-- Audit fixes (31 Oct 2026). Run in the Supabase SQL editor after 20261028_fast_track_services.sql and the earlier
-- migrations. Run it as one script. It is safe to run more than once, except that step 5 and step 6 stop with an error
-- if the database already holds duplicates (their notes say how to find them).
--
-- What each step closes is written above it. Nothing here changes what the site does through the server; it removes
-- what a signed-in browser session (the publishable key plus the user's login) could do directly to the tables.

begin;

-- ---------------------------------------------------------------------------------------------------------
-- 1. Appointments. Doctors used to update their own appointments through the REST API: the status (an unpaid booking
--    could be marked confirmed), the patient it belonged to, its fees. Doctors now act through the server only
--    (app/actions/doctor.ts), which checks the visit is theirs and only moves it forward.
-- ---------------------------------------------------------------------------------------------------------

drop policy if exists "doctors: update own appointments" on public.appointments;

-- Executives still change status and check patients in through their session (app/actions/executive.ts), which the
-- policy "executives: update handled appointments" allows. This trigger adds the rules the policy can't express:
-- a booking's patient, doctor, slot, hospital and fees can't change from a session, and an unpaid booking is confirmed
-- only by its payment (the server), never by a status change. The service role (server code, the SQL editor) is
-- not affected.
create or replace function public.cyd_guard_appointment_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.patient_id is distinct from old.patient_id
     or new.doctor_id is distinct from old.doctor_id
     or new.schedule_id is distinct from old.schedule_id
     or new.hospital_id is distinct from old.hospital_id
     or new.created_at is distinct from old.created_at
     or new.booking_type is distinct from old.booking_type
     or new.services is distinct from old.services then
    raise exception 'That booking detail can''t be changed from here.' using errcode = '42501';
  end if;
  if old.status = 'pending_payment' and new.status is distinct from old.status then
    raise exception 'An unpaid booking is confirmed by its payment, not by a status change.' using errcode = '42501';
  end if;
  return new;
end
$$;

drop trigger if exists cyd_guard_appointment_writes on public.appointments;
create trigger cyd_guard_appointment_writes
  before update on public.appointments
  for each row execute function public.cyd_guard_appointment_writes();

-- ---------------------------------------------------------------------------------------------------------
-- 2. Profiles. The public doctor listing rule ("public: read doctor profiles") let every signed-in account read every
--    doctor's email, phone number and staff ID, because the grant on the table was never narrowed for signed-in users
--    (only for visitors). A signed-in session may now read only the columns the site reads through it. A person's own
--    email, phone number, staff ID and patient ID are read by the server (admin client) using the verified user id.
--    Writes are unchanged: a user still edits their own name and phone (the guard trigger keeps role and organisation
--    fixed).
-- ---------------------------------------------------------------------------------------------------------

revoke select on public.profiles from authenticated;
grant select (id, full_name, role, hospital_id, diagnostic_center_id, created_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- 3. Medical records. A doctor's session may add a record to their own visit (prescriptions, health documents). The
--    file stored with it is served back as a signed link, so the path must belong to that visit: either no file, the
--    placeholder 'none', or a path that contains the visit's id (the paths the server writes do).
-- ---------------------------------------------------------------------------------------------------------

drop policy if exists "doctors: add records to own appointments" on public.medical_records;
create policy "doctors: add records to own appointments" on public.medical_records
  for insert to authenticated
  with check (
    exists (
      select 1 from public.appointments a
      where a.id = medical_records.appointment_id and a.doctor_id in (select public.cyd_my_doctor_ids())
    )
    and (file_url is null or file_url = 'none' or position(appointment_id::text in file_url) > 0)
  );

-- ---------------------------------------------------------------------------------------------------------
-- 4. Payments at the counter. A booking paid online (the booking fee) still takes the desk's payment for the consultation
--    or the test charges. There must be only one such counter payment per booking, so a double tap or two desks can't
--    both record it. (cash and upi_qr are the counter gateways; payu is the online one.)
-- ---------------------------------------------------------------------------------------------------------

create unique index if not exists payments_one_counter_per_appointment
  on public.payments (appointment_id)
  where status = 'success' and gateway in ('cash', 'upi_qr') and appointment_id is not null;

-- If this fails, the database already has two counter payments for one booking. Find them with:
--   select diagnostic_booking_id, count(*) from payments where status='success' and gateway in ('cash','upi_qr')
--   and diagnostic_booking_id is not null group by 1 having count(*) > 1;
create unique index if not exists payments_one_counter_per_diagnostic
  on public.payments (diagnostic_booking_id)
  where status = 'success' and gateway in ('cash', 'upi_qr') and diagnostic_booking_id is not null;

-- Refund details (the refund action writes them; the columns may be missing on an older database).
alter table public.payments add column if not exists refund_amount numeric;
alter table public.payments add column if not exists refund_reason text;
alter table public.payments add column if not exists refunded_at timestamptz;

-- ---------------------------------------------------------------------------------------------------------
-- 5. Slots. Nothing stopped two open slots with the same start for one doctor, so the same time could be offered
--    twice. First remove duplicate OPEN slots (keeping one, and never a booked one or one that has a visit), then
--    make the pair unique. If the last statement fails, two BOOKED slots share a start time: look at them and
--    resolve them by hand before running this step again.
-- ---------------------------------------------------------------------------------------------------------

delete from public.schedules s
using public.schedules d
where s.doctor_id = d.doctor_id
  and s.start_time = d.start_time
  and s.id <> d.id
  and not s.is_booked
  and not exists (select 1 from public.appointments a where a.schedule_id = s.id)
  and (d.is_booked or d.id < s.id);

create unique index if not exists schedules_doctor_start_key on public.schedules (doctor_id, start_time);

-- ---------------------------------------------------------------------------------------------------------
-- 6. Lab bookings keep the prices they were booked at (priced_tests), so a later change to a lab's test list or prices
--    can't change what a booked patient owes or what the report shows. Bookings made before this keep matching by name.
-- ---------------------------------------------------------------------------------------------------------

alter table public.diagnostic_bookings add column if not exists priced_tests jsonb;

-- ---------------------------------------------------------------------------------------------------------
-- 7. Attempt limits shared by every server instance (lib/rate-limit.ts). Only the server reads or writes this table.
-- ---------------------------------------------------------------------------------------------------------

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_key_created on public.rate_limit_hits (key, created_at desc);

alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

commit;

-- Check afterwards (read-only):
--   select grantee, column_name from information_schema.column_privileges
--     where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated';   -- id, full_name, role, hospital_id, diagnostic_center_id, created_at, and update rights
--   select tgname from pg_trigger where tgrelid = 'public.appointments'::regclass and not tgisinternal;   -- cyd_guard_appointment_writes
--   select policyname from pg_policies where tablename = 'appointments' and policyname like 'doctors:%';   -- only the read policy
