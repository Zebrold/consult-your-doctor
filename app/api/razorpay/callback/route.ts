import { NextResponse } from 'next/server'
import { notifyPaymentPending } from '@/lib/notify/patient'
import { recordFailedPayment, settleOnlinePayment } from '@/lib/online-payments'
import { fetchOrder, fetchPayment, orderNotes, validPaymentSignature, type OrderNotes } from '@/lib/razorpay'

// Where Razorpay Checkout sends the patient after paying (callback_url with redirect, lib/razorpay-client.ts). Success
// posts razorpay_payment_id, razorpay_order_id and razorpay_signature; the signature is checked, and the booking is read
// from Razorpay's own copy of the order, never from the browser. A failure posts error[...] fields, which aren't
// signed, so the payment is fetched from Razorpay before anything is recorded or emailed.

const BOOKING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const text = (form: FormData, name: string) => {
  const v = form.get(name)
  return typeof v === 'string' ? v.trim() : ''
}

/** The order and payment ids of a failed payment: error[metadata] is a JSON string, or sent as separate fields. */
function failedIds(form: FormData) {
  let meta: { order_id?: string; payment_id?: string } = {}
  try {
    meta = JSON.parse(text(form, 'error[metadata]') || '{}')
  } catch {
    meta = {}
  }
  return {
    orderId: meta.order_id || text(form, 'error[metadata][order_id]'),
    paymentId: meta.payment_id || text(form, 'error[metadata][payment_id]'),
  }
}

export async function POST(request: Request) {
  const base = new URL(request.url).origin
  // Only used to send the patient back to the right page; nothing is recorded from it.
  const hinted = new URL(request.url).searchParams.get('booking') ?? ''
  const page = (bookingId: string, query: string) => NextResponse.redirect(`${base}/book/confirmation/${bookingId}?${query}`, 303)
  const failed = (bookingId: string | null, reason: string) =>
    bookingId ? page(bookingId, `payment=failed&reason=${encodeURIComponent(reason)}`) : NextResponse.redirect(`${base}/patient/appointments`, 303)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return failed(BOOKING_ID.test(hinted) ? hinted : null, 'The payment could not be completed. Please try again.')
  }

  const paymentId = text(form, 'razorpay_payment_id')
  const orderId = text(form, 'razorpay_order_id')
  const signature = text(form, 'razorpay_signature')

  try {
    if (paymentId && orderId && signature) {
      if (!validPaymentSignature(orderId, paymentId, signature)) {
        console.error('Razorpay callback: signature mismatch. Possible tampering.')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
      const [order, payment] = await Promise.all([fetchOrder(orderId), fetchPayment(paymentId)])
      const notes = orderNotes(order)
      if (!notes || payment.order_id !== order.id) {
        console.error(`Razorpay callback: payment ${paymentId} doesn't belong to a booking order (${orderId}).`)
        return failed(BOOKING_ID.test(hinted) ? hinted : null, 'We could not match this payment to your booking. Our team will check it; you don’t need to pay again.')
      }
      const settled = await settleOnlinePayment(notes.kind, notes.booking_id, payment)
      return settled.ok ? page(notes.booking_id, 'payment=success') : failed(notes.booking_id, settled.reason)
    }

    // The payment failed or was cancelled.
    const reason = text(form, 'error[description]') || 'The payment was not completed.'
    const ids = failedIds(form)
    let notes: OrderNotes | null = null
    if (ids.orderId) {
      try {
        notes = orderNotes(await fetchOrder(ids.orderId))
      } catch (err) {
        console.error('Razorpay callback: could not read the failed order:', err)
      }
    }
    if (notes && ids.paymentId) {
      try {
        const payment = await fetchPayment(ids.paymentId)
        if (payment.order_id === ids.orderId && payment.status === 'failed') {
          await recordFailedPayment(notes.kind, notes.booking_id, payment)
          // The booking stays waiting for payment until its 30-minute hold ends; the patient is emailed it with a Pay button.
          notifyPaymentPending(notes.booking_id, payment.error_description || reason)
        }
      } catch (err) {
        console.error('Razorpay callback: could not read the failed payment:', err)
      }
    }
    return failed(notes?.booking_id ?? (BOOKING_ID.test(hinted) ? hinted : null), reason)
  } catch (err) {
    console.error('Razorpay callback error:', err)
    return failed(
      BOOKING_ID.test(hinted) ? hinted : null,
      'We could not confirm the payment just now. If you were charged, your booking will be confirmed shortly; you don’t need to pay again.',
    )
  }
}
