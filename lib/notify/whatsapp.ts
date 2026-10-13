/**
 * WhatsApp service module for Consult Your Doctor platform.
 * Supports sending PDF medical records, prescriptions, lab reports, booking confirmations,
 * account credentials, health updates, and OTPs via Fast2SMS WhatsApp Business API and Meta Cloud API.
 */

import { siteUrl } from '@/lib/site-url'

const FAST2SMS_BASE = 'https://www.fast2sms.com'
const META_BASE = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v21.0'}`

const getApiKey = () => process.env.FAST2SMS_API_KEY || process.env.WHATSAPP_API_KEY
const getPhoneNumberId = () => process.env.WHATSAPP_PHONE_NUMBER_ID || '1358256674038637'
const getMetaToken = () => process.env.WHATSAPP_TOKEN || ''

export const whatsappConfigured = () => Boolean(getApiKey() || (getMetaToken() && getPhoneNumberId()))

export type WhatsAppTemplate =
  | { name: 'cyd_report_ready'; params: [name: string, what: string, from: string]; document: { link: string; filename: string } }
  | { name: 'cyd_booking_confirmed'; params: [name: string, what: string, where: string, bookingId: string, amount: string]; document?: { link: string; filename: string } }
  | { name: 'cyd_health_update'; params: [name: string, hospital: string] }
  | { name: 'cyd_account_created'; params: [name: string, patientId: string, password: string, signInUrl: string] }
  | { name: 'cyd_ticket_update'; params: [name: string, ticketCode: string, status: string] }
  | { name: 'cyd_otp'; params: [otp: string] }

/** "+91 98204 77210" → "919820477210" (WhatsApp requires country code without leading "+"). */
export const waNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  return digits
}

const param = (text: string) => ({ type: 'text', text: text.replace(/\s+/g, ' ').trim().slice(0, 900) || '-' })

/** Formats friendly plain-text messages corresponding to the standard CYD templates. */
function formatTemplateText(template: WhatsAppTemplate): { text: string; caption?: string } {
  switch (template.name) {
    case 'cyd_report_ready': {
      const [name, what, from] = template.params
      const text = `Hello ${name}, your ${what} from ${from} is ready. It is attached here and securely saved in your Consult Your Doctor account.`
      return { text, caption: text }
    }
    case 'cyd_booking_confirmed': {
      const [name, what, where, bookingId, amount] = template.params
      const text = `Hello ${name},\n\nYour booking for ${what} at ${where} is confirmed!\n\n📋 Booking ID: ${bookingId}\n💳 Amount Paid: ${amount}\n\nYour appointment confirmation slip PDF is attached.\n\nView details: ${siteUrl()}/patient/appointments\n\nThank you for choosing Consult Your Doctor.`
      return { text, caption: text }
    }
    case 'cyd_health_update': {
      const [name, hospital] = template.params
      const text = `Hello ${name},\n\n${hospital} added your health details from today's visit to your Consult Your Doctor account. Your doctor can see them too.\n\nView your records: ${siteUrl()}/patient/profile`
      return { text }
    }
    case 'cyd_account_created': {
      const [name, patientId, password, signInUrl] = template.params
      const text = `Hello ${name},\n\nYour Consult Your Doctor account is ready!\n\n🆔 Patient ID: ${patientId}\n🔑 Password: ${password}\n🌐 Sign In: ${signInUrl}\n\nPlease sign in and keep these credentials private.`
      return { text }
    }
    case 'cyd_ticket_update': {
      const [name, ticketCode, status] = template.params
      const text = `Hello ${name},\n\nYour support ticket ${ticketCode} status has been updated to ${status.toUpperCase().replace(/_/g, ' ')}.\n\nView tickets: ${siteUrl()}/patient/support`
      return { text }
    }
    case 'cyd_otp': {
      const [otp] = template.params
      const text = `*Consult Your Doctor* 🏥\n\nYour sign-in verification code is: *${otp}*\n\nValid for 10 minutes. Please do not share this code with anyone for your security.`
      return { text }
    }
    default:
      return { text: 'Notification from Consult Your Doctor' }
  }
}

/** Sends a direct text message on WhatsApp via Fast2SMS Session API or Meta Cloud API. */
export async function sendWhatsAppText(phone: string | null | undefined, text: string): Promise<boolean> {
  if (!phone || !whatsappConfigured()) return false
  const to = waNumber(phone)
  if (to.length < 11) return false

  const apiKey = getApiKey()
  const phoneId = getPhoneNumberId()

  if (apiKey) {
    // 1. Try Fast2SMS WhatsApp session endpoint
    try {
      const url = `${FAST2SMS_BASE}/dev/whatsapp-session?phone_number_id=${encodeURIComponent(phoneId)}&to=${encodeURIComponent(to)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          type: 'text',
          text,
        }),
      })

      const data = await res.json().catch(() => null)
      if (res.ok && data?.return !== false && !data?.error) {
        return true
      }
      console.warn('sendWhatsAppText session error:', res.status, data)
    } catch (err) {
      console.error('sendWhatsAppText session exception:', err)
    }

    // 2. Try direct Cloud API text message endpoint
    try {
      const version = process.env.WHATSAPP_API_VERSION || 'v21.0'
      const cloudRes = await fetch(`${FAST2SMS_BASE}/dev/whatsapp/${version}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      })
      const cloudData = await cloudRes.json().catch(() => null)
      if (cloudRes.ok && !cloudData?.error && cloudData?.messages?.[0]?.id) {
        return true
      }
      console.warn('sendWhatsAppText cloud message error:', cloudRes.status, cloudData)
    } catch (err) {
      console.warn('sendWhatsAppText cloud message exception:', err)
    }
  }

  return false
}

