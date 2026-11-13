-- The join forms' documents and the doctor form's extra answers (/signup/doctor, /signup/hospital,
-- /signup/diagnostic-centre). Run in the Supabase SQL editor after the earlier migrations. Safe to run more than once.
--
-- partner-documents: a PRIVATE bucket for registration certificates, degree certificates, PAN cards, photo IDs, bank
-- letters and test menus. It has no storage policies on purpose: applicants upload with one-time signed links the
-- server hands out (app/actions/applicationUploads.ts), and the executive portal opens files with 10-minute signed
-- links. Until this runs, the forms say documents are sent by email instead.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-documents',
  'partner-documents',
  false,
  5242880,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Everything the doctor form asks for beyond the original columns (gender, languages, registration dates, timings,
-- profile text, PAN, documents, ...). Until this runs, the server packs them into qualifications instead.
alter table public.doctor_signup_requests
  add column if not exists details jsonb not null default '{}'::jsonb;

commit;
