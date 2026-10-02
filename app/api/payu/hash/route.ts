import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { CONSULTATION_PLATFORM_FEE, DIAGNOSTIC_PLATFORM_FEE, matchBookedTests, sumPrices } from '@/lib/pricing';

type Priced = { amount: number } | { error: string; status: number };

// The amount is worked out here from the booking itself, never taken from the browser,
// so a tampered request can't confirm a booking for less than it costs.
async function amountFor(txnid: string, productinfo: string): Promise<Priced> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to pay.', status: 401 };

  if (productinfo === 'Consultation') {
    const { data } = await supabase
      .from('appointments')
      .select('status, doctors ( consultation_fee )')
      .eq('id', txnid)
      .eq('patient_id', user.id)
      .maybeSingle();
    if (!data) return { error: 'Appointment not found.', status: 404 };
    if (data.status !== 'pending_payment') return { error: 'This appointment is already paid.', status: 409 };
    const doctor = (Array.isArray(data.doctors) ? data.doctors[0] : data.doctors) as { consultation_fee: number | null } | null;
    const fee = Number(doctor?.consultation_fee);
    if (!fee) return { error: "This doctor's fee isn't set, so the booking can't be paid online.", status: 422 };
    return { amount: fee + CONSULTATION_PLATFORM_FEE };
  }

  if (productinfo === 'Diagnostic') {
    const { data } = await supabase
      .from('diagnostic_bookings')
      .select('status, test_name, diagnostic_centers ( test_prices )')
      .eq('id', txnid)
      .eq('patient_id', user.id)
      .maybeSingle();
    if (!data) return { error: 'Booking not found.', status: 404 };
    if (data.status !== 'pending_payment') return { error: 'This booking is already paid.', status: 409 };
    const center = (Array.isArray(data.diagnostic_centers) ? data.diagnostic_centers[0] : data.diagnostic_centers) as { test_prices: Record<string, number> | null } | null;
    const tests = matchBookedTests(data.test_name || '', center?.test_prices);
    if (!tests) return { error: "We couldn't price this booking. Please contact support.", status: 422 };
    return { amount: sumPrices(tests) + DIAGNOSTIC_PLATFORM_FEE };
  }

  return { error: 'Unknown product.', status: 400 };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { txnid, productinfo, firstname, email } = body;

    const key = process.env.PAYU_MERCHANT_KEY;
    const salt = process.env.PAYU_MERCHANT_SALT;

    if (!key || !salt) {
      return NextResponse.json({ error: 'PayU credentials missing' }, { status: 500 });
    }

    if (!txnid || !productinfo || !firstname || !email) {
      return NextResponse.json({ error: 'Missing required payment fields' }, { status: 400 });
    }

    const priced = await amountFor(String(txnid), String(productinfo));
    if ('error' in priced) {
      return NextResponse.json({ error: priced.error }, { status: priced.status });
    }
    const amount = String(priced.amount);

    // The SHA512 Hash string format for PayU:
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    // We are leaving udf1 to udf10 blank, which means 10 empty strings and 11 pipes between email and salt.
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;

    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    // The form posted to PayU must carry exactly this amount, or PayU rejects the hash.
    return NextResponse.json({ hash, amount });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Payment setup failed' }, { status: 500 });
  }
}
