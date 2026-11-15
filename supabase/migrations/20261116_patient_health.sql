-- Patient "My health" pages (2026-11-16): medical details, emergency contacts, family members (and booking for them),
-- records the patient uploads, medicine reminders from prescriptions, insurance policy details and a claim tracker,
-- and tags on reviews. Run in the Supabase SQL editor after 20261103_patient_insurance.sql. Safe to run more than once.
--
-- Every new table is read and written only by the server with the service role (server actions check the signed-in
-- patient first), so the public REST API gets no access to them. Until this runs, each page says the feature is being
-- set up and the rest of the site works as before.

begin;

-- 1. Medical details and meal times on the patient's own details -----------------------------------------------------
alter table public.patient_details add column if not exists allergies text check (allergies is null or char_length(allergies) <= 300);
alter table public.patient_details add column if not exists conditions text check (conditions is null or char_length(conditions) <= 300);
alter table public.patient_details add column if not exists current_medicines text check (current_medicines is null or char_length(current_medicines) <= 300);
alter table public.patient_details add column if not exists height_cm numeric(5, 1) check (height_cm is null or height_cm between 30 and 260);
-- Meal times in minutes after midnight (IST); medicine reminders before or after food follow them.
alter table public.patient_details add column if not exists breakfast_at smallint check (breakfast_at is null or breakfast_at between 0 and 1439);
alter table public.patient_details add column if not exists lunch_at smallint check (lunch_at is null or lunch_at between 0 and 1439);
alter table public.patient_details add column if not exists dinner_at smallint check (dinner_at is null or dinner_at between 0 and 1439);

-- 2. Emergency contacts (beyond the one on the patient's details) -------------------------------------------------------
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  relation text check (relation is null or char_length(relation) <= 40),
  phone text not null check (char_length(phone) between 8 and 20),
  created_at timestamptz not null default now()
);
create index if not exists emergency_contacts_patient_idx on public.emergency_contacts (patient_id);
alter table public.emergency_contacts enable row level security;
revoke all on public.emergency_contacts from anon, authenticated;

-- 3. Family members, and bookings made for them -----------------------------------------------------------------------
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  relation text not null check (relation in ('spouse', 'child', 'parent', 'sibling', 'other')),
  date_of_birth date,
  gender text check (gender is null or gender in ('Male', 'Female', 'Other')),
  blood_group text check (blood_group is null or char_length(blood_group) <= 5),
  phone text check (phone is null or char_length(phone) <= 20),
  allergies text check (allergies is null or char_length(allergies) <= 300),
  conditions text check (conditions is null or char_length(conditions) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists family_members_patient_idx on public.family_members (patient_id);
alter table public.family_members enable row level security;
revoke all on public.family_members from anon, authenticated;

-- A booking made from the account for a family member names them; the account holder still pays and gets the slip.
alter table public.appointments add column if not exists family_member_id uuid references public.family_members(id) on delete set null;
alter table public.diagnostic_bookings add column if not exists family_member_id uuid references public.family_members(id) on delete set null;

-- 4. Records the patient uploads (old prescriptions, reports, scans, vaccination cards) ---------------------------------
-- Files are kept in the private medical_records bucket under patient-uploads/<patient id>/ and handed out only as
-- short-lived signed links to the patient. Doctors, hospitals and labs do not see them.
create table if not exists public.patient_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete set null,
  title text not null check (char_length(title) between 2 and 120),
  record_type text not null check (record_type in ('prescription', 'lab_report', 'scan', 'vaccination', 'other')),
  record_date date,
  provider text check (provider is null or char_length(provider) <= 120),
  file_path text not null,
  file_type text,
  created_at timestamptz not null default now()
);
create index if not exists patient_records_patient_idx on public.patient_records (patient_id, record_date desc);
alter table public.patient_records enable row level security;
revoke all on public.patient_records from anon, authenticated;

-- 5. Medicines from prescriptions, and the doses marked as taken -------------------------------------------------------
-- The prescription writer keeps the structured medicines beside the notes, so reminders follow the doctor's timing.
alter table public.medical_records add column if not exists medicines jsonb;

create table if not exists public.medicine_doses (
  patient_id uuid not null references public.profiles(id) on delete cascade,
  -- "<medical record id>:<medicine index>:<morning|afternoon|night|once>"
  dose_key text not null check (char_length(dose_key) <= 80),
  dose_date date not null,
  taken_at timestamptz not null default now(),
  primary key (patient_id, dose_key, dose_date)
);
alter table public.medicine_doses enable row level security;
revoke all on public.medicine_doses from anon, authenticated;

-- 6. Insurance policy details and the patient's own claim tracker -------------------------------------------------------
alter table public.patient_insurance add column if not exists plan_type text
  check (plan_type is null or plan_type in ('individual', 'family_floater', 'group', 'government'));
alter table public.patient_insurance add column if not exists sum_insured numeric(12, 2) check (sum_insured is null or sum_insured >= 0);
alter table public.patient_insurance add column if not exists tpa_name text check (tpa_name is null or char_length(tpa_name) <= 120);
alter table public.patient_insurance add column if not exists tpa_phone text check (tpa_phone is null or char_length(tpa_phone) <= 20);
alter table public.patient_insurance add column if not exists room_rent text check (room_rent is null or char_length(room_rent) <= 80);
alter table public.patient_insurance add column if not exists co_payment text check (co_payment is null or char_length(co_payment) <= 80);
alter table public.patient_insurance add column if not exists covered_member_ids uuid[] not null default '{}';

-- Claims the patient files with their insurer or TPA and keeps track of here. Consult your Doctor does not file or
-- settle claims; the documents are kept privately for the patient.
create table if not exists public.insurance_claims (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  claim_type text not null check (claim_type in ('cashless', 'reimbursement')),
  claim_number text check (claim_number is null or char_length(claim_number) <= 60),
  hospital_name text not null check (char_length(hospital_name) between 2 and 120),
  treated_on date,
  amount numeric(12, 2) check (amount is null or amount >= 0),
  status text not null default 'preparing'
    check (status in ('preparing', 'submitted', 'in_review', 'documents_needed', 'approved', 'settled', 'rejected')),
  settled_amount numeric(12, 2) check (settled_amount is null or settled_amount >= 0),
  -- [{ "name": "Discharge summary", "path": "claims/<patient>/<claim>/<file>" }]
  documents jsonb not null default '[]',
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists insurance_claims_patient_idx on public.insurance_claims (patient_id, created_at desc);
alter table public.insurance_claims enable row level security;
revoke all on public.insurance_claims from anon, authenticated;

-- 7. What stood out, on reviews ---------------------------------------------------------------------------------------
alter table public.doctor_reviews add column if not exists tags text[] not null default '{}';

commit;
