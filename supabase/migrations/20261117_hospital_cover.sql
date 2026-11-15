-- Hospital cover photo: the wide banner on the hospital's profile (/hospital/profile) and its patient page
-- (/hospitals/[id]). Uploaded by the hospital admin to the public avatars bucket (hospitals/covers/<id>-<time>.<ext>);
-- the square hospital photo (image_url) stays as the logo/thumbnail.
-- Safe to run more than once. Until it runs, the profile shows the plain blue banner and uploading a cover explains
-- that this update is needed.

alter table public.hospitals add column if not exists cover_url text;
