-- Retire the super admin role. The executive portal now adds hospitals, diagnostic centres and doctor accounts, and
-- the /admin portal has been removed from the site.
--
-- Why this matters: the row level security policies from 20261005_security_hardening.sql (and later files) give any
-- profile with role = 'super_admin' full read and write access to every table through the public REST API. With no
-- portal left for that role, an account still holding it is only a risk. Once no profile has the role and the check
-- below stops it being set again, those policy clauses can never match, so they are left in place untouched.
--
-- The site already signs out any account whose role has no portal (see PORTAL_ROLES in proxy.ts).
--
-- Run in the Supabase SQL editor, one step at a time.

-- 1. See which accounts still have the role.
select p.id, p.full_name, p.email, p.staff_id, u.email as auth_email, u.last_sign_in_at
from public.profiles p
left join auth.users u on u.id = p.id
where p.role = 'super_admin';

-- 2. Decide what happens to each of them, then run ONE of these (they are commented out on purpose):
--
--    a) The person now works from the executive portal:
-- update public.profiles set role = 'executive' where role = 'super_admin';
--
--    b) The account is no longer needed (removes the sign-in; the profile is removed with it if it cascades):
-- delete from auth.users where id in (select id from public.profiles where role = 'super_admin');

-- 3. Stop the role from being given out again. NOT VALID adds the check for new writes straight away; VALIDATE
--    then confirms no existing row breaks it (it fails, harmlessly, until step 2 has been done).
alter table public.profiles
  add constraint profiles_role_not_super_admin check (role is distinct from 'super_admin') not valid;

alter table public.profiles validate constraint profiles_role_not_super_admin;
