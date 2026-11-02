-- Hospital wallets, booking-fee snapshots and free follow-ups (2 Nov 2026). Run in the Supabase SQL editor after
-- 20261031_audit_fixes.sql. Safe to run more than once. Deploy the code first: it works without these columns and uses
-- them as soon as they exist.
--
-- The money model (lib/wallet.ts):
--   * Every hospital visit has two parts: the booking fee (Consult your Doctor's) and the hospital's charges (the
--     consultation fee and any services).
--   * Money that reaches Consult your Doctor's account (PayU online, or the desk's UPI scanner, which pays our UPI ID)
--     credits the hospital's share of it to the hospital's wallet.
--   * Cash the hospital keeps at its counter debits Consult your Doctor's share of it (the booking fee) from the wallet.
--     A hospital with nothing in its wallet goes negative: it then owes that amount.
--   * A hospital withdraws a positive balance to its bank account; an executive pays it and marks it paid.
-- The wallet is worked out from the payments themselves (the view below), so a refunded payment drops out of it.

begin;

-- ---------------------------------------------------------------------------------------------------------
-- 1. Appointments keep the booking fee they were booked at (so a later fee change can't change what is owed), and
--    a free follow-up points at the visit it follows. One free follow-up per visit.
-- ---------------------------------------------------------------------------------------------------------

alter table public.appointments add column if not exists booking_fee numeric(10, 2);
alter table public.appointments add column if not exists follow_up_of uuid references public.appointments (id) on delete set null;

alter table public.appointments drop constraint if exists appointments_booking_fee_chk;
alter table public.appointments add constraint appointments_booking_fee_chk check (booking_fee is null or booking_fee >= 0);

create unique index if not exists appointments_one_follow_up_per_visit
  on public.appointments (follow_up_of)
  where follow_up_of is not null and status <> 'cancelled';

-- The guard from 20261031 keeps a signed-in session from changing what a booking costs or who it is for; it now covers
-- the two new columns as well.
create or replace function public.cyd_guard_appointment_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.patient_id is distinct from old.patient_id
     or new.doctor_id is distinct from old.doctor_id
     or new.schedule_id is distinct from old.schedule_id
     or new.hospital_id is distinct from old.hospital_id
     or new.created_at is distinct from old.created_at
     or new.booking_type is distinct from old.booking_type
     or new.services is distinct from old.services
     or new.booking_fee is distinct from old.booking_fee
     or new.follow_up_of is distinct from old.follow_up_of then
    raise exception 'That booking detail can''t be changed from here.' using errcode = '42501';
  end if;
  if old.status = 'pending_payment' and new.status is distinct from old.status then
    raise exception 'An unpaid booking is confirmed by its payment, not by a status change.' using errcode = '42501';
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------------------------------------
-- 2. Payments say whose money they are: platform_share is Consult your Doctor's part (the booking fee), hospital_share
--    the hospital's (consultation fee and services). method is how it was paid ("UPI", "Credit card", "Cash"...).
--    Payments made before this have neither share and stay out of the wallet.
-- ---------------------------------------------------------------------------------------------------------

alter table public.payments add column if not exists platform_share numeric(10, 2);
alter table public.payments add column if not exists hospital_share numeric(10, 2);
alter table public.payments add column if not exists method text;

-- ---------------------------------------------------------------------------------------------------------
-- 3. Where a hospital's withdrawals are paid.
-- ---------------------------------------------------------------------------------------------------------

alter table public.hospitals add column if not exists payout_account_name text;
alter table public.hospitals add column if not exists payout_account_number text;
alter table public.hospitals add column if not exists payout_ifsc text;
alter table public.hospitals add column if not exists payout_upi_id text;

-- ---------------------------------------------------------------------------------------------------------
-- 4. Withdrawals. A requested withdrawal holds its amount until an executive pays or rejects it; a hospital has at most
--    one waiting at a time (which also stops two requests at once from both passing the balance check).
-- ---------------------------------------------------------------------------------------------------------

create table if not exists public.hospital_payouts (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'requested' check (status in ('requested', 'paid', 'rejected')),
  -- The bank account or UPI ID at the moment of the request, so a later change can't redirect it.
  account jsonb not null,
  requested_by uuid references public.profiles (id) on delete set null,
  processed_by uuid references public.profiles (id) on delete set null,
  reference text,
  note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists hospital_payouts_hospital_idx on public.hospital_payouts (hospital_id, created_at desc);
create unique index if not exists hospital_payouts_one_waiting
  on public.hospital_payouts (hospital_id)
  where status = 'requested';

-- ---------------------------------------------------------------------------------------------------------
-- 5. Adjustments an executive records by hand: a hospital paying what it owes (a credit), a correction (either way).
-- ---------------------------------------------------------------------------------------------------------

create table if not exists public.hospital_wallet_adjustments (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  amount numeric(10, 2) not null check (amount <> 0),
  note text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists hospital_wallet_adjustments_hospital_idx on public.hospital_wallet_adjustments (hospital_id, created_at desc);

alter table public.hospital_payouts enable row level security;
alter table public.hospital_wallet_adjustments enable row level security;
revoke all on public.hospital_payouts from anon, authenticated;
revoke all on public.hospital_wallet_adjustments from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- 6. The wallet: every line that moves a hospital's balance, and each hospital's balance. Only the server reads them.
-- ---------------------------------------------------------------------------------------------------------

create or replace view public.hospital_wallet_ledger
with (security_invoker = true) as
select
  p.hospital_id,
  p.id as entry_id,
  case when p.gateway = 'cash' then 'cash_booking_fee' else 'collection' end as kind,
  case when p.gateway = 'cash' then -coalesce(p.platform_share, 0) else coalesce(p.hospital_share, 0) end as amount,
  p.created_at,
  p.appointment_id,
  p.gateway,
  p.transaction_id as reference,
  null::text as status,
  null::text as note
from public.payments p
where p.status = 'success'
  and p.hospital_id is not null
  and (case when p.gateway = 'cash' then coalesce(p.platform_share, 0) else coalesce(p.hospital_share, 0) end) <> 0
union all
select a.hospital_id, a.id, 'adjustment', a.amount, a.created_at, null, null, null, null, a.note
from public.hospital_wallet_adjustments a
union all
select o.hospital_id, o.id, 'payout', -o.amount, o.created_at, null, null, o.reference, o.status, o.note
from public.hospital_payouts o
where o.status in ('requested', 'paid');

create or replace view public.hospital_wallet_balances
with (security_invoker = true) as
select
  hospital_id,
  sum(amount) as balance,
  sum(case when kind = 'payout' and status = 'requested' then -amount else 0 end) as waiting
from public.hospital_wallet_ledger
group by hospital_id;

revoke all on public.hospital_wallet_ledger from anon, authenticated;
revoke all on public.hospital_wallet_balances from anon, authenticated;

commit;
