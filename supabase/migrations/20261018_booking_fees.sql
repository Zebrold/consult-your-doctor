-- The booking fees Consult Your Doctor charges online, which executives set on Payments (lib/booking-fees.ts):
-- a flat fee per doctor booking (₹119) and a share of the lab's test prices per lab booking (11%). The doctor's
-- consultation fee is paid at the hospital counter and lab tests at the lab, so neither is part of these fees.
-- Run in the Supabase SQL editor after the earlier migrations. Safe to run more than once.
--
-- Until this runs the site charges the standard fees above and the fee settings can't be saved.
--
-- The server reads and writes the settings with the service role (and checks the executive role itself), so the
-- public REST API gets no access: a direct write could otherwise skip the server's checks on the amounts.

begin;

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

drop policy if exists "executives: full platform settings access" on public.platform_settings;
drop policy if exists "anyone: read platform settings" on public.platform_settings;
revoke all on public.platform_settings from anon, authenticated;

-- The old flat platform fees (₹49 / ₹29 on top of the doctor's fee or the lab's prices) are no longer used.
delete from public.platform_settings where key = 'platform_fees';

insert into public.platform_settings (key, value)
values ('booking_fees', '{"consultation": 119, "diagnosticPercent": 11}'::jsonb)
on conflict (key) do nothing;

commit;
