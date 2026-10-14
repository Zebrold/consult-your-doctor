import { ADVERSE_EVENTS, AI_REGULATORY_ASSESSMENT, AI_USE_POLICY, DIAGNOSTIC_CENTRE_CHECKS, FOLLOW_UP_PROTOCOL, MEDICINES_POLICY, PRESCRIPTION_POLICY, TELEMEDICINE_SOP } from './clinical'
import { ACCEPTABLE_USE_POLICY, BREACH_RESPONSE_PLAN, DPIA, PRIVACY_NOTICE, PROCESSING_RECORD, RETENTION_POLICY, SECURITY_POLICY, TRANSFER_POLICY } from './data-protection'
import { CODE_OF_CONDUCT, CONTINUITY_PLAN, DOCUMENT_REGISTER, POSH_POLICY } from './company'
import type { DocArea, PolicyDoc } from './types'

export * from './types'

/** The documents published at /legal, in the order of the Document Register (CYD-REG-00). */
export const PUBLIC_DOCS: PolicyDoc[] = [
  TELEMEDICINE_SOP,
  PRESCRIPTION_POLICY,
  ADVERSE_EVENTS,
  DIAGNOSTIC_CENTRE_CHECKS,
  AI_USE_POLICY,
  FOLLOW_UP_PROTOCOL,
  MEDICINES_POLICY,
  AI_REGULATORY_ASSESSMENT,
  PROCESSING_RECORD,
  DPIA,
  PRIVACY_NOTICE,
  RETENTION_POLICY,
  BREACH_RESPONSE_PLAN,
  TRANSFER_POLICY,
  SECURITY_POLICY,
  ACCEPTABLE_USE_POLICY,
  CODE_OF_CONDUCT,
  CONTINUITY_PLAN,
  POSH_POLICY,
  DOCUMENT_REGISTER,
]

export const publicDoc = (slug: string) => PUBLIC_DOCS.find((d) => d.slug === slug) ?? null

/** Public documents by number, so references such as "(CYD-DP-04)" in the text can link to them. */
export const PUBLIC_BY_NUMBER: Record<string, PolicyDoc> = Object.fromEntries(PUBLIC_DOCS.map((d) => [d.number, d]))

export const docHref = (doc: PolicyDoc) => `/legal/${doc.slug}`
export const pdfHref = (doc: PolicyDoc) => (doc.file ? `/legal/files/${doc.file}` : null)

export const AREA_ORDER: DocArea[] = ['clinical', 'data', 'security', 'internal']

/** The register itself is listed on its own on /legal, not inside a group. */
export const docsInArea = (area: DocArea) => PUBLIC_DOCS.filter((d) => d.area === area && d !== DOCUMENT_REGISTER)

export { DOCUMENT_REGISTER, PRIVACY_NOTICE, AI_USE_POLICY, TELEMEDICINE_SOP, RETENTION_POLICY, FOLLOW_UP_PROTOCOL }
