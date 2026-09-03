import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// We must use the service role key to bypass RLS, because this webhook is called by PayU's servers without any user session.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());

    const { 
      txnid, amount, productinfo, firstname, email, status, hash, 
      udf1, udf2, udf3, udf4, udf5 
    } = data;

    const key = process.env.PAYU_MERCHANT_KEY;
    const salt = process.env.PAYU_MERCHANT_SALT;

    if (!key || !salt) {
      return NextResponse.json({ error: 'PayU credentials missing' }, { status: 500 });
    }

    // Reverse Hash formula for PayU:
    // salt|status|||||||||||email|firstname|productinfo|amount|txnid|key
    const reverseHashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    const computedHash = crypto.createHash('sha512').update(reverseHashString).digest('hex');

    // Verify hash
    if (computedHash !== hash) {
      console.error('PayU Hash Mismatch. Potential tampering detected.');
      return NextResponse.json({ error: 'Invalid Hash' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (status === 'success') {
      // Record payment success
      const { error: paymentError } = await supabase.from('payments').insert({
        appointment_id: typeof txnid === 'string' ? txnid : null, // Depending on if it's consultation or diagnostic
        amount: Number(amount),
        gateway: 'payu',
        status: 'success'
      });

      if (paymentError) console.error('Error inserting payment:', paymentError);

      // Update the correct table based on productinfo
      if (productinfo === 'Consultation') {
        await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', txnid);
      } else if (productinfo === 'Diagnostic') {
        await supabase.from('diagnostic_bookings').update({ status: 'confirmed' }).eq('id', txnid);
      }

      // Redirect to the success dashboard
      return NextResponse.redirect(`${baseUrl}/patient/dashboard?payment=success`, 303);
    } else {
      // Payment Failed
      // You can update status to 'failed' if necessary
      return NextResponse.redirect(`${baseUrl}/patient/dashboard?payment=failed`, 303);
    }

  } catch (error: any) {
    console.error('PayU Callback Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
