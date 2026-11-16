-- Visitors (the public, signed-out key) could read every column of the profiles they can see, including doctors'
-- email addresses, phone numbers and staff IDs. Run in the Supabase SQL editor. Safe to run more than once, and safe
-- to run before 20261005_security_hardening.sql, which makes the same change among many others.
--
-- Public pages, Find and the search box only ever read a doctor's name (doctors -> profiles(full_name)), with the
-- profile id for the join. Signed-in users were narrowed the same way by 20261031_audit_fixes.sql. The server reads
-- anything else with the service role, which this doesn't touch.

begin;

revoke select on public.profiles from anon;
grant select (id, full_name, role) on public.profiles to anon;

commit;

-- Check afterwards (read-only): only id, full_name and role for anon.
--   select column_name from information_schema.column_privileges
--     where table_schema = 'public' and table_name = 'profiles' and grantee = 'anon' and privilege_type = 'SELECT';
