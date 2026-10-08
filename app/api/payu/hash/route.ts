import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CONSULTATION_PLATFORM_FEE, DIAGNOSTIC_PLATFORM_FEE, matchBookedTests, sumPrices } from '@/lib/pricing';

type Priced = { amount: number; desk: boolean } | { error: string; status: number };

// The amount is worked out here from the booking itself, never taken from the browser,
// so a tampered request can't confirm a booking for less than it costs.
async function amountFor(txnid: string, productinfo: string): Promise<Priced> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to pay.', status: 401 };

  // Hospital and diagnostic centre staff take payment at the desk for bookings they made for a patient.
  const admin = createAdminClient();
  const { data: staff } = await admin.from('profiles').select('role, hospital_id, diagnostic_center_id').eq('id', user.id).maybeSingle();
  if (staff?.role === 'hospital_admin' || staff?.role === 'diagnostic_admin') return deskAmount(admin, staff, txnid, productinfo);

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
    return { amount: fee + CONSULTATION_PLATFORM_FEE, desk: false };
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
    return { amount: sumPrices(tests) + DIAGNOSTIC_PLATFORM_FEE, desk: false };
  }

  return { error: 'Unknown product.', status: 400 };
}

type Staff = { role: string; hospital_id: string | null; diagnostic_center_id: string | null };

/** The same prices, for a booking at the staff member's own hospital or centre. */
async function deskAmount(admin: ReturnType<typeof createAdminClient>, staff: Staff, txnid: string, productinfo: string): Promise<Priced> {
  if (productinfo === 'Consultation' && staff.role === 'hospital_admin' && staff.hospital_id) {
    const { data } = await admin.from('appointments').select('status, hospital_id, doctors ( consultation_fee, hospital_id )').eq('id', txnid).maybeSingle();
    const doctor = (Array.isArray(data?.doctors) ? data.doctors[0] : data?.doctors) as { consultation_fee: number | null; hospital_id: string | null } | null;
    if (!data || (data.hospital_id !== staff.hospital_id && doctor?.hospital_id !== staff.hospital_id)) return { error: 'Appointment not found.', status: 404 };
    if (data.status !== 'pending_payment') return { error: 'This appointment is already paid.', status: 409 };
    const fee = Number(doctor?.consultation_fee);
    if (!fee) return { error: "This doctor's fee isn't set.", status: 422 };
    return { amount: fee + CONSULTATION_PLATFORM_FEE, desk: true };
  }
  if (productinfo === 'Diagnostic' && staff.role === 'diagnostic_admin' && staff.diagnostic_center_id) {
    const { data } = await admin.from('diagnostic_bookings').select('status, center_id, test_name, diagnostic_centers ( test_prices )').eq('id', txnid).maybeSingle();
    if (!data || data.center_id !== staff.diagnostic_center_id) return { error: 'Booking not found.', status: 404 };
    if (data.status !== 'pending_payment') return { error: 'This booking is already paid.', status: 409 };
    const center = (Array.isArray(data.diagnostic_centers) ? data.diagnostic_centers[0] : data.diagnostic_centers) as { test_prices: Record<string, number> | null } | null;
    const tests = matchBookedTests(data.test_name || '', center?.test_prices);
    if (!tests) return { error: "We couldn't price this booking.", status: 422 };
    return { amount: sumPrices(tests) + DIAGNOSTIC_PLATFORM_FEE, desk: true };
  }
  return { error: 'You can only take payment for bookings at your own hospital or centre.', status: 403 };
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
    // udf1 marks a payment taken at a hospital or centre desk, so the callback returns to that portal.
    const udf1 = priced.desk ? 'desk' : '';

    // The SHA512 Hash string format for PayU:
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    // udf2 to udf10 are blank: 9 empty fields between udf1 and the salt.
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}||||||||||${salt}`;

    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    // The form posted to PayU must carry exactly this amount and udf1, or PayU rejects the hash.
    return NextResponse.json({ hash, amount, udf1 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Payment setup failed' }, { status: 500 });
  }
}
