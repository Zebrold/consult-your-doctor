-- Patients' health insurance (profile, "Health insurance"): one policy per patient account, kept as a digital card.
--
-- Patients add, change and remove it from their profile (/patient/profile#insurance). The hospitals they book see it
-- on their patient list, so the insurance desk has it at the visit. Claims and cashless approval stay between the
-- hospital and the insurer; Consult your Doctor only keeps the details.
--
-- The app writes through the server (service role) after checking the signed-in patient. The policies below also let a
-- patient read and change only their own row with their own session. Safe to run more than once.

create table if not exists public.patient_insurance (
  patient_id uuid primary key references public.profiles(id) on delete cascade,
  insurer text not null check (char_length(insurer) between 2 and 120),
  policy_number text not null check (char_length(policy_number) between 3 and 60),
  holder_name text check (holder_name is null or char_length(holder_name) <= 120),
  member_id text check (member_id is null or char_length(member_id) <= 60),
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.patient_insurance enable row level security;
revoke all on public.patient_insurance from anon;

drop policy if exists "patients: read own insurance" on public.patient_insurance;
create policy "patients: read own insurance" on public.patient_insurance
  for select to authenticated using (patient_id = (select auth.uid()));

drop policy if exists "patients: add own insurance" on public.patient_insurance;
create policy "patients: add own insurance" on public.patient_insurance
  for insert to authenticated with check (patient_id = (select auth.uid()));

drop policy if exists "patients: change own insurance" on public.patient_insurance;
create policy "patients: change own insurance" on public.patient_insurance
  for update to authenticated
  using (patient_id = (select auth.uid()))
  with check (patient_id = (select auth.uid()));

drop policy if exists "patients: remove own insurance" on public.patient_insurance;
create policy "patients: remove own insurance" on public.patient_insurance
  for delete to authenticated using (patient_id = (select auth.uid()));
