-- =========================================================================================
-- CONSULT YOUR DOCTOR - COMPLETE DATABASE SYNC & FIX
-- Run this in your Supabase Dashboard -> SQL Editor:
-- https://supabase.com/dashboard/project/roehneuuwtpsgcwitgzs/sql/new
-- Safe to run multiple times.
-- =========================================================================================

-- 1. Helper function for RLS checks if not already created
create or replace function public.cyd_my_role()
returns text
language sql stable security definer
set search_path = ''
as $$ select role from public.profiles where id = auth.uid() $$;

grant execute on function public.cyd_my_role() to authenticated;

-- 2. Partner Applications (/signup/hospital and /signup/diagnostic-centre)
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('hospital', 'diagnostic_center')),
  organization_name text not null,
  city text not null,
  address text,
  contact_name text not null,
  contact_role text,
  email text not null,
  phone text not null,
  registration_number text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  organization_id uuid,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists partner_applications_queue_idx
  on public.partner_applications (kind, status, created_at desc);

create unique index if not exists partner_applications_one_pending_idx
  on public.partner_applications (kind, lower(email))
  where status = 'pending';

alter table public.partner_applications enable row level security;
revoke all on public.partner_applications from anon, authenticated;

drop policy if exists "executives: read partner applications" on public.partner_applications;
create policy "executives: read partner applications" on public.partner_applications
  for select to authenticated
  using ((select public.cyd_my_role()) = 'executive');

grant select on public.partner_applications to authenticated;

-- 3. Online Booking Fees (platform_settings)
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;
drop policy if exists "executives: full platform settings access" on public.platform_settings;
drop policy if exists "anyone: read platform settings" on public.platform_settings;
revoke all on public.platform_settings from anon, authenticated;

delete from public.platform_settings where key = 'platform_fees';

insert into public.platform_settings (key, value)
values ('booking_fees', '{"consultation": 119, "diagnosticPercent": 11}'::jsonb)
on conflict (key) do update
set value = excluded.value, updated_at = now();

-- 4. Diagnostic Doorstep Columns
alter table public.diagnostic_centers
  add column if not exists doorstep_enabled boolean not null default true,
  add column if not exists doorstep_fee integer not null default 100;

alter table public.diagnostic_bookings
  add column if not exists booking_type text not null default 'walk_in',
  add column if not exists doorstep_fee integer not null default 0;

create index if not exists idx_diagnostic_bookings_type
  on public.diagnostic_bookings (center_id, booking_type);

-- 5. Hospital Reviews & Extended Doctor Reviews (Patient Feedback)
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

-- 6. Reload Supabase Schema Cache
notify pgrst, 'reload schema';

select 'SUCCESS: All tables (partner_applications, hospital_reviews, platform_settings, doorstep) are fully synchronized!' as result;
