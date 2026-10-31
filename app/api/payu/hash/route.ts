import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { loadBookingFees, onlineChargeFor } from '@/lib/booking-fees';
import { payuAmount } from '@/lib/pricing';
import { bookingIdOf } from '@/lib/payu-txn';

type Priced = { amount: number } | { error: string; status: number };

// PayU only ever collects a patient's own booking fee: the doctor booking fee, or the lab booking fee on the booked
// tests. The amount is worked out here from the booking itself, never taken from the browser, and the consultation fee,
// test prices and home-collection fee are never part of it (they are paid at the hospital counter or the lab).
// Hospital and lab desks take their own payments by UPI or cash (lib/desk-payments.ts), not through PayU.
async function amountFor(txnid: string, productinfo: string): Promise<Priced> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please log in to pay.', status: 401 };

  let fees;
  try {
    fees = await loadBookingFees();
  } catch (err) {
    console.error(err);
    return { error: "We couldn't load the booking fee. Please try again in a moment.", status: 503 };
  }

  const charge = await onlineChargeFor(supabase, productinfo, bookingIdOf(txnid), fees);
  if ('error' in charge) return charge;
  if (charge.patientId !== user.id) return { error: productinfo === 'Consultation' ? 'Appointment not found.' : 'Booking not found.', status: 404 };
  if (charge.status !== 'pending_payment') return { error: `This ${productinfo === 'Consultation' ? 'appointment' : 'booking'} is already paid.`, status: 409 };
  if (!(charge.amount > 0)) return { error: 'There is no booking fee to pay for this booking.', status: 422 };
  return { amount: charge.amount };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { txnid, productinfo, firstname, email } = body;

    const key = process.env.PAYU_MERCHANT_KEY || process.env.NEXT_PUBLIC_PAYU_KEY;
    // The salt signs every payment. It must only ever come from the environment, never from source.
    const salt = process.env.PAYU_MERCHANT_SALT;

    if (!key || !salt) {
      return NextResponse.json({ error: 'PayU credentials missing' }, { status: 500 });
    }

    if (!txnid || !productinfo || !firstname || !email) {
      return NextResponse.json({ error: 'Missing required payment fields' }, { status: 400 });
    }
    // Every field is joined with "|" into the signed string, so a "|" inside one would shift the others.
    if ([txnid, productinfo, firstname, email].some((v) => typeof v !== 'string' || v.length > 200 || /[|\u0000-\u001f]/.test(v))) {
      return NextResponse.json({ error: 'Invalid payment details' }, { status: 400 });
    }

    const priced = await amountFor(String(txnid), String(productinfo));
    if ('error' in priced) {
      return NextResponse.json({ error: priced.error }, { status: priced.status });
    }
    const amount = payuAmount(priced.amount);

    // The SHA512 Hash string format for PayU:
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    // udf1 to udf10 are blank.
    const hashString = [key, txnid, amount, productinfo, firstname, email, ...Array(10).fill(''), salt].join('|');

    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    // The form posted to PayU must carry exactly this amount, or PayU rejects the hash.
    return NextResponse.json({ hash, amount });
  } catch (error) {
    console.error('PayU hash error:', error);
    return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 500 });
  }
}
