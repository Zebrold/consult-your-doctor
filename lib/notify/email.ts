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

import path from 'node:path'

export type EmailAttachment = {
  filename: string
  content?: Uint8Array | Buffer | string
  path?: string
  contentType?: string
  cid?: string
}

export type Email = {
  to: string
  subject: string
  /** Plain paragraphs; links are written out in full. */
  paragraphs: string[]
  attachments?: EmailAttachment[]
  button?: { text: string; url: string }
  html?: string
}

const escape = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const linkify = (s: string) => escape(s).replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#0050cb;font-weight:600;text-decoration:underline;">${url}</a>`)

function html(paragraphs: string[], button?: { text: string; url: string }) {
  const logoUrl = 'https://www.consultyourdoctor.de/logo-icon.png'

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consult Your Doctor</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; width: 100%; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 32px 14px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 590px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 35px rgba(0, 80, 203, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Top Multi-Tone Brand Accent Line -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #0050cb 0%, #0066ff 40%, #06b6d4 75%, #10b981 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header with Official Website Logo -->
          <tr>
            <td style="padding: 22px 28px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right: 14px;">
                    <a href="https://www.consultyourdoctor.de" target="_blank" style="text-decoration: none; display: block;">
                      <img src="${logoUrl}" width="48" height="48" alt="Consult your Doctor" style="display: block; border: 0; outline: none; width: 48px; height: 48px; border-radius: 12px;" />
                    </a>
                  </td>
                  <td valign="middle">
                    <a href="https://www.consultyourdoctor.de" target="_blank" style="text-decoration: none;">
                      <div style="font-size: 21px; font-weight: 800; color: #0050cb; letter-spacing: -0.4px; line-height: 1.15; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Consult your Doctor</div>
                      <div style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Verified Healthcare Network</div>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 30px 28px 24px; font-size: 14.5px; line-height: 1.65; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${paragraphs.map((p) => `<p style="margin: 0 0 16px;">${linkify(p)}</p>`).join('')}
              ${
                button
                  ? `<div style="margin: 28px 0 10px; text-align: center;">
                      <a href="${button.url}" target="_blank" style="display: inline-block; padding: 14px 36px; background-color: #0050cb; color: #ffffff; text-decoration: none; font-weight: 700; border-radius: 50px; font-size: 14.5px; box-shadow: 0 4px 16px rgba(0, 80, 203, 0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${escape(button.text)} &rarr;</a>
                    </div>`
                  : ''
              }
            </td>
          </tr>

          <!-- Corporate Medical Footer -->
          <tr>
            <td style="padding: 22px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11.5px; line-height: 1.5; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="font-weight: 700; color: #334155; margin-bottom: 3px;">Consult Your Doctor &bull; Verified Healthcare Network</div>
              <div>A service of Zebrold International Pvt Ltd &bull; Confidential Healthcare Notification</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Sends an email if SMTP is configured. Returns whether it was sent; failures are logged, never thrown. */
export async function sendEmail(email: Email): Promise<boolean> {
  if (!emailConfigured()) {
    console.info(`[Email Preview / No SMTP] To: ${email.to} | Subject: ${email.subject}`)
    return false
  }
  try {
    const from = getFromAddress()
    const logoPath = path.join(process.cwd(), 'public', 'logo-icon.png')
    const finalAttachments: any[] = []

    if (email.attachments) {
      for (const a of email.attachments) {
        finalAttachments.push({
          filename: a.filename,
          content: a.content ? (Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content)) : undefined,
          path: a.path,
          contentType: a.contentType,
          cid: a.cid,
        })
      }
    }

    const renderedHtml = email.html || html(email.paragraphs, email.button)

    // Automatically embed the website logo as an inline CID image if referenced
    if (renderedHtml.includes('cid:cydlogo') && !finalAttachments.some((a) => a.cid === 'cydlogo')) {
      finalAttachments.push({
        filename: 'logo-icon.png',
        path: logoPath,
        cid: 'cydlogo',
        contentType: 'image/png',
      })
    }

    await mailer().sendMail({
      from,
      to: email.to,
      subject: email.subject,
      text: email.paragraphs.join('\n\n') + (email.button ? `\n\n${email.button.text}: ${email.button.url}` : ''),
      html: renderedHtml,
      attachments: finalAttachments,
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

const partnerNoun = (kind: 'hospital' | 'diagnostic_center') => (kind === 'hospital' ? 'hospital' : 'diagnostic centre')

/** Sent when a hospital or diagnostic centre applies to join the network. */
export async function sendPartnerApplicationReceivedEmail(args: {
  to: string
  contactName: string
  organizationName: string
  kind: 'hospital' | 'diagnostic_center'
}) {
  const noun = partnerNoun(args.kind)
  return sendEmail({
    to: args.to,
    subject: `Consult Your Doctor: ${args.kind === 'hospital' ? 'Hospital' : 'Diagnostic centre'} application received`,
    paragraphs: [
      `Dear ${args.contactName},`,
      `Thank you for applying to list ${args.organizationName} as a partner ${noun} on Consult Your Doctor.`,
      `Our operations team will check the registration and accreditation details you sent and contact you on this email address or your phone number. Once your ${noun} is approved, we will set up the staff login your team uses to manage its listing, bookings and payments.`,
    ],
  })
}

/** Sent when an executive approves a hospital or diagnostic centre application. The password is shared separately. */
export async function sendPartnerApprovedEmail(args: {
  to: string
  contactName: string
  organizationName: string
  kind: 'hospital' | 'diagnostic_center'
  staffId: string
  signInUrl: string
}) {
  const noun = partnerNoun(args.kind)
  return sendEmail({
    to: args.to,
    subject: `Consult Your Doctor: ${args.organizationName} is approved`,
    paragraphs: [
      `Dear ${args.contactName},`,
      `${args.organizationName} is now a partner ${noun} on Consult Your Doctor.`,
      `Your team logs in with the staff ID ${args.staffId}. Our operations team will give you the password separately; we never send passwords by email.`,
    ],
    button: { text: 'Go to the staff login', url: args.signInUrl },
  })
}
