import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { txnid, amount, productinfo, firstname, email } = body;

    const key = process.env.PAYU_MERCHANT_KEY;
    const salt = process.env.PAYU_MERCHANT_SALT;

    if (!key || !salt) {
      return NextResponse.json({ error: 'PayU credentials missing' }, { status: 500 });
    }

    if (!txnid || !amount || !productinfo || !firstname || !email) {
      return NextResponse.json({ error: 'Missing required payment fields' }, { status: 400 });
    }

    // The SHA512 Hash string format for PayU:
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    // We are leaving udf1 to udf10 blank, which means 10 empty strings and 11 pipes between email and salt.
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    return NextResponse.json({ hash });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
