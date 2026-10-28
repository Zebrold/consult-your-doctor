-- The hospital page's "Appointment type" and "Choose services you need" on doctor bookings.
--
-- booking_type: 'general', or 'fast_track': seen ahead of general patients once checked in at the hospital. Fast track
-- has its own booking fee, which executives set on Payments next to the other booking fees (lib/booking-fees.ts).
-- services: the hospital services the patient ticked, as [{"name": "...", "price": 300}] at the hospital's prices when
-- booked. They are paid at the hospital counter with the consultation fee, never online.
--
-- Run in the Supabase SQL editor after the earlier migrations. Safe to run more than once.
-- Until this runs the hospital page doesn't offer either choice and every booking is general.
--
-- Patients have no update policy on appointments (bookings are written by the server), so a booking can't be switched
-- to fast track after its fee is paid.

begin;

alter table public.appointments
  add column if not exists booking_type text not null default 'general',
  add column if not exists services jsonb not null default '[]'::jsonb;

alter table public.appointments drop constraint if exists appointments_booking_type_check;
alter table public.appointments
  add constraint appointments_booking_type_check check (booking_type in ('general', 'fast_track'));

alter table public.appointments drop constraint if exists appointments_services_check;
alter table public.appointments
  add constraint appointments_services_check check (jsonb_typeof(services) = 'array');

commit;
