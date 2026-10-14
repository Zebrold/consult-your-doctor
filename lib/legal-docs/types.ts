// The Consult Your Doctor policy set (Document Register CYD-REG-00), as signed by the directors of Zebrold Private
// Limited. The text is copied from the signed PDFs in public/legal/files; when a document changes, the directors
// sign a new version and both the PDF and the text here are replaced together.
//
// Inline text may contain **bold** runs and blanks to fill in, written as three or more underscores (___).

export const LEGAL_COMPANY = {
  name: 'Zebrold Private Limited',
  cin: 'U26109TS2026PTC210471',
  operationalOffice: 'Bockenheimer Landstraße 17-19, Frankfurt am Main, 60325, Germany',
  registeredOffice: 'Plot N.13 Survey P64/2, Software Units Layout, Madhapur, Hyderabad, 500081, Telangana, India',
} as const

export const DOC_VERSION = '1.0'
export const DOC_EFFECTIVE = 'November 5, 2026'
export const DOC_EFFECTIVE_ISO = '2026-11-05'

export const DIRECTORS = ['Hemendrah Kumar Sadamsetty', 'Indu Reddy Morthala'] as const

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  /** Signature lines on a form: each entry is the role under the line, e.g. "Patient or guardian". */
  | { kind: 'sign'; roles: string[] }
  /** A template's signature block: the company's authorised signatory, and a line for the other side. */
  | { kind: 'signatory'; counterparty: string }

export type DocSection = { title: string; blocks: Block[] }

export type DocArea = 'clinical' | 'data' | 'security' | 'internal'

export type PolicyDoc = {
  number: string
  slug: string
  title: string
  subtitle: string
  area: DocArea
  /** Public documents are shown at /legal; internal ones (signing templates) only in the executive portal. */
  audience: 'public' | 'internal'
  /** The signed PDF in public/legal/files (public documents only). */
  file?: string
  /** "directors": approved and signed by both directors (shown at the end); "none": no approval block. */
  approval: 'directors' | 'none'
  sections: DocSection[]
}

export const AREA_LABELS: Record<DocArea, { title: string; description: string }> = {
  clinical: {
    title: 'Healthcare and clinical',
    description: 'How consultations, prescriptions, diagnostic reports and Zebrold AI follow-up are carried out and checked.',
  },
  data: {
    title: 'Data protection',
    description: 'What personal data we hold, why, for how long, and how we handle breaches and transfers between Germany and India.',
  },
  security: {
    title: 'Security',
    description: 'How patient and company information is protected, and the rules for using company systems and AI tools.',
  },
  internal: {
    title: 'Company and people',
    description: 'The standards of conduct, continuity planning and workplace protections that apply to everyone who works with us.',
  },
}

export const p = (text: string): Block => ({ kind: 'p', text })
export const ul = (...items: string[]): Block => ({ kind: 'ul', items })
export const ol = (...items: string[]): Block => ({ kind: 'ol', items })
export const table = (head: string[], ...rows: string[][]): Block => ({ kind: 'table', head, rows })
export const sign = (...roles: string[]): Block => ({ kind: 'sign', roles })
export const signatory = (counterparty: string): Block => ({ kind: 'signatory', counterparty })
export const sec = (title: string, ...blocks: Block[]): DocSection => ({ title, blocks })

/** An empty row of `n` cells, for registers and logs that are filled in by hand. */
export const blankRow = (n: number) => Array.from({ length: n }, () => '')
/** An unticked checkbox, as in the "Done" columns of checklists. */
export const BOX = '☐'

/** The section's id in the page, for the table of contents ("3. Retention schedule" → "retention-schedule"). */
export const sectionId = (title: string) =>
  title
    .toLowerCase()
    .replace(/^(part [a-z]\.|annexure \d+\.|annexure [a-z]\.|\d+\.)\s*/, (m) => m.replace(/[.\s]+/g, '-'))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
