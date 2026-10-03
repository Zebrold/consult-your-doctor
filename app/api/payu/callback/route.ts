import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// We must use the service role key to bypass RLS, because this webhook is called by PayU's servers without any user session.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const field = (data: Record<string, FormDataEntryValue>, name: string) => {
  const value = data[name];
  return typeof value === 'string' ? value : '';
};

function hashesMatch(expected: string, received: string) {
  const a = Buffer.from(expected.toLowerCase());
  const b = Buffer.from(received.toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());

    const txnid = field(data, 'txnid');
    const amount = field(data, 'amount');
    const productinfo = field(data, 'productinfo');
    const firstname = field(data, 'firstname');
    const email = field(data, 'email');
    const status = field(data, 'status');
    const hash = field(data, 'hash');
    const mihpayid = field(data, 'mihpayid');
    const additionalCharges = field(data, 'additionalCharges');
    const udf = [1, 2, 3, 4, 5].map((n) => field(data, `udf${n}`));

    const key = process.env.PAYU_MERCHANT_KEY;
    const salt = process.env.PAYU_MERCHANT_SALT;

    if (!key || !salt) {
      return NextResponse.json({ error: 'PayU credentials missing' }, { status: 500 });
    }

    // Reverse Hash formula for PayU:
    // [additionalCharges|]salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    // This is checked for every callback (success and failure) before anything else happens.
    const reverseHashString = [
      ...(additionalCharges ? [additionalCharges] : []),
      salt, status, '', '', '', '', '', ...[...udf].reverse(),
      email, firstname, productinfo, amount, txnid, key,
    ].join('|');
    const computedHash = crypto.createHash('sha512').update(reverseHashString).digest('hex');

    // Verify hash
    if (!hash || !hashesMatch(computedHash, hash)) {
      console.error('PayU Hash Mismatch. Potential tampering detected.');
      return NextResponse.json({ error: 'Invalid Hash' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const isConsultation = productinfo === 'Consultation';
    const isDiagnostic = productinfo === 'Diagnostic';

    if (status === 'success' && (isConsultation || isDiagnostic)) {
      // Record payment success against the right booking table.
      // payments.appointment_id is a FK to appointments, so diagnostic bookings use their own column.
      const { error: paymentError } = await supabase.from('payments').insert({
        appointment_id: isConsultation ? txnid : null,
        diagnostic_booking_id: isDiagnostic ? txnid : null,
        transaction_id: mihpayid || txnid,
        amount: Number(amount),
        gateway: 'payu',
        status: 'success'
      });

      // 23505 = PayU retried a callback we've already recorded; the booking is already confirmed.
      if (paymentError && paymentError.code !== '23505') {
        console.error('Error inserting payment:', paymentError);
      }

      // Only move bookings that are still waiting for payment, so a replayed callback can't
      // resurrect a cancelled booking.
      const table = isConsultation ? 'appointments' : 'diagnostic_bookings';
      const { error: updateError } = await supabase
        .from(table)
        .update({ status: 'confirmed' })
        .eq('id', txnid)
        .eq('status', 'pending_payment');
      if (updateError) console.error(`Error confirming ${table} ${txnid}:`, updateError);

      // Redirect to the success dashboard
      return NextResponse.redirect(`${baseUrl}/patient/profile?payment=success`, 303);
    }

    // Payment Failed (or unknown product). The booking stays pending so the patient can retry.
    return NextResponse.redirect(`${baseUrl}/patient/profile?payment=failed`, 303);

  } catch (error: any) {
    console.error('PayU Callback Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
