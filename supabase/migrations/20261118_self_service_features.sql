-- Self-service features (planned 2026-11-16, .claude/audit/features-plan.md):
--   1. booking_cancellations   patients cancel their own bookings; a refund-due cancellation shows on the executive
--                              Payments page, where the team records the refund it paid from the Razorpay dashboard.
--   2. appointments.reschedule_count / rescheduled_at   a patient moves a doctor visit once.
--   3. record_access_blocks    a patient removes a doctor's access to their past visits' records, enforced in the
--                              doctor portal's loaders and, for direct REST reads, by a restrictive policy on
--                              medical_records.
--   4. doctors.bookings_paused / _by / _at   a hospital (or the doctor) pauses new bookings; paused doctors are hidden
--                              from patients and can't be booked. Bookings already made stay.
--   5. ticket_steps            the executive Support desk ticks a ticket's "Steps to solve".
--
-- Run in the Supabase SQL editor. Safe to run more than once. NOT run by the planning session.
--
-- Order: after 20261115_executive_workspace.sql and 20261116_patient_health.sql, and after
-- 20261005_security_hardening.sql. Section 3 adds a policy on medical_records, and 20261005 drops every policy on that
-- table: if 20261005 is run (or run again) after this file, run this file again afterwards.
--
-- Until this runs the site keeps working: unpaid and free bookings can still be cancelled, but cancelling a paid
-- booking, rescheduling, removing a doctor's access, pausing a doctor and ticking ticket steps each say they open after
-- the next update; doctor loaders see no blocks and patient lists see no paused doctors.
--
-- New tables are read and written only by the server with the service role (actions check the caller first), so the
-- public REST API gets no access to them. Session users can't change the new appointment or doctor columns either.

begin;

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Cancellations made by the patient, and whether the online booking fee is to be refunded
-- ---------------------------------------------------------------------------------------------------------------------
-- refund_due: cancelled at least 2 hours before the booking starts with the fee paid online. The team refunds
-- paid_amount (booking fee + convenience fee) from the Razorpay dashboard and records it with processPaymentRefund,
-- which sets payments.refund_amount and emails the patient. starts_at is the slot (doctor visit) or 00:00 IST of the
-- visit day (lab booking).

