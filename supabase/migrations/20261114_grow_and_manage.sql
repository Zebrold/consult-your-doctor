-- Grow & manage (2026-11-14): hospital branches under one login, paid verified badges, equipment orders and doctors'
-- leave. Run in the Supabase SQL editor after the earlier migrations. Safe to run more than once.
--
-- Every table here is read and written only by the server with the service role (the portals' server actions and
-- API routes check who is asking first), so the public REST API gets no access at all. Until this runs, the new pages
-- say the feature is being set up and the rest of the site works as before.

begin;

-- 1. Accounts & branches -------------------------------------------------------------------------------------------
-- Which hospitals a hospital admin may switch between. profiles.hospital_id stays the hospital they are signed in
-- to; switching branch changes it (app/actions/branches.ts), so every page, action and policy keeps working as is.
create table if not exists public.hospital_admin_access (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (profile_id, hospital_id)
);
create index if not exists hospital_admin_access_hospital_idx on public.hospital_admin_access (hospital_id);

-- Every hospital admin can reach the hospital they already manage.
insert into public.hospital_admin_access (profile_id, hospital_id)
select id, hospital_id from public.profiles where role = 'hospital_admin' and hospital_id is not null
on conflict do nothing;

alter table public.hospital_admin_access enable row level security;
revoke all on public.hospital_admin_access from anon, authenticated;

-- 2. Verified badges -----------------------------------------------------------------------------------------------
-- One Razorpay payment can pay for several badges (a hospital verifying a few doctors at once).
create table if not exists public.badge_payments (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid references public.profiles (id) on delete set null,
  hospital_id uuid references public.hospitals (id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- A badge is bought, then checked by the Consult your Doctor team, and shows (the blue tick) only while active.
create table if not exists public.verified_badges (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (subject in ('doctor', 'hospital')),
  doctor_id uuid references public.doctors (id) on delete cascade,
  hospital_id uuid references public.hospitals (id) on delete cascade,
  plan text not null default 'monthly' check (plan in ('monthly', 'yearly')),
  amount numeric(10, 2) not null check (amount > 0),
  -- awaiting_payment: asked for (a doctor can ask their hospital to pay); in_review: paid, being checked;
  -- active: checked, shows from starts_at to ends_at; rejected: refunded from the Razorpay dashboard.
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment', 'in_review', 'active', 'rejected', 'cancelled')),
  paid_by text not null default 'doctor' check (paid_by in ('doctor', 'hospital')),
  requested_by uuid references public.profiles (id) on delete set null,
  payment_id uuid references public.badge_payments (id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  review_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((subject = 'doctor' and doctor_id is not null) or (subject = 'hospital' and hospital_id is not null))
);
create index if not exists verified_badges_doctor_idx on public.verified_badges (doctor_id, status);
create index if not exists verified_badges_hospital_idx on public.verified_badges (hospital_id, status);
create index if not exists verified_badges_review_idx on public.verified_badges (status, created_at);

alter table public.badge_payments enable row level security;
alter table public.verified_badges enable row level security;
revoke all on public.badge_payments from anon, authenticated;
revoke all on public.verified_badges from anon, authenticated;

-- 3. Order equipment -----------------------------------------------------------------------------------------------
-- The catalogue is kept by the Consult your Doctor team (/executive/equipment); hospitals order and pay online.
create table if not exists public.equipment_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  category text not null default 'other' check (category in ('devices', 'ppe', 'furniture', 'lab', 'other')),
  description text check (length(description) <= 300),
  unit text not null default 'per unit' check (length(unit) <= 40),
  price numeric(10, 2) not null check (price > 0),
  delivery_days text check (length(delivery_days) <= 60),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.equipment_order_no start 24001;

create table if not exists public.equipment_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('ORD-' || nextval('public.equipment_order_no')),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  placed_by uuid references public.profiles (id) on delete set null,
  -- awaiting_payment until Razorpay confirms; then placed → confirmed → shipped → delivered, or cancelled.
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment', 'placed', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  paid_at timestamptz,
  note text check (length(note) <= 500),
  team_note text check (length(team_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists equipment_orders_hospital_idx on public.equipment_orders (hospital_id, created_at desc);
create index if not exists equipment_orders_status_idx on public.equipment_orders (status, created_at desc);

create table if not exists public.equipment_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.equipment_orders (id) on delete cascade,
  product_id uuid references public.equipment_products (id) on delete set null,
  -- What it was called and cost when ordered, so later catalogue edits don't change past orders.
  name text not null,
  unit text not null,
  price numeric(10, 2) not null check (price > 0),
  quantity integer not null check (quantity between 1 and 1000)
);
create index if not exists equipment_order_items_order_idx on public.equipment_order_items (order_id);

alter table public.equipment_products enable row level security;
alter table public.equipment_orders enable row level security;
alter table public.equipment_order_items enable row level security;
revoke all on public.equipment_products from anon, authenticated;
revoke all on public.equipment_orders from anon, authenticated;
revoke all on public.equipment_order_items from anon, authenticated;

-- 4. Leave & availability ------------------------------------------------------------------------------------------
-- A doctor asks for leave; their hospital approves it, which closes the open slots on those days and tells the
-- patients already booked. booked_patients is what the doctor prefers the desk to do with those bookings.
create table if not exists public.doctor_leaves (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  hospital_id uuid references public.hospitals (id) on delete set null,
  starts_on date not null,
  ends_on date not null,
  reason text not null default 'personal' check (reason in ('vacation', 'conference', 'personal', 'unwell', 'other')),
  booked_patients text not null default 'same_doctor' check (booked_patients in ('same_doctor', 'other_doctor')),
  note text check (length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  slots_closed integer not null default 0,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  decline_reason text check (length(decline_reason) <= 300),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on - starts_on <= 60)
);
create index if not exists doctor_leaves_doctor_idx on public.doctor_leaves (doctor_id, starts_on);
create index if not exists doctor_leaves_hospital_idx on public.doctor_leaves (hospital_id, status, starts_on);

alter table public.doctor_leaves enable row level security;
revoke all on public.doctor_leaves from anon, authenticated;

commit;
