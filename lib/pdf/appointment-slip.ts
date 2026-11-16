import { PDFDocument, rgb, degrees, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import QRCode from 'qrcode'
import { PAGE, drawLogo, loadAssets, safe, wrap, richWrap, type Seg } from './clinical'
import { siteUrl } from '@/lib/site-url'
import { formatINR } from '@/components/patient/format'
import { cardStamp } from '@/lib/booking-card-format'
import type { BookingCard } from '@/lib/booking-card'

// The PDF slip, drawn in the layout of the booking page and the booking email (app/book/confirmation/[id],
// lib/notify/booking-email.ts): brand, headline, the ticket with its QR code, token and report-by time, the free
// follow-up, the order summary and the booking facts. Everything comes from the BookingCard so the three never disagree.

const M = 40
const W = PAGE[0] - M * 2
const R = M + W

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
const BLUE = hex('#2A4DD0')
const INK = hex('#0B1B3F')
const MUTED = hex('#5B667A')
const TICKET = hex('#F6F8FC')
const BAND = hex('#EEF2F8')
const DASH = hex('#D6DDE8')
const BORDER = hex('#E3E8F0')
const AMBER = hex('#C2410C')
const WHITE = rgb(1, 1, 1)

const money = (n: number) => formatINR(n).replace(/^₹([\d,]+)$/, '₹$1.00')

/** The hospital's or doctor's photo, if it can be fetched as a JPEG or PNG within a few seconds; otherwise null. */
async function fetchPhoto(url: string | null): Promise<{ bytes: Uint8Array; png: boolean } | null> {
  if (!url) return null
  try {
    const href = url.startsWith('/') ? `${siteUrl()}${url}` : url
    if (!/^https:\/\//i.test(href) && !href.startsWith(siteUrl())) return null
    const res = await fetch(href, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.length > 4_000_000) return null
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return { bytes, png: true }
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return { bytes, png: false }
    // WebP (hospital photos can be uploaded as WebP): pdf-lib can't embed it, so turn it into a small JPEG with sharp,
    // the image library Next.js itself uses. Without sharp the grey placeholder is drawn instead.
    if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
      const { default: sharp } = await import('sharp')
      const jpeg = await sharp(bytes).resize(264, 352, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer()
      return { bytes: new Uint8Array(jpeg), png: false }
    }
    return null
  } catch {
    return null
  }
}

export async function generateAppointmentSlipPdf(card: BookingCard): Promise<Uint8Array> {
  const assets = await loadAssets()
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const regular = await doc.embedFont(assets.regular)
  const bold = await doc.embedFont(assets.bold)
  const logo = await doc.embedPng(assets.logo)
  const fonts = { regular, bold }

  const isLab = card.kind === 'lab'
  const confirmed = card.state === 'confirmed'
  const qrPng = await QRCode.toBuffer(card.links.confirmation, { margin: 1, width: 300 })
  const qr = await doc.embedPng(qrPng)
  const photoData = await fetchPhoto(card.image)
  let photo: Awaited<ReturnType<typeof doc.embedPng>> | null = null
  if (photoData) {
    try {
      photo = photoData.png ? await doc.embedPng(photoData.bytes) : await doc.embedJpg(photoData.bytes)
    } catch {
      photo = null
    }
  }

  let page: PDFPage = doc.addPage(PAGE)
  let y = PAGE[1] - M

  /** Starts a new page when the next block of height `h` would run into the bottom margin. */
  const ensure = (h: number) => {
    if (y - h < M) {
      page = doc.addPage(PAGE)
      y = PAGE[1] - M
    }
  }
  const text = (s: string, x: number, yy: number, size: number, o: { b?: boolean; color?: ReturnType<typeof rgb> } = {}) =>
    page.drawText(safe(s), { x, y: yy, size, font: o.b ? bold : regular, color: o.color ?? INK })
  const widthOf = (s: string, size: number, b = false) => (b ? bold : regular).widthOfTextAtSize(safe(s), size)
  const centered = (s: string, yy: number, size: number, o: { b?: boolean; color?: ReturnType<typeof rgb> } = {}) =>
    text(s, M + (W - widthOf(s, size, o.b)) / 2, yy, size, o)
  const right = (s: string, xRight: number, yy: number, size: number, o: { b?: boolean; color?: ReturnType<typeof rgb> } = {}) =>
    text(s, xRight - widthOf(s, size, o.b), yy, size, o)
  const dashed = (yy: number, x1 = M, x2 = R) =>
    page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: 0.9, color: DASH, dashArray: [4, 3] })
  const rich = (segs: Seg[], x: number, top: number, size: number, width: number, lineH: number, color = MUTED) => {
    let yy = top
    for (const line of richWrap(segs, fonts, size, width)) {
      let xx = x
      for (const s of line) {
        const f: PDFFont = s.b ? bold : regular
        page.drawText(s.t, { x: xx, y: yy, size, font: f, color: s.b ? INK : color })
        xx += f.widthOfTextAtSize(s.t, size)
      }
      yy -= lineH
    }
    return yy
  }
  const richHeight = (segs: Seg[], size: number, width: number, lineH: number) => richWrap(segs, fonts, size, width).length * lineH

  // 1. Brand and headline
  const brand = 'Consult your Doctor'
  const brandW = widthOf(brand, 17, true) + 30
  const bx = M + (W - brandW) / 2
  drawLogo(page, logo, bx, y - 22, 22)
  text(brand, bx + 30, y - 16, 17, { b: true })
  y -= 44
  centered(isLab ? 'Your lab booking is confirmed!' : 'Your appointment is confirmed!', y, 17, { b: true, color: BLUE })
  y -= 18
  // safe() trims, so the gap after the label is added by hand.
  const idLabel = 'Booking ID'
  const gap = regular.widthOfTextAtSize(' ', 10.5)
  const idW = widthOf(idLabel, 10.5) + gap + widthOf(card.code, 10.5, true)
  const ix = M + (W - idW) / 2
  text(idLabel, ix, y, 10.5, { color: MUTED })
  text(card.code, ix + widthOf(idLabel, 10.5) + gap, y, 10.5, { b: true })
  y -= 22

  // 2. Ticket: photo, visit details and the QR code
  const textX = M + 16 + 66 + 14
  const qrSize = 84
  const textW = R - 16 - qrSize - 14 - textX
  const titleLines = wrap(card.title, bold, 13, textW)
  const placeLines = [card.place, ...card.placeLines].flatMap((l) => wrap(l, regular, 9, textW))
  const infoH = titleLines.length * 16 + 14 + (card.when ? 18 : 0) + placeLines.length * 12 + 20
  const topH = Math.max(infoH, 92, qrSize + 22) + 24
  const tokenH = 58
  ensure(topH + tokenH + 40)
  const ticketTop = y
  const ticketH = topH + tokenH + 16
  page.drawRectangle({ x: M, y: ticketTop - ticketH, width: W, height: ticketH, color: TICKET })

  // Photo (grey placeholder when there is none)
  const px = M + 16
  const py = ticketTop - 16 - 88
  page.drawRectangle({ x: px, y: py, width: 66, height: 88, color: hex('#E3E9F4') })
  if (photo) {
    const scale = Math.max(66 / photo.width, 88 / photo.height)
    const w = photo.width * scale
    const h = photo.height * scale
    page.pushOperators(pushGraphicsState(), rectangle(px, py, 66, 88), clip(), endPath())
    page.drawImage(photo, { x: px + (66 - w) / 2, y: py + (88 - h) / 2, width: w, height: h })
    page.pushOperators(popGraphicsState())
  }

  let ty = ticketTop - 30
  for (const l of titleLines) {
    text(l, textX, ty, 13, { b: true })
    ty -= 16
  }
  text(card.subtitle, textX, ty, 9.5, { b: true, color: BLUE })
  ty -= 17
  if (card.when) {
    text(card.when, textX, ty, 10.5, { b: true })
    ty -= 16
  }
  for (const l of placeLines) {
    text(l, textX, ty, 9, { color: MUTED })
    ty -= 12
  }
  ty -= 6
  text(card.typeLabel, textX, ty, 10, { b: true })

  const qx = R - 16 - qrSize
  page.drawRectangle({ x: qx - 4, y: ticketTop - 16 - qrSize - 8, width: qrSize + 8, height: qrSize + 8, color: WHITE, borderColor: DASH, borderWidth: 0.8 })
  page.drawImage(qr, { x: qx, y: ticketTop - 16 - qrSize - 4, width: qrSize, height: qrSize })
  text('Scan at desk', qx + qrSize / 2 - widthOf('Scan at desk', 8, true) / 2, ticketTop - 16 - qrSize - 20, 8, { b: true, color: MUTED })

  // Perforation, then token and report-by (or the lab visit) with the stamp
  const perfY = ticketTop - topH
  dashed(perfY, M + 16, R - 16)
  const rowTop = perfY - 14
  if (isLab) {
    text('VISIT ON', M + 16, rowTop - 6, 8, { b: true, color: MUTED })
    text(card.when ?? 'To be confirmed', M + 16, rowTop - 24, 12, { b: true })
    text('STATUS', M + 200, rowTop - 6, 8, { b: true, color: MUTED })
    text('Booked', M + 200, rowTop - 24, 12, { b: true, color: BLUE })
  } else {
    text('TOKEN', M + 16, rowTop - 6, 8, { b: true, color: MUTED })
    text(card.token ?? card.code, M + 16, rowTop - 34, 28, { b: true, color: BLUE })
    text('REPORT BY', M + 200, rowTop - 6, 8, { b: true, color: MUTED })
    text(card.reportBy ?? '-', M + 200, rowTop - 24, 12, { b: true })
  }
  // The stamp, tilted 8 degrees
  const angle = -8
  const rad = (angle * Math.PI) / 180
  const ox = R - 16 - 112
  const oy = rowTop - 44
  const at = (dx: number, dy: number) => ({ x: ox + dx * Math.cos(rad) - dy * Math.sin(rad), y: oy + dx * Math.sin(rad) + dy * Math.cos(rad) })
  page.drawRectangle({ x: ox, y: oy, width: 112, height: 40, borderColor: BLUE, borderWidth: 1.4, rotate: degrees(angle) })
  const stamp = (s: string, size: number, dy: number) => {
    const p = at((112 - widthOf(s, size, true)) / 2, dy)
    page.drawText(s, { x: p.x, y: p.y, size, font: bold, color: BLUE, rotate: degrees(angle) })
  }
  stamp('CONSULT YOUR DOCTOR', 6.5, 29)
  stamp('BOOKING', 10.5, 16)
  stamp('CONFIRMED', 10.5, 5)

  dashed(ticketTop - ticketH + 12, M + 16, R - 16)
  y = ticketTop - ticketH - 16
  const message = isLab ? 'Show the QR code at the lab front desk when you arrive.' : 'Show the QR code or token at the hospital front desk when you arrive.'
  centered(message, y, 9.5, { color: MUTED })
  y -= 22

  // 3. Free follow-up
  if (card.followUp) {
    const body = `Need to see ${card.followUp.doctor} again about the same problem? Book a follow-up in the app within ${card.followUp.days} days at no booking fee.`
    const lines = wrap(body, regular, 9, W - 40)
    const h = 40 + lines.length * 12
    ensure(h + 10)
    page.drawRectangle({ x: M, y: y - h, width: W, height: h, color: BLUE })
    text(`Free follow-up for ${card.followUp.days} days`, M + 20, y - 22, 13, { b: true, color: WHITE })
    let by = y - 38
    for (const l of lines) {
      page.drawText(safe(l), { x: M + 20, y: by, size: 9, font: regular, color: hex('#E6ECFF') })
      by -= 12
    }
    y -= h + 10
  }

  // 4. Note
  const noteText = isLab
    ? 'Please carry a photo ID and your doctor’s prescription if you have one. The test charges are paid at the lab. In an emergency, call 108.'
    : card.venueTitle === 'PAID AT HOSPITAL'
      ? 'Please carry a photo ID and any previous reports. In an emergency, call 108.'
      : 'Please carry a photo ID and any previous reports. The consultation fee is paid at the hospital counter. In an emergency, call 108.'
  const noteSegs: Seg[] = [{ t: 'Note:', b: true }, { t: ` ${noteText}` }]
  const noteH = richHeight(noteSegs, 9, W - 40, 12) + 20
  ensure(noteH + 20)
  page.drawRectangle({ x: M, y: y - noteH, width: W, height: noteH, color: TICKET })
  rich(noteSegs, M + 20, y - 17, 9, W - 40, 12)
  y -= noteH + 18

  // 5. Order summary
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: card.isFollowUp ? 'BOOKING FEE (FREE FOLLOW-UP)' : 'BOOKING FEE', value: money(card.bookingFee), strong: true },
    ...card.bookingFeeLines.map((l) => ({ label: l.label, value: l.value })),
    ...(card.convenienceFee > 0 ? [{ label: 'PAYMENT CONVENIENCE FEE', value: money(card.convenienceFee), strong: true }] : []),
  ]
  const venueRows: { label: string; value: string; strong?: boolean }[] =
    card.venueTotal == null
      ? []
      : [
          { label: card.venueTitle, value: money(card.venueTotal), strong: true },
          ...(card.venueItems.length > 1
            ? [...card.venueItems.map((i) => ({ label: i.label, value: i.amount != null ? money(i.amount) : '-' })), { label: 'Paid at', value: card.venueNote }]
            : [{ label: card.venueItems[0]?.label ?? 'Consultation fee', value: card.venueNote }]),
        ]
  const rowH = 16
  const sumH = 10 + rows.length * rowH + (venueRows.length ? 14 + venueRows.length * rowH : 0) + 8 + 30
  ensure(sumH + 20)
  text('ORDER SUMMARY', M, y, 8.5, { b: true, color: MUTED })
  y -= 8
  const boxTop = y
  page.drawRectangle({ x: M, y: boxTop - sumH, width: W, height: sumH, borderColor: BORDER, borderWidth: 0.9 })
  let ry = boxTop - 20
  const drawRow = (r: { label: string; value: string; strong?: boolean }) => {
    text(r.label, M + 16, ry, 9.5, { b: r.strong, color: r.strong ? INK : MUTED })
    right(r.value, R - 16, ry, 9.5, { b: r.strong, color: r.strong ? INK : MUTED })
    ry -= rowH
  }
  rows.forEach(drawRow)
  if (venueRows.length) {
    ry += rowH - 8
    dashed(ry, M + 16, R - 16)
    ry -= 14
    venueRows.forEach(drawRow)
  }
  const bandY = boxTop - sumH
  page.drawRectangle({ x: M, y: bandY, width: W, height: 30, color: BAND })
  text(card.amountLabel, M + 16, bandY + 11, 10.5, { b: true })
  right(money(card.amount), R - 16, bandY + 11, 10.5, { b: true })
  y = bandY - 22

  // 6. Booking facts, two by two
  const facts: [string, string][] = [
    ['Booking date & time', cardStamp(card.bookedAt)],
    ['Payment type', card.paymentType ?? (card.isFollowUp ? 'Free follow-up' : 'Online')],
    ['Transaction ID', card.transactionId ?? card.code],
    ['Patient', [card.patient.name, card.patient.ageSex].filter(Boolean).join(' · ')],
  ]
  const colW = (W - 24) / 2
  const factLines = facts.map(([, v]) => wrap(v, bold, 10, colW))
  const rowHeights = [Math.max(factLines[0].length, factLines[1].length), Math.max(factLines[2].length, factLines[3].length)].map((n) => 16 + n * 13 + 8)
  ensure(rowHeights[0] + rowHeights[1] + 30)
  facts.forEach(([label], i) => {
    const col = i % 2
    const rowIdx = Math.floor(i / 2)
    const fx = M + col * (colW + 24)
    const fy = y - (rowIdx === 0 ? 0 : rowHeights[0])
    text(label, fx, fy, 8.5, { color: MUTED })
    factLines[i].forEach((l, n) => text(l, fx, fy - 14 - n * 13, 10, { b: true, color: i === 0 && !confirmed ? AMBER : INK }))
  })
  y -= rowHeights[0] + rowHeights[1] + 4

  // 7. Disclaimer and footer
  ensure(26)
  centered('This is a booking confirmation, not a medical record or prescription.', y, 8.5, { color: MUTED })
  y -= 13
  centered(`© ${new Date().getFullYear()} Consult Your Doctor`, y, 8.5, { color: MUTED })

  return doc.save()
}
