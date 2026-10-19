import { after } from 'next/server'
import { siteUrl } from '@/lib/site-url'
import { createAdminClient } from '@/lib/supabase/admin'
import { RECORD_BUCKET } from '@/lib/records'
import { sendEmail, buildAppointmentEmailHtml } from './email'
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

import { generateAppointmentSlipPdf } from '@/lib/pdf/appointment-slip'
import { payAtVenueNote } from '@/lib/pricing'

export type BookingConfirmationArgs = {
  patientId: string
  what: string
  where: string
  bookingId: string
  /** The booking fee paid online, e.g. "₹119". The consultation fee and test prices are paid at the venue and never named. */
  amount: string
  numericAmount?: number
  dateTimeStr?: string
  tokenNumber?: string
  isConsultation?: boolean
  doctorName?: string
  specialty?: string
  hospitalName?: string
  address?: string | null
  city?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  transactionId?: string | null
}

/** A booking's booking fee has been paid: generates the PDF appointment slip, sends it on WhatsApp and attaches it to email. */
export function notifyBookingConfirmed(args: BookingConfirmationArgs) {
  later('booking', async (admin) => {
    const contact = await patientContact(admin, args.patientId)
    if (!contact) return
    const isConsultation = args.isConsultation ?? true
    const venueNote = payAtVenueNote(isConsultation)

    // Retrieve patient extra details (gender, DOB) if available
    let gender = args.gender
    let dob = args.dateOfBirth
    if (!gender || !dob) {
      const { data: pDet } = await admin.from('patient_details').select('gender, date_of_birth').eq('id', args.patientId).maybeSingle()
      gender = gender || pDet?.gender
      dob = dob || pDet?.date_of_birth
    }

    const tokenNumber = args.tokenNumber || String(Math.abs(args.bookingId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 25) + 1).padStart(2, '0')
    const numericAmount = args.numericAmount ?? (Number(args.amount.replace(/[^\d.]/g, '')) || 0)

    let pdfBytes: Uint8Array | null = null
    try {
      pdfBytes = await generateAppointmentSlipPdf({
        bookingId: args.bookingId,
        tokenNumber,
        isConsultation,
        patient: {
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          gender,
          dateOfBirth: dob,
        },
        provider: {
          name: args.doctorName || args.what,
          specialty: args.specialty,
          hospitalName: args.hospitalName || args.where,
          address: args.address,
          city: args.city,
        },
        schedule: {
          dateTimeStr: args.dateTimeStr || 'Scheduled Visit',
        },
        payment: {
          amount: numericAmount,
          transactionId: args.transactionId || args.bookingId,
          status: 'PAID',
          gateway: 'PayU Real-Time',
          paidAt: new Date(),
        },
      })
    } catch (pdfErr) {
      console.error('Failed to generate appointment slip PDF:', pdfErr)
    }

    let signedUrl: string | null = null
    const filename = `Appointment_Slip_${args.bookingId}.pdf`

    if (pdfBytes) {
      try {
        const storagePath = `slips/${args.bookingId}_${Date.now()}.pdf`
        await admin.storage.from(RECORD_BUCKET).upload(storagePath, pdfBytes, { upsert: true, contentType: 'application/pdf' })
        const { data: signed } = await admin.storage.from(RECORD_BUCKET).createSignedUrl(storagePath, 7 * 86_400)
        signedUrl = signed?.signedUrl ?? null
      } catch (storageErr) {
        console.warn('Could not store appointment slip in bucket:', storageErr)
      }
    }

    // 1. WhatsApp with PDF document attachment & clear text confirmation
    await sendWhatsApp(contact.phone, {
      name: 'cyd_booking_confirmed',
      params: [firstName(contact.name), args.what, args.where, args.bookingId, `${args.amount} booking fee`],
      note: venueNote,
      ...(signedUrl ? { document: { link: signedUrl, filename } } : {}),
    })

    // 2. SMS alert
    if (contact.phone) {
      await sendBookingConfirmationSms(contact.phone, {
        bookingId: args.bookingId,
        doctorOrLab: args.what,
        hospital: args.where,
        date: args.dateTimeStr || 'Scheduled Visit',
      }).catch(() => null)
    }

    // 3. Email (Gmail) with executive website-matching template & official PDF appointment slip attached!
    if (contact.email) {
      const locationStr = [args.address, args.city].filter(Boolean).join(', ') || args.city || null
      const emailHtml = buildAppointmentEmailHtml({
        patientName: contact.name,
        doctorOrService: args.doctorName || args.what,
        specialty: args.specialty,
        hospitalName: args.hospitalName || args.where,
        location: locationStr,
        dateTimeStr: args.dateTimeStr || 'Scheduled Visit',
        tokenNumber,
        bookingId: args.bookingId.toUpperCase(),
        amount: args.amount,
        payAtVenue: venueNote,
        siteUrl: SITE_URL,
        pdfFilename: filename,
      })

      await sendEmail({
        to: contact.email,
        subject: `Appointment Confirmed: ${args.what} at ${args.where} (Token ${tokenNumber.replace(/^#/, '')})`,
        paragraphs: [
          `Hello ${firstName(contact.name)},`,
          `Your appointment for ${args.what} at ${args.where} is confirmed!`,
          `📋 Appointment Token: ${tokenNumber.replace(/^#/, '')}`,
          `🔖 Booking Reference ID: ${args.bookingId.toUpperCase()}`,
          `💳 Booking fee paid: ${args.amount} (PayU verified)`,
          `🏥 ${venueNote}`,
          `📅 Schedule: ${args.dateTimeStr || 'Scheduled Visit'}`,
          `Your official clinical appointment confirmation slip & receipt is attached to this email as a PDF.`,
          `You can also view and manage this visit anytime in your account at https://www.consultyourdoctor.de/patient/appointments.`,
        ],
        button: { text: 'View My Appointments', url: 'https://www.consultyourdoctor.de/patient/appointments' },
        html: emailHtml,
        attachments: pdfBytes ? [{ filename, content: pdfBytes, contentType: 'application/pdf' }] : undefined,
      })
    }
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
          `Sign in at ${signIn} with your Patient ID and password, or with your mobile number and a one-time code. Keep these details private.`,
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

