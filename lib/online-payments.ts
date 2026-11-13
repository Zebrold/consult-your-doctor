import { createAdminClient } from '@/lib/supabase/admin'
import { notifyBookingConfirmed } from '@/lib/notify/patient'
import { insertPaymentRow, shareColumns } from '@/lib/wallet'
import { loadBookingFees, onlineChargeFor, type OnlineProduct } from '@/lib/booking-fees'
import { formatINR } from '@/components/patient/format'
import { ONLINE_GATEWAY } from '@/lib/payment-gateways'
import { capturePayment, fetchPayment, fromPaise, type RazorpayPayment } from '@/lib/razorpay'

// Recording a successful online payment against its booking. Razorpay reports a payment twice: Checkout posts it to
// app/api/razorpay/callback when the patient comes back, and the webhook (app/api/razorpay/webhook) sends it from
// Razorpay's servers. Whichever arrives first confirms the booking; the other finds the payment already recorded.
// Callers must have checked that the payment really is Razorpay's (signature or a fetch from Razorpay's API).

type Admin = ReturnType<typeof createAdminClient>

// Booking states that mean the patient has paid for the booking.
const PAID_STATES = ['confirmed', 'visited', 'completed', 'report_sent']

export type Settled = { ok: true } | { ok: false; reason: string }

/**
 * What this payment had to cover (the booking fee and the convenience fee on it), worked out the way the order was
 * priced. Null when the fee settings can't be read: the order's amount was set by our own server, so it is trusted then.
 */
async function expectedCharge(admin: Admin, product: OnlineProduct, bookingId: string): Promise<number | null> {
  try {
    const charge = await onlineChargeFor(admin, product, bookingId, await loadBookingFees())
    return 'error' in charge ? null : charge.amount
  } catch (err) {
    console.error('Online payment: could not check the booking fee:', err)
    return null
  }
}

/**
 * Captures the payment if the account left it authorised, records it, and confirms the booking. A payment that is
 * short of the amount due, or for a booking no longer waiting for payment, is kept as "pending" for the operations
 * team to refund or confirm, and the booking is left alone.
 */
