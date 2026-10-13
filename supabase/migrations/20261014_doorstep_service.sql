-- Migration: Add WalkIn / Doorstep support and Doorstep toggle to diagnostic bookings and centers

alter table public.diagnostic_bookings
  add column if not exists booking_type text not null default 'walk_in',
  add column if not exists doorstep_fee integer not null default 0;

alter table public.diagnostic_centers
  add column if not exists doorstep_enabled boolean not null default true,
  add column if not exists doorstep_fee integer not null default 100;

create index if not exists idx_diagnostic_bookings_type
  on public.diagnostic_bookings (center_id, booking_type);
