-- Row level security for every table the app uses, and a guard on the profile columns that grant access.
--
-- Why: NEXT_PUBLIC_SUPABASE_ANON_KEY is shipped to every browser, so anyone can call the REST API with it.
-- Once it holds the real anon key (today it holds a service-role key, which ignores RLS; rotate it), these
-- policies are what decide what a visitor or a signed-in user can read and change.
--
-- Server code that needs more (the staff portals, the PayU callback, doctor approvals, desk bookings) uses the
-- service-role client after checking the caller's role in code. The service role bypasses RLS, so it is not
-- affected by anything in this file.
--
-- This is the complete policy set for these tables: it first DROPS EVERY EXISTING POLICY on them, including
-- ones added by hand in the dashboard. To see what will be replaced, run this first:
--   select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public';
--
-- The app creates profiles itself and assumes no trigger on auth.users does it. If this lists one that copies
-- a role from user metadata into profiles, drop it: anyone can sign up with any metadata.
--   select tgname, tgrelid::regclass from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
--
-- Run after 20261004_payments_diagnostic_booking.sql.

begin;

-- ---------------------------------------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so that policies (including those on profiles itself) can look up the caller's
-- profile without recursing into profiles' own policies.
-- ---------------------------------------------------------------------------------------------------------

create or replace function public.cyd_my_role()
returns text
language sql stable security definer
set search_path = ''
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.cyd_my_hospital_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$ select hospital_id from public.profiles where id = auth.uid() $$;

create or replace function public.cyd_my_center_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$ select diagnostic_center_id from public.profiles where id = auth.uid() $$;

-- The doctors rows that belong to the signed-in doctor.
create or replace function public.cyd_my_doctor_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$ select id from public.doctors where profile_id = auth.uid() $$;

revoke execute on function public.cyd_my_role(), public.cyd_my_hospital_id(), public.cyd_my_center_id(),
  public.cyd_my_doctor_ids() from public, anon;
grant execute on function public.cyd_my_role(), public.cyd_my_hospital_id(), public.cyd_my_center_id(),
  public.cyd_my_doctor_ids() to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- Start from a clean slate: RLS on everywhere, no old policies.
-- ---------------------------------------------------------------------------------------------------------

do $$
declare
  t text;
  p record;
  tables text[] := array[
    'profiles', 'patient_details', 'hospitals', 'departments', 'doctors', 'schedules', 'appointments',
    'medical_records', 'payments', 'diagnostic_centers', 'diagnostic_bookings', 'doctor_signup_requests'
  ];
begin
  for p in
    select tablename, policyname from pg_policies where schemaname = 'public' and tablename = any (tables)
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;

  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    -- Super admins manage everything from the admin tools, which use their signed-in session.
    execute format(
      'create policy "super admins: full access" on public.%I for all to authenticated '
      'using ((select public.cyd_my_role()) = ''super_admin'') '
      'with check ((select public.cyd_my_role()) = ''super_admin'')',
      t
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Public catalogue: hospitals, doctors, labs and open slots are what visitors browse and book.
-- ---------------------------------------------------------------------------------------------------------

create policy "public: read hospitals" on public.hospitals
  for select to anon, authenticated using (true);

create policy "public: read departments" on public.departments
  for select to anon, authenticated using (true);

create policy "public: read doctors" on public.doctors
  for select to anon, authenticated using (true);

create policy "public: read diagnostic centers" on public.diagnostic_centers
  for select to anon, authenticated using (true);

create policy "public: read schedules" on public.schedules
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------------------------------------

create policy "users: read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

-- Doctor names appear on public listings (doctors -> profiles(full_name)).
create policy "public: read doctor profiles" on public.profiles
  for select to anon, authenticated using (role = 'doctor');

-- Visitors only ever need a doctor's name, so keep doctors' email, phone and staff ID out of anonymous reach.
revoke select on public.profiles from anon;
grant select (id, full_name, role) on public.profiles to anon;

-- Self sign-up (phone OTP or Google) can only ever create a plain patient profile. Staff profiles are created
-- by super admins or by the server.
create policy "users: create own patient profile" on public.profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and role = 'patient'
    and hospital_id is null
    and diagnostic_center_id is null
    and staff_id is null
  );

create policy "users: update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Users may edit their name and phone, but not the columns that decide what they can access.
create or replace function public.cyd_guard_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- The service role (server code) and the SQL editor manage these columns, and so do super admins in the app.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if public.cyd_my_role() = 'super_admin' then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.hospital_id is distinct from old.hospital_id
     or new.diagnostic_center_id is distinct from old.diagnostic_center_id
     or new.staff_id is distinct from old.staff_id
     or new.email is distinct from old.email then
    raise exception 'Only an administrator can change a profile''s role, organisation, staff ID or email.'
      using errcode = '42501';
  end if;
  return new;
end
$$;

drop trigger if exists cyd_guard_profile_privileges on public.profiles;
create trigger cyd_guard_profile_privileges
  before update on public.profiles
  for each row execute function public.cyd_guard_profile_privileges();

