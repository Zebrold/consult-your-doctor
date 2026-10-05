-- Payments for diagnostic bookings could not be recorded: payments.appointment_id is a FK to
-- appointments(id), so inserting a diagnostic_bookings id there violated the constraint.
-- Give diagnostic payments their own FK column and add the created_at the app already reads.

alter table public.payments
  add column if not exists diagnostic_booking_id uuid
    references public.diagnostic_bookings (id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

-- A diagnostic payment has no appointment, so appointment_id can no longer be required
-- (it is NOT NULL today, which would make every diagnostic payment insert fail).
alter table public.payments
  alter column appointment_id drop not null;

-- A payment settles at most one booking.
alter table public.payments
  drop constraint if exists payments_single_booking_chk;
alter table public.payments
  add constraint payments_single_booking_chk
    check (num_nonnulls(appointment_id, diagnostic_booking_id) <= 1);

-- FK columns are used for lookups (patient payment history) and cascades; index them.
create index if not exists payments_appointment_id_idx on public.payments (appointment_id);
create index if not exists payments_diagnostic_booking_id_idx on public.payments (diagnostic_booking_id);

-- PayU may call the callback more than once for the same transaction; keep one row per gateway txn.
create unique index if not exists payments_gateway_transaction_id_key
  on public.payments (gateway, transaction_id)
  where transaction_id is not null;
