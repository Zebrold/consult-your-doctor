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

import { CANONICAL_SITE_URL } from '@/lib/site-url'
import { COMPANY } from '@/lib/company'

/** The operations team's inbox, for "something is waiting for you" emails: SUPPORT_EMAIL, else the company address. */
export const teamInbox = () => process.env.SUPPORT_EMAIL?.trim() || COMPANY.email

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
  /** The headline under the blue brand header, e.g. "Application received". */
  heading?: string
  /** Plain paragraphs; links are written out in full. */
  paragraphs: string[]
  /** Label and value pairs (ticket ID, staff ID...), shown in a grey box under the text. */
  facts?: [string, string][]
  attachments?: EmailAttachment[]
  button?: { text: string; url: string }
  html?: string
}

/**
 * Where email images load from: the live site (the bare domain redirects here). Images are linked, not attached, so
 * inboxes like Gmail don't list the logo as an attachment on every email.
 */
export const EMAIL_ASSET_URL = 'https://www.consultyourdoctor.de'
export const emailImage = (file: string) => `${EMAIL_ASSET_URL}/${file.replace(/^\/+/, '')}`

// The website's look: the blue header band with the white stethoscope and the name in Helvetica (SiteHeader), Manrope
// text, #2A4DD0 buttons, and the blue footer with the brand, the tagline and the Help & Legal links (Footer). Email
// clients take tables and inline styles only.
export const EMAIL_FONT = "font-family:Manrope,'Helvetica Neue',Helvetica,Arial,sans-serif;"
const FONT = EMAIL_FONT
const BRAND_FONT = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;"
export const EMAIL_COLORS = { ink: '#0B1B3F', text: '#3F4A5E', muted: '#5B667A', blue: '#2A4DD0', header: '#1D4ED8', soft: '#F5F7FB', line: '#E3E8F0', page: '#EEF2F7', footer: '#E1E8FA' }
const C = EMAIL_COLORS

const escape = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const linkify = (s: string) => escape(s).replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" target="_blank" style="color:${C.blue};font-weight:700;text-decoration:underline;word-break:break-all;">${url}</a>`)

/** The inbox preview line: the first paragraph after the greeting, cut to a sentence or two. */
function previewOf(paragraphs: string[]) {
  const line = paragraphs.find((p) => p.trim() && !/^(dear|hello|hi)\b/i.test(p.trim())) ?? paragraphs[0] ?? ''
  const flat = line.replace(/\s+/g, ' ').trim()
  return flat.length > 150 ? `${flat.slice(0, 147).replace(/\s+\S*$/, '')}…` : flat
}

const footerLink = (href: string, text: string) => `<a href="${href}" target="_blank" style="color:#ffffff;font-weight:700;text-decoration:none;">${text}</a>`

/**
 * Every email's frame: the website's blue header, the white body (`body` is trusted HTML built by the caller), the help
 * line and the website's footer. `preheader` is the inbox preview line, hidden in the email itself.
 */
