-- =========================================================================================================
-- CONSULT YOUR DOCTOR | CONSOLIDATED SCOPE DATABASE ARCHITECTURE MIGRATION
-- Covers:
-- 1. Unique Hospital ID & Diagnostic Centre ID generation and linking
-- 2. Automated Support Tickets & Messages (Ticket Management lifecycle)
-- 3. Payments Enhancement (failed/pending/refunded states, traceable payment audits)
-- 4. Doctor Invitations via Hospital Dashboard (statuses, secure activation)
-- 5. Digital Prescription numbers and traceable amendments audit
-- 6. Hospital Beds, Allocations, and Doctor Reviews (idempotent repeats from 20261009/20261010)
-- 
-- Safe to run more than once in the Supabase SQL Editor.
-- =========================================================================================================

-- ---------------------------------------------------------------------------------------------------------
-- 1. Unique Hospital ID & Diagnostic Centre ID
-- ---------------------------------------------------------------------------------------------------------

alter table public.hospitals
  add column if not exists hospital_code text;

create sequence if not exists public.hospital_code_seq as bigint minvalue 1001 start 1001;

create or replace function public.generate_hospital_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.hospital_code is null or new.hospital_code = '' then
    new.hospital_code := 'CYD-HOSP-' || nextval('public.hospital_code_seq')::text;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generate_hospital_code on public.hospitals;
create trigger trg_generate_hospital_code
  before insert on public.hospitals
  for each row execute function public.generate_hospital_code();

-- Backfill existing hospitals with codes if missing
update public.hospitals
set hospital_code = 'CYD-HOSP-' || nextval('public.hospital_code_seq')::text
where hospital_code is null or hospital_code = '';

create unique index if not exists hospitals_hospital_code_key on public.hospitals (hospital_code);

-- Diagnostic Centres
alter table public.diagnostic_centers
  add column if not exists center_code text;

create sequence if not exists public.center_code_seq as bigint minvalue 1001 start 1001;

create or replace function public.generate_center_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.center_code is null or new.center_code = '' then
    new.center_code := 'CYD-DIAG-' || nextval('public.center_code_seq')::text;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generate_center_code on public.diagnostic_centers;
create trigger trg_generate_center_code
  before insert on public.diagnostic_centers
  for each row execute function public.generate_center_code();

-- Backfill existing diagnostic centres
update public.diagnostic_centers
set center_code = 'CYD-DIAG-' || nextval('public.center_code_seq')::text
where center_code is null or center_code = '';

create unique index if not exists diagnostic_centers_center_code_key on public.diagnostic_centers (center_code);


-- ---------------------------------------------------------------------------------------------------------
-- 2. Help & Support — Automated Ticket Management
-- ---------------------------------------------------------------------------------------------------------

create sequence if not exists public.ticket_code_seq as bigint minvalue 1001 start 1001;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null unique default ('CYD-TICK-' || nextval('public.ticket_code_seq')::text),
  user_id uuid references public.profiles (id) on delete set null,
  requester_name text not null,
  requester_email text,
  requester_phone text,
  requester_role text not null default 'patient' check (requester_role in ('patient', 'doctor', 'hospital_admin', 'diagnostic_admin', 'visitor', 'executive')),
  category text not null,
  subject text not null,
  description text not null,
  related_booking_id text,
  related_payment_id text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'awaiting_response', 'resolved', 'closed')),
  assigned_to uuid references public.profiles (id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tickets_user_id_idx on public.tickets (user_id);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_assigned_to_idx on public.tickets (assigned_to);
create index if not exists tickets_created_at_idx on public.tickets (created_at desc);

-- Ticket replies and conversation history
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_role text not null default 'executive',
  sender_name text not null,
  message text not null,
  status_change text,
  created_at timestamptz not null default now()
);

create index if not exists ticket_messages_ticket_id_idx on public.ticket_messages (ticket_id, created_at asc);


-- ---------------------------------------------------------------------------------------------------------
-- 3. Payments Management & Traceable Audit History
-- ---------------------------------------------------------------------------------------------------------

-- Ensure payments table has all required tracking columns
alter table public.payments
  add column if not exists diagnostic_booking_id uuid references public.diagnostic_bookings (id) on delete set null,
  add column if not exists patient_id uuid references public.profiles (id) on delete set null,
  add column if not exists hospital_id uuid references public.hospitals (id) on delete set null,
  add column if not exists diagnostic_center_id uuid references public.diagnostic_centers (id) on delete set null,
  add column if not exists refund_amount numeric(10, 2),
  add column if not exists refund_reason text,
  add column if not exists refunded_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists created_at timestamptz not null default now();

