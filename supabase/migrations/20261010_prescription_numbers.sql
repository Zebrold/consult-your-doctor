-- Prescription numbers: RX0000000001, RX0000000002, … printed (and as a barcode) on every prescription PDF and kept
-- with the prescription record, so a printed prescription can be looked up.
--
-- Run after 20261009_beds_reviews_profiles.sql, in the Supabase SQL editor. Safe to run more than once.

create sequence if not exists public.prescription_no_seq as bigint minvalue 1 start 1;

-- Hands out the next number. Only the server (service role) calls it.
create or replace function public.next_prescription_no()
returns text
language sql
volatile
security definer
set search_path = ''
as $$ select 'RX' || lpad(nextval('public.prescription_no_seq')::text, 10, '0') $$;

revoke execute on function public.next_prescription_no() from public, anon, authenticated;
grant execute on function public.next_prescription_no() to service_role;

alter table public.medical_records add column if not exists prescription_no text;
create unique index if not exists medical_records_prescription_no_key on public.medical_records (prescription_no) where prescription_no is not null;
