import { after } from 'next/server'
import { siteUrl } from '@/lib/site-url'
import { createAdminClient } from '@/lib/supabase/admin'
import { RECORD_BUCKET } from '@/lib/records'
import { sendEmail } from './email'
import { sendWhatsApp } from './whatsapp'
import { sendBookingConfirmationSms, sendReportReadySms, sendAccountCreatedSms } from './sms'

// What patients hear about, on WhatsApp and (when they gave an email address) by email. Everything runs after the
// staff member's request has been answered, so a slow or failing provider never holds up the desk.

type Admin = ReturnType<typeof createAdminClient>

export const SITE_URL = siteUrl()

// Generated placeholder addresses are not real inboxes.
const realEmail = (email: string | null | undefined) => (email && email.includes('@') && !email.endsWith('.internal') ? email : null)
const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there'

type Contact = { name: string; phone: string | null; email: string | null }

async function patientContact(admin: Admin, patientId: string): Promise<Contact | null> {
  const { data } = await admin.from('profiles').select('full_name, phone_number, email').eq('id', patientId).maybeSingle()
  if (!data) return null
  return { name: data.full_name || 'Patient', phone: data.phone_number, email: realEmail(data.email) }
}

function later(label: string, task: (admin: Admin) => Promise<void>) {
  after(async () => {
    try {
      await task(createAdminClient())
    } catch (err) {
      console.error(`notify ${label}:`, err)
    }
  })
}

/** A prescription or lab report is in the patient's account: send it on WhatsApp and attach it to an email. */
export function notifyReportReady(args: { patientId: string; what: string; from: string; path: string; filename: string; contentType: string; file?: Uint8Array }) {
  later('report', async (admin) => {
    const contact = await patientContact(admin, args.patientId)
    if (!contact) return

    // WhatsApp fetches the document itself, from a signed link to the private file (valid for a week).
    const { data: signed } = await admin.storage.from(RECORD_BUCKET).createSignedUrl(args.path, 7 * 86_400)
    if (signed?.signedUrl) {
      await sendWhatsApp(contact.phone, {
        name: 'cyd_report_ready',
        params: [firstName(contact.name), args.what, args.from],
        document: { link: signed.signedUrl, filename: args.filename },
      })
    }

    if (contact.phone) {
      await sendReportReadySms(contact.phone, {
        patientName: firstName(contact.name),
        what: args.what,
        from: args.from,
      }).catch(() => null)
    }

    if (contact.email) {
      let file = args.file
      if (!file) {
        const { data } = await admin.storage.from(RECORD_BUCKET).download(args.path)
        file = data ? new Uint8Array(await data.arrayBuffer()) : undefined
      }
      await sendEmail({
        to: contact.email,
        subject: `Your ${args.what} from ${args.from}`,
        paragraphs: [
          `Hello ${firstName(contact.name)},`,
          `Your ${args.what} from ${args.from} is ${file ? 'attached to this email' : 'ready'}.`,
          `You can also open it any time in your Consult Your Doctor account: ${SITE_URL}/patient/profile`,
        ],
        attachments: file ? [{ filename: args.filename, content: file, contentType: args.contentType }] : undefined,
      })
    }
  })
}

import QRCode from 'qrcode'
import { generateAppointmentSlipPdf } from '@/lib/pdf/appointment-slip'
import { payAtVenueNote } from '@/lib/pricing'
import { formatINR } from '@/components/patient/format'
import { loadBookingCard, type BookingCard } from '@/lib/booking-card'
import { BOOKING_QR_CID, WHITE_LOGO_CID, bookingEmailLines, bookingEmailSubject, buildBookingEmailHtml } from './booking-email'
import path from 'node:path'

/** The booking email (the same layout as the booking page), with the QR code inline once the booking is paid. */
async function sendBookingEmail(card: BookingCard, opts: { failureReason?: string | null; slip?: { filename: string; content: Uint8Array } | null }) {
  if (!card.patient.email || !realEmail(card.patient.email)) return
  const confirmed = card.state === 'confirmed'
  const qr = confirmed ? await QRCode.toBuffer(card.links.confirmation, { margin: 1, width: 240 }) : null
  await sendEmail({
    to: card.patient.email,
    subject: bookingEmailSubject(card, !!opts.failureReason),
    paragraphs: bookingEmailLines(card, opts),
    html: buildBookingEmailHtml(card, opts),
    attachments: [
      ...(qr ? [{ filename: 'booking-qr.png', content: qr, contentType: 'image/png', cid: BOOKING_QR_CID }] : []),
      ...(card.followUp ? [{ filename: 'logo-icon-white.png', path: path.join(process.cwd(), 'public', 'logo-icon-white.png'), contentType: 'image/png', cid: WHITE_LOGO_CID }] : []),
      ...(opts.slip ? [{ filename: opts.slip.filename, content: opts.slip.content, contentType: 'application/pdf' }] : []),
    ],
  })
}

/**
 * A booking has been paid (online, at a desk, or it is a free follow-up): sends the confirmation by email (with the PDF
 * slip attached), WhatsApp and SMS. `bookingId` is the full id of the appointment or lab booking.
 */