create table if not exists public.booking_cancellations (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete cascade,
  diagnostic_booking_id uuid references public.diagnostic_bookings (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  cancelled_by text not null default 'patient' check (cancelled_by in ('patient')),
  cancelled_at timestamptz not null default now(),
  starts_at timestamptz,
  payment_id uuid references public.payments (id) on delete set null,
  paid_amount numeric(10, 2) check (paid_amount is null or paid_amount >= 0),
  refund_due boolean not null default false,
  constraint booking_cancellations_one_booking_chk check (num_nonnulls(appointment_id, diagnostic_booking_id) = 1)
);

-- One cancellation per booking: also the lock that stops a double tap from cancelling (and refunding) twice.
create unique index if not exists booking_cancellations_appointment_key
  on public.booking_cancellations (appointment_id) where appointment_id is not null;
create unique index if not exists booking_cancellations_lab_key
  on public.booking_cancellations (diagnostic_booking_id) where diagnostic_booking_id is not null;
create index if not exists booking_cancellations_patient_idx on public.booking_cancellations (patient_id, cancelled_at desc);
create index if not exists booking_cancellations_refund_due_idx on public.booking_cancellations (cancelled_at desc) where refund_due;

alter table public.booking_cancellations enable row level security;
revoke all on public.booking_cancellations from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. A patient moves a doctor visit once (the hospital desk's moves, app/actions/leave.ts moveBooking, don't count)
-- ---------------------------------------------------------------------------------------------------------------------

alter table public.appointments add column if not exists reschedule_count smallint not null default 0;
alter table public.appointments add column if not exists rescheduled_at timestamptz;
alter table public.appointments drop constraint if exists appointments_reschedule_count_chk;
alter table public.appointments add constraint appointments_reschedule_count_chk check (reschedule_count between 0 and 1);

-- Only the server sets these. (The existing cyd_guard_appointment_writes trigger covers the other booking columns; this
-- is a separate trigger so that function doesn't have to be copied here.)
create or replace function public.cyd_guard_reschedule_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (new.reschedule_count is distinct from old.reschedule_count or new.rescheduled_at is distinct from old.rescheduled_at) then
    raise exception 'That booking detail can''t be changed from here.' using errcode = '42501';
  end if;
  return new;
end
$$;

drop trigger if exists cyd_guard_reschedule_writes on public.appointments;
create trigger cyd_guard_reschedule_writes
  before update on public.appointments
  for each row execute function public.cyd_guard_reschedule_writes();

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. "Who can see your records → Remove": a doctor stops seeing the patient's past visits with them
-- ---------------------------------------------------------------------------------------------------------------------
-- A visit is hidden from that doctor when its slot (or, without one, its booking time) is before blocked_at. A visit
-- the patient books with the doctor later is shared again. Removing again moves blocked_at forward.

create table if not exists public.record_access_blocks (
  patient_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  blocked_at timestamptz not null default now(),
  primary key (patient_id, doctor_id)
);
create index if not exists record_access_blocks_doctor_idx on public.record_access_blocks (doctor_id);

alter table public.record_access_blocks enable row level security;
revoke all on public.record_access_blocks from anon, authenticated;

-- True when the signed-in doctor may no longer see this appointment's records. SECURITY DEFINER because the caller has
-- no access to record_access_blocks; it never returns anything but this one yes/no. Patients and other staff get false.
create or replace function public.cyd_record_hidden_from_me(p_appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.appointments a
    join public.record_access_blocks b on b.patient_id = a.patient_id and b.doctor_id = a.doctor_id
    join public.doctors d on d.id = a.doctor_id
    left join public.schedules s on s.id = a.schedule_id
    where a.id = p_appointment_id
      and d.profile_id = (select auth.uid())
      and coalesce(s.start_time, a.created_at) < b.blocked_at
  )
$$;

revoke execute on function public.cyd_record_hidden_from_me(uuid) from public, anon;
grant execute on function public.cyd_record_hidden_from_me(uuid) to authenticated;

-- The app's doctor pages read records with the service role (app/doctor/_lib/doctor.ts loadVisits), which this policy
-- doesn't affect; the loaders apply the same rule. This covers a doctor's session reading medical_records directly
-- through the REST API. Restrictive: it narrows whatever the permissive policies allow and grants nothing.
drop policy if exists "doctors: not records the patient removed" on public.medical_records;
create policy "doctors: not records the patient removed" on public.medical_records
  as restrictive
  for select
  to authenticated
  using (appointment_id is null or not public.cyd_record_hidden_from_me(appointment_id));

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Pausing a doctor's bookings ("Paused · hidden from patients" / "Taking bookings")
-- ---------------------------------------------------------------------------------------------------------------------
-- bookings_paused_by says who paused: a pause by the hospital can only be lifted by the hospital.

alter table public.doctors add column if not exists bookings_paused boolean not null default false;
alter table public.doctors add column if not exists bookings_paused_by text;
alter table public.doctors add column if not exists bookings_paused_at timestamptz;
alter table public.doctors drop constraint if exists doctors_bookings_paused_by_chk;
alter table public.doctors add constraint doctors_bookings_paused_by_chk
  check (bookings_paused_by is null or bookings_paused_by in ('doctor', 'hospital'));
create index if not exists doctors_bookings_paused_idx on public.doctors (id) where bookings_paused;

-- Only the server changes the pause (the doctor's own switch and the hospital's go through server actions).
create or replace function public.cyd_guard_doctor_pause_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (new.bookings_paused is distinct from old.bookings_paused
          or new.bookings_paused_by is distinct from old.bookings_paused_by
          or new.bookings_paused_at is distinct from old.bookings_paused_at) then
    raise exception 'Bookings are paused and resumed from the portal.' using errcode = '42501';
  end if;
  return new;
end
$$;

drop trigger if exists cyd_guard_doctor_pause_writes on public.doctors;
create trigger cyd_guard_doctor_pause_writes
  before update on public.doctors
  for each row execute function public.cyd_guard_doctor_pause_writes();

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Support desk: the ticked "Steps to solve" of each ticket (steps themselves are in lib/support-desk.ts)
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.ticket_steps (
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  step_key text not null check (char_length(step_key) between 1 and 60),
  done_by uuid references public.profiles (id) on delete set null,
  done_by_name text check (done_by_name is null or char_length(done_by_name) <= 120),
  done_at timestamptz not null default now(),
  primary key (ticket_id, step_key)
);

alter table public.ticket_steps enable row level security;
revoke all on public.ticket_steps from anon, authenticated;

commit;

-- Check afterwards (read-only):
--   select count(*) from public.booking_cancellations;
--   select reschedule_count, rescheduled_at from public.appointments limit 1;
--   select count(*) from public.record_access_blocks;
--   select policyname, permissive from pg_policies where tablename = 'medical_records';
--   select bookings_paused, bookings_paused_by from public.doctors limit 1;
--   select count(*) from public.ticket_steps;
