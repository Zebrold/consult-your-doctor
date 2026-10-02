import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Lab reports live in the medical records bucket, one file per booking, and are only ever handed out as
// short-lived signed links (to the lab that uploaded them and to the patient they belong to).
export const REPORT_BUCKET = 'medical_records'
export const REPORT_MAX_BYTES = 10 * 1024 * 1024
export const REPORT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export const reportPath = (centerId: string, bookingId: string) => `diagnostic-reports/${centerId}/${bookingId}`

/** Signed links (valid for an hour) to the reports that exist for these bookings, keyed by booking id. */
export async function signReportLinks(admin: Admin, bookings: { id: string; centerId: string }[]): Promise<Record<string, string>> {
  if (bookings.length === 0) return {}
  const { data } = await admin.storage.from(REPORT_BUCKET).createSignedUrls(
    bookings.map((b) => reportPath(b.centerId, b.id)),
    60 * 60,
  )
  const links: Record<string, string> = {}
  for (const item of data ?? []) {
    const bookingId = item.path?.split('/').pop()
    if (bookingId && item.signedUrl && !item.error) links[bookingId] = item.signedUrl
  }
  return links
}
