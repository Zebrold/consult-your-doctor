import { NextResponse } from 'next/server'
import { settlePurchase } from '@/lib/purchases'
import { fetchOrder, fetchPayment, purchaseNotes, validPaymentSignature } from '@/lib/razorpay'

// Checkout's success handler for a partner purchase posts the three Razorpay fields here. The signature is checked and
// the purchase is read from Razorpay's own copy of the order, never from the browser. The webhook does the same if the
// page closes first.

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const str = (k: string) => (typeof body?.[k] === 'string' ? (body[k] as string).trim() : '')
  const orderId = str('razorpay_order_id')
  const paymentId = str('razorpay_payment_id')
  const signature = str('razorpay_signature')
  if (!orderId || !paymentId || !signature) return NextResponse.json({ ok: false, reason: 'Missing payment details.' }, { status: 400 })
  if (!validPaymentSignature(orderId, paymentId, signature)) {
    console.error('Razorpay purchase verify: signature mismatch.')
    return NextResponse.json({ ok: false, reason: 'We could not verify this payment.' }, { status: 400 })
  }
  try {
    const [order, payment] = await Promise.all([fetchOrder(orderId), fetchPayment(paymentId)])
    const notes = purchaseNotes(order)
    if (!notes || payment.order_id !== order.id) return NextResponse.json({ ok: false, reason: 'We could not match this payment. Our team will check it; you don’t need to pay again.' }, { status: 400 })
    const settled = await settlePurchase(notes, payment)
    return NextResponse.json(settled, { status: settled.ok ? 200 : 409 })
  } catch (err) {
    console.error('Razorpay purchase verify:', err)
    return NextResponse.json({ ok: false, reason: 'We could not confirm the payment just now. If you were charged, it will show here shortly; you don’t need to pay again.' }, { status: 502 })
  }
}
