-- Sign-in codes (WhatsApp / SMS) are checked against this table, so each code allows only a few guesses, works once,
-- and the number of codes sent to a number or from one network is capped.
--
-- Why: the code used to be checked against a signed cookie alone. Nothing counted wrong guesses, so anyone could ask
-- for a code for someone else's number and try all 900,000 codes within the 10 minutes it is valid, and anyone could
-- make the site send unlimited (paid) messages to any number.
--
-- Until this table exists the site keeps working the old way (lib/otp-guard.ts logs a warning on every sign-in),
-- so run this soon after deploying.
--
-- Only the server reads or writes it (with the service role); RLS is on with no policies, so the public API can't.

create table if not exists public.auth_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists auth_otp_challenges_phone_created on public.auth_otp_challenges (phone, created_at desc);
create index if not exists auth_otp_challenges_ip_created on public.auth_otp_challenges (ip, created_at desc);

alter table public.auth_otp_challenges enable row level security;
revoke all on public.auth_otp_challenges from anon, authenticated;
