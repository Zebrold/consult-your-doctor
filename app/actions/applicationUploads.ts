'use server'

import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { clientIp } from '@/lib/otp-guard'
import { overLimit } from '@/lib/rate-limit'
import { APPLICATION_DOCS, DOC_BUCKET, DOC_TYPES, docFileProblem, fileExtension, type ApplicantKind } from '@/lib/application-documents'
import { documentsReady, uploadFolder } from '@/lib/application-uploads'

// Applicants aren't signed in, so their browser can't write to storage itself. This hands out one-time signed upload
// links, one per document, all under a fresh random folder; the form then sends that folder's id with the application.

type Upload = { key: string; path: string; token: string; contentType: string }
type Result = { ok: true; uploadId: string; uploads: Upload[] } | { ok: false; error: string }

const KINDS: ApplicantKind[] = ['doctor', 'hospital', 'diagnostic_center']

export async function startDocumentUploads(kind: ApplicantKind, files: { key: string; name: string; size: number }[]): Promise<Result> {
  if (!KINDS.includes(kind) || !Array.isArray(files) || files.length === 0) return { ok: false, error: 'Choose the documents to upload.' }
  const fields = APPLICATION_DOCS[kind]
  const seen = new Set<string>()
  for (const file of files) {
    const field = fields.find((f) => f.key === file?.key)
    if (!field || seen.has(field.key) || typeof file.name !== 'string' || typeof file.size !== 'number') {
      return { ok: false, error: 'One of the documents could not be read. Please choose it again.' }
    }
    seen.add(field.key)
    const problem = docFileProblem(field.accept, file)
    if (problem) return { ok: false, error: `${field.label}: ${problem}` }
  }

  // Each set of links lets a visitor store up to a few files; limit how many sets one network can ask for.
  if (await overLimit(`application-uploads:${(await clientIp()) ?? 'unknown'}`, 12, 60 * 60_000)) {
    return { ok: false, error: 'Several applications have been started from this network. Please try again in an hour.' }
  }

  const admin = createAdminClient()
  if (!(await documentsReady(admin))) return { ok: false, error: 'Document upload is not available right now. Please send your application and email the documents to our team.' }

  const uploadId = randomUUID()
  const uploads: Upload[] = []
  for (const file of files) {
    const field = fields.find((f) => f.key === file.key)!
    const ext = fileExtension(file.name)
    const path = `${uploadFolder(kind, uploadId)}/${field.key}.${ext}`
    const { data, error } = await admin.storage.from(DOC_BUCKET).createSignedUploadUrl(path)
    if (error || !data) {
      console.error('startDocumentUploads:', error)
      return { ok: false, error: 'We could not prepare the upload. Please try again.' }
    }
    uploads.push({ key: field.key, path: data.path, token: data.token, contentType: DOC_TYPES[field.accept][ext] })
  }
  return { ok: true, uploadId, uploads }
}
