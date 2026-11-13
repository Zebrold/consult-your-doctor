import { createAdminClient } from '@/lib/supabase/admin'
import { APPLICATION_DOCS, DOC_BUCKET, fileExtension, type ApplicantKind } from '@/lib/application-documents'

// Server side of the join forms' documents (lib/application-documents.ts). Files sit in the private partner-documents
// bucket at <kind>/<upload id>/<field>.<ext>; the upload id is random and only the applicant's browser knows it until
// the application is sent. The bucket is created by supabase/migrations/20261113_partner_documents.sql; until that
// runs, the forms say documents are sent by email instead (documentsReady).

type Admin = ReturnType<typeof createAdminClient>

let ready: { value: boolean; at: number } | null = null

/** Whether the documents bucket exists. Remembered for 5 minutes once it does, re-checked each minute until then. */
export async function documentsReady(admin: Admin = createAdminClient()): Promise<boolean> {
  if (ready && Date.now() - ready.at < (ready.value ? 5 * 60_000 : 60_000)) return ready.value
  const { data, error } = await admin.storage.getBucket(DOC_BUCKET)
  const value = !error && !!data
  ready = { value, at: Date.now() }
  return value
}

export const uploadFolder = (kind: ApplicantKind, uploadId: string) => `${kind}/${uploadId}`

/** The documents the applicant uploaded under this upload id, by field: { registrationCertificate: 'hospital/…/registrationCertificate.pdf' }. */
export async function collectDocuments(admin: Admin, kind: ApplicantKind, uploadId: string | null): Promise<Record<string, string>> {
  if (!uploadId || !/^[0-9a-f-]{36}$/i.test(uploadId)) return {}
  const folder = uploadFolder(kind, uploadId)
  const { data, error } = await admin.storage.from(DOC_BUCKET).list(folder, { limit: 50 })
  if (error || !data) return {}
  const keys = new Set(APPLICATION_DOCS[kind].map((d) => d.key))
  const found: Record<string, string> = {}
  for (const file of data) {
    const key = file.name.slice(0, -(fileExtension(file.name).length + 1))
    if (keys.has(key)) found[key] = `${folder}/${file.name}`
  }
  return found
}

/** Which required documents are missing from what was uploaded. */
export function missingDocuments(kind: ApplicantKind, documents: Record<string, string>) {
  return APPLICATION_DOCS[kind].filter((d) => d.required && !documents[d.key]).map((d) => d.label)
}

export type DocumentLink = { key: string; label: string; url: string | null }

/** Short-lived links to an application's documents, for the executive portal (10 minutes, like other private files). */
export async function signDocuments(admin: Admin, kind: ApplicantKind, documents: Record<string, string> | undefined | null): Promise<DocumentLink[]> {
  const entries = APPLICATION_DOCS[kind].filter((d) => documents?.[d.key])
  if (entries.length === 0) return []
  const paths = entries.map((d) => documents![d.key])
  const { data } = await admin.storage.from(DOC_BUCKET).createSignedUrls(paths, 60 * 10)
  return entries.map((d, i) => ({ key: d.key, label: d.label, url: data?.[i]?.signedUrl ?? null }))
}
