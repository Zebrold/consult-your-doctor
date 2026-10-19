-- =========================================================================================
-- CONSULT YOUR DOCTOR - IMMEDIATE DATABASE FIX
-- Run this in your Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard/project/roehneuuwtpsgcwitgzs/sql/new)
-- =========================================================================================

-- 1. Create platform_settings table for Online Booking Fees
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

drop policy if exists "executives: full platform settings access" on public.platform_settings;
drop policy if exists "anyone: read platform settings" on public.platform_settings;
revoke all on public.platform_settings from anon, authenticated;

-- Initialize default booking fees (₹119 for doctor consultations, 11% for diagnostic labs)
delete from public.platform_settings where key = 'platform_fees';

insert into public.platform_settings (key, value)
values ('booking_fees', '{"consultation": 119, "diagnosticPercent": 11}'::jsonb)
on conflict (key) do update
set value = excluded.value, updated_at = now();

-- 2. Add doorstep and booking type columns to diagnostic tables
alter table public.diagnostic_centers
  add column if not exists doorstep_enabled boolean not null default true,
  add column if not exists doorstep_fee integer not null default 100;

alter table public.diagnostic_bookings
  add column if not exists booking_type text not null default 'walk_in',
  add column if not exists doorstep_fee integer not null default 0;

create index if not exists idx_diagnostic_bookings_type
  on public.diagnostic_bookings (center_id, booking_type);

-- Notify schema cache reload
notify pgrst, 'reload schema';

select 'Database tables and columns have been successfully updated!' as status;
