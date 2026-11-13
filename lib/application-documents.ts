// The documents the join forms ask for (/signup/doctor, /signup/hospital, /signup/diagnostic-centre). Applicants upload
// them straight to the private partner-documents bucket with one-time signed links (app/actions/applicationUploads.ts),
// and the executive portal opens them with short-lived signed links. Plain data only, so client components can import it.

export const DOC_BUCKET = 'partner-documents'

/** Each file may be up to 5 MB (the bucket enforces the same limit). */
export const DOC_MAX_BYTES = 5 * 1024 * 1024

export type ApplicantKind = 'doctor' | 'hospital' | 'diagnostic_center'

/** What a field accepts: scans of documents, a photo, or a test menu. */
export type DocAccept = 'document' | 'photo' | 'menu'

export type ApplicationDoc = { key: string; label: string; hint: string; required: boolean; accept: DocAccept }

const SCAN = 'PDF, JPG or PNG'

export const APPLICATION_DOCS: Record<ApplicantKind, ApplicationDoc[]> = {
  doctor: [
    { key: 'photo', label: 'Profile photo', hint: 'A clear, recent photo for your doctor profile. JPG or PNG.', required: false, accept: 'photo' },
    { key: 'registrationCertificate', label: 'Medical registration certificate', hint: SCAN, required: true, accept: 'document' },
    { key: 'degreeCertificate', label: 'Degree certificate', hint: SCAN, required: true, accept: 'document' },
    { key: 'panCard', label: 'PAN card', hint: SCAN, required: true, accept: 'document' },
    { key: 'photoId', label: 'Government photo ID', hint: `Aadhaar, passport or driving licence. ${SCAN}.`, required: true, accept: 'document' },
  ],
  hospital: [
    { key: 'registrationCertificate', label: 'Registration certificate', hint: SCAN, required: true, accept: 'document' },
    { key: 'accreditationCertificate', label: 'Accreditation certificate', hint: SCAN, required: false, accept: 'document' },
    { key: 'bankProof', label: 'Cancelled cheque or bank letter', hint: SCAN, required: true, accept: 'document' },
  ],
  diagnostic_center: [
    { key: 'registrationCertificate', label: 'Registration certificate', hint: SCAN, required: true, accept: 'document' },
    { key: 'licenceCertificates', label: 'NABL, PCPNDT or AERB certificates', hint: SCAN, required: false, accept: 'document' },
    { key: 'testMenu', label: 'Test menu with prices', hint: 'Excel, CSV or PDF with test names and prices.', required: true, accept: 'menu' },
    { key: 'bankProof', label: 'Cancelled cheque or bank letter', hint: SCAN, required: true, accept: 'document' },
  ],
}

/** File extensions each field takes, with the content type the file is stored as. */
export const DOC_TYPES: Record<DocAccept, Record<string, string>> = {
  document: { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' },
  photo: { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' },
  menu: {
    pdf: 'application/pdf',
    csv: 'text/csv',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
}

/** The `accept` attribute for a field's file input. */
export const acceptAttr = (accept: DocAccept) => Object.keys(DOC_TYPES[accept]).map((ext) => `.${ext}`).join(',')

export const fileExtension = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

/** Why a chosen file can't be used, or null when it can. */
export function docFileProblem(accept: DocAccept, file: { name: string; size: number }): string | null {
  if (!DOC_TYPES[accept][fileExtension(file.name)]) {
    const kinds = Object.keys(DOC_TYPES[accept]).filter((e) => e !== 'jpeg').map((e) => e.toUpperCase())
    return `Choose a ${kinds.length > 1 ? `${kinds.slice(0, -1).join(', ')} or ${kinds[kinds.length - 1]}` : kinds[0]} file.`
  }
  if (file.size <= 0) return 'This file is empty.'
  if (file.size > DOC_MAX_BYTES) return 'Choose a file up to 5 MB.'
  return null
}

/** The label of a stored document, by its key. */
export function docLabel(kind: ApplicantKind, key: string) {
  return APPLICATION_DOCS[kind].find((d) => d.key === key)?.label ?? key
}
