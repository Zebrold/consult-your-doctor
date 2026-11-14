-- Executive workspace (2026-11-15): team page access and staff logins, support teams and partner enquiries, equipment
-- suppliers, stock, photos and cost, badge renewal reminders, monthly report emails, and doctors practising at more
-- than one hospital. Run in the Supabase SQL editor AFTER 20261113_partner_documents.sql and
-- 20261114_grow_and_manage.sql. Safe to run more than once.
--
-- Every table here is read and written only by the server with the service role (server actions and API routes check
-- who is asking first), so the public REST API gets no access. Until this runs, each feature says it is being set up
-- and the rest of the site works as before.

begin;

-- 1. Executive teams and page access ---------------------------------------------------------------------------------
-- An executive's team. Management sees every page and is the only team that can open Staff & access. Executives
-- without a team count as Management until one is set, so nobody is locked out by this migration.
alter table public.profiles add column if not exists executive_team text
  check (executive_team in ('management', 'operations', 'finance', 'support'));

-- The pages each of the other teams may open (Management always opens all of them).
create table if not exists public.executive_page_access (
  team text not null check (team in ('operations', 'finance', 'support')),
  page text not null,
  primary key (team, page)
);
insert into public.executive_page_access (team, page) values
  ('operations', 'payments'), ('operations', 'support'), ('operations', 'hospitals'), ('operations', 'doctors'),
  ('operations', 'diagnostics'), ('operations', 'patients'), ('operations', 'today'), ('operations', 'ai'),
  ('operations', 'badges'), ('operations', 'equipment'), ('operations', 'reviews'), ('operations', 'branches'),
  ('operations', 'leave'), ('operations', 'reports'),
  ('finance', 'payments'), ('finance', 'wallets'), ('finance', 'revenue'), ('finance', 'equipment'),
  ('finance', 'badges'), ('finance', 'reports'), ('finance', 'support'), ('finance', 'ai'),
  ('support', 'support'), ('support', 'patients'), ('support', 'today'), ('support', 'hospitals'),
  ('support', 'doctors'), ('support', 'reviews'), ('support', 'leave'), ('support', 'ai')
on conflict do nothing;

-- What changed in Staff & access, and new-device sign-ins, for the access log.
create table if not exists public.executive_access_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists executive_access_log_recent_idx on public.executive_access_log (created_at desc);

alter table public.executive_page_access enable row level security;
alter table public.executive_access_log enable row level security;
revoke all on public.executive_page_access from anon, authenticated;
revoke all on public.executive_access_log from anon, authenticated;

-- 2. Support: tickets handed to a team ----------------------------------------------------------------------------------
-- Internal notes are ticket_messages with sender_role 'internal'; the requester never sees them.
alter table public.tickets add column if not exists team text
  check (team in ('management', 'operations', 'finance', 'support'));
create index if not exists tickets_team_idx on public.tickets (team) where team is not null;

-- 3. Partner enquiries ---------------------------------------------------------------------------------------------------
-- "Talk to our team" on the Partner with us page. The team calls each one and can fill the application in for them.
create table if not exists public.partner_enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'hospital' check (kind in ('hospital', 'diagnostic_center')),
  organization_name text not null,
  city text not null,
  beds integer check (beds is null or beds between 0 and 100000),
  contact_name text not null,
  contact_role text,
  phone text not null,
  email text,
  message text,
  stage text not null default 'new' check (stage in ('new', 'called', 'interested', 'applied', 'not_interested')),
  notes text,
  last_called_at timestamptz,
  handled_by uuid references public.profiles (id) on delete set null,
  application_id uuid references public.partner_applications (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partner_enquiries_stage_idx on public.partner_enquiries (stage, created_at desc);
alter table public.partner_enquiries enable row level security;
revoke all on public.partner_enquiries from anon, authenticated;

-- 4. Equipment: suppliers, stock, photos, cost and delivery ratings -------------------------------------------------------
create table if not exists public.equipment_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  categories text,
  delivery_days text,
  phone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.equipment_suppliers enable row level security;
revoke all on public.equipment_suppliers from anon, authenticated;

-- stock: null means not tracked; 0 means out of stock. cost_price: what Consult your Doctor pays the supplier, so the
-- difference to the price is the commission. photos: public URLs in the equipment-photos bucket.
alter table public.equipment_products add column if not exists supplier_id uuid references public.equipment_suppliers (id) on delete set null;
alter table public.equipment_products add column if not exists stock integer check (stock is null or stock >= 0);
alter table public.equipment_products add column if not exists cost_price numeric(10, 2) check (cost_price is null or cost_price >= 0);
alter table public.equipment_products add column if not exists photos text[] not null default '{}';

-- What the order cost from suppliers (for the commission), and the hospital's rating of the delivery.
alter table public.equipment_orders add column if not exists cost_total numeric(12, 2);
alter table public.equipment_orders add column if not exists rating smallint check (rating is null or rating between 1 and 5);
alter table public.equipment_orders add column if not exists rating_note text;
alter table public.equipment_orders add column if not exists rated_at timestamptz;
alter table public.equipment_order_items add column if not exists supplier_id uuid references public.equipment_suppliers (id) on delete set null;

-- Takes a paid order's items out of stock (tracked products only, never below zero). Called once when it is paid.
create or replace function public.take_equipment_stock(p_order uuid) returns void
language sql security definer set search_path = public as $$
  update public.equipment_products p
     set stock = greatest(p.stock - i.quantity, 0)
    from public.equipment_order_items i
   where i.order_id = p_order and i.product_id = p.id and p.stock is not null;
$$;
revoke all on function public.take_equipment_stock(uuid) from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipment-photos', 'equipment-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 5. Badge renewal reminders ----------------------------------------------------------------------------------------------
alter table public.verified_badges add column if not exists reminded_at timestamptz;

-- 6. Monthly report emails ------------------------------------------------------------------------------------------------
create table if not exists public.report_subscriptions (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null,
  active boolean not null default true,
  last_sent_month text,
  created_at timestamptz not null default now()
);
alter table public.report_subscriptions enable row level security;
revoke all on public.report_subscriptions from anon, authenticated;

-- 7. Doctors practising at more than one hospital ------------------------------------------------------------------------
-- A hospital invites a doctor from another hospital; the doctor accepts; the Consult your Doctor team confirms. Then
-- the hospital can publish slots for that doctor at its own address. A slot's hospital_id (null = the doctor's own
-- hospital) decides where the booking is.
create table if not exists public.doctor_practices (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'confirmed', 'declined', 'rejected', 'ended')),
  note text,
  invited_by uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  reviewed_at timestamptz,
  unique (doctor_id, hospital_id)
);
create index if not exists doctor_practices_hospital_idx on public.doctor_practices (hospital_id, status);
alter table public.doctor_practices enable row level security;
revoke all on public.doctor_practices from anon, authenticated;

alter table public.schedules add column if not exists hospital_id uuid references public.hospitals (id) on delete set null;
create index if not exists schedules_hospital_idx on public.schedules (hospital_id) where hospital_id is not null;

commit;
