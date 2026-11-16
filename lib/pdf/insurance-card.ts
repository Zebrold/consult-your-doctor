import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { C, dateText, drawLogo, loadAssets, safe, wrap } from './clinical'

// The patient's saved insurance policy as a card, mirroring DigitalInsuranceCard (components/patient/InsuranceCard.tsx):
// only what they saved. It is not a card issued by the insurer, and the page says so.

export type InsuranceCardDoc = {
  holder: string
  policyNumber: string
  insurer: string
  /** yyyy-mm-dd */
  validUntil: string | null
  memberId: string | null
  tpa: string | null
}

const PAGE_W = 320
const CARD_W = 243 // CR80 card, 85.6 x 54 mm
const CARD_H = 153
const BLUE = rgb(0.165, 0.302, 0.816) // #2A4DD0
const WHITE = rgb(1, 1, 1)
const SOFT = rgb(0.84, 0.88, 0.97)

function roundedRect(page: PDFPage, x: number, top: number, w: number, h: number, r: number) {
  const d = `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`
  page.drawSvgPath(d, { x, y: top, color: BLUE })
}

function fit(text: string, font: PDFFont, size: number, width: number) {
  let t = text
  while (t.length > 1 && font.widthOfTextAtSize(t, size) > width) t = t.slice(0, -1)
  return t === text ? t : `${t.trimEnd()}…`
}

export async function generateInsuranceCardPdf(doc: InsuranceCardDoc): Promise<Uint8Array> {
  const { regular, bold } = await loadAssets()
  const whiteLogo = await readFile(path.join(process.cwd(), 'public', 'logo-icon-white.png'))
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle('Health insurance card')
  const font = await pdf.embedFont(regular, { subset: true })
  const strong = await pdf.embedFont(bold, { subset: true })
  const logo = await pdf.embedPng(whiteLogo)

  const holder = safe(doc.holder)
  const policyNumber = safe(doc.policyNumber)
  const insurer = safe(doc.insurer)
  const memberId = safe(doc.memberId)
  const tpa = safe(doc.tpa)
  const valid = doc.validUntil ? dateText(new Date(`${doc.validUntil}T12:00:00+05:30`)) : ''

  const noteLines = wrap(
    'Policy details saved by the patient on Consult Your Doctor. This is not a card issued by the insurer: carry your insurer’s card or e-card and a photo ID.',
    font,
    8,
    PAGE_W - 60,
  )
  const extra = [memberId && ['Member ID', memberId], tpa && ['TPA', tpa]].filter(Boolean) as string[][]
  const pageH = 30 + CARD_H + 22 + extra.length * 16 + 10 + noteLines.length * 11 + 28
  const page = pdf.addPage([PAGE_W, pageH])

  const x = (PAGE_W - CARD_W) / 2
  const top = pageH - 30 // PDF y of the card's top edge
  roundedRect(page, x, top, CARD_W, CARD_H, 12)

  const pad = 14
  const inner = CARD_W - pad * 2
  const text = (s: string, px: number, py: number, size: number, f: PDFFont, color = WHITE) =>
    page.drawText(s, { x: px, y: py, size, font: f, color })
  const label = (s: string, px: number, py: number) => text(s, px, py, 6, strong, SOFT)

  drawLogo(page, logo, x + pad, top - pad - 15, 15)
  text('Consult your Doctor', x + pad + 21, top - pad - 11, 10, strong)
  const tag = 'HEALTH INSURANCE'
  text(tag, x + CARD_W - pad - strong.widthOfTextAtSize(tag, 6), top - pad - 9, 6, strong, SOFT)

  label('MEMBER NAME', x + pad, top - 52)
  text(fit(holder, strong, 13, inner), x + pad, top - 66, 13, strong)
  label('INSURANCE NUMBER', x + pad, top - 80)
  text(fit(policyNumber, strong, 11, inner), x + pad, top - 93, 11, strong)

  page.drawLine({ start: { x: x + pad, y: top - 108 }, end: { x: x + CARD_W - pad, y: top - 108 }, thickness: 0.5, color: rgb(0.62, 0.71, 0.93) })
  const validW = valid ? strong.widthOfTextAtSize(valid, 9) : 0
  label('INSURER', x + pad, top - 120)
  text(fit(insurer, strong, 9, inner - validW - 14), x + pad, top - 131, 9, strong)
  if (valid) {
    label('VALID TILL', x + CARD_W - pad - validW, top - 120)
    text(valid, x + CARD_W - pad - validW, top - 131, 9, strong)
  }

  let y = top - CARD_H - 22
  for (const [k, v] of extra) {
    page.drawText(k, { x: 30, y, size: 8.5, font: strong, color: C.muted })
    const w = font.widthOfTextAtSize(fit(v, font, 8.5, 200), 8.5)
    page.drawText(fit(v, font, 8.5, 200), { x: PAGE_W - 30 - w, y, size: 8.5, font, color: C.ink })
    y -= 16
  }
  y -= 4
  for (const line of noteLines) {
    page.drawText(line, { x: 30, y, size: 8, font, color: C.muted })
    y -= 11
  }

  return pdf.save()
}
