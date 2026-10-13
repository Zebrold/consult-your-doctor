-- 20261015_hospital_reviews_and_doorstep.sql
-- Adds hospital_reviews table, extends doctor_reviews with hospital feedback,
-- and ensures doorstep columns on diagnostic_bookings and diagnostic_centers.

-- 1. Hospital Reviews Table
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

-- 2. Extend doctor_reviews with optional hospital review columns for convenient unified retrieval
alter table public.doctor_reviews
  add column if not exists hospital_id uuid references public.hospitals (id) on delete set null,
  add column if not exists hospital_rating smallint check (hospital_rating between 1 and 5),
  add column if not exists hospital_comment text check (hospital_comment is null or char_length(hospital_comment) <= 1000);

create index if not exists doctor_reviews_hospital_id_idx on public.doctor_reviews (hospital_id, created_at desc) where is_published;

-- 3. Row Level Security for hospital_reviews
alter table public.hospital_reviews enable row level security;

drop policy if exists "hospital_reviews: public read published" on public.hospital_reviews;
create policy "hospital_reviews: public read published" on public.hospital_reviews
  for select using (is_published = true);

drop policy if exists "hospital_reviews: patients read own" on public.hospital_reviews;
create policy "hospital_reviews: patients read own" on public.hospital_reviews
  for select to authenticated using (patient_id = (select auth.uid()));

drop policy if exists "hospital_reviews: patients insert own" on public.hospital_reviews;
create policy "hospital_reviews: patients insert own" on public.hospital_reviews
  for insert to authenticated with check (patient_id = (select auth.uid()));

drop policy if exists "hospital_reviews: patients update own" on public.hospital_reviews;
create policy "hospital_reviews: patients update own" on public.hospital_reviews
  for update to authenticated using (patient_id = (select auth.uid()));

drop policy if exists "hospital_reviews: super admins full access" on public.hospital_reviews;
create policy "hospital_reviews: super admins full access" on public.hospital_reviews
  for all to authenticated
  using ((select public.cyd_my_role()) = 'super_admin')
  with check ((select public.cyd_my_role()) = 'super_admin');
