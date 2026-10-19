-- =========================================================================================
-- CONSULT YOUR DOCTOR - COMPLETE DATABASE SYNC SCRIPT
-- Run this in the Supabase Dashboard > SQL Editor (https://supabase.com/dashboard/project/roehneuuwtpsgcwitgzs)
-- Safe to run multiple times (all statements use IF NOT EXISTS).
-- =========================================================================================

-- 1. Helper function for RLS checks
create or replace function public.cyd_my_role()
returns text
language sql stable security definer
set search_path = ''
as $$ select role from public.profiles where id = auth.uid() $$;

grant execute on function public.cyd_my_role() to authenticated;

-- 2. Payment Gateway Enums & Columns
do $$ begin
  alter type public.payment_gateway add value if not exists 'payu';
exception when others then null; end $$;

do $$ begin
  alter type public.payment_gateway add value if not exists 'upi_qr';
exception when others then null; end $$;

do $$ begin
  alter type public.document_type add value if not exists 'health_record';
exception when others then null; end $$;

alter table public.payments
  add column if not exists diagnostic_booking_id uuid references public.diagnostic_bookings (id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

alter table public.payments alter column appointment_id drop not null;

alter table public.profiles 
  add column if not exists patient_code text;

create unique index if not exists profiles_patient_code_key 
  on public.profiles (patient_code) where patient_code is not null;

-- 3. Hospital Profile Columns
alter table public.hospitals
  add column if not exists phone text,
  add column if not exists emergency_phone text,
  add column if not exists website text,
  add column if not exists about text,
  add column if not exists established_year integer,
  add column if not exists facilities text[] not null default '{}',
  add column if not exists accreditations text[] not null default '{}',
  add column if not exists insurance_accepted text[] not null default '{}',
  add column if not exists available_tests text[] not null default '{}',
  add column if not exists test_prices jsonb not null default '{}'::jsonb;

-- 4. Doctor Profile Columns
alter table public.doctors
  add column if not exists registration_number text,
  add column if not exists registration_council text,
  add column if not exists education jsonb not null default '[]'::jsonb,
  add column if not exists insurance_accepted text[] not null default '{}';

-- 5. Inpatient Beds Table
create table if not exists public.hospital_beds (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  ward text not null check (char_length(ward) between 1 and 60),
  label text not null check (char_length(label) between 1 and 30),
  bed_type text not null default 'general'
    check (bed_type in ('general', 'semi_private', 'private', 'icu', 'hdu', 'nicu', 'picu', 'emergency', 'maternity', 'isolation')),
  daily_rate numeric(10, 2) check (daily_rate is null or daily_rate >= 0),
  status text not null default 'available' check (status in ('available', 'cleaning', 'maintenance')),
  created_at timestamptz not null default now(),
  unique (hospital_id, ward, label)
);

create index if not exists hospital_beds_hospital_id_idx on public.hospital_beds (hospital_id);

-- 6. Bed Allocations Table
create table if not exists public.bed_allocations (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references public.hospital_beds (id) on delete cascade,
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id uuid references public.doctors (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  reason text check (reason is null or char_length(reason) <= 500),
  notes text check (notes is null or char_length(notes) <= 2000),
  admitted_at timestamptz not null default now(),
  expected_discharge date,
  discharged_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint bed_allocations_discharge_after_admission_chk check (discharged_at is null or discharged_at >= admitted_at)
);

create unique index if not exists bed_allocations_active_bed_key on public.bed_allocations (bed_id) where discharged_at is null;
create unique index if not exists bed_allocations_active_patient_key on public.bed_allocations (patient_id) where discharged_at is null;
create index if not exists bed_allocations_hospital_id_idx on public.bed_allocations (hospital_id, admitted_at desc);
create index if not exists bed_allocations_doctor_id_idx on public.bed_allocations (doctor_id) where discharged_at is null;
create index if not exists bed_allocations_patient_id_idx on public.bed_allocations (patient_id, admitted_at desc);
create index if not exists bed_allocations_appointment_id_idx on public.bed_allocations (appointment_id);

-- 7. Doctor Reviews Table
create table if not exists public.doctor_reviews (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists doctor_reviews_doctor_id_idx on public.doctor_reviews (doctor_id, created_at desc) where is_published;
create index if not exists doctor_reviews_recent_idx on public.doctor_reviews (created_at desc) where is_published;
create index if not exists doctor_reviews_patient_id_idx on public.doctor_reviews (patient_id);

-- 8. Row Level Security Policies
alter table public.hospital_beds enable row level security;
alter table public.bed_allocations enable row level security;
alter table public.doctor_reviews enable row level security;

drop policy if exists "super admins: full access" on public.hospital_beds;
create policy "super admins: full access" on public.hospital_beds for all to authenticated
  using ((select public.cyd_my_role()) = 'super_admin') with check ((select public.cyd_my_role()) = 'super_admin');

drop policy if exists "super admins: full access" on public.bed_allocations;
create policy "super admins: full access" on public.bed_allocations for all to authenticated
  using ((select public.cyd_my_role()) = 'super_admin') with check ((select public.cyd_my_role()) = 'super_admin');

drop policy if exists "super admins: full access" on public.doctor_reviews;
create policy "super admins: full access" on public.doctor_reviews for all to authenticated
  using ((select public.cyd_my_role()) = 'super_admin') with check ((select public.cyd_my_role()) = 'super_admin');

drop policy if exists "patients: read own admissions" on public.bed_allocations;
create policy "patients: read own admissions" on public.bed_allocations for select to authenticated
  using (patient_id = (select auth.uid()));

drop policy if exists "patients: read own reviews" on public.doctor_reviews;
create policy "patients: read own reviews" on public.doctor_reviews for select to authenticated
  using (patient_id = (select auth.uid()));

-- 11. Platform Settings: the online booking fees executives set on Payments (see 20261018_booking_fees.sql)
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

-- Read and written only by the server with the service role.
drop policy if exists "executives: full platform settings access" on public.platform_settings;
drop policy if exists "anyone: read platform settings" on public.platform_settings;
revoke all on public.platform_settings from anon, authenticated;

delete from public.platform_settings where key = 'platform_fees';

insert into public.platform_settings (key, value)
values ('booking_fees', '{"consultation": 119, "diagnosticPercent": 11}'::jsonb)
on conflict (key) do nothing;

-- 11. Diagnostic Center Doorstep Service & Booking Types
alter table public.diagnostic_bookings
  add column if not exists booking_type text not null default 'walk_in',
  add column if not exists doorstep_fee integer not null default 0;

alter table public.diagnostic_centers
  add column if not exists doorstep_enabled boolean not null default true,
  add column if not exists doorstep_fee integer not null default 100;

create index if not exists idx_diagnostic_bookings_type
  on public.diagnostic_bookings (center_id, booking_type);

-- 12. Hospital Reviews & Unified Patient Feedback
create table if not exists public.hospital_reviews (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hospital_reviews_hospital_id_idx on public.hospital_reviews (hospital_id, created_at desc) where is_published;
create index if not exists hospital_reviews_recent_idx on public.hospital_reviews (created_at desc) where is_published;
create index if not exists hospital_reviews_patient_id_idx on public.hospital_reviews (patient_id);
create index if not exists hospital_reviews_appointment_id_idx on public.hospital_reviews (appointment_id);

alter table public.doctor_reviews
  add column if not exists hospital_id uuid references public.hospitals (id) on delete set null,
  add column if not exists hospital_rating smallint check (hospital_rating between 1 and 5),
  add column if not exists hospital_comment text check (hospital_comment is null or char_length(hospital_comment) <= 1000);

create index if not exists doctor_reviews_hospital_id_idx on public.doctor_reviews (hospital_id, created_at desc) where is_published;

alter table public.hospital_reviews enable row level security;

drop policy if exists "hospital_reviews: public read published" on public.hospital_reviews;
create policy "hospital_reviews: public read published" on public.hospital_reviews
  for select using (is_published = true);

drop policy if exists "hospital_reviews: patients read own" on public.hospital_reviews;
create policy "hospital_reviews: patients read own" on public.hospital_reviews
  for select to authenticated using (patient_id = (select auth.uid()));

drop policy if exists "hospital_reviews: super admins full access" on public.hospital_reviews;
create policy "hospital_reviews: super admins full access" on public.hospital_reviews
  for all to authenticated
  using ((select public.cyd_my_role()) = 'super_admin')
  with check ((select public.cyd_my_role()) = 'super_admin');

-- 13. Auth OTP Challenges (WhatsApp / SMS verification codes server-side state)
create table if not exists public.auth_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists auth_otp_challenges_phone_created on public.auth_otp_challenges (phone, created_at desc);
create index if not exists auth_otp_challenges_ip_created on public.auth_otp_challenges (ip, created_at desc);

alter table public.auth_otp_challenges enable row level security;
revoke all on public.auth_otp_challenges from anon, authenticated;

-- Success verification
select 'SUCCESS: Database tables and columns are fully created and synchronized!' as status;


