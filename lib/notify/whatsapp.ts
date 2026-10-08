// WhatsApp messages to patients through the Meta WhatsApp Cloud API. Configure WHATSAPP_TOKEN (a permanent system-user
// token) and WHATSAPP_PHONE_NUMBER_ID; WHATSAPP_TEMPLATE_LANGUAGE defaults to "en". Without them nothing is sent.
//
// Meta only delivers business-initiated messages that use a template approved in WhatsApp Manager, so each message
// below is a template. Create them (category Utility) with exactly these names and placeholders:
//
//   cyd_report_ready      Header: Document.
//                         Body: Hello {{1}}, your {{2}} from {{3}} is ready. It's attached here and saved in your
//                         Consult Your Doctor account.
//   cyd_booking_confirmed Body: Hello {{1}}, your {{2}} at {{3}} is confirmed. Booking ID: {{4}}. Amount paid: {{5}}.
//   cyd_health_update     Body: Hello {{1}}, {{2}} added your health details from today's visit to your Consult Your
//                         Doctor account. Your doctor can see them too.
//   cyd_account_created   Body: Hello {{1}}, your Consult Your Doctor account is ready. Patient ID: {{2}}. Password:
//                         {{3}}. Sign in at {{4}} and keep these details private.

const API = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v21.0'}`

export const whatsappConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)

export type WhatsAppTemplate =
  | { name: 'cyd_report_ready'; params: [name: string, what: string, from: string]; document: { link: string; filename: string } }
  | { name: 'cyd_booking_confirmed'; params: [name: string, what: string, where: string, bookingId: string, amount: string] }
  | { name: 'cyd_health_update'; params: [name: string, hospital: string] }
  | { name: 'cyd_account_created'; params: [name: string, patientId: string, password: string, signInUrl: string] }

/** "+91 98204 77210" → "919820477210" (WhatsApp wants the number with country code and no "+"). */
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

// Template parameters can't contain new lines, tabs or more than four spaces in a row.
const param = (text: string) => ({ type: 'text', text: text.replace(/\s+/g, ' ').trim().slice(0, 900) || '-' })

/** Sends a template message if WhatsApp is configured. Returns whether Meta accepted it; failures are logged, never thrown. */
export async function sendWhatsApp(phone: string | null | undefined, template: WhatsAppTemplate): Promise<boolean> {
  if (!whatsappConfigured() || !phone) return false
  const to = waNumber(phone)
  if (to.length < 11) return false

  const components: Record<string, unknown>[] = []
  if ('document' in template) components.push({ type: 'header', parameters: [{ type: 'document', document: template.document }] })
  components.push({ type: 'body', parameters: template.params.map(param) })

  try {
    const res = await fetch(`${API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name: template.name, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' }, components },
      }),
    })
    if (!res.ok) {
      console.error(`sendWhatsApp ${template.name}:`, res.status, (await res.text()).slice(0, 500))
      return false
    }
    return true
  } catch (err) {
    console.error(`sendWhatsApp ${template.name}:`, err)
    return false
  }
}
