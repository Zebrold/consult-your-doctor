import crypto from 'node:crypto'

// Razorpay, the online payment gateway (server only). Patients pay their booking fee through Razorpay Checkout: the
// server creates an order for the amount it worked out (app/api/razorpay/order), Checkout collects the payment and
// posts the result to app/api/razorpay/callback, and Razorpay's webhook (app/api/razorpay/webhook) confirms it again in
// case the patient's browser never came back. Keys live only in the environment:
//   RAZORPAY_KEY_ID       rzp_live_… (public: Checkout needs it in the browser)
//   RAZORPAY_KEY_SECRET   signs payments; never in source, never in the browser
//   RAZORPAY_WEBHOOK_SECRET  the secret set on the webhook in the Razorpay dashboard

const API = 'https://api.razorpay.com/v1'

export function razorpayKeys(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim()
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
  return keyId && keySecret ? { keyId, keySecret } : null
}

export class RazorpayError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function call<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const keys = razorpayKeys()
  if (!keys) throw new RazorpayError('Razorpay keys are not set', 500)
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64')}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })
  const data = (await res.json().catch(() => null)) as (T & { error?: { description?: string } }) | null
  if (!res.ok || !data) throw new RazorpayError(data?.error?.description || `Razorpay answered ${res.status}`, res.status)
  return data
}

/** What the order is for, kept on the order so the callback and webhook find the booking from Razorpay's own record. */
export type OrderNotes = { booking_id: string; kind: 'Consultation' | 'Diagnostic' }

export type RazorpayOrder = { id: string; amount: number; amount_paid: number; currency: string; status: string; receipt: string | null; notes: Partial<OrderNotes> | unknown[] }

export type RazorpayPayment = {
  id: string
  order_id: string | null
  amount: number
  currency: string
  /** created, authorized, captured, refunded or failed */
  status: string
  /** upi, card, netbanking, wallet, emi, paylater */
  method: string | null
  error_description: string | null
}

/** Amounts go to Razorpay in paise. */
export const toPaise = (rupees: number) => Math.round(rupees * 100)
export const fromPaise = (paise: number) => Math.round(paise) / 100

export function createOrder(amountRupees: number, notes: OrderNotes) {
  // The receipt is the booking id (36 characters; Razorpay allows 40), so the dashboard links each order to its booking.
  return call<RazorpayOrder>('/orders', { method: 'POST', body: { amount: toPaise(amountRupees), currency: 'INR', receipt: notes.booking_id, notes } })
}

export const fetchOrder = (orderId: string) => call<RazorpayOrder>(`/orders/${encodeURIComponent(orderId)}`)
export const fetchPayment = (paymentId: string) => call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`)

/** Captures an authorised payment, for an account that doesn't capture automatically. */
export const capturePayment = (payment: Pick<RazorpayPayment, 'id' | 'amount' | 'currency'>) =>
  call<RazorpayPayment>(`/payments/${encodeURIComponent(payment.id)}/capture`, { method: 'POST', body: { amount: payment.amount, currency: payment.currency } })

/** The booking an order was made for, read from Razorpay's copy of the order. */
export function orderNotes(order: RazorpayOrder): OrderNotes | null {
  const notes = Array.isArray(order.notes) ? {} : (order.notes as Partial<OrderNotes>)
  const id = typeof notes.booking_id === 'string' ? notes.booking_id : order.receipt
  const kind = notes.kind === 'Consultation' || notes.kind === 'Diagnostic' ? notes.kind : null
  return id && kind && /^[0-9a-f-]{36}$/i.test(id) ? { booking_id: id, kind } : null
}

function sameHex(expected: string, received: string) {
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(received.trim().toLowerCase(), 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Checkout's signature on a successful payment: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function validPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const keys = razorpayKeys()
  if (!keys || !orderId || !paymentId || !signature) return false
  const expected = crypto.createHmac('sha256', keys.keySecret).update(`${orderId}|${paymentId}`).digest('hex')
  return sameHex(expected, signature)
}

/** A webhook's X-Razorpay-Signature: HMAC-SHA256 of the raw body with the webhook secret. */
export function validWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim()
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return sameHex(expected, signature)
}
