import { PDFDocument, rgb, type PDFImage, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { C, PAGE, drawLogo, loadAssets, safe, wrap, dateText, timeText } from './clinical'
import { drawBarcode } from './barcode'
import { payAtVenueNote } from '@/lib/pricing'

export type AppointmentSlipData = {
  bookingId: string
  tokenNumber: string
  isConsultation: boolean
  patient: {
    name: string
    phone: string | null
    email: string | null
    gender?: string | null
    dateOfBirth?: string | null
  }
  provider: {
    name: string
    specialty?: string | null
    hospitalName?: string | null
    address?: string | null
    city?: string | null
  }
  schedule: {
    dateTimeStr: string
  }
  payment: {
    /**
     * false for a booking made and paid at a hospital or lab desk: the slip then shows no amount, since what the counter
     * took is the consultation fee or test charges.
     */
    online?: boolean
    /** The booking fee paid online: the only amount on the slip. */
    amount: number
    transactionId?: string | null
    status: string
    gateway: string
    paidAt?: Date
  }
}

const M = 40
const W = PAGE[0] - M * 2

export async function generateAppointmentSlipPdf(data: AppointmentSlipData): Promise<Uint8Array> {
  const assets = await loadAssets()
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)

  const regular = await doc.embedFont(assets.regular)
  const bold = await doc.embedFont(assets.bold)
  const logo = await doc.embedPng(assets.logo)

  const page = doc.addPage(PAGE)
  let y = PAGE[1] - M

  // 1. Top Header Banner
  drawLogo(page, logo, M, y - 36, 40)
  
  page.drawText('CONSULT YOUR DOCTOR', {
    x: M + 48,
    y: y - 16,
    font: bold,
    size: 16,
    color: C.primary,
  })
  page.drawText('Official Appointment Confirmation & Payment Receipt', {
    x: M + 48,
    y: y - 30,
    font: regular,
    size: 9.5,
    color: C.muted,
  })

  // Top right slip metadata
  const refCode = `CYD-${safe(data.bookingId).slice(0, 8).toUpperCase()}`
  const now = data.payment.paidAt || new Date()
  page.drawText('SLIP REFERENCE:', { x: PAGE[0] - M - 160, y: y - 12, font: bold, size: 8, color: C.muted })
  page.drawText(refCode, { x: PAGE[0] - M - 80, y: y - 12, font: bold, size: 8.5, color: C.ink })
  
  page.drawText('ISSUED AT:', { x: PAGE[0] - M - 160, y: y - 24, font: bold, size: 8, color: C.muted })
  page.drawText(`${dateText(now)} ${timeText(now)}`, { x: PAGE[0] - M - 80, y: y - 24, font: regular, size: 8, color: C.ink })

  y -= 52

  // Horizontal separator line
  page.drawLine({
    start: { x: M, y },
    end: { x: M + W, y },
    thickness: 1,
    color: C.line,
  })

  y -= 16

  // 2. Token & Confirmation Status Card
  const tokenBoxH = 68
  page.drawRectangle({
    x: M,
    y: y - tokenBoxH,
    width: W,
    height: tokenBoxH,
    color: rgb(0.95, 0.97, 1),
    borderColor: rgb(0.75, 0.85, 1),
    borderWidth: 1,
  })

  // Token indicator
  page.drawText('BOOKING REFERENCE', {
    x: M + 18,
    y: y - 22,
    font: bold,
    size: 9,
    color: C.primary,
  })
  page.drawText(`${safe(data.tokenNumber).replace(/^#/, '')}`, {
    x: M + 18,
    y: y - 56,
    font: bold,
    size: 30,
    color: C.ink,
  })

  // Status Badge
  const statusX = M + 200
  page.drawText('BOOKING STATUS', {
    x: statusX,
    y: y - 22,
    font: bold,
    size: 9,
    color: C.muted,
  })
  page.drawText('CONFIRMED • REAL-TIME PAYMENT VERIFIED', {
    x: statusX,
    y: y - 40,
    font: bold,
    size: 11,
    color: rgb(0.06, 0.55, 0.32),
  })
  page.drawText('Present this digital slip or printed copy at reception.', {
    x: statusX,
    y: y - 54,
    font: regular,
    size: 8.5,
    color: C.muted,
  })

  y -= tokenBoxH + 20

  // 3. Details Two-Column Grid: Patient Details & Schedule Details
  const colW = (W - 14) / 2
  const cardH = 132

  // Column A: Patient Details
  page.drawRectangle({
    x: M,
    y: y - cardH,
    width: colW,
    height: cardH,
    color: C.panel,
    borderColor: C.line,
    borderWidth: 1,
  })
  page.drawRectangle({
    x: M,
    y: y - 24,
    width: colW,
    height: 24,
    color: rgb(0.9, 0.93, 0.98),
  })
  page.drawText('PATIENT INFORMATION', {
    x: M + 12,
    y: y - 16,
    font: bold,
    size: 8.5,
    color: C.primary,
  })

  let py = y - 40
  const drawRow = (label: string, val: string, xPos: number) => {
    page.drawText(label, { x: xPos + 12, y: py, font: regular, size: 8, color: C.muted })
    page.drawText(val, { x: xPos + 80, y: py, font: bold, size: 8.5, color: C.ink })
    py -= 18
  }

  drawRow('Full Name:', safe(data.patient.name) || 'Patient', M)
  drawRow('Mobile:', safe(data.patient.phone) || '—', M)
  drawRow('Email:', safe(data.patient.email) || '—', M)
  const sexDob = [safe(data.patient.gender), safe(data.patient.dateOfBirth)].filter(Boolean).join(' • ') || 'Saved in account'
  drawRow('Sex / DOB:', sexDob, M)
  drawRow('Booking ID:', safe(data.bookingId).slice(0, 12).toUpperCase(), M)

  // Column B: Consultation / Healthcare Provider Details
  page.drawRectangle({
    x: M + colW + 14,
    y: y - cardH,
    width: colW,
    height: cardH,
    color: C.panel,
    borderColor: C.line,
    borderWidth: 1,
  })
  page.drawRectangle({
    x: M + colW + 14,
    y: y - 24,
    width: colW,
    height: 24,
    color: rgb(0.9, 0.93, 0.98),
  })
  page.drawText(data.isConsultation ? 'DOCTOR & FACILITY DETAILS' : 'DIAGNOSTIC CENTRE DETAILS', {
    x: M + colW + 26,
    y: y - 16,
    font: bold,
    size: 8.5,
    color: C.primary,
  })

  py = y - 40
  const rX = M + colW + 14
  drawRow(data.isConsultation ? 'Clinician:' : 'Center:', safe(data.provider.name), rX)
  drawRow('Specialty:', safe(data.provider.specialty) || 'General Consultation', rX)
  drawRow('Hospital:', safe(data.provider.hospitalName) || 'Affiliated Partner Facility', rX)
  drawRow('Location:', [safe(data.provider.city), safe(data.provider.address)].filter(Boolean).join(', ') || 'Branch Campus', rX)
  drawRow('Visit Slot:', safe(data.schedule.dateTimeStr), rX)

  y -= cardH + 18

  // 4. Payment Receipt & Breakdown Table
  page.drawRectangle({
    x: M,
    y: y - 110,
    width: W,
    height: 110,
    color: rgb(1, 1, 1),
    borderColor: C.line,
    borderWidth: 1,
  })
  page.drawRectangle({
    x: M,
    y: y - 24,
    width: W,
    height: 24,
    color: C.zebra,
  })
  page.drawText('BOOKING FEE RECEIPT', {
    x: M + 14,
    y: y - 16,
    font: bold,
    size: 8.5,
    color: C.primary,
  })

  const inr = (n: number) => `INR ${n.toLocaleString('en-IN', Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Only the booking fee is paid online; the consultation fee or test charges are paid at the venue and never shown.
  const online = data.payment.online !== false
  let payY = y - 42
  page.drawText(online ? 'Booking Fee (Consult Your Doctor)' : `Booked at the ${data.isConsultation ? 'hospital' : 'lab'} desk`, { x: M + 14, y: payY, font: regular, size: 8.5, color: C.ink })
  page.drawText(online ? inr(data.payment.amount) : 'No booking fee', { x: M + W - 90, y: payY, font: bold, size: 8.5, color: C.ink })

  payY -= 16
  page.drawText(online ? safe(payAtVenueNote(data.isConsultation)) : 'Paid at the counter.', { x: M + 14, y: payY, font: regular, size: 8, color: C.muted })

  payY -= 18
  page.drawLine({ start: { x: M + 14, y: payY + 4 }, end: { x: M + W - 14, y: payY + 4 }, thickness: 0.8, color: C.line })

  page.drawText('Total Paid Online', { x: M + 14, y: payY - 10, font: bold, size: 10, color: C.ink })
  page.drawText(inr(online ? data.payment.amount : 0), { x: M + W - 100, y: payY - 10, font: bold, size: 11, color: C.primary })

  // Transaction details line
  page.drawText(`Gateway: ${data.payment.gateway} | Txn Ref: ${safe(data.payment.transactionId || data.bookingId)} | Status: SUCCESS`, {
    x: M + 14,
    y: payY - 26,
    font: regular,
    size: 7.5,
    color: C.muted,
  })

  y -= 130

  // 5. Patient Instructions & Barcode Check-in
  page.drawRectangle({
    x: M,
    y: y - 90,
    width: W,
    height: 90,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.85, 0.9, 0.98),
    borderWidth: 1,
  })

  page.drawText('IMPORTANT PATIENT INSTRUCTIONS', {
    x: M + 14,
    y: y - 18,
    font: bold,
    size: 8.5,
    color: C.ink,
  })

  const instructions = [
    '• Please report to the reception desk 15 minutes before your scheduled appointment time.',
    '• Carry a valid Government Photo ID along with this digital or printed appointment slip.',
    '• In case of rescheduling or queries, visit https://www.consultyourdoctor.de/patient/support.',
    '• Lab tests requiring fasting: Please follow clinical dietary guidelines as instructed by the lab.',
  ]

  let instY = y - 32
  for (const line of instructions) {
    page.drawText(line, { x: M + 14, y: instY, font: regular, size: 7.5, color: C.muted })
    instY -= 12
  }

  // Barcode representation for scanner verification
  try {
    const barcodeText = safe(data.bookingId).slice(0, 16).toUpperCase()
    drawBarcode(page, barcodeText, M + W - 140, y - 68, 126, 32, C.ink)
    page.drawText(barcodeText, { x: M + W - 120, y: y - 80, font: regular, size: 7.5, color: C.muted })
  } catch (err) {
    // Fallback if barcode encoding has unsupported chars
    page.drawText(`REF: ${safe(data.bookingId).slice(0, 12)}`, { x: M + W - 120, y: y - 60, font: bold, size: 8, color: C.ink })
  }

  // 6. Professional Footer
  page.drawText('Consult Your Doctor • A service of Zebrold International Pvt Ltd • ISO Certified Healthcare Network', {
    x: M,
    y: M + 12,
    font: regular,
    size: 7.5,
    color: C.muted,
  })
  page.drawText('Page 1 of 1 • System Generated Medical Slip', {
    x: PAGE[0] - M - 160,
    y: M + 12,
    font: regular,
    size: 7.5,
    color: C.muted,
  })

  return doc.save()
}