export async function settleOnlinePayment(product: OnlineProduct, bookingId: string, payment: RazorpayPayment): Promise<Settled> {
  const admin = createAdminClient()
  const table = product === 'Consultation' ? 'appointments' : 'diagnostic_bookings'
  const bookingColumn = product === 'Consultation' ? { appointment_id: bookingId } : { appointment_id: null, diagnostic_booking_id: bookingId }

  // Rows already recorded for this payment. A success among them means it was settled already (the callback and the
  // webhook both report it), which changes nothing. A pending or failed one is turned into the outcome below.
  const { data: earlier } = await admin.from('payments').select('id, status').eq('gateway', ONLINE_GATEWAY).eq('transaction_id', payment.id)
  const earlierRows = (earlier ?? []) as { id: string; status: string }[]
  if (earlierRows.some((p) => p.status === 'success')) return { ok: true }
  const earlierRow = earlierRows[0] ?? null

  const { data: current } = await admin.from(table).select('*').eq('id', bookingId).maybeSingle()
  const currentStatus = (current as { status?: string } | null)?.status ?? null

  // An account set to capture by hand leaves the payment authorised; take the money now.
  let captured = payment
  if (payment.status === 'authorized') {
    try {
      captured = await capturePayment(payment)
    } catch (err) {
      // The other report of this payment may have captured it a moment ago: go by Razorpay's current record.
      captured = await fetchPayment(payment.id).catch(() => payment)
      if (captured.status !== 'captured') console.error(`Razorpay: could not capture ${payment.id} for ${bookingId}:`, err)
    }
  }
  const paid = fromPaise(captured.amount)

  // Online money lands in Consult your Doctor's account and is all booking and convenience fee, so it adds nothing to
  // the hospital's wallet (lib/wallet.ts). The method ("upi", "card"...) is shown on the booking page.
  const wallet = shareColumns(
    product === 'Consultation' ? ((current as { hospital_id?: string | null } | null)?.hospital_id ?? null) : null,
    { platform: paid, hospital: 0 },
    captured.method,
  )
  const record = async (row: { amount: number; status: string }) => {
    if (!earlierRow) return insertPaymentRow(admin, { ...bookingColumn, transaction_id: payment.id, gateway: ONLINE_GATEWAY, ...row, ...wallet })
    const res = await admin.from('payments').update({ ...row, ...wallet }).eq('id', earlierRow.id)
    // A database without the wallet columns yet: update what it has.
    return res.error && /share|method|schema cache/i.test(res.error.message) ? admin.from('payments').update(row).eq('id', earlierRow.id) : res
  }

  if (captured.status !== 'captured') {
    console.error(`Razorpay: ${payment.id} for ${bookingId} is ${captured.status}, not captured. Left for review.`)
    await record({ amount: paid, status: 'pending' })
    return { ok: false, reason: 'Your payment is still being processed. We will confirm your booking as soon as it completes; you don’t need to pay again.' }
  }

  // Only the booking fee and the convenience fee on it are collected online. A payment short of that (say the fee went
  // up between the order and the payment) is kept for review and doesn't confirm the booking.
  const expected = await expectedCharge(admin, product, bookingId)
  if (expected != null && !(paid + 0.005 >= expected)) {
    console.error(`Razorpay: ${bookingId} paid ${paid}, amount due is ${expected}. Left for review.`)
    await record({ amount: paid, status: 'pending' })
    return { ok: false, reason: `The amount paid (${formatINR(paid)}) doesn't match the amount due (${formatINR(expected)}). Our team will refund or confirm it; you don't need to pay again.` }
  }

  // The booking must still be open for payment. One that was cancelled (its unpaid hold went stale, so the slot may
  // have been sold since) can't be confirmed, and neither can a second payment for a paid booking. The money is kept
  // for review either way.
  if (currentStatus !== 'pending_payment') {
    const alreadyPaid = currentStatus !== null && PAID_STATES.includes(currentStatus)
    console.error(`Razorpay: ${bookingId} paid ${paid} for a booking that is ${currentStatus ?? 'missing'}. Left for review.`)
    await record({ amount: paid, status: 'pending' })
    return {
      ok: false,
      reason: alreadyPaid
        ? 'We received a second payment for a booking that is already paid. Our team will refund it; you don’t need to pay again.'
        : 'Your payment went through, but this booking is no longer open. Our team will refund it; you don’t need to pay again.',
    }
  }

  const { error: paymentError } = await record({ amount: paid, status: 'success' })
  // 23505: the other report of this payment recorded it a moment ago.
  if (paymentError && paymentError.code !== '23505') console.error('Error recording payment:', paymentError)

  // Only move bookings still waiting for payment, so a replay can't bring back a cancelled booking.
  const { data: confirmed, error: updateError } = await admin
    .from(table)
    .update({ status: 'confirmed' })
    .eq('id', bookingId)
    .eq('status', 'pending_payment')
    .select('id')
  if (updateError) console.error(`Error confirming ${table} ${bookingId}:`, updateError)
  if (confirmed?.length) notifyBookingConfirmed(bookingId)
  return { ok: true }
}

/** Records a payment Razorpay reports as failed, so it shows on the booking's payment history. */
export async function recordFailedPayment(product: OnlineProduct, bookingId: string, payment: RazorpayPayment) {
  const admin = createAdminClient()
  const bookingColumn = product === 'Consultation' ? { appointment_id: bookingId } : { appointment_id: null, diagnostic_booking_id: bookingId }
  const { error } = await admin.from('payments').insert({
    ...bookingColumn,
    transaction_id: payment.id,
    amount: fromPaise(payment.amount),
    gateway: ONLINE_GATEWAY,
    status: 'failed',
  })
  // 23505: already recorded.
  if (error && error.code !== '23505') console.error('Error recording failed payment:', error)
}
