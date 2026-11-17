-- Free welcome badge: every hospital and doctor gets the verified badge (blue tick) for their first 3 months, with
-- no payment. Stored as an ordinary active badge with plan 'welcome' and amount 0 (lib/badges.ts grantWelcomeBadge),
-- so the tick, the expiry reminders and renewing in the last 7 days all work as for a bought badge.
-- Run after 20261114_grow_and_manage.sql. Safe to run more than once.

begin;

-- 1. Allow the 'welcome' plan and a zero amount (bought badges still cost more than 0). The old checks were made
-- inline in 20261114, so they are found by what they say rather than by name.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.verified_badges'::regclass and contype = 'c'
      and (pg_get_constraintdef(oid) ilike '%plan%monthly%' or pg_get_constraintdef(oid) ilike '%amount >%')
  loop
    execute format('alter table public.verified_badges drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.verified_badges
  add constraint verified_badges_plan_check check (plan in ('monthly', 'yearly', 'welcome')),
  add constraint verified_badges_amount_check check (amount > 0 or (plan = 'welcome' and amount = 0));

-- 2. One welcome badge per doctor and per hospital, ever.
create unique index if not exists verified_badges_one_welcome_doctor on public.verified_badges (doctor_id) where plan = 'welcome' and subject = 'doctor';
create unique index if not exists verified_badges_one_welcome_hospital on public.verified_badges (hospital_id) where plan = 'welcome' and subject = 'hospital';

-- 3. Hospitals and doctors already on the platform without a badge get their 3 months from today.
insert into public.verified_badges (subject, hospital_id, plan, amount, status, paid_by, starts_at, ends_at, reviewed_at)
select 'hospital', h.id, 'welcome', 0, 'active', 'hospital', now(), now() + interval '3 months', now()
from public.hospitals h
where not exists (select 1 from public.verified_badges b where b.subject = 'hospital' and b.hospital_id = h.id);

insert into public.verified_badges (subject, doctor_id, plan, amount, status, paid_by, starts_at, ends_at, reviewed_at)
select 'doctor', d.id, 'welcome', 0, 'active', 'doctor', now(), now() + interval '3 months', now()
from public.doctors d
where not exists (select 1 from public.verified_badges b where b.subject = 'doctor' and b.doctor_id = d.id);

commit;
