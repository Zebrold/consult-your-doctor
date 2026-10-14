-- Hospitals and diagnostic centres applying to join the network (/signup/hospital, /signup/diagnostic-centre).
-- Run in the Supabase SQL editor after the earlier migrations. Safe to run more than once.
--
-- The public forms submit through the server (app/actions/partnerSignup.ts) with the service role, and the executive
-- portal reviews them the same way, so the public REST API gets no access at all. Approving an application creates
-- the hospital or centre and its staff sign-in (app/actions/network.ts) and records which one it became.

begin;

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
  -- Clinical establishment registration or licence number.
  registration_number text,
  -- Everything else the form asks for (accreditation, beds, services, responsible professional, ...).
  details jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  -- The hospital or diagnostic centre created when the application was approved.
  organization_id uuid,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists partner_applications_queue_idx
  on public.partner_applications (kind, status, created_at desc);

-- One open application per organisation email and kind.
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

commit;
