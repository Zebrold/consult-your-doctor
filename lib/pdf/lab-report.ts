import { PDFDocument, rgb, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { C, PAGE, dateText, drawLogo, loadAssets, safe, timeText, wrap } from './clinical'

// The laboratory report PDF: the lab's letterhead, a patient and sample band, the results table (investigation, result,
// unit, biological reference interval) with out-of-range results flagged, interpretation, "End of report" and the
// signatures.

const M = 40
const W = PAGE[0] - M * 2
const FOOTER = 58

export type LabReportDoc = {
  code: string
  reportedAt: Date
  lab: { name: string; lines: (string | null | undefined)[]; email: string | null }
  patient: { name: string; id: string; ageSex: string | null; phone: string | null }
  referredBy: string | null
  sample: string | null
  /** The day the patient booked to give the sample ("YYYY-MM-DD"). */
  collectedOn: string | null
  tests: string
  rows: { test: string; value: string; unit: string; range: string; flag: string }[]
  remarks: string | null
  authorisedBy: string
  note: string
}

const soft = rgb(0.937, 0.953, 1)
const red = rgb(0.78, 0.16, 0.24)
const FLAG_MARK: Record<string, string> = { Low: 'L', High: 'H', Abnormal: 'A', Critical: 'C' }

export async function renderLabReportPdf(doc: LabReportDoc): Promise<Uint8Array> {
  const { regular, bold, logo } = await loadAssets()
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle(`Laboratory report #${doc.code}`)
  pdf.setAuthor(doc.lab.name)
  pdf.setCreator('Consult Your Doctor')
  const font = await pdf.embedFont(regular, { subset: true })
  const fontBold = await pdf.embedFont(bold, { subset: true })
  const logoImage = await pdf.embedPng(logo)

  let page: PDFPage = pdf.addPage(PAGE)
  let y = 0
  const draw = (s: string, x: number, at: number, size: number, opts: { bold?: boolean; color?: ReturnType<typeof rgb> } = {}) =>
    page.drawText(safe(s), { x, y: at, size, font: opts.bold ? fontBold : font, color: opts.color ?? C.ink })
  const right = (s: string, at: number, size: number, isBold = false, color = C.muted) => {
    const f = isBold ? fontBold : font
    page.drawText(safe(s), { x: PAGE[0] - M - f.widthOfTextAtSize(safe(s), size), y: at, size, font: f, color })
  }

  const letterhead = () => {
    const top = PAGE[1] - M
    draw(doc.lab.name, M, top - 16, 16, { bold: true, color: C.primary })
    let ly = top - 30
    for (const raw of [...doc.lab.lines, doc.lab.email]) {
      const line = safe(raw)
      if (!line) continue
      for (const l of wrap(line, font, 8.5, W * 0.58)) {
        draw(l, M, ly, 8.5, { color: C.muted })
        ly -= 11
      }
    }
    right('LABORATORY REPORT', top - 14, 12, true, C.ink)
    right(`Report #${doc.code}`, top - 28, 8.5)
    right(`${dateText(doc.reportedAt)}, ${timeText(doc.reportedAt)}`, top - 39, 8.5)
    const bottom = Math.min(ly, top - 46) - 2
    page.drawRectangle({ x: M, y: bottom, width: W, height: 2.2, color: C.primary })
    y = bottom - 14
  }

  const patientBand = () => {
    const cells: [string, string | null][][] = [
      [
        ['Patient', doc.patient.name],
        ['Age / Sex', doc.patient.ageSex],
        ['Patient ID', doc.patient.id],
        ['Booking', `#${doc.code}`],
      ],
      [
        ['Referred by', doc.referredBy || 'Self'],
        ['Sample', doc.sample],
        ['Collected on', doc.collectedOn ? dateText(new Date(`${doc.collectedOn}T12:00:00+05:30`)) : null],
        ['Reported on', dateText(doc.reportedAt)],
      ],
    ]
    const h = 50
    page.drawRectangle({ x: M, y: y - h, width: W, height: h, color: soft, borderColor: C.line, borderWidth: 0.6 })
    const colW = W / 4
    cells.forEach((row, r) =>
      row.forEach(([label, value], c) => {
        const x = M + 10 + c * colW
        const top = y - 15 - r * 22
        draw(label.toUpperCase(), x, top + 1, 6.8, { bold: true, color: C.muted })
        draw(wrap(safe(value) || '—', fontBold, 9.5, colW - 14)[0] ?? '—', x, top - 10, 9.5, { bold: true })
      }),
    )
    y -= h + 12
  }

  const cols = [
    { title: 'Investigation', w: 0.38 },
    { title: 'Result', w: 0.17 },
    { title: 'Unit', w: 0.13 },
    { title: 'Biological reference interval', w: 0.32 },
  ].map((c) => ({ ...c, px: c.w * W }))
  const tableHead = () => {
    page.drawRectangle({ x: M, y: y - 19, width: W, height: 19, color: C.head })
    let x = M
    cols.forEach((c) => {
      draw(c.title, x + 6, y - 13, 8.5, { bold: true })
      x += c.px
    })
    y -= 19
  }
  const newPage = (withHead: boolean) => {
    page = pdf.addPage(PAGE)
    letterhead()
    draw(`${doc.patient.name} • Report #${doc.code} (continued)`, M, y, 8.5, { color: C.muted })
    y -= 14
    if (withHead) tableHead()
  }

  letterhead()
  patientBand()

  // Title bar with the tests done
  const testLines = wrap(`Tests: ${safe(doc.tests)}`, fontBold, 9.5, W - 20)
  page.drawRectangle({ x: M, y: y - (10 + testLines.length * 12), width: W, height: 10 + testLines.length * 12, color: C.white, borderColor: C.primary, borderWidth: 0.6 })
  testLines.forEach((l, i) => draw(l, M + 10, y - 14 - i * 12, 9.5, { bold: true }))
  y -= 20 + testLines.length * 12

  tableHead()
  doc.rows.forEach((r, i) => {
    const flagged = !!FLAG_MARK[r.flag]
    const cells = [
      wrap(safe(r.test), fontBold, 9.5, cols[0].px - 12),
      wrap(`${safe(r.value)}${flagged ? `  ${FLAG_MARK[r.flag]}` : ''}`, fontBold, 9.5, cols[1].px - 12),
      wrap(safe(r.unit) || '—', font, 9, cols[2].px - 12),
      wrap(safe(r.range) || '—', font, 9, cols[3].px - 12),
    ]
    const h = Math.max(...cells.map((c) => c.length)) * 12 + 10
    if (y - h < FOOTER + 14) newPage(true)
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - h, width: W, height: h, color: C.zebra })
    let x = M
    cells.forEach((lines, c) => {
      lines.forEach((l, j) => draw(l, x + 6, y - 14 - j * 12, c < 2 ? 9.5 : 9, { bold: c < 2, color: c === 1 && flagged ? red : C.ink }))
      x += cols[c].px
    })
    page.drawLine({ start: { x: M, y: y - h }, end: { x: M + W, y: y - h }, thickness: 0.5, color: C.line })
    y -= h
  })
  y -= 8
  if (doc.rows.some((r) => FLAG_MARK[r.flag])) {
    draw('H = high, L = low, A = abnormal, C = critical (results outside the reference interval are shown in red).', M, y, 7.8, { color: C.muted })
    y -= 14
  }

  const remarks = safe(doc.remarks)
  if (remarks) {
    const lines = wrap(remarks, font, 10, W)
    if (y - 30 < FOOTER + 14) newPage(false)
    y -= 6
    draw('INTERPRETATION / REMARKS', M, y, 8, { bold: true, color: C.primary })
    y -= 14
    for (const l of lines) {
      if (y - 14 < FOOTER + 14) newPage(false)
      draw(l, M, y, 10)
      y -= 13
    }
  }

  // End of report and signatures
  if (y - 90 < FOOTER + 14) newPage(false)
  y -= 12
  const end = '— End of Report —'
  page.drawText(end, { x: (PAGE[0] - font.widthOfTextAtSize(end, 9)) / 2, y, size: 9, font, color: C.muted })
  y -= 46
  page.drawLine({ start: { x: M, y }, end: { x: M + 170, y }, thickness: 0.8, color: C.muted })
  draw('Lab Technician', M, y - 13, 9, { bold: true })
  draw(doc.lab.name, M, y - 25, 8, { color: C.muted })
  const sx = PAGE[0] - M - 190
  page.drawLine({ start: { x: sx, y }, end: { x: sx + 190, y }, thickness: 0.8, color: C.muted })
  draw(wrap(safe(doc.authorisedBy), fontBold, 9.5, 190)[0] ?? '', sx, y - 13, 9.5, { bold: true })
  draw('Authorised signatory', sx, y - 25, 8, { color: C.muted })

  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: FOOTER - 6 }, end: { x: PAGE[0] - M, y: FOOTER - 6 }, thickness: 0.5, color: C.line })
    drawLogo(p, logoImage, M, FOOTER - 26, 14)
    p.drawText('Consult Your Doctor', { x: M + 18, y: FOOTER - 18, size: 8, font: fontBold, color: C.primary })
    wrap(safe(doc.note), font, 7, W - 80)
      .slice(0, 2)
      .forEach((l, j) => p.drawText(l, { x: M + 18, y: FOOTER - 28 - j * 8.5, size: 7, font, color: C.muted }))
    const label = `Page ${i + 1} of ${pages.length}`
    p.drawText(label, { x: PAGE[0] - M - font.widthOfTextAtSize(label, 7.5), y: FOOTER - 18, size: 7.5, font, color: C.muted })
  })

  return pdf.save()
}
