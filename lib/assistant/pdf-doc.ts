import { z } from 'zod'

/** The content of a PDF Zebrold AI hands the visitor. The browser lays it out (components/assistant/pdf.ts). */
export const PdfDocSchema = z.object({
  title: z.string().trim().min(1).max(120).describe('Document title, e.g. "Orthopedic doctors in New Delhi"'),
  subtitle: z.string().trim().max(200).optional().describe('One line under the title'),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().max(120).optional(),
        paragraphs: z.array(z.string().max(2000)).max(12).optional(),
        bullets: z.array(z.string().max(500)).max(40).optional(),
        table: z
          .object({
            columns: z.array(z.string().max(60)).min(1).max(6),
            rows: z.array(z.array(z.string().max(200)).max(6)).max(80),
          })
          .optional()
          .describe('A simple table; every row has one cell per column'),
      }),
    )
    .min(1)
    .max(15),
})

export type PdfDoc = z.infer<typeof PdfDocSchema>

// Smaller models sometimes send nested lists as JSON text, or a doctor as an object where a sentence was asked for.
// Reshape what they send into the schema's shape (and within its limits) before validating it.
const parseMaybe = (v: unknown): unknown => {
  if (typeof v !== 'string' || !/^\s*[[{]/.test(v)) return v
  try {
    return JSON.parse(v)
  } catch {
    return v
  }
}
const label = (key: string) => key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
const asText = (v: unknown): string => {
  v = parseMaybe(v)
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(', ')
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x != null && x !== '')
      .map(([k, x]) => `${label(k)}: ${asText(x)}`)
      .join(' • ')
  }
  return String(v)
}
const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)
const list = (v: unknown, max: number, len: number) => {
  v = parseMaybe(v)
  if (v == null) return undefined
  const items = (Array.isArray(v) ? v : [v]).map(asText).filter(Boolean)
  return items.length ? items.slice(0, max).map((s) => cut(s, len)) : undefined
}

export function preparePdfArgs(raw: unknown): unknown {
  const doc = parseMaybe(raw)
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return doc
  const d = doc as Record<string, unknown>
  let sections = parseMaybe(d.sections)
  if (!Array.isArray(sections)) sections = sections && typeof sections === 'object' ? [sections] : typeof sections === 'string' && sections.trim() ? [{ paragraphs: [sections] }] : []
  return {
    title: cut(asText(d.title) || 'Zebrold AI', 120),
    subtitle: d.subtitle == null ? undefined : cut(asText(d.subtitle), 200) || undefined,
    sections: (sections as unknown[]).slice(0, 15).map((raw) => {
      const s = parseMaybe(raw)
      if (!s || typeof s !== 'object' || Array.isArray(s)) return { paragraphs: [cut(asText(s), 2000)] }
      const sec = s as Record<string, unknown>
      let table: PdfDoc['sections'][number]['table']
      const t = parseMaybe(sec.table)
      if (t && typeof t === 'object' && !Array.isArray(t)) {
        let columns = list((t as Record<string, unknown>).columns, 6, 60) ?? []
        const rowsRaw = parseMaybe((t as Record<string, unknown>).rows)
        const rows = (Array.isArray(rowsRaw) ? rowsRaw : []).slice(0, 80).map((r) => {
          r = parseMaybe(r)
          if (Array.isArray(r)) return r.map(asText)
          if (r && typeof r === 'object') {
            if (!columns.length) columns = Object.keys(r).slice(0, 6).map((k) => cut(label(k), 60))
            return Object.values(r).map(asText)
          }
          return [asText(r)]
        })
        if (columns.length) table = { columns, rows: rows.map((r) => r.slice(0, columns.length).map((c) => cut(c, 200))) }
      }
      return {
        heading: sec.heading == null ? undefined : cut(asText(sec.heading), 120) || undefined,
        paragraphs: list(sec.paragraphs, 12, 2000),
        bullets: list(sec.bullets, 40, 500),
        table,
      }
    }),
  }
}
