import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadBookingFees, onlineChargeFor } from '@/lib/booking-fees'
import { createOrder, razorpayKeys, RazorpayError } from '@/lib/razorpay'

// Starts an online payment: creates a Razorpay order for the patient's own booking. Online payment only ever collects
// the booking fee (the doctor booking fee, or the lab booking fee on the booked tests) and the payment convenience fee
// on it. The amount is worked out here from the booking itself, never taken from the browser; the consultation fee,
// test prices and hospital services are paid at the hospital counter or the lab. Desks take their own payments by UPI
// or cash (lib/desk-payments.ts), not through Razorpay.

const BOOKING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

export async function POST(request: Request) {
  try {
    const keys = razorpayKeys()
    if (!keys) return fail('Online payment is not set up yet. Please try again later.', 503)

    const body = (await request.json().catch(() => null)) as { bookingId?: unknown; product?: unknown } | null
    const bookingId = typeof body?.bookingId === 'string' ? body.bookingId : ''
    const product = body?.product === 'Consultation' || body?.product === 'Diagnostic' ? body.product : null
    if (!BOOKING_ID.test(bookingId) || !product) return fail('Missing payment details.', 400)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('Please log in to pay.', 401)

    let fees
    try {
      fees = await loadBookingFees()
    } catch (err) {
      console.error(err)
      return fail("We couldn't load the booking fee. Please try again in a moment.", 503)
    }

    const charge = await onlineChargeFor(supabase, product, bookingId, fees)
    const noun = product === 'Consultation' ? 'appointment' : 'booking'
    if ('error' in charge) return fail(charge.error, charge.status)
    if (charge.patientId !== user.id) return fail(product === 'Consultation' ? 'Appointment not found.' : 'Booking not found.', 404)
    if (charge.status === 'cancelled') return fail('This booking was released because it wasn’t paid in time. Please book again.', 409)
    if (charge.status !== 'pending_payment') return fail(`This ${noun} is already paid.`, 409)
    if (!(charge.amount >= 1)) return fail('There is no booking fee to pay for this booking.', 422)

    const order = await createOrder(charge.amount, { booking_id: bookingId, kind: product })
    return NextResponse.json({ keyId: keys.keyId, orderId: order.id, amount: order.amount, currency: order.currency })
  } catch (err) {
    console.error('Razorpay order:', err)
    const message = err instanceof RazorpayError && err.status === 401 ? 'Online payment is not set up correctly. Please contact support.' : 'Could not start the payment. Please try again.'
    return fail(message, 502)
  }
}
