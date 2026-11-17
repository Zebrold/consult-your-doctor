-- When each hospital was added, for "New hospitals and branches" on the executive Reports page and in the
-- monthly report email. Safe to run any time and more than once; existing hospitals get the time it runs.
alter table public.hospitals add column if not exists created_at timestamptz not null default now();
