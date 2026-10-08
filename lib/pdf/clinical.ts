import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

// Server-side PDFs for prescriptions and diagnostic reports. Noto Sans (in public/fonts) covers English and the ₹ sign.

const PAGE: [number, number] = [595.28, 841.89] // A4 in points
const MARGIN = 44
const WIDTH = PAGE[0] - MARGIN * 2
const FOOTER = 54

const C = {
  primary: rgb(0, 0.4, 1),
  ink: rgb(0.059, 0.09, 0.165),
  muted: rgb(0.278, 0.333, 0.412),
  line: rgb(0.851, 0.871, 0.918),
  panel: rgb(0.957, 0.965, 0.992),
  head: rgb(0.906, 0.929, 1),
  zebra: rgb(0.98, 0.984, 0.992),
  high: rgb(0.78, 0.16, 0.24),
  white: rgb(1, 1, 1),
}

export type Pair = [label: string, value: string | null | undefined]

export type ClinicalDoc = {
  /** "PRESCRIPTION", "DIAGNOSTIC REPORT", … */
  title: string
  /** Reference shown under the title, e.g. the booking ID. */
  reference: string
  issuedAt: Date
  /** The hospital or lab issuing it. */
  organisation: { name: string; lines: (string | null | undefined)[] }
  /** Side-by-side panels, e.g. Patient and Doctor. */
  panels: { title: string; rows: Pair[] }[]
  vitals?: { label: string; value: string }[]
  table?: { title: string; columns: string[]; widths: number[]; rows: string[][]; flagColumn?: number }
  sections: { heading: string; body: string | null | undefined }[]
  signature?: { name: string; lines: (string | null | undefined)[] }
  /** Small print at the bottom of every page. */
  note: string
}

let assets: Promise<{ regular: Uint8Array; bold: Uint8Array; logo: Uint8Array }> | null = null
function loadAssets() {
  const pub = (...p: string[]) => path.join(process.cwd(), 'public', ...p)
  assets ??= Promise.all([readFile(pub('fonts', 'NotoSans-Regular.ttf')), readFile(pub('fonts', 'NotoSans-Bold.ttf')), readFile(pub('logo-icon.png'))])
    .then(([regular, bold, logo]) => ({ regular, bold, logo }))
    .catch((err) => {
      assets = null
      throw err
    })
  return assets
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = []
  for (const para of text.replace(/\r/g, '').split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next
        continue
      }
      if (line) lines.push(line)
      let rest = word
      while (font.widthOfTextAtSize(rest, size) > width) {
        let cut = rest.length - 1
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--
        lines.push(rest.slice(0, cut))
        rest = rest.slice(cut)
      }
      line = rest
    }
    lines.push(line)
  }
  return lines
}

const dateText = (d: Date) => d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })
const timeText = (d: Date) => d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })
// Strip characters the font can't draw (control characters) so a stray paste can't break the PDF.
const safe = (s: string | null | undefined) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim()