-- ---------------------------------------------------------------------------------------------------------
-- patient_details: a patient's own medical profile.
-- ---------------------------------------------------------------------------------------------------------

create policy "patients: read own details" on public.patient_details
  for select to authenticated using (id = (select auth.uid()));

create policy "patients: create own details" on public.patient_details
  for insert to authenticated with check (id = (select auth.uid()));

create policy "patients: update own details" on public.patient_details
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------------------
-- appointments. Patients book through the server (service role), so nobody inserts with their own session.
-- ---------------------------------------------------------------------------------------------------------

create policy "patients: read own appointments" on public.appointments
  for select to authenticated using (patient_id = (select auth.uid()));

create policy "doctors: read own appointments" on public.appointments
  for select to authenticated using (doctor_id in (select public.cyd_my_doctor_ids()));

create policy "doctors: update own appointments" on public.appointments
  for update to authenticated
  using (doctor_id in (select public.cyd_my_doctor_ids()))
  with check (doctor_id in (select public.cyd_my_doctor_ids()));

-- The operations team works across the whole platform.
create policy "executives: read appointments" on public.appointments
  for select to authenticated using ((select public.cyd_my_role()) = 'executive');

-- Executives check in patients at their hospital and manage the bookings they handle.
create policy "executives: update handled appointments" on public.appointments
  for update to authenticated
  using (
    (select public.cyd_my_role()) = 'executive'
    and (executive_id = (select auth.uid()) or hospital_id = (select public.cyd_my_hospital_id()))
  )
  with check ((select public.cyd_my_role()) = 'executive' and executive_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------------------
-- medical_records: prescriptions, visible to the patient and the doctor of the appointment.
-- ---------------------------------------------------------------------------------------------------------

create policy "patients: read own medical records" on public.medical_records
  for select to authenticated
  using (exists (
    select 1 from public.appointments a
    where a.id = medical_records.appointment_id and a.patient_id = (select auth.uid())
  ));

create policy "doctors: read records of own appointments" on public.medical_records
  for select to authenticated
  using (exists (
    select 1 from public.appointments a
    where a.id = medical_records.appointment_id and a.doctor_id in (select public.cyd_my_doctor_ids())
  ));

create policy "doctors: add records to own appointments" on public.medical_records
  for insert to authenticated
  with check (exists (
    select 1 from public.appointments a
    where a.id = medical_records.appointment_id and a.doctor_id in (select public.cyd_my_doctor_ids())
  ));

-- ---------------------------------------------------------------------------------------------------------
-- diagnostic_bookings. Labs work through the server (service role); patients create unpaid bookings.
-- ---------------------------------------------------------------------------------------------------------

create policy "patients: read own lab bookings" on public.diagnostic_bookings
  for select to authenticated using (patient_id = (select auth.uid()));

-- Only unpaid bookings: the PayU callback (service role) is what confirms them.
create policy "patients: create own lab bookings" on public.diagnostic_bookings
  for insert to authenticated
  with check (patient_id = (select auth.uid()) and status = 'pending_payment');

create policy "labs: read own center's bookings" on public.diagnostic_bookings
  for select to authenticated
  using (
    (select public.cyd_my_role()) = 'diagnostic_admin'
    and center_id = (select public.cyd_my_center_id())
  );

-- ---------------------------------------------------------------------------------------------------------
-- schedules: hospital admins publish and remove their doctors' slots; doctors can remove their own open slots.
-- Booking a slot happens on the server (service role).
-- ---------------------------------------------------------------------------------------------------------

create policy "hospital admins: add slots for their doctors" on public.schedules
  for insert to authenticated
  with check (
    (select public.cyd_my_role()) = 'hospital_admin'
    and exists (
      select 1 from public.doctors d
      where d.id = schedules.doctor_id and d.hospital_id = (select public.cyd_my_hospital_id())
    )
  );

create policy "hospital admins: remove open slots of their doctors" on public.schedules
  for delete to authenticated
  using (
    not is_booked
    and (select public.cyd_my_role()) = 'hospital_admin'
    and exists (
      select 1 from public.doctors d
      where d.id = schedules.doctor_id and d.hospital_id = (select public.cyd_my_hospital_id())
    )
  );

create policy "doctors: remove own open slots" on public.schedules
  for delete to authenticated
  using (not is_booked and doctor_id in (select public.cyd_my_doctor_ids()));

-- ---------------------------------------------------------------------------------------------------------
-- doctor_signup_requests: applications are submitted through the server; reviewers read them.
-- (Replaces the old policies that let any signed-in user read and edit every application.)
-- ---------------------------------------------------------------------------------------------------------

create policy "reviewers: read doctor applications" on public.doctor_signup_requests
  for select to authenticated
  using ((select public.cyd_my_role()) in ('super_admin', 'executive'));

-- ---------------------------------------------------------------------------------------------------------
-- payments: written by the PayU callback and read by staff portals, both with the service role. Only the
-- super admin policy above applies to signed-in sessions.
-- ---------------------------------------------------------------------------------------------------------

commit;
