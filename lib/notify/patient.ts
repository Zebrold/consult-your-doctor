import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RECORD_BUCKET } from '@/lib/records'
import { sendEmail } from './email'
import { sendWhatsApp } from './whatsapp'
import { sendBookingConfirmationSms } from './sms'

// What patients hear about, on WhatsApp and (when they gave an email address) by email. Everything runs after the
// staff member's request has been answered, so a slow or failing provider never holds up the desk.

type Admin = ReturnType<typeof createAdminClient>

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.consultyourdoctor.de').replace(/\/$/, '')

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

/** A booking made at the desk has been paid. */
export function notifyBookingConfirmed(args: { patientId: string; what: string; where: string; bookingId: string; amount: string }) {
  later('booking', async (admin) => {
    const contact = await patientContact(admin, args.patientId)
    if (!contact) return
    await sendWhatsApp(contact.phone, { name: 'cyd_booking_confirmed', params: [firstName(contact.name), args.what, args.where, args.bookingId, args.amount] })
    if (contact.phone) {
      await sendBookingConfirmationSms(contact.phone, {
        bookingId: args.bookingId,
        doctorOrLab: args.what,
        hospital: args.where,
        date: 'Scheduled Visit',
      })
    }
    if (contact.email) {
      await sendEmail({
        to: contact.email,
        subject: `Booking confirmed: ${args.what}`,
        paragraphs: [
          `Hello ${firstName(contact.name)},`,
          `Your ${args.what} at ${args.where} is confirmed. Booking ID: ${args.bookingId}. Amount paid: ${args.amount}.`,
          `See your bookings at ${SITE_URL}/patient/appointments`,
        ],
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
