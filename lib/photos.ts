// Profile photos (doctors, hospitals, labs) are uploaded to the public avatars bucket under a new name each time
// (<folder>/<id>-<timestamp>.<ext>), so a file never changes once written: browsers and the image optimiser can keep it
// for a year. Supabase's default is one hour.
export const PHOTO_CACHE = '31536000'
