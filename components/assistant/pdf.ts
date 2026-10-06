import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { PdfDoc } from '@/lib/assistant/pdf-doc'

// Loaded only when someone downloads a PDF (chat.tsx imports this file on demand), so pdf-lib and the fonts
// never weigh down normal page loads. Noto Sans covers English, German and the ₹ sign; it has no Hindi script.

const PAGE: [number, number] = [595.28, 841.89] // A4 in points
const MARGIN = 48
const FOOTER = 36
const WIDTH = PAGE[0] - MARGIN * 2

const C = {
  primary: rgb(0, 0.314, 0.796),
  text: rgb(0.075, 0.106, 0.18),
  muted: rgb(0.278, 0.333, 0.412),
  white: rgb(1, 1, 1),
  head: rgb(0.855, 0.882, 1),
  zebra: rgb(0.973, 0.98, 0.988),
  line: rgb(0.761, 0.776, 0.847),
}

type Fonts = { regular: ArrayBuffer; bold: ArrayBuffer }

/** Markdown-ish text from the assistant to plain PDF text: links become "text (full address)", bold markers go. */
function plain(text: string, origin: string) {
  return text
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => `${label} (${href.startsWith('/') ? origin + href : href})`)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\t/g, '  ')
    .replace(/[\u0000-\u0008\u000b-\u001f]/g, '')
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next
        continue
      }
      if (line) lines.push(line)
      // A single word wider than the line (a long address) is broken by character.
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

export async function buildPdf(doc: PdfDoc, fonts: Fonts, origin: string, now = new Date()) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const regular = await pdf.embedFont(fonts.regular, { subset: true })
  const bold = await pdf.embedFont(fonts.bold, { subset: true })
  pdf.setTitle(doc.title)
  pdf.setAuthor('Zebrold AI, Consult Your Doctor')
  pdf.setCreator('consultyourdoctor.de')
  pdf.setProducer('Zebrold AI')
  pdf.setCreationDate(now)

  let page: PDFPage = pdf.addPage(PAGE)
  let y = 0 // distance from the top of the current page

  const newPage = () => {
    page = pdf.addPage(PAGE)
    y = MARGIN
  }
  const room = (h: number) => {
    if (y + h > PAGE[1] - MARGIN - FOOTER) newPage()
  }
  const draw = (text: string, x: number, size: number, font: PDFFont, color = C.text) => page.drawText(text, { x, y: PAGE[1] - y - size, size, font, color })
  const lines = (text: string, opts: { size: number; font?: PDFFont; color?: typeof C.text; indent?: number; gap?: number }) => {
    const font = opts.font ?? regular
    const lh = opts.size * 1.45
    for (const line of wrap(plain(text, origin), font, opts.size, WIDTH - (opts.indent ?? 0))) {
      room(lh)
      draw(line, MARGIN + (opts.indent ?? 0), opts.size, font, opts.color)
      y += lh
    }
    y += opts.gap ?? 0
  }

  // Branded header band
  page.drawRectangle({ x: 0, y: PAGE[1] - 64, width: PAGE[0], height: 64, color: C.primary })
  page.drawText('Consult Your Doctor', { x: MARGIN, y: PAGE[1] - 34, size: 16, font: bold, color: C.white })
  page.drawText('consultyourdoctor.de', { x: MARGIN, y: PAGE[1] - 50, size: 9, font: regular, color: C.white })
  const tag = 'Zebrold AI'
  page.drawText(tag, { x: PAGE[0] - MARGIN - bold.widthOfTextAtSize(tag, 11), y: PAGE[1] - 38, size: 11, font: bold, color: C.white })
  y = 64 + 30

  lines(doc.title, { size: 20, font: bold, gap: 2 })
  if (doc.subtitle) lines(doc.subtitle, { size: 11, color: C.muted, gap: 2 })
  const stamp = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  lines(`Created ${stamp} IST`, { size: 9, color: C.muted, gap: 8 })
  page.drawLine({ start: { x: MARGIN, y: PAGE[1] - y }, end: { x: PAGE[0] - MARGIN, y: PAGE[1] - y }, thickness: 0.6, color: C.line })
  y += 16

  for (const section of doc.sections) {
    if (section.heading) {
      room(40)
      lines(section.heading, { size: 13, font: bold, color: C.primary, gap: 4 })
    }
    for (const p of section.paragraphs ?? []) lines(p, { size: 10.5, gap: 6 })
    for (const b of section.bullets ?? []) {
      room(15)
      draw('•', MARGIN + 4, 10.5, regular, C.primary)
      lines(b, { size: 10.5, indent: 16, gap: 3 })
    }
    if (section.table) drawTable(section.table)
    y += 10
  }

  function drawTable({ columns, rows }: NonNullable<PdfDoc['sections'][number]['table']>) {
    const size = 9
    const pad = 5
    const lh = size * 1.4
    const count = columns.length
    // Column widths follow their content, within limits, then scale to the full width.
    const natural = columns.map((c, i) =>
      Math.min(220, Math.max(48, bold.widthOfTextAtSize(c, size), ...rows.map((r) => regular.widthOfTextAtSize(plain(r[i] ?? '', origin), size))) + pad * 2),
    )
    const total = natural.reduce((s, w) => s + w, 0)
    const widths = natural.map((w) => (w / total) * WIDTH)

    const rowHeight = (cells: string[], font: PDFFont) => Math.max(...cells.map((c, i) => wrap(plain(c ?? '', origin), font, size, widths[i] - pad * 2).length)) * lh + pad * 2
    const drawRow = (cells: string[], font: PDFFont, fill?: typeof C.text) => {
      const h = rowHeight(cells, font)
      const top = PAGE[1] - y
      if (fill) page.drawRectangle({ x: MARGIN, y: top - h, width: WIDTH, height: h, color: fill })
      let x = MARGIN
      for (let i = 0; i < count; i++) {
        let ly = y + pad
        for (const line of wrap(plain(cells[i] ?? '', origin), font, size, widths[i] - pad * 2)) {
          page.drawText(line, { x: x + pad, y: PAGE[1] - ly - size, size, font, color: C.text })
          ly += lh
        }
        x += widths[i]
      }
      page.drawLine({ start: { x: MARGIN, y: top - h }, end: { x: MARGIN + WIDTH, y: top - h }, thickness: 0.5, color: C.line })
      y += h
    }

    room(rowHeight(columns, bold) + 20)
    drawRow(columns, bold, C.head)
    rows.forEach((r, i) => {
      if (y + rowHeight(r, regular) > PAGE[1] - MARGIN - FOOTER) {
        newPage()
        drawRow(columns, bold, C.head)
      }
      drawRow(r, regular, i % 2 ? C.zebra : undefined)
    })
    y += 6
  }

  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: MARGIN, y: MARGIN + 14 }, end: { x: PAGE[0] - MARGIN, y: MARGIN + 14 }, thickness: 0.5, color: C.line })
    p.drawText('Made by Zebrold AI on consultyourdoctor.de. For information only, not medical advice.', { x: MARGIN, y: MARGIN, size: 8, font: regular, color: C.muted })
    const label = `Page ${i + 1} of ${pages.length}`
    p.drawText(label, { x: PAGE[0] - MARGIN - regular.widthOfTextAtSize(label, 8), y: MARGIN, size: 8, font: regular, color: C.muted })
  })

  return pdf.save()
}