export async function renderClinicalPdf(doc: ClinicalDoc): Promise<Uint8Array> {
  const { regular, bold, logo } = await loadAssets()
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle(`${doc.title} ${doc.reference}`)
  pdf.setAuthor(doc.organisation.name)
  pdf.setCreator('Consult Your Doctor')
  const font = await pdf.embedFont(regular, { subset: true })
  const fontBold = await pdf.embedFont(bold, { subset: true })
  const logoImage = await pdf.embedPng(logo)

  let page: PDFPage = pdf.addPage(PAGE)
  let y = 0

  const text = (s: string, x: number, at: number, size: number, opts: { bold?: boolean; color?: ReturnType<typeof rgb> } = {}) =>
    page.drawText(s, { x, y: at, size, font: opts.bold ? fontBold : font, color: opts.color ?? C.ink })

  const header = () => {
    const top = PAGE[1] - MARGIN
    drawLogo(page, logoImage, MARGIN, top - 30, 30)
    text('Consult Your Doctor', MARGIN + 38, top - 14, 15, { bold: true, color: C.primary })
    text('consultyourdoctor.de', MARGIN + 38, top - 28, 8.5, { color: C.muted })
    // The issuing hospital or lab, right-aligned.
    const right = PAGE[0] - MARGIN
    const org = safe(doc.organisation.name)
    page.drawText(org, { x: right - fontBold.widthOfTextAtSize(org, 11), y: top - 12, size: 11, font: fontBold, color: C.ink })
    let ly = top - 25
    for (const raw of doc.organisation.lines) {
      const line = safe(raw)
      if (!line) continue
      for (const l of wrap(line, font, 8.5, 230)) {
        page.drawText(l, { x: right - font.widthOfTextAtSize(l, 8.5), y: ly, size: 8.5, font, color: C.muted })
        ly -= 11
      }
    }
    const bottom = Math.min(top - 40, ly - 2)
    page.drawRectangle({ x: MARGIN, y: bottom, width: WIDTH, height: 1.5, color: C.primary })
    y = bottom - 22
  }

  const ensure = (space: number) => {
    if (y - space >= FOOTER + 10) return
    page = pdf.addPage(PAGE)
    header()
  }

  header()

  // Title and reference
  text(doc.title, MARGIN, y, 16, { bold: true })
  const meta = [`Date: ${dateText(doc.issuedAt)}, ${timeText(doc.issuedAt)}`, `Ref: ${doc.reference}`]
  meta.forEach((m, i) => page.drawText(m, { x: PAGE[0] - MARGIN - font.widthOfTextAtSize(m, 9), y: y + 6 - i * 12, size: 9, font, color: C.muted }))
  y -= 26

  // Panels side by side
  if (doc.panels.length) {
    const gap = 12
    const w = (WIDTH - gap * (doc.panels.length - 1)) / doc.panels.length
    const bodies = doc.panels.map((p) =>
      p.rows
        .filter(([, v]) => safe(v))
        .flatMap(([label, value]) => wrap(`${label}: ${safe(value)}`, font, 9.5, w - 24).map((line, i) => ({ line, label: i === 0 ? label : null }))),
    )
    const h = 30 + Math.max(1, ...bodies.map((b) => b.length)) * 13.5
    ensure(h + 10)
    doc.panels.forEach((p, i) => {
      const x = MARGIN + i * (w + gap)
      page.drawRectangle({ x, y: y - h, width: w, height: h, color: C.panel, borderColor: C.line, borderWidth: 0.6 })
      text(p.title.toUpperCase(), x + 12, y - 16, 8.5, { bold: true, color: C.primary })
      bodies[i].forEach(({ line, label }, j) => {
        const ly = y - 32 - j * 13.5
        if (label && line.startsWith(`${label}:`)) {
          text(`${label}:`, x + 12, ly, 9.5, { color: C.muted })
          text(line.slice(label.length + 1).trim(), x + 12 + font.widthOfTextAtSize(`${label}: `, 9.5), ly, 9.5, { bold: true })
        } else {
          text(line, x + 12, ly, 9.5, { bold: true })
        }
      })
    })
    y -= h + 18
  }

  // Vitals as a grid of tiles
  if (doc.vitals?.length) {
    ensure(70)
    text('VITALS', MARGIN, y, 9, { bold: true, color: C.primary })
    y -= 10
    const cols = Math.min(4, doc.vitals.length)
    const gap = 8
    const w = (WIDTH - gap * (cols - 1)) / cols
    doc.vitals.forEach((v, i) => {
      const row = Math.floor(i / cols)
      const col = i % cols
      if (col === 0 && row > 0) y -= 42
      if (col === 0) ensure(42)
      const x = MARGIN + col * (w + gap)
      page.drawRectangle({ x, y: y - 36, width: w, height: 36, color: C.white, borderColor: C.line, borderWidth: 0.8 })
      text(v.label, x + 10, y - 14, 8, { color: C.muted })
      text(wrap(safe(v.value), fontBold, 10.5, w - 20)[0] ?? '', x + 10, y - 28, 10.5, { bold: true })
    })
    y -= 54
  }

  // Results table
  if (doc.table && doc.table.rows.length) {
    const t = doc.table
    const total = t.widths.reduce((a, b) => a + b, 0)
    const widths = t.widths.map((w) => (w / total) * WIDTH)
    const drawHead = () => {
      page.drawRectangle({ x: MARGIN, y: y - 20, width: WIDTH, height: 20, color: C.head })
      let x = MARGIN
      t.columns.forEach((c, i) => {
        text(c, x + 6, y - 14, 8.5, { bold: true })
        x += widths[i]
      })
      y -= 20
    }
    ensure(60)
    text(t.title.toUpperCase(), MARGIN, y, 9, { bold: true, color: C.primary })
    y -= 10
    drawHead()
    t.rows.forEach((row, r) => {
      const cells = row.map((cell, i) => wrap(safe(cell) || '—', i === 0 ? fontBold : font, 9, widths[i] - 12))
      const h = Math.max(...cells.map((c) => c.length)) * 12 + 10
      if (y - h < FOOTER + 10) {
        page = pdf.addPage(PAGE)
        header()
        drawHead()
      }
      if (r % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - h, width: WIDTH, height: h, color: C.zebra })
      let x = MARGIN
      cells.forEach((lines, i) => {
        const flagged = i === t.flagColumn && lines[0] !== '—'
        lines.forEach((l, j) => text(l, x + 6, y - 14 - j * 12, 9, { bold: i === 0 || flagged, color: flagged ? C.high : C.ink }))
        x += widths[i]
      })
      page.drawLine({ start: { x: MARGIN, y: y - h }, end: { x: MARGIN + WIDTH, y: y - h }, thickness: 0.5, color: C.line })
      y -= h
    })
    y -= 18
  }

  // Free-text sections
  for (const s of doc.sections) {
    const body = safe(s.body)
    if (!body) continue
    const lines = wrap(body, font, 10, WIDTH)
    ensure(34)
    text(s.heading.toUpperCase(), MARGIN, y, 9, { bold: true, color: C.primary })
    y -= 15
    for (const line of lines) {
      ensure(14)
      text(line, MARGIN, y, 10)
      y -= 14
    }
    y -= 10
  }

  // Signature
  if (doc.signature) {
    ensure(62)
    y -= 8
    const x = PAGE[0] - MARGIN - 200
    page.drawLine({ start: { x, y }, end: { x: x + 200, y }, thickness: 0.8, color: C.muted })
    text(safe(doc.signature.name), x, y - 14, 10.5, { bold: true })
    doc.signature.lines.map(safe).filter(Boolean).forEach((l, i) => text(l, x, y - 27 - i * 11, 8.5, { color: C.muted }))
  }

  // Footer on every page
  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: MARGIN, y: FOOTER - 8 }, end: { x: PAGE[0] - MARGIN, y: FOOTER - 8 }, thickness: 0.5, color: C.line })
    const note = wrap(safe(doc.note), font, 7.5, WIDTH - 70)
    note.slice(0, 2).forEach((l, j) => p.drawText(l, { x: MARGIN, y: FOOTER - 20 - j * 9.5, size: 7.5, font, color: C.muted }))
    const label = `Page ${i + 1} of ${pages.length}`
    p.drawText(label, { x: PAGE[0] - MARGIN - font.widthOfTextAtSize(label, 7.5), y: FOOTER - 20, size: 7.5, font, color: C.muted })
  })

  return pdf.save()
}

function drawLogo(page: PDFPage, image: PDFImage, x: number, y: number, size: number) {
  const scale = size / Math.max(image.width, image.height)
  page.drawImage(image, { x, y, width: image.width * scale, height: image.height * scale })
}