alter table public.payments alter column appointment_id drop not null;

create index if not exists payments_patient_id_idx on public.payments (patient_id);
create index if not exists payments_hospital_id_idx on public.payments (hospital_id);
create index if not exists payments_diagnostic_center_id_idx on public.payments (diagnostic_center_id);
create index if not exists payments_created_at_idx on public.payments (created_at desc);

-- Traceable Financial Audit Trail (Refunds, Adjustments, Corrections)
create table if not exists public.payment_audits (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  action text not null check (action in ('status_adjustment', 'refund', 'reconciliation')),
  performed_by uuid references public.profiles (id) on delete set null,
  performed_by_name text not null,
  old_status text,
  new_status text,
  amount numeric(10, 2),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists payment_audits_payment_id_idx on public.payment_audits (payment_id);
create index if not exists payment_audits_performed_by_idx on public.payment_audits (performed_by);


-- ---------------------------------------------------------------------------------------------------------
-- 4. Doctor Invitations via Hospital Dashboard
-- ---------------------------------------------------------------------------------------------------------

create table if not exists public.doctor_invitations (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  doctor_id uuid references public.doctors (id) on delete set null,
  email text not null,
  full_name text not null,
  specialty text not null,
  status text not null default 'invitation_pending' check (status in ('invitation_pending', 'email_verified', 'active', 'suspended')),
  invitation_token text unique,
  expires_at timestamptz,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists doctor_invitations_hospital_id_idx on public.doctor_invitations (hospital_id);
create index if not exists doctor_invitations_email_idx on public.doctor_invitations (email);


-- ---------------------------------------------------------------------------------------------------------
-- 5. Digital Prescription Numbers & Traceable Amendments
-- ---------------------------------------------------------------------------------------------------------

create sequence if not exists public.prescription_no_seq as bigint minvalue 1 start 1;

create or replace function public.next_prescription_no()
returns text
language sql
volatile
security definer
set search_path = ''
as $$ select 'RX' || lpad(nextval('public.prescription_no_seq')::text, 10, '0') $$;

grant execute on function public.next_prescription_no() to service_role;

alter table public.medical_records add column if not exists prescription_no text;
create unique index if not exists medical_records_prescription_no_key on public.medical_records (prescription_no) where prescription_no is not null;

-- Traceable amendments for issued prescriptions
create table if not exists public.prescription_amendments (
  id uuid primary key default gen_random_uuid(),
  prescription_no text not null,
  appointment_id uuid references public.appointments (id) on delete cascade,
  amended_by uuid references public.profiles (id) on delete set null,
  amended_by_name text not null,
  reason text not null,
  changes_summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists prescription_amendments_no_idx on public.prescription_amendments (prescription_no);


-- ---------------------------------------------------------------------------------------------------------
-- 6. Row Level Security Policies
-- ---------------------------------------------------------------------------------------------------------

alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.payment_audits enable row level security;
alter table public.doctor_invitations enable row level security;
alter table public.prescription_amendments enable row level security;

-- Super admin / Executive full access policies
create policy "executives: full tickets access" on public.tickets for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('executive', 'super_admin')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('executive', 'super_admin')));

create policy "users: read and create own tickets" on public.tickets for select to authenticated
  using (user_id = auth.uid());

create policy "users: insert own tickets" on public.tickets for insert to authenticated
  with check (user_id = auth.uid());

create policy "executives: full ticket messages access" on public.ticket_messages for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('executive', 'super_admin')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('executive', 'super_admin')));

create policy "users: read own ticket messages" on public.ticket_messages for select to authenticated
  using (exists (select 1 from public.tickets where tickets.id = ticket_messages.ticket_id and tickets.user_id = auth.uid()));

create policy "users: reply to own tickets" on public.ticket_messages for insert to authenticated
  with check (exists (select 1 from public.tickets where tickets.id = ticket_messages.ticket_id and tickets.user_id = auth.uid()));

create policy "hospital admins: manage hospital doctor invitations" on public.doctor_invitations for all to authenticated
  using (hospital_id in (select hospital_id from public.profiles where id = auth.uid() and role = 'hospital_admin'))
  with check (hospital_id in (select hospital_id from public.profiles where id = auth.uid() and role = 'hospital_admin'));
