-- Pre-launch audit fixes (16 Oct 2026). Run in the Supabase SQL editor after the earlier migrations. Safe to run more
-- than once. Nothing here changes what the site does through the server; it removes what the public REST API (the
-- publishable key plus a signed-in session) could do that the site never needed.

begin;

-- ---------------------------------------------------------------------------------------------------------
-- 1. One lookup for the sign-in account with an email or phone (lib/auth-users.ts). Without it the server pages
--    through every account on each Google or OTP sign-in. Only the server (service role) may call it.
-- ---------------------------------------------------------------------------------------------------------

create or replace function public.cyd_find_auth_user(p_email text default null, p_phone text default null)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where (p_email is not null and lower(u.email) = lower(p_email))
     or (p_phone is not null and u.phone = regexp_replace(p_phone, '\D', '', 'g'))
  order by u.created_at
  limit 1
$$;

revoke execute on function public.cyd_find_auth_user(text, text) from public, anon, authenticated;
grant execute on function public.cyd_find_auth_user(text, text) to service_role;

-- ---------------------------------------------------------------------------------------------------------
-- 2. Lab bookings: patients book through the server (app/actions/booking.ts), which checks the tests, date and
--    home-collection fee. A patient inserting their own row could set doorstep_fee to a negative amount, which the
--    payment page used to add to the price.
-- ---------------------------------------------------------------------------------------------------------

drop policy if exists "patients: create own lab bookings" on public.diagnostic_bookings;

alter table public.diagnostic_bookings drop constraint if exists diagnostic_bookings_doorstep_fee_chk;
alter table public.diagnostic_bookings
  add constraint diagnostic_bookings_doorstep_fee_chk check (doorstep_fee >= 0) not valid;
alter table public.diagnostic_bookings validate constraint diagnostic_bookings_doorstep_fee_chk;

alter table public.diagnostic_bookings drop constraint if exists diagnostic_bookings_booking_type_chk;
alter table public.diagnostic_bookings
  add constraint diagnostic_bookings_booking_type_chk check (booking_type in ('walk_in', 'doorstep')) not valid;
alter table public.diagnostic_bookings validate constraint diagnostic_bookings_booking_type_chk;

alter table public.diagnostic_centers drop constraint if exists diagnostic_centers_doorstep_fee_chk;
alter table public.diagnostic_centers
  add constraint diagnostic_centers_doorstep_fee_chk check (doorstep_fee >= 0) not valid;
alter table public.diagnostic_centers validate constraint diagnostic_centers_doorstep_fee_chk;

-- ---------------------------------------------------------------------------------------------------------
-- 3. Hospital reviews: written by the server after it checks the patient had a visit there (app/actions/reviews.ts)
--    and read by the server (lib/reviews.ts). The insert/update policies let any signed-in user post a review for
--    any hospital and appointment, and the public read policy exposed patient and appointment ids to anyone.
-- ---------------------------------------------------------------------------------------------------------

drop policy if exists "hospital_reviews: patients insert own" on public.hospital_reviews;
drop policy if exists "hospital_reviews: patients update own" on public.hospital_reviews;
drop policy if exists "hospital_reviews: public read published" on public.hospital_reviews;

-- ---------------------------------------------------------------------------------------------------------
-- 4. Support tickets: raised and answered through the server (app/actions/tickets.ts). The insert policies let a
--    signed-in user create tickets with any status, priority or assignee, and post into their thread as anyone.
-- ---------------------------------------------------------------------------------------------------------

drop policy if exists "users: insert own tickets" on public.tickets;
drop policy if exists "users: reply to own tickets" on public.ticket_messages;

commit;

-- Check afterwards (read-only): every public table has RLS, and only the catalogue is open to signed-out visitors.
--   select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;          -- expect no rows
--   select tablename, policyname, cmd from pg_policies where schemaname = 'public' and 'anon' = any (roles);
