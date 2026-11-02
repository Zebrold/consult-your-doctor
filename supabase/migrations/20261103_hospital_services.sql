-- Services & charges (hospital portal, /hospital/settings/services).
--
-- A hospital's services are still named and priced in hospitals.available_tests (their order) and hospitals.test_prices
-- (name -> rupees), which every booking reads. This adds what the Services & charges page shows besides the price:
-- a short description, the department, the type (Test, Scan, Lab test, Procedure) and whether patients see it.
--
--   service_details: { "<service name>": { "description": text, "department": text, "type": text, "hidden": bool } }
--
-- A service with no entry is shown to patients, with no department or type. Hidden services stay on the hospital's own
-- list but are left off its public page and can't be picked when booking a doctor.
--
-- Safe to run more than once. The app works before it runs: the page then saves only names and prices.

alter table public.hospitals
  add column if not exists service_details jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hospitals_service_details_object') then
    alter table public.hospitals
      add constraint hospitals_service_details_object check (jsonb_typeof(service_details) = 'object');
  end if;
end $$;
