import nodemailer, { type Transporter } from 'nodemailer'
import { CANONICAL_SITE_URL } from '@/lib/site-url'

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

export type AppointmentEmailArgs = {
  patientName: string
  doctorOrService: string
  specialty?: string | null
  hospitalName: string
  location?: string | null
  dateTimeStr: string
  tokenNumber: string
  bookingId: string
  /** The booking fee paid online. */
  amount: string
  /** What is still paid in person, without an amount ("The consultation fee is … paid at the hospital counter."). */
  payAtVenue?: string
  siteUrl?: string
  pdfFilename?: string
}

/** Generates an executive, website-matching HTML email for appointment confirmations. */
export function buildAppointmentEmailHtml(args: AppointmentEmailArgs): string {
  const siteUrl = (args.siteUrl || CANONICAL_SITE_URL).replace(/\/$/, '')
  const logoUrl = 'https://www.consultyourdoctor.de/logo-icon.png'

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmed - Consult Your Doctor</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; width: 100%; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 32px 14px 44px;">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 35px rgba(0, 80, 203, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Top Multi-Tone Brand Accent Line -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #0050cb 0%, #0066ff 40%, #06b6d4 75%, #10b981 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Top Brand Header Bar matching Website TopBar -->
          <tr>
            <td style="padding: 22px 28px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right: 14px;">
                          <a href="${escape(siteUrl)}" target="_blank" style="text-decoration: none; display: block;">
                            <img src="${logoUrl}" width="48" height="48" alt="Consult your Doctor" style="display: block; border: 0; outline: none; width: 48px; height: 48px; border-radius: 12px;" />
                          </a>
                        </td>
                        <td valign="middle">
                          <a href="${escape(siteUrl)}" target="_blank" style="text-decoration: none;">
                            <div style="font-size: 21px; font-weight: 800; color: #0050cb; letter-spacing: -0.4px; line-height: 1.15; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Consult your Doctor</div>
                            <div style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Verified Healthcare Network</div>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 9999px; font-size: 11px; font-weight: 700; padding: 6px 14px; letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      &#10003; Confirmed
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ticket Hero Banner (matches Confirmation page ticket UI) -->
          <tr>
            <td style="padding: 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #0050cb 0%, #0066ff 100%); color: #ffffff;">
                <tr>
                  <td style="padding: 26px 30px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="middle">
                          <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #bfdbfe; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Official Clinical Appointment</div>
                          <div style="font-size: 38px; font-weight: 800; letter-spacing: -0.8px; line-height: 1.1; margin-top: 4px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Token ${escape(args.tokenNumber).replace(/^#/, '')}</div>
                          <div style="font-size: 12.5px; font-family: 'SF Mono', Monaco, Consolas, monospace; color: #e0f2fe; margin-top: 6px; letter-spacing: 0.5px;">Booking ID: <span style="font-weight: 700; color: #ffffff;">${escape(args.bookingId)}</span></div>
                        </td>
                        <td align="right" valign="middle" style="padding-left: 12px;">
                          <div style="background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 14px; padding: 10px 16px; text-align: right; display: inline-block;">
                            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #dbeafe; font-weight: 600;">Booking Fee Paid</div>
                            <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 2px;">${escape(args.amount)}</div>
                            <div style="font-size: 10.5px; color: #86efac; font-weight: 700; margin-top: 2px;">&#9679; PayU Verified</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 30px 28px 22px;">
              <h2 style="margin: 0 0 10px; font-size: 17px; font-weight: 700; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Hello ${escape(args.patientName)},
              </h2>
              <p style="margin: 0 0 22px; font-size: 14.5px; line-height: 1.6; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Your consultation slot has been confirmed and registered with the healthcare facility. Below is your official visit summary and check-in pass. Your formal clinical confirmation slip &amp; tax receipt is attached as a PDF.
              </p>

              <!-- Consultation Details Card (Matches Website Summary) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; background-color: #f1f5f9;">
                    <span style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #0050cb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Consultation Summary
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; width: 130px; font-weight: 500;" valign="top">Doctor / Service:</td>
                        <td style="padding: 7px 0; font-size: 14.5px; font-weight: 700; color: #0f172a;" valign="top">
                          ${escape(args.doctorOrService)}
                          ${args.specialty ? `<span style="display: inline-block; background-color: #eff6ff; color: #0050cb; font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 6px; margin-left: 6px; border: 1px solid #dbeafe;">${escape(args.specialty)}</span>` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 500;" valign="top">Hospital / Facility:</td>
                        <td style="padding: 7px 0; font-size: 14px; font-weight: 600; color: #0f172a;" valign="top">
                          ${escape(args.hospitalName)}
                          ${args.location ? `<div style="font-size: 12.5px; color: #64748b; font-weight: normal; margin-top: 2px;">&#128205; ${escape(args.location)}</div>` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 500;" valign="top">Scheduled Slot:</td>
                        <td style="padding: 7px 0; font-size: 14px; font-weight: 700; color: #0050cb;" valign="top">
                          &#128197; ${escape(args.dateTimeStr)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 500;" valign="top">Patient Name:</td>
                        <td style="padding: 7px 0; font-size: 14px; font-weight: 600; color: #0f172a;" valign="top">
                          ${escape(args.patientName)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 500;" valign="top">Booking fee:</td>
                        <td style="padding: 7px 0; font-size: 14px; font-weight: 700; color: #059669;" valign="top">
                          &#10003; ${escape(args.amount)} paid online <span style="font-size: 12px; font-weight: normal; color: #64748b;">&bull; PayU verified</span>
                        </td>
                      </tr>${args.payAtVenue ? `
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 500;" valign="top">At your visit:</td>
                        <td style="padding: 7px 0; font-size: 13.5px; font-weight: 600; color: #0f172a;" valign="top">
                          ${escape(args.payAtVenue)}
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Official PDF Attachment Callout Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f7ff; border: 1px solid #bae6fd; border-radius: 14px; margin-bottom: 26px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="36" valign="top" style="font-size: 26px; line-height: 1; padding-right: 12px;">
                          &#128196;
                        </td>
                        <td valign="top">
                          <div style="font-size: 14px; font-weight: 700; color: #0369a1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            Official Clinical Appointment Slip Attached (PDF)
                          </div>
                          <div style="font-size: 12.5px; color: #0284c7; margin-top: 3px; line-height: 1.45; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            <strong>${escape(args.pdfFilename || `Appointment_Slip_${args.bookingId}.pdf`)}</strong> &bull; Includes barcode token, hospital directions, reception QR &amp; tax receipt.
                          </div>
                          <div style="font-size: 11.5px; color: #0369a1; margin-top: 5px; font-style: italic;">
                            You can present this PDF on your smartphone at reception for priority check-in.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary Call to Action Button (Matches Website Style) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 26px;">
                <tr>
                  <td align="center">
                    <a href="${escape(siteUrl)}/patient/appointments" target="_blank" style="display: inline-block; background-color: #0050cb; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 50px; box-shadow: 0 4px 16px rgba(0, 80, 203, 0.3); letter-spacing: 0.2px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      View Appointment in Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Hospital Check-in Guidelines Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Hospital Check-in Guidelines
                    </div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.65; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <li>Report to the hospital or clinic reception desk <strong>15 minutes prior</strong> to your time slot.</li>
                      <li>Present your <strong>Token ${escape(args.tokenNumber).replace(/^#/, '')}</strong> or show the attached PDF on your smartphone.</li>
                      <li>Please keep a valid Government Photo ID handy.</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corporate Medical Footer -->
          <tr>
            <td style="padding: 24px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Consult Your Doctor &bull; Verified Healthcare Network
                    </p>
                    <p style="margin: 0 0 8px; font-size: 11px; color: #64748b; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      A healthcare technology service of Zebrold International Pvt Ltd &bull; ISO 27001 Certified &bull; All Rights Reserved
                    </p>
                    <p style="margin: 0 0 10px; font-size: 11px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Need assistance? Contact patient support at <a href="mailto:support@consultyourdoctor.de" style="color: #0050cb; font-weight: 600; text-decoration: none;">support@consultyourdoctor.de</a>
                    </p>
                    <p style="margin: 0; font-size: 10.5px; color: #94a3b8; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Confidential Clinical Communication: This message is intended exclusively for ${escape(args.patientName)}.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

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
      `Our operations team will check the registration and accreditation details you sent and contact you on this email address or your phone number. Once your ${noun} is approved, we will set up the staff sign-in your team uses to manage its listing, bookings and payments.`,
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
      `Your team signs in with the staff ID ${args.staffId}. Our operations team will give you the password separately; we never send passwords by email.`,
    ],
    button: { text: 'Go to the staff sign-in', url: args.signInUrl },
  })
}
