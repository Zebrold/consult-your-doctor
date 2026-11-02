import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { notifyBookingConfirmed, notifyPaymentPending } from '@/lib/notify/patient';
import { insertPaymentRow, shareColumns } from '@/lib/wallet';
import { loadBookingFees, onlineChargeFor } from '@/lib/booking-fees';
import { formatINR } from '@/components/patient/format';
import { bookingIdOf } from '@/lib/payu-txn';

// We must use the service role key to bypass RLS, because this webhook is called by PayU's servers without any user session.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const field = (data: Record<string, FormDataEntryValue>, name: string) => {
  const value = data[name];
  return typeof value === 'string' ? value : '';
};

// Booking states that mean the patient has paid for the booking.
const PAID_STATES = ['confirmed', 'visited', 'completed', 'report_sent'];

/**
 * What this payment had to cover (the booking fee and the convenience fee on it), worked out the way /api/payu/hash
 * priced it. Null when the fee settings
 * can't be read: the amount was still signed by our own hash route, so PayU's verified amount is trusted then.
 */
async function expectedCharge(productinfo: string, bookingId: string): Promise<number | null> {
  try {
    const charge = await onlineChargeFor(supabase, productinfo, bookingId, await loadBookingFees());
    return 'error' in charge ? null : charge.amount;
  } catch (err) {
    console.error('PayU callback: could not check the booking fee:', err);
    return null;
  }
}

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

    const key = process.env.PAYU_MERCHANT_KEY || process.env.NEXT_PUBLIC_PAYU_KEY;
    // Anyone who knows the salt can forge a "payment succeeded" callback, so it only ever comes from the environment.
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

    const baseUrl = new URL(request.url).origin;
    const isConsultation = productinfo === 'Consultation';
    const isDiagnostic = productinfo === 'Diagnostic';
    // The booking this payment is for. The transaction id carries a suffix per attempt (lib/payu-txn.ts).
    const bookingId = bookingIdOf(txnid);
    const table = isConsultation ? 'appointments' : 'diagnostic_bookings';

    const bookingColumn = isConsultation ? { appointment_id: bookingId } : { appointment_id: null, diagnostic_booking_id: bookingId };
    const failed = (reason: string) =>
      NextResponse.redirect(`${baseUrl}/book/confirmation/${bookingId}?payment=failed&reason=${encodeURIComponent(reason)}`, 303);

    if (status === 'success' && (isConsultation || isDiagnostic)) {
      const paidAmount = Number(amount);

      // Rows already recorded for this PayU transaction. A success among them means PayU sent this callback again (a
      // replay), which changes nothing. A pending or failed one (PayU can report "pending" before "success") is turned
      // into the outcome below rather than duplicated.
      const { data: earlier } = await supabase.from('payments').select('id, status').eq('transaction_id', mihpayid || txnid);
      const earlierRows = (earlier ?? []) as { id: string; status: string }[];
      if (earlierRows.some((p) => p.status === 'success')) {
        return NextResponse.redirect(`${baseUrl}/book/confirmation/${bookingId}?payment=success`, 303);
      }
      const earlierRow = earlierRows[0] ?? null;

      const { data: current } = await supabase.from(table).select('*').eq('id', bookingId).maybeSingle();
      const currentStatus = (current as { status?: string } | null)?.status ?? null;

      // Online money lands in Consult your Doctor's account and is all booking and convenience fee, so it adds nothing to the hospital's
      // wallet (lib/wallet.ts). The payment method ("UPI", "CC"...) is shown on the booking page.
      const wallet = shareColumns(
        isConsultation ? ((current as { hospital_id?: string | null } | null)?.hospital_id ?? null) : null,
        { platform: paidAmount || 0, hospital: 0 },
        field(data, 'mode') || null,
      );
      const recordPayment = async (row: { amount: number; status: string }) => {
        if (!earlierRow) return insertPaymentRow(supabase, { ...bookingColumn, transaction_id: mihpayid || txnid, gateway: 'payu', ...row, ...wallet });
        const res = await supabase.from('payments').update({ ...row, ...wallet }).eq('id', earlierRow.id);
        // A database without the wallet columns yet: update what it has.
        return res.error && /share|method|schema cache/i.test(res.error.message) ? supabase.from('payments').update(row).eq('id', earlierRow.id) : res;
      };

      // PayU only ever collects the booking fee and the convenience fee on it. A payment short of that (say the fee went
      // up while the patient was on PayU's page) is kept for the operations team to settle and doesn't confirm the booking.
      const expected = await expectedCharge(productinfo, bookingId);
      if (expected != null && !(paidAmount + 0.005 >= expected)) {
        console.error(`PayU callback: ${bookingId} paid ${amount}, amount due is ${expected}. Left for review.`);
        await recordPayment({ amount: paidAmount || 0, status: 'pending' });
        return failed(`The amount paid (${formatINR(paidAmount || 0)}) doesn't match the amount due (${formatINR(expected)}). Our team will refund or confirm it; you don't need to pay again.`);
      }

      // The booking must still be open for payment. One that was cancelled (its unpaid hold went stale, so the slot may
      // have been sold since) can't be confirmed. A second payment for a booking that is already paid is the same case.
      // Either way the money is kept for review, and the patient is told.
      if (currentStatus !== 'pending_payment') {
        const alreadyPaid = currentStatus !== null && PAID_STATES.includes(currentStatus);
        console.error(`PayU callback: ${bookingId} paid ${amount} for a booking that is ${currentStatus ?? 'missing'}. Left for review.`);
        await recordPayment({ amount: paidAmount || 0, status: 'pending' });
        return failed(
          alreadyPaid
            ? 'We received a second payment for a booking that is already paid. Our team will refund it; you don’t need to pay again.'
            : 'Your payment went through, but this booking is no longer open. Our team will refund it; you don’t need to pay again.',
        );
      }

      // Record payment success against the right booking table.
      const { error: paymentError } = await recordPayment({ amount: paidAmount, status: 'success' });

      if (paymentError && paymentError.code !== '23505') {
        console.error('Error inserting payment:', paymentError);
      }

      // Only move bookings that are still waiting for payment, so a replayed callback can't resurrect a cancelled booking.
      const { data: confirmed, error: updateError } = await supabase
        .from(table)
        .update({ status: 'confirmed' })
        .eq('id', bookingId)
        .eq('status', 'pending_payment')
        .select('id');
      if (updateError) console.error(`Error confirming ${table} ${bookingId}:`, updateError);

      if (confirmed?.length) notifyBookingConfirmed(bookingId);

      return NextResponse.redirect(`${baseUrl}/book/confirmation/${bookingId}?payment=success`, 303);
    }

    // Payment Failed or Pending
    const failureReason = field(data, 'error_Message') || field(data, 'unmappedstatus') || 'Transaction was not completed by provider';
    try {
      await supabase.from('payments').insert({
        ...bookingColumn,
        transaction_id: mihpayid || txnid,
        amount: Number(amount) || 0,
        gateway: 'payu',
        status: status === 'pending' ? 'pending' : 'failed',
      });
    } catch {}

    // A payment that failed or was cancelled leaves the booking waiting for payment, so the patient can try again until
    // its hold ends (app/actions/booking.ts releases holds after 30 minutes). They are emailed the booking with a Pay
    // button. One still in progress at PayU is left alone.
    if (status !== 'pending' && (isConsultation || isDiagnostic)) {
      notifyPaymentPending(bookingId, failureReason);
    }

    return failed(failureReason);

  } catch (error) {
    console.error('PayU Callback Error:', error);
    return NextResponse.json({ error: 'The payment could not be processed. If you were charged, contact support with your transaction ID.' }, { status: 500 });
  }
}
