-- Read-only security check. Paste into the Supabase SQL editor; it changes nothing.

-- 1. Tables the public API can reach WITHOUT row level security. Every row here is readable (and often writable)
--    by anyone with the site's public key. Expect: no rows.
select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;

-- 2. Policies that let signed-out visitors (anon) read or change data. Expect only the public catalogue
--    (hospitals, doctors, departments, diagnostic_centers, schedules) and doctor names on profiles.
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and 'anon' = any (roles)
order by tablename, policyname;

-- 3. Accounts that still hold the retired super admin role (see migrations/20261013_retire_super_admin.sql).
select id, full_name, email, staff_id from public.profiles where role = 'super_admin';

-- 4. Storage buckets anyone can read. Expect only "avatars" (photos); records, prescriptions and reports must be private.
select id, public from storage.buckets order by id;
