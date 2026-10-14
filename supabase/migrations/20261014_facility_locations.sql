-- Map pins for hospitals and diagnostic centres, so patients see the doctors, hospitals and labs nearest to them.
--
-- Staff set the pin in their profile (Hospital portal -> Profile, Diagnostic portal -> Profile) with "Use my current
-- location", "Find from address", or by dragging it on the map. Doctors are shown at the hospital they work at.
-- Places without a pin are still listed, by city, after the ones with a distance.
--
-- Until this runs the site keeps working without distances; saving a profile reports that the pin needs this update.

alter table public.hospitals
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.diagnostic_centers
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- Only real coordinates, and both or neither.
alter table public.hospitals drop constraint if exists hospitals_location_valid;
alter table public.hospitals add constraint hospitals_location_valid check (
  (latitude is null and longitude is null)
  or (latitude between -90 and 90 and longitude between -180 and 180)
);

alter table public.diagnostic_centers drop constraint if exists diagnostic_centers_location_valid;
alter table public.diagnostic_centers add constraint diagnostic_centers_location_valid check (
  (latitude is null and longitude is null)
  or (latitude between -90 and 90 and longitude between -180 and 180)
);
