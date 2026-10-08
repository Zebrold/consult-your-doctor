import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Prescriptions, health documents and lab reports live in the private medical records bucket. A record's file_url
// holds the file's path in that bucket ('none' when there is no file); older rows hold the full public address the
// bucket had before it was made private. Either way the file is only handed out as a short-lived signed link.
export const RECORD_BUCKET = 'medical_records'
export const RECORD_MAX_BYTES = 5 * 1024 * 1024
export const RECORD_TYPES: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

const PUBLIC_MARKER = `/storage/v1/object/public/${RECORD_BUCKET}/`

/** The file's path in the bucket, or null when the record has no file of ours. */
export function recordPath(fileUrl: string | null | undefined): string | null {
  if (!fileUrl || fileUrl === 'none') return null
  const at = fileUrl.indexOf(PUBLIC_MARKER)
  if (at >= 0) return decodeURIComponent(fileUrl.slice(at + PUBLIC_MARKER.length).split('?')[0])
  return /^https?:\/\//i.test(fileUrl) ? null : fileUrl
}

/** Signed links (valid for an hour) for these records' files, keyed by the file_url value as stored. */
export async function signRecordFiles(admin: Admin, fileUrls: (string | null | undefined)[], expiresIn = 60 * 60): Promise<Record<string, string>> {
  const byPath = new Map<string, string>()
  for (const url of fileUrls) {
    const path = recordPath(url)
    if (url && path) byPath.set(path, url)
  }
  if (byPath.size === 0) return {}
  const { data } = await admin.storage.from(RECORD_BUCKET).createSignedUrls(Array.from(byPath.keys()), expiresIn)
  const links: Record<string, string> = {}
  for (const item of data ?? []) {
    const original = item.path ? byPath.get(item.path) : undefined
    if (original && item.signedUrl && !item.error) links[original] = item.signedUrl
  }
  return links
}

/** Replaces each record's file_url with a signed link (or 'none' when the file can't be signed). */
export async function withSignedFiles<T extends { file_url: string | null }>(admin: Admin, records: T[]): Promise<T[]> {
  const links = await signRecordFiles(admin, records.map((r) => r.file_url))
  return records.map((r) => ({ ...r, file_url: (r.file_url && links[r.file_url]) || 'none' }))
}

/** Uploads a file to the bucket and returns its path, for file_url. */
export async function storeRecordFile(admin: Admin, path: string, body: Blob | Uint8Array, contentType: string) {
  const { error } = await admin.storage.from(RECORD_BUCKET).upload(path, body, { upsert: true, contentType })
  if (error) throw error
  return path
}