export function notifyBookingConfirmed(bookingId: string) {
  later('booking', async (admin) => {
    const card = await loadBookingCard(admin, bookingId)
    if (!card || card.state !== 'confirmed') return
    const contact = await patientContact(admin, card.patientId)
    if (!contact) return
    const isConsultation = card.kind === 'consultation'
    const what = isConsultation ? `consultation with ${card.title}` : `lab tests (${card.title})`
    const dateTimeStr = card.when ?? 'Scheduled visit'
    const { data: details } = await admin.from('patient_details').select('gender, date_of_birth').eq('id', card.patientId).maybeSingle()

    let pdfBytes: Uint8Array | null = null
    try {
      pdfBytes = await generateAppointmentSlipPdf({
        bookingId: card.id,
        tokenNumber: card.token ?? card.code,
        isConsultation,
        patient: { name: contact.name, phone: contact.phone, email: contact.email, gender: details?.gender, dateOfBirth: details?.date_of_birth },
        provider: { name: card.title, specialty: card.subtitle, hospitalName: card.place, address: card.placeLines[0] ?? null, city: card.placeLines[1] ?? null },
        schedule: { dateTimeStr },
        payment: {
          online: card.bookingFeeLines.some((l) => l.label === 'Collected by' && l.value === 'Consult your Doctor'),
          amount: card.bookingFee + card.convenienceFee,
          convenienceFee: card.convenienceFee,
          transactionId: card.transactionId ?? card.id,
          status: 'PAID',
          gateway: card.paymentType ?? 'Online',
          paidAt: new Date(),
        },
      })
    } catch (pdfErr) {
      console.error('Failed to generate appointment slip PDF:', pdfErr)
    }

    let signedUrl: string | null = null
    const filename = `Appointment_Slip_${card.code}.pdf`
    if (pdfBytes) {
      try {
        const storagePath = `slips/${card.id}_${Date.now()}.pdf`
        await admin.storage.from(RECORD_BUCKET).upload(storagePath, pdfBytes, { upsert: true, contentType: 'application/pdf' })
        const { data: signed } = await admin.storage.from(RECORD_BUCKET).createSignedUrl(storagePath, 7 * 86_400)
        signedUrl = signed?.signedUrl ?? null
      } catch (storageErr) {
        console.warn('Could not store appointment slip in bucket:', storageErr)
      }
    }

    // 1. WhatsApp with the PDF slip
    await sendWhatsApp(contact.phone, {
      name: 'cyd_booking_confirmed',
      params: [firstName(contact.name), what, card.place, card.code, card.isFollowUp ? 'no booking fee (free follow-up)' : `${formatINR(card.bookingFee)} booking fee`],
      note: payAtVenueNote(isConsultation),
      ...(signedUrl ? { document: { link: signedUrl, filename } } : {}),
    })

    // 2. SMS alert
    if (contact.phone) {
      await sendBookingConfirmationSms(contact.phone, { bookingId: card.code, doctorOrLab: what, hospital: card.place, date: dateTimeStr }).catch(() => null)
    }

    // 3. Email in the booking page's layout, with the slip attached
    await sendBookingEmail(card, { slip: pdfBytes ? { filename, content: pdfBytes } : null })
  })
}

/**
 * A payment for an unpaid booking failed or was cancelled at PayU: emails the patient the booking, still waiting for
 * payment, with the reason and a button to pay again. The booking keeps its slot until its hold ends.
 */
export function notifyPaymentPending(bookingId: string, reason: string | null) {
  later('payment-pending', async (admin) => {
    const card = await loadBookingCard(admin, bookingId)
    if (!card || card.state !== 'pending') return
    await sendBookingEmail(card, { failureReason: reason })
  })
}

/** Hospital staff added health details (vitals, notes or documents) to the patient's visit. */
export function notifyHealthUpdate(args: { patientId: string; hospital: string }) {
  later('health', async (admin) => {
    const contact = await patientContact(admin, args.patientId)
    if (!contact) return
    await sendWhatsApp(contact.phone, { name: 'cyd_health_update', params: [firstName(contact.name), args.hospital] })
    if (contact.email) {
      await sendEmail({
        to: contact.email,
        subject: `${args.hospital} added your health details`,
        paragraphs: [
          `Hello ${firstName(contact.name)},`,
          `${args.hospital} added your health details from today's visit to your Consult Your Doctor account. Your doctor can see them too.`,
          `View them at ${SITE_URL}/patient/profile`,
        ],
      })
    }
  })
}

/** A diagnostic centre registered the patient: send the generated Patient ID and password. */
export function notifyAccountCreated(args: { patientId: string; patientCode: string; password: string }) {
  later('account', async (admin) => {
    const contact = await patientContact(admin, args.patientId)
    if (!contact) return
    const signIn = `${SITE_URL}/login/patient`
    await sendWhatsApp(contact.phone, { name: 'cyd_account_created', params: [firstName(contact.name), args.patientCode, args.password, signIn] })
    if (contact.phone) {
      await sendAccountCreatedSms(contact.phone, {
        patientName: firstName(contact.name),
        patientCode: args.patientCode,
        password: args.password,
      }).catch(() => null)
    }
    if (contact.email) {
      await sendEmail({
        to: contact.email,
        subject: 'Your Consult Your Doctor account',
        paragraphs: [
          `Hello ${firstName(contact.name)},`,
          `Your Consult Your Doctor account is ready. Patient ID: ${args.patientCode}. Password: ${args.password}`,
          `Log in at ${signIn} with your Patient ID and password, or with your mobile number and a one-time code. Keep these details private.`,
        ],
      })
    }
  })
}

/** Sends a support ticket update to the user over WhatsApp */
export function notifyTicketWhatsApp(args: { phone: string | null | undefined; name: string; ticketCode: string; status: string }) {
  if (!args.phone) return
  later('ticket', async () => {
    await sendWhatsApp(args.phone, {
      name: 'cyd_ticket_update',
      params: [firstName(args.name), args.ticketCode, args.status],
    })
  })
}

