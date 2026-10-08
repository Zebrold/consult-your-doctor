-- Desk patient registration, desk payments (PayU and UPI scanner), hospital health records and generated PDF reports.
--
-- Safe to run more than once. Run it in the Supabase SQL editor. It repeats what 20261004 does, so it works whether
-- or not that file was applied (on 8 Oct 2026 it had not been: payments had no diagnostic_booking_id column).

-- ---------------------------------------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------------------------------------

-- A payment settles either a consultation or a lab booking (as in 20261004).
alter table public.payments
  add column if not exists diagnostic_booking_id uuid references public.diagnostic_bookings (id) on delete set null,
  add column if not exists created_at timestamptz not null default now();
alter table public.payments alter column appointment_id drop not null;
alter table public.payments drop constraint if exists payments_single_booking_chk;
alter table public.payments
  add constraint payments_single_booking_chk check (num_nonnulls(appointment_id, diagnostic_booking_id) <= 1);
create index if not exists payments_appointment_id_idx on public.payments (appointment_id);
create index if not exists payments_diagnostic_booking_id_idx on public.payments (diagnostic_booking_id);
create unique index if not exists payments_gateway_transaction_id_key
  on public.payments (gateway, transaction_id)
  where transaction_id is not null;

-- The ways the app records a payment. 'payu' was missing, so no online payment could be saved;
-- 'upi_qr' is a UPI payment the desk collects by showing its scanner (QR) code.
alter type public.payment_gateway add value if not exists 'payu';
alter type public.payment_gateway add value if not exists 'upi_qr';

-- ---------------------------------------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------------------------------------

-- Health information hospital staff collect for a visit: vitals (with BMI), notes and uploaded documents.
-- Kept as medical records on the visit, so the patient's profile and the assigned doctor see them.
alter type public.document_type add value if not exists 'health_record';

-- The Patient ID a diagnostic centre generates at registration. With the generated password it signs the
-- patient in, alongside the usual mobile number and one-time code.
alter table public.profiles add column if not exists patient_code text;
create unique index if not exists profiles_patient_code_key on public.profiles (patient_code) where patient_code is not null;

-- Results a lab enters in the portal; the PDF report is generated from them.
alter table public.diagnostic_bookings add column if not exists results jsonb;

-- Users may edit their own name and phone, never the columns that decide access or identify them
-- (this is the guard from 20261005, now also covering patient_code).
create or replace function public.cyd_guard_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if (select role from public.profiles where id = auth.uid()) = 'super_admin' then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.hospital_id is distinct from old.hospital_id
     or new.diagnostic_center_id is distinct from old.diagnostic_center_id
     or new.staff_id is distinct from old.staff_id
     or new.patient_code is distinct from old.patient_code
     or new.email is distinct from old.email then
    raise exception 'Only an administrator can change a profile''s role, organisation, staff ID, patient ID or email.'
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
-- Files
-- ---------------------------------------------------------------------------------------------------------

-- Prescriptions, lab reports and health documents are private. The bucket was public, so anyone with (or
-- guessing) a file's address could open it. The app now hands out short-lived signed links instead.
update storage.buckets
set public = false,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'medical_records';
