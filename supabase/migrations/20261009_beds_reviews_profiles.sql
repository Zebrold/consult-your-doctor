-- Inpatient beds and bed allocation, the hospital profile, doctors' education / insurance / registration, test charges
-- for hospitals, and patient reviews of doctors.
--
-- Run 20261008_desk_registration_reports.sql first (payments need it), then this file, in the Supabase SQL editor.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------------------------------------
-- Hospital profile
-- ---------------------------------------------------------------------------------------------------------

-- What the hospital's profile page edits and patients see on the hospital's public page. available_tests and
-- test_prices hold the hospital's own test charges, in the same shape diagnostic_centers uses.
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

alter table public.hospitals drop constraint if exists hospitals_established_year_chk;
alter table public.hospitals
  add constraint hospitals_established_year_chk check (established_year is null or established_year between 1800 and 2100);

-- ---------------------------------------------------------------------------------------------------------
-- Doctor profile
-- ---------------------------------------------------------------------------------------------------------

-- education: [{ "kind": "Degree" | "Residency" | "Fellowship" | ..., "title": "MBBS", "institution": "...", "year": "2012" }]
-- The registration number and council print on every prescription.
alter table public.doctors
  add column if not exists registration_number text,
  add column if not exists registration_council text,
  add column if not exists education jsonb not null default '[]'::jsonb,
  add column if not exists insurance_accepted text[] not null default '{}';

alter table public.doctors drop constraint if exists doctors_education_is_array_chk;
alter table public.doctors add constraint doctors_education_is_array_chk check (jsonb_typeof(education) = 'array');

-- ---------------------------------------------------------------------------------------------------------
-- Inpatient beds
-- ---------------------------------------------------------------------------------------------------------

-- A hospital's beds, by ward. Whether a bed is occupied comes from bed_allocations; status says whether a free bed
-- can take a patient (cleaning and maintenance beds can't).
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

-- Who is (or was) in a bed. An allocation without discharged_at is a current admission.
create table if not exists public.bed_allocations (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references public.hospital_beds (id) on delete cascade,
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  -- The attending doctor, who sees the admission in their portal.
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
-- One patient per bed, and one bed per patient, at a time.
create unique index if not exists bed_allocations_active_bed_key on public.bed_allocations (bed_id) where discharged_at is null;
create unique index if not exists bed_allocations_active_patient_key on public.bed_allocations (patient_id) where discharged_at is null;
create index if not exists bed_allocations_hospital_id_idx on public.bed_allocations (hospital_id, admitted_at desc);
create index if not exists bed_allocations_doctor_id_idx on public.bed_allocations (doctor_id) where discharged_at is null;
create index if not exists bed_allocations_patient_id_idx on public.bed_allocations (patient_id, admitted_at desc);
create index if not exists bed_allocations_appointment_id_idx on public.bed_allocations (appointment_id);
create index if not exists bed_allocations_created_by_idx on public.bed_allocations (created_by);

-- ---------------------------------------------------------------------------------------------------------
-- Patient reviews of doctors
-- ---------------------------------------------------------------------------------------------------------

-- One review per consultation, written by the patient after the visit. Published reviews show on the doctor's
-- profile and the home page (with the patient's first name only).
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

-- ---------------------------------------------------------------------------------------------------------
-- Row level security. The portals and pages read and write these through the server (service role) after checking
-- who is asking, so signed-in sessions only get what they need directly.
-- ---------------------------------------------------------------------------------------------------------

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
