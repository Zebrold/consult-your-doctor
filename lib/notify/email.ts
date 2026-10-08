import nodemailer, { type Transporter } from 'nodemailer'

// Email to patients, sent from no-reply@zebrold.de over SMTP. Configure SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS
// (any provider that can send as no-reply@zebrold.de); MAIL_FROM overrides the sender. Without SMTP_HOST nothing is sent.

const FROM = process.env.MAIL_FROM || 'Consult Your Doctor <no-reply@zebrold.de>'

export const emailConfigured = () => Boolean(process.env.SMTP_HOST)

let transport: Transporter | null = null
function mailer() {
  if (transport) return transport
  const port = Number(process.env.SMTP_PORT || 587)
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  })
  return transport
}

export type Email = {
  to: string
  subject: string
  /** Plain paragraphs; links are written out in full. */
  paragraphs: string[]
  attachments?: { filename: string; content: Uint8Array; contentType: string }[]
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const linkify = (s: string) => escape(s).replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#0066ff">${url}</a>`)

function html(paragraphs: string[]) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0066ff;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:bold">Consult Your Doctor</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.6">${paragraphs.map((p) => `<p style="margin:0 0 14px">${linkify(p)}</p>`).join('')}</td></tr>
<tr><td style="padding:14px 24px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5">This is an automatic message from no-reply@zebrold.de. Please don't reply to it. Consult Your Doctor is a service of Zebrold International Pvt Ltd.</td></tr>
</table></td></tr></table></body></html>`
}

/** Sends an email if SMTP is configured. Returns whether it was sent; failures are logged, never thrown. */
export async function sendEmail(email: Email): Promise<boolean> {
  if (!emailConfigured()) return false
  try {
    await mailer().sendMail({
      from: FROM,
      to: email.to,
      subject: email.subject,
      text: email.paragraphs.join('\n\n'),
      html: html(email.paragraphs),
      attachments: email.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content), contentType: a.contentType })),
    })
    return true
  } catch (err) {
    console.error('sendEmail:', err)
    return false
  }
}
