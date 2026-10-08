import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'

// Shared pieces for the server-side PDFs (prescription.ts and lab-report.ts): page size, colours, fonts and text
// wrapping. Noto Sans (in public/fonts) covers English and the ₹ sign.

export const PAGE: [number, number] = [595.28, 841.89] // A4 in points

export const C = {
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

let assets: Promise<{ regular: Uint8Array; bold: Uint8Array; logo: Uint8Array }> | null = null
export function loadAssets() {
  const pub = (...p: string[]) => path.join(process.cwd(), 'public', ...p)
  assets ??= Promise.all([readFile(pub('fonts', 'NotoSans-Regular.ttf')), readFile(pub('fonts', 'NotoSans-Bold.ttf')), readFile(pub('logo-icon.png'))])
    .then(([regular, bold, logo]) => ({ regular, bold, logo }))
    .catch((err) => {
      assets = null
      throw err
    })
  return assets
}

export function wrap(text: string, font: PDFFont, size: number, width: number) {
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

export const dateText = (d: Date) => d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })
export const timeText = (d: Date) => d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })
// Strip characters the font can't draw (control characters) so a stray paste can't break the PDF.
export const safe = (s: string | null | undefined) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim()

export function drawLogo(page: PDFPage, image: PDFImage, x: number, y: number, size: number) {
  const scale = size / Math.max(image.width, image.height)
  page.drawImage(image, { x, y, width: image.width * scale, height: image.height * scale })
}

/** A run of text in one weight. */
export type Seg = { t: string; b?: boolean }
export type Fonts = { regular: PDFFont; bold: PDFFont }

/** Wraps mixed regular and bold text to `width`, keeping each word's weight. */
export function richWrap(segs: Seg[], fonts: Fonts, size: number, width: number): Seg[][] {
  const words: Seg[] = []
  for (const s of segs) {
    const parts = safe(s.t).split(/(\s+)/)
    for (const p of parts) if (p) words.push({ t: p, b: s.b })
  }
  const lines: Seg[][] = [[]]
  let used = 0
  for (const w of words) {
    const f = w.b ? fonts.bold : fonts.regular
    const wWidth = f.widthOfTextAtSize(w.t, size)
    const space = /^\s+$/.test(w.t)
    if (!space && used + wWidth > width && lines[lines.length - 1].length) {
      lines.push([])
      used = 0
    }
    if (space && used === 0) continue
    lines[lines.length - 1].push(w)
    used += wWidth
  }
  return lines.map((l) => {
    while (l.length && /^\s+$/.test(l[l.length - 1].t)) l.pop()
    return l
  })
}
