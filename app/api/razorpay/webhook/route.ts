import { NextResponse } from 'next/server'
import { settleOnlinePayment } from '@/lib/online-payments'
import { fetchOrder, orderNotes, validWebhookSignature, type RazorpayPayment } from '@/lib/razorpay'

// Razorpay's webhook: confirms a booking from Razorpay's servers even when the patient's browser never came back to
// app/api/razorpay/callback (closed tab, lost signal). Set it up in the Razorpay dashboard (Account & Settings →
// Webhooks) with the URL https://<site>/api/razorpay/webhook, the events payment.authorized and payment.captured, and a
// secret, which goes in RAZORPAY_WEBHOOK_SECRET. Without that secret every call is refused.

type Event = { event?: string; payload?: { payment?: { entity?: RazorpayPayment } } }

export async function POST(request: Request) {
  const raw = await request.text()
  if (!process.env.RAZORPAY_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json({ error: 'Webhook secret not set' }, { status: 503 })
  }
  if (!validWebhookSignature(raw, request.headers.get('x-razorpay-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: Event
  try {
    event = JSON.parse(raw) as Event
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const payment = event.payload?.payment?.entity
  if ((event.event !== 'payment.authorized' && event.event !== 'payment.captured') || !payment?.id || !payment.order_id) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  try {
    const notes = orderNotes(await fetchOrder(payment.order_id))
    // An order this site didn't make for a booking (a payment link, say): not ours to handle.
    if (!notes) return NextResponse.json({ ok: true, ignored: true })
    const settled = await settleOnlinePayment(notes.kind, notes.booking_id, payment)
    return NextResponse.json({ ok: true, settled: settled.ok })
  } catch (err) {
    console.error('Razorpay webhook error:', err)
    // A 5xx makes Razorpay retry later.
    return NextResponse.json({ error: 'Could not process the payment' }, { status: 500 })
  }
}