export function emailShell(args: { title: string; preheader?: string | null; body: string }) {
  const site = CANONICAL_SITE_URL
  const preheader = args.preheader?.trim()
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escape(args.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;">
${preheader ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};opacity:0;">${escape(preheader)}${'&#8199;&#65279;&#847; '.repeat(60)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};"><tr><td align="center" style="padding:24px 10px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid ${C.line};border-radius:14px;border-collapse:separate;">

  <tr><td style="background:${C.header};border-radius:13px 13px 0 0;padding:18px 26px;">
    <a href="${site}" target="_blank" style="text-decoration:none;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle" style="padding-right:12px;"><img src="${emailImage('logo-icon-white.png')}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border:0;outline:none;" /></td>
      <td valign="middle" style="${BRAND_FONT}font-size:22px;font-weight:700;letter-spacing:-0.2px;color:#ffffff;">Consult your Doctor</td>
    </tr></table></a>
  </td></tr>

  ${args.body}

  <tr><td style="padding:14px 26px 26px;${FONT}font-size:13px;line-height:1.55;color:${C.muted};">
    Questions? Visit <a href="${site}/contact" target="_blank" style="color:${C.blue};font-weight:700;text-decoration:none;">Help &amp; Support</a>. This mailbox doesn&#39;t take replies.
  </td></tr>

  <tr><td style="background:${C.blue};border-radius:0 0 13px 13px;padding:24px 26px 26px;${FONT}font-size:12.5px;line-height:1.6;color:${C.footer};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle" style="padding-right:10px;"><img src="${emailImage('logo-icon-white.png')}" width="28" height="28" alt="" style="display:block;width:28px;height:28px;border:0;outline:none;" /></td>
      <td valign="middle" style="${BRAND_FONT}font-size:17px;font-weight:700;color:#ffffff;">Consult your Doctor</td>
    </tr></table>
    <div style="padding-top:10px;">Find doctors at partner hospitals and diagnostic labs, book and pay online, and keep your prescriptions and reports in one place.</div>
    <div style="padding-top:14px;">${footerLink(site, 'consultyourdoctor.de')}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${footerLink(`${site}/contact`, 'Help &amp; Support')}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${footerLink(`${site}/privacy-policy`, 'Privacy Policy')}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${footerLink(`${site}/terms-of-use`, 'Terms &amp; Conditions')}</div>
    <div style="padding-top:14px;margin-top:14px;border-top:1px solid rgba(255,255,255,0.22);font-size:11.5px;color:#C9D4F5;">You&#39;re receiving this email about your account, booking or application on Consult your Doctor.<br />&copy; ${new Date().getFullYear()} Consult Your Doctor. All rights reserved.</div>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`
}

function html(email: Pick<Email, 'heading' | 'paragraphs' | 'facts' | 'button'>) {
  const { heading, paragraphs, facts, button } = email
  const factRows = (facts ?? [])
    .map(
      ([label, value], i) =>
        `<tr><td valign="top" style="${FONT}font-size:13.5px;color:${C.muted};padding:10px 0;${i ? `border-top:1px solid ${C.line};` : ''}">${escape(label)}</td><td valign="top" align="right" style="${FONT}font-size:14px;font-weight:800;color:${C.ink};padding:10px 0 10px 16px;${i ? `border-top:1px solid ${C.line};` : ''}">${linkify(value)}</td></tr>`,
    )
    .join('')

  const body = `<tr><td style="padding:30px 26px 10px;${FONT}">
    ${heading ? `<h1 style="margin:0;${FONT}font-size:22px;line-height:1.3;font-weight:800;color:${C.ink};padding-bottom:16px;">${escape(heading)}</h1>` : ''}
    ${paragraphs.map((p) => `<p style="margin:0 0 14px;${FONT}font-size:15px;line-height:1.6;color:${C.text};">${linkify(p)}</p>`).join('')}
    ${factRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.soft};border:1px solid ${C.line};border-radius:12px;border-collapse:separate;margin:8px 0 16px;"><tr><td style="padding:6px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${factRows}</table></td></tr></table>` : ''}
    ${
      button
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto 12px;"><tr><td align="center" style="background:${C.blue};border-radius:10px;">
        <a href="${escape(button.url)}" target="_blank" style="display:inline-block;padding:13px 44px;${FONT}font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:10px;">${escape(button.text)}</a>
      </td></tr></table>`
        : ''
    }
  </td></tr>
  <tr><td style="padding:0 26px;"><div style="border-top:1px solid ${C.line};font-size:0;line-height:0;">&nbsp;</div></td></tr>`

  return emailShell({ title: heading || 'Consult your Doctor', preheader: previewOf(paragraphs), body })
}

/** The plain-text twin of html(), for clients that don't show HTML. */
function text(email: Pick<Email, 'heading' | 'paragraphs' | 'facts' | 'button'>) {
  return [
    email.heading,
    ...email.paragraphs,
    ...(email.facts?.length ? [email.facts.map(([l, v]) => `${l}: ${v}`).join('\n')] : []),
    email.button ? `${email.button.text}: ${email.button.url}` : null,
    `Consult your Doctor · ${CANONICAL_SITE_URL}`,
  ]
    .filter((p): p is string => !!p)
    .join('\n\n')
}

/** Sends an email if SMTP is configured. Returns whether it was sent; failures are logged, never thrown. */
export async function sendEmail(email: Email): Promise<boolean> {
  if (!emailConfigured()) {
    console.info(`[Email Preview / No SMTP] To: ${email.to} | Subject: ${email.subject}`)
    return false
  }
  try {
    const from = getFromAddress()
    const finalAttachments: (Omit<EmailAttachment, 'content'> & { content?: Buffer })[] = []

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

    // Images (logo, QR code, photos) are linked from the website, so only real files (PDFs) are attached.
    const renderedHtml = email.html || html(email)

    await mailer().sendMail({
      from,
      to: email.to,
      subject: email.subject,
      text: email.html ? email.paragraphs.join('\n\n') : text(email),
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

const STATUS_LABEL: Record<string, string> = { open: 'Open', in_progress: 'In progress', awaiting_response: 'Waiting for your reply', resolved: 'Resolved', closed: 'Closed' }
const statusLabel = (s: string) => STATUS_LABEL[s] ?? s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

/** Where the person who raised a ticket finds help: their own portal's Help & support, or the public page. */
export function supportUrl(siteUrl: string, role?: string | null) {
  const path =
    role === 'patient' ? '/patient/support'
    : role === 'doctor' ? '/doctor/ai'
    : role === 'hospital_admin' || role === 'hospital' ? '/hospital/ai'
    : role === 'diagnostic_admin' ? '/diagnostic-center/ai'
    : '/contact'
  return `${siteUrl}${path}`
}

/** Sends support ticket receipt confirmation to the user */
export async function sendTicketConfirmationEmail(args: {
  to: string
  requesterName: string
  ticketCode: string
  category: string
  subject: string
  siteUrl: string
  role?: string | null
}) {
  return sendEmail({
    to: args.to,
    subject: `[${args.ticketCode}] We've received your request: ${args.subject}`,
    heading: 'We’ve received your request',
    paragraphs: [
      `Hello ${args.requesterName},`,
      `Thank you for contacting Consult Your Doctor. Our support team is looking into your request and will reply to this email address.`,
    ],
    facts: [
      ['Ticket ID', args.ticketCode],
      ['Topic', args.category],
      ['Subject', args.subject],
    ],
    button: { text: 'Open Help & Support', url: supportUrl(args.siteUrl, args.role) },
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
  role?: string | null
}) {
  return sendEmail({
    to: args.to,
    subject: `[${args.ticketCode}] New reply from Consult Your Doctor support`,
    heading: 'There’s an update on your request',
    paragraphs: [
      `Hello ${args.requesterName},`,
      `${args.executiveName} from our support team updated your ticket:`,
      `“${args.message}”`,
    ],
    facts: [
      ['Ticket ID', args.ticketCode],
      ['Status', statusLabel(args.status)],
    ],
    button: { text: 'Open Help & Support', url: supportUrl(args.siteUrl, args.role) },
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
    subject: 'Consult Your Doctor: we’ve received your application',
    heading: 'Application received',
    paragraphs: [
      `Dear Dr. ${args.doctorName},`,
      `Thank you for applying to join Consult Your Doctor as a doctor in ${args.specialty}.`,
      `Our team checks your registration number and medical council details. Once your application is approved, we’ll email you a link to set your password and open your doctor workspace.`,
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
    subject: 'Consult Your Doctor: your doctor account is ready',
    heading: 'Your doctor account is ready',
    paragraphs: [
      `Dear Dr. ${args.doctorName},`,
      `Your doctor account on Consult Your Doctor${args.hospitalName ? ` with ${args.hospitalName}` : ''} is approved.`,
      `Set your password with the button below to open your doctor workspace. The link is personal and works for a limited time; we never send passwords by email.`,
    ],
    button: { text: 'Set your password', url: args.activationLink },
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
    heading: 'Application received',
    paragraphs: [
      `Dear ${args.contactName},`,
      `Thank you for applying to list ${args.organizationName} as a partner ${noun} on Consult Your Doctor.`,
      `Our operations team will check the registration and accreditation details you sent and contact you on this email address or your phone number. Once your ${noun} is approved, we will set up the staff login your team uses to manage its listing, bookings and payments.`,
    ],
  })
}

/**
 * Sent when an executive approves a hospital or diagnostic centre application. With `setPasswordLink` (the login was
 * created with a temporary password and this email address), the admin sets their own password from the link; we
 * never send passwords by email.
 */
export async function sendPartnerApprovedEmail(args: {
  to: string
  contactName: string
  organizationName: string
  kind: 'hospital' | 'diagnostic_center'
  staffId: string
  signInUrl: string
  setPasswordLink?: string | null
}) {
  const noun = partnerNoun(args.kind)
  return sendEmail({
    to: args.to,
    subject: `Consult Your Doctor: ${args.organizationName} is approved`,
    heading: `${args.organizationName} is approved`,
    paragraphs: [
      `Dear ${args.contactName},`,
      `${args.organizationName} is now a partner ${noun} on Consult Your Doctor.`,
      args.setPasswordLink
        ? `Your login is ready. Set your own password with the button below, then log in with your staff ID or this email address. The link is personal and works for a limited time; we never send passwords by email.`
        : `Your team logs in with the staff ID below. Our operations team will give you the password separately; we never send passwords by email.`,
    ],
    facts: [
      ['Staff ID', args.staffId],
      ['Staff login', args.signInUrl],
    ],
    button: args.setPasswordLink ? { text: 'Set your password', url: args.setPasswordLink } : { text: 'Go to the staff login', url: args.signInUrl },
  })
}

/** Sent when the team turns down a doctor's, hospital's or diagnostic centre's application to join. */
export async function sendApplicationRejectedEmail(args: {
  to: string
  name: string
  kind: 'doctor' | 'hospital' | 'diagnostic_center'
  organizationName?: string | null
}) {
  const what = args.kind === 'doctor' ? 'your application to join Consult Your Doctor as a doctor' : `the application to list ${args.organizationName || `your ${partnerNoun(args.kind)}`} on Consult Your Doctor`
  return sendEmail({
    to: args.to,
    subject: 'Consult Your Doctor: about your application',
    heading: 'About your application',
    paragraphs: [
      args.kind === 'doctor' ? `Dear Dr. ${args.name},` : `Dear ${args.name},`,
      `Thank you for your interest. We’ve reviewed ${what}, and we can’t approve it at the moment.`,
      'If you think we’ve missed something, or you’d like to apply again with updated details, please contact us through Help & Support.',
    ],
    button: { text: 'Open Help & Support', url: `${CANONICAL_SITE_URL}/contact` },
  })
}

/** Sent to a hospital's admins when the team pays or turns down a withdrawal from its wallet. */
export async function sendPayoutUpdateEmail(args: {
  to: string
  name: string
  hospital: string
  amount: string
  status: 'paid' | 'rejected'
  reference?: string | null
  note?: string | null
  siteUrl: string
}) {
  const paid = args.status === 'paid'
  return sendEmail({
    to: args.to,
    subject: paid ? `Consult Your Doctor: your withdrawal of ${args.amount} is paid` : `Consult Your Doctor: your withdrawal of ${args.amount} wasn’t paid`,
    heading: paid ? 'Your withdrawal is paid' : 'Your withdrawal wasn’t paid',
    paragraphs: [
      `Dear ${args.name},`,
      paid
        ? `We’ve paid ${args.amount} from the ${args.hospital} wallet to your saved bank account or UPI ID.`
        : `We couldn’t pay the withdrawal of ${args.amount} from the ${args.hospital} wallet, so the amount is back in your balance.${args.note ? ` The reason: “${args.note}”` : ''}`,
      paid ? 'You’ll find it under payout history on the Payouts page.' : 'Once it’s sorted, you can ask for the withdrawal again from the Payouts page.',
    ],
    facts: [
      ['Amount', args.amount],
      ['Status', paid ? 'Paid' : 'Not paid'],
      ...(paid && args.reference ? ([['Reference (UTR)', args.reference]] as [string, string][]) : []),
    ],
    button: { text: 'Open Payouts', url: `${args.siteUrl}/hospital/wallet` },
  })
}

/** A new executive login (Staff & access): the employee ID and a link to set their own password. */
export async function sendExecutiveLoginEmail(args: { to: string; name: string; staffId: string; team: string; setPasswordLink: string; signInUrl: string }) {
  return sendEmail({
    to: args.to,
    subject: 'Your Consult Your Doctor executive login',
    heading: 'Your executive login',
    paragraphs: [
      `Dear ${args.name},`,
      `Welcome to the ${args.team} team at Consult Your Doctor.`,
      `Set your own password with the button below, then log in with your employee ID or this email address. The link is personal and works for a limited time; we never send passwords by email.`,
    ],
    facts: [
      ['Employee ID', args.staffId],
      ['Team', args.team],
      ['Login page', args.signInUrl],
    ],
    button: { text: 'Set your password', url: args.setPasswordLink },
  })
}