/** Sends a document (e.g. PDF prescription or lab report) on WhatsApp via Fast2SMS. */
export async function sendWhatsAppDocument(
  phone: string | null | undefined,
  doc: { url: string; filename: string; caption?: string }
): Promise<boolean> {
  if (!phone || !whatsappConfigured()) return false
  const to = waNumber(phone)
  if (to.length < 11) return false

  const apiKey = getApiKey()
  const phoneId = getPhoneNumberId()

  if (apiKey) {
    try {
      const url = `${FAST2SMS_BASE}/dev/whatsapp-session?phone_number_id=${encodeURIComponent(phoneId)}&to=${encodeURIComponent(to)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          type: 'document',
          url: doc.url,
          document_filename: doc.filename,
          caption: doc.caption || doc.filename,
        }),
      })

      const data = await res.json().catch(() => null)
      if (res.ok && data?.return !== false) {
        return true
      }
      console.warn('sendWhatsAppDocument session error:', res.status, data)
    } catch (err) {
      console.error('sendWhatsAppDocument exception:', err)
    }
  }

  return false
}

/** Sends a verification OTP code via WhatsApp */
export async function sendWhatsAppOtp(phone: string | null | undefined, otp: string): Promise<boolean> {
  return sendWhatsApp(phone, {
    name: 'cyd_otp',
    params: [otp],
  })
}

/**
 * Sends a WhatsApp message (PDF document or structured text).
 * Tries Fast2SMS Session API first (delivers direct document/text without template delay),
 * then falls back to Meta format / Cloud API template endpoints. Failures are logged and never throw.
 */
export async function sendWhatsApp(phone: string | null | undefined, template: WhatsAppTemplate): Promise<boolean> {
  if (!whatsappConfigured() || !phone) return false
  const to = waNumber(phone)
  if (to.length < 11) return false

  const apiKey = getApiKey()
  const phoneId = getPhoneNumberId()
  const metaToken = getMetaToken()
  const { text, caption } = formatTemplateText(template)

  // 1. Fast2SMS Session API (Primary: works for direct PDF documents and texts)
  if (apiKey) {
    try {
      if ('document' in template && template.document) {
        const sent = await sendWhatsAppDocument(phone, {
          url: template.document.link,
          filename: template.document.filename,
          caption: caption || text,
        })
        if (sent) return true
      } else {
        const sent = await sendWhatsAppText(phone, text)
        if (sent) return true
      }
    } catch (err) {
      console.warn('Fast2SMS WhatsApp session dispatch error, attempting template fallback:', err)
    }

    // 2. Fast2SMS Meta format proxy for approved templates
    try {
      const components: Record<string, unknown>[] = []
      if ('document' in template && template.document) {
        components.push({ type: 'header', parameters: [{ type: 'document', document: template.document }] })
      }
      components.push({ type: 'body', parameters: template.params.map(param) })

      const version = process.env.WHATSAPP_API_VERSION || 'v21.0'
      const res = await fetch(`${FAST2SMS_BASE}/dev/whatsapp/${version}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: template.name,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' },
            components,
          },
        }),
      })

      if (res.ok) {
        return true
      }
      const errText = await res.text().catch(() => '')
      console.warn(`Fast2SMS template ${template.name}:`, res.status, errText.slice(0, 300))
    } catch (err) {
      console.warn(`Fast2SMS template error:`, err)
    }
  }

  // 3. Direct Meta WhatsApp Cloud API (if WHATSAPP_TOKEN is configured)
  if (metaToken && phoneId) {
    try {
      const components: Record<string, unknown>[] = []
      if ('document' in template && template.document) {
        components.push({ type: 'header', parameters: [{ type: 'document', document: template.document }] })
      }
      components.push({ type: 'body', parameters: template.params.map(param) })

      const res = await fetch(`${META_BASE}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: template.name,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' },
            components,
          },
        }),
      })

      if (res.ok) return true
      console.error(`Meta sendWhatsApp ${template.name}:`, res.status, (await res.text()).slice(0, 500))
    } catch (err) {
      console.error(`Meta sendWhatsApp ${template.name}:`, err)
    }
  }

  return false
}

