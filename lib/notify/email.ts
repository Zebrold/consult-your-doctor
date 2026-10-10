import nodemailer, { type Transporter } from 'nodemailer'

// Email to patients and staff.
// Configure SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS; MAIL_FROM overrides sender.
export function getFromAddress(): string {
  if (process.env.MAIL_FROM?.trim()) return process.env.MAIL_FROM.trim()
  if (process.env.RESEND_API_KEY?.trim()) {
    return 'Consult Your Doctor <no-reply@consultyourdoctor.de>'
  }
  if (process.env.SMTP_USER?.trim() && process.env.SMTP_USER.includes('@')) {
    return `Consult Your Doctor <${process.env.SMTP_USER.trim()}>`
  }
  return 'Consult Your Doctor <no-reply@consultyourdoctor.de>'
}

export const emailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY?.trim() || process.env.SMTP_HOST?.trim())

let transport: Transporter | null = null
export function mailer() {
  if (transport) return transport

  const resendKey = process.env.RESEND_API_KEY?.trim()
  if (resendKey) {
    // Resend provides a direct SMTP relay for nodemailer via smtp.resend.com
    transport = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: resendKey,
      },
    })
    return transport
  }

  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()

  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim(),
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  })
  return transport
}

/** Verifies whether current SMTP credentials and connection are valid */
export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) {
    return { ok: false, error: 'Neither RESEND_API_KEY nor SMTP_HOST is set in .env.local' }
  }
  try {
    await mailer().verify()
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

export type Email = {
  to: string
  subject: string
  /** Plain paragraphs; links are written out in full. */
  paragraphs: string[]
  attachments?: { filename: string; content: Uint8Array; contentType: string }[]
  button?: { text: string; url: string }
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const linkify = (s: string) => escape(s).replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#0066ff">${url}</a>`)

function html(paragraphs: string[], button?: { text: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.06);overflow:hidden">
<tr><td style="background:#0066ff;padding:24px 28px;color:#ffffff">
  <div style="font-size:22px;font-weight:bold;letter-spacing:-0.5px">Consult Your Doctor</div>
  <div style="font-size:13px;opacity:0.9;margin-top:4px">Verified Healthcare Network</div>
</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.65;color:#1e293b">
  ${paragraphs.map((p) => `<p style="margin:0 0 16px">${linkify(p)}</p>`).join('')}
  ${
    button
      ? `<div style="margin:24px 0 12px;text-align:center">
          <a href="${button.url}" style="display:inline-block;padding:12px 28px;background:#0066ff;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:8px;font-size:15px">${escape(button.text)}</a>
        </div>`
      : ''
  }
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5">
  This is an automated notification from Consult Your Doctor (a service of Zebrold International Pvt Ltd). Please keep sensitive health and authentication details confidential.
</td></tr>
</table></td></tr></table></body></html>`
}

/** Sends an email if SMTP is configured. Returns whether it was sent; failures are logged, never thrown. */
export async function sendEmail(email: Email): Promise<boolean> {
  if (!emailConfigured()) {
    console.info(`[Email Preview / No SMTP] To: ${email.to} | Subject: ${email.subject}`)
    return false
  }
  try {
    const from = getFromAddress()
    await mailer().sendMail({
      from,
      to: email.to,
      subject: email.subject,
      text: email.paragraphs.join('\n\n') + (email.button ? `\n\n${email.button.text}: ${email.button.url}` : ''),
      html: html(email.paragraphs, email.button),
      attachments: email.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content), contentType: a.contentType })),
    })
    console.info(`[Email Sent] To: ${email.to} | From: ${from} | Subject: ${email.subject}`)
    return true
  } catch (err: unknown) {
    const error = err as Record<string, unknown> | Error
    console.error('[Email Send Failed]:', error)
    if (typeof error === 'object' && error !== null) {
      if ('code' in error) console.error('[SMTP Error Code]:', (error as { code: unknown }).code)
      if ('response' in error) console.error('[SMTP Server Response]:', (error as { response: unknown }).response)
    }
    return false
  }
}

/** Sends appointment confirmation with token and booking reference */
export async function sendAppointmentConfirmationEmail(args: {
  to: string
  patientName: string
  doctorName: string
  hospitalName: string
  appointmentDate: string
  tokenNumber: string | number
  bookingId: string
  siteUrl: string
}) {
  return sendEmail({
    to: args.to,
    subject: `Appointment Confirmed: Dr. ${args.doctorName} (Token #${args.tokenNumber})`,
    paragraphs: [
      `Hello ${args.patientName},`,
      `Your consultation with Dr. ${args.doctorName} at ${args.hospitalName} has been confirmed.`,
      `Token Number: #${args.tokenNumber}`,
      `Booking Reference ID: ${args.bookingId}`,
      `Scheduled Date & Time: ${args.appointmentDate}`,
      `Please arrive 15 minutes prior to your consultation. You can view, reschedule, or manage this appointment in your patient dashboard.`,
    ],
    button: { text: 'View Appointment', url: `${args.siteUrl}/patient/appointments` },
  })
}

/** Sends support ticket receipt confirmation to the user */
export async function sendTicketConfirmationEmail(args: {
  to: string
  requesterName: string
  ticketCode: string
  category: string
  subject: string
  siteUrl: string
}) {
  return sendEmail({
    to: args.to,
    subject: `[${args.ticketCode}] Support Request Received: ${args.subject}`,
    paragraphs: [
      `Hello ${args.requesterName},`,
      `We have received your support request regarding "${args.category}". Our executive team is actively investigating it.`,
      `Ticket ID: ${args.ticketCode}`,
      `Subject: ${args.subject}`,
      `You will receive an update here as soon as an executive responds.`,
    ],
    button: { text: 'Track Support Ticket', url: `${args.siteUrl}/patient/support` },
  })
}

/** Sends ticket reply from executive to user */
export async function sendTicketReplyEmail(args: {
  to: string
  requesterName: string
  ticketCode: string
  executiveName: string
  message: string
  status: string
  siteUrl: string
}) {
  return sendEmail({
    to: args.to,
    subject: `[Update - ${args.ticketCode}] Reply from Executive Support`,
    paragraphs: [
      `Hello ${args.requesterName},`,
      `${args.executiveName} from Executive Support has updated your ticket (${args.ticketCode}):`,
      `"${args.message}"`,
      `Current Status: ${args.status.toUpperCase().replace(/_/g, ' ')}`,
    ],
    button: { text: 'View Ticket Thread', url: `${args.siteUrl}/patient/support` },
  })
}

/** Sends doctor registration confirmation email upon submission */
export async function sendDoctorRegistrationReceivedEmail(args: {
  to: string
  doctorName: string
  specialty: string
}) {
  return sendEmail({
    to: args.to,
    subject: 'Consult Your Doctor: Clinician Application Received',
    paragraphs: [
      `Dear Dr. ${args.doctorName},`,
      `Thank you for applying to join the Consult Your Doctor clinician network as a specialist in ${args.specialty}.`,
      `Our medical verification board is reviewing your registration documents and council credentials. Once verified by our Super Admin or Executive team, you will receive an account activation link to access the Doctor Panel.`,
      `Expected verification turnaround: 24 to 48 hours.`,
    ],
  })
}

/** Sends doctor account activation email with secure setup link */
export async function sendDoctorActivationEmail(args: {
  to: string
  doctorName: string
  activationLink: string
  hospitalName?: string
}) {
  return sendEmail({
    to: args.to,
    subject: 'Welcome to Consult Your Doctor: Activate Clinician Account',
    paragraphs: [
      `Dear Dr. ${args.doctorName},`,
      `Your clinician account for Consult Your Doctor${args.hospitalName ? ` with ${args.hospitalName}` : ''} is approved and ready.`,
      `Please click the button below to set your password and access your Doctor Panel.`,
      `For security, this setup link is personalized and expires in 48 hours.`,
    ],
    button: { text: 'Activate Doctor Account', url: args.activationLink },
  })
}
