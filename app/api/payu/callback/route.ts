import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { notifyBookingConfirmed } from '@/lib/notify/patient';
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

type Joined<T> = T | T[] | null;
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

// Booking states that mean the patient has paid for the booking.
const PAID_STATES = ['confirmed', 'visited', 'completed', 'report_sent'];

/**
 * The booking fee this payment had to cover, worked out the way /api/payu/hash priced it. Null when the fee settings
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

/** Sends the patient their booking confirmation on WhatsApp and email. Only the booking fee they paid online is named. */
async function notifyPaidBooking(isConsultation: boolean, id: string, amount: number, transactionId?: string) {
  const paid = formatINR(amount);
  const bookingId = id.slice(0, 8).toUpperCase();
  const tokenSeq = Math.abs(id.split('-').reduce((acc: number, part: string) => acc + parseInt(part.slice(0, 4), 16) || 0, 0) % 25) + 1;
  const tokenNumber = String(tokenSeq).padStart(2, '0');

  if (isConsultation) {
    const { data } = await supabase
      .from('appointments')
      .select(`
        patient_id,
        created_at,
        schedules ( start_time ),
        hospitals ( name, address, city ),
        doctors (
          specialty,
          profiles!doctors_profile_id_fkey ( full_name )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    const row = data as any;
    if (!row) return;
    const docObj = one(row.doctors);
    const hospObj = one(row.hospitals);
    const schedule = one(row.schedules);
    const rawDoctor = one(docObj?.profiles)?.full_name;
    const doctor = rawDoctor ? (/^dr\.?\s/i.test(rawDoctor) ? rawDoctor : `Dr. ${rawDoctor}`) : 'Specialist';
    const dateStr = schedule?.start_time
      ? new Date(schedule.start_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })
      : 'Scheduled Visit';

    notifyBookingConfirmed({
      patientId: row.patient_id,
      what: `consultation with ${doctor}`,
      where: hospObj?.name ?? 'the hospital',
      bookingId,
      amount: paid,
      numericAmount: amount,
      dateTimeStr: dateStr,
      tokenNumber,
      isConsultation: true,
      doctorName: doctor,
      specialty: docObj?.specialty ?? 'Specialist Consultation',
      hospitalName: hospObj?.name ?? 'Partner Hospital',
      address: hospObj?.address ?? null,
      city: hospObj?.city ?? null,
      transactionId: transactionId || id,
    });
  } else {
    const { data } = await supabase
      .from('diagnostic_bookings')
      .select('patient_id, test_name, preferred_date, diagnostic_centers ( name, address, city )')
      .eq('id', id)
      .maybeSingle();

    const row = data as any;
    if (!row) return;
    const centerObj = one(row.diagnostic_centers);
    const dateStr = row.preferred_date ? `Visit on ${row.preferred_date}` : 'Scheduled Visit';

    notifyBookingConfirmed({
      patientId: row.patient_id,
      what: `lab tests (${row.test_name})`,
      where: centerObj?.name ?? 'the diagnostic centre',
      bookingId,
      amount: paid,
      numericAmount: amount,
      dateTimeStr: dateStr,
      tokenNumber,
      isConsultation: false,
      doctorName: row.test_name,
      specialty: 'Diagnostic Laboratory Testing',
      hospitalName: centerObj?.name ?? 'Diagnostic Centre',
      address: centerObj?.address ?? null,
      city: centerObj?.city ?? null,
      transactionId: transactionId || id,
    });
  }
}

/**
 * A booking whose payment failed or was cancelled can't be paid for now, so it is cancelled and its slot is given back
 * at once. Only a booking still awaiting payment is touched.
 */
async function releaseUnpaidBooking(isConsultation: boolean, bookingId: string) {
  if (isConsultation) {
    const { data: row } = await supabase.from('appointments').select('schedule_id').eq('id', bookingId).maybeSingle();
    const { data: cancelled } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('status', 'pending_payment')
      .select('id');
    if (cancelled?.length && row?.schedule_id) {
      await supabase.from('schedules').update({ is_booked: false }).eq('id', row.schedule_id);
    }
  } else {
    await supabase.from('diagnostic_bookings').update({ status: 'cancelled' }).eq('id', bookingId).eq('status', 'pending_payment');
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
      const recordPayment = (row: { amount: number; status: string }) =>
        earlierRow
          ? supabase.from('payments').update(row).eq('id', earlierRow.id)
          : supabase.from('payments').insert({ ...bookingColumn, transaction_id: mihpayid || txnid, gateway: 'payu', ...row });

      // PayU only ever collects the booking fee. A payment short of it (say the fee went up while the patient was on
      // PayU's page) is kept for the operations team to settle and doesn't confirm the booking.
      const expected = await expectedCharge(productinfo, bookingId);
      if (expected != null && !(paidAmount + 0.005 >= expected)) {
        console.error(`PayU callback: ${bookingId} paid ${amount}, booking fee is ${expected}. Left for review.`);
        await recordPayment({ amount: paidAmount || 0, status: 'pending' });
        return failed(`The amount paid (${formatINR(paidAmount || 0)}) doesn't match the booking fee (${formatINR(expected)}). Our team will refund or confirm it; you don't need to pay again.`);
      }

      const { data: current } = await supabase.from(table).select('status').eq('id', bookingId).maybeSingle();
      const currentStatus = (current as { status?: string } | null)?.status ?? null;

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

      if (confirmed?.length) await notifyPaidBooking(isConsultation, bookingId, paidAmount, mihpayid);

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

    // A payment that failed or was cancelled frees its slot now. One still in progress at PayU keeps it.
    if (status !== 'pending' && (isConsultation || isDiagnostic)) {
      await releaseUnpaidBooking(isConsultation, bookingId);
    }

    return failed(failureReason);

  } catch (error) {
    console.error('PayU Callback Error:', error);
    return NextResponse.json({ error: 'The payment could not be processed. If you were charged, contact support with your transaction ID.' }, { status: 500 });
  }
}