let fontCache: Promise<Fonts> | null = null
function loadFonts() {
  fontCache ??= Promise.all(
    ['/fonts/NotoSans-Regular.ttf', '/fonts/NotoSans-Bold.ttf'].map((url) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Font ${url} failed to load`)
        return r.arrayBuffer()
      }),
    ),
  )
    .then(([regular, bold]) => ({ regular, bold }))
    .catch((err) => {
      fontCache = null
      throw err
    })
  return fontCache
}

/** Builds the PDF in the browser and saves it. */
export async function downloadPdf(doc: PdfDoc) {
  const bytes = await buildPdf(doc, await loadFonts(), window.location.origin)
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }))
  const name = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'zebrold-ai'
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Turns one assistant reply into a PDF document, for "Save as PDF" under any answer. */
export function answerToDoc(question: string | null, answer: string): PdfDoc {
  const paragraphs: string[] = []
  const bullets: string[] = []
  const sections: PdfDoc['sections'] = []
  const flush = () => {
    if (paragraphs.length || bullets.length) sections.push({ paragraphs: paragraphs.splice(0), bullets: bullets.splice(0) })
  }
  for (const raw of answer.split('\n')) {
    const line = raw.trim()
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/)
    if (!line) continue
    if (bullet) bullets.push(bullet[1])
    else {
      if (bullets.length) flush()
      paragraphs.push(line.replace(/^#{1,6}\s+/, ''))
    }
  }
  flush()
  return {
    title: 'Answer from Zebrold AI',
    subtitle: question ? `You asked: ${question.slice(0, 180)}` : undefined,
    sections: sections.length ? sections.slice(0, 15) : [{ paragraphs: [answer.slice(0, 2000)] }],
  }
}
