-- Walk-in booking by QR code (lib/walk-in.ts).
--
-- A hospital sets the hours it takes walk-ins (Hospital portal → Walk-in & QR). Its QR code opens its hospital page
-- with "Walk in now" ready: during those hours the patient picks a doctor, pays the booking fee online like any
-- booking, and joins the doctor's queue for today. Nothing changes for a hospital that never turns it on.
--
-- Run in the Supabase SQL editor. Safe to run more than once.

alter table public.hospitals
  add column if not exists walk_in_enabled boolean not null default false,
  -- India time, e.g. 09:00 and 17:00. The end is after the start (no walk-in hours past midnight).
  add column if not exists walk_in_start time,
  add column if not exists walk_in_end time,
  -- The weekdays walk-ins are taken: 0 = Sunday … 6 = Saturday.
  add column if not exists walk_in_days smallint[] not null default '{0,1,2,3,4,5,6}';

alter table public.hospitals drop constraint if exists hospitals_walk_in_hours_check;
alter table public.hospitals add constraint hospitals_walk_in_hours_check
  check (not walk_in_enabled or (walk_in_start is not null and walk_in_end is not null and walk_in_end > walk_in_start));

-- A visit booked as a walk-in (from the QR code), so the pass says "walk-in" instead of a report-by time.
alter table public.appointments
  add column if not exists is_walk_in boolean not null default false;

-- Make the new columns visible to the API straight away.
notify pgrst, 'reload schema';
