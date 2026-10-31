// Browser-only: hands a pending booking over to the PayU hosted checkout.
// PayU calls /api/payu/callback afterwards, which confirms the booking.
import { newPayuTxnid } from '@/lib/payu-txn'

// PayU live hosted checkout (https://secure.payu.in/_payment)
const PAYU_URL = process.env.NEXT_PUBLIC_PAYU_URL || 'https://secure.payu.in/_payment'

type PayuRequest = {
  txnid: string
  productinfo: 'Consultation' | 'Diagnostic'
  firstname: string
  email: string
  phone: string
  payuKey: string
}

const tenDigits = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

/** Resolves with an error message if the payment couldn't be started; otherwise the page navigates to PayU. */
export async function startPayuPayment(req: PayuRequest): Promise<string | null> {
  const key = req.payuKey || process.env.NEXT_PUBLIC_PAYU_KEY
  if (!key) return 'Online payment is not set up yet. Please try again later.'
  const firstname = req.firstname.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/)[0] || 'Patient'
  // A new transaction id for every attempt, so a retry is never sent to PayU under an id it has already seen.
  const txnid = newPayuTxnid(req.txnid)
  const res = await fetch('/api/payu/hash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txnid, productinfo: req.productinfo, firstname, email: req.email }),
  })
  const data = await res.json().catch(() => ({ error: 'Payment service did not respond.' }))
  if (!res.ok || data.error || !data.hash) return data.error || 'Could not start the payment. Please try again.'

  const callback = `${window.location.origin}/api/payu/callback`
  const fields: Record<string, string> = {
    key,
    txnid,
    amount: data.amount,
    productinfo: req.productinfo,
    firstname,
    email: req.email,
    phone: tenDigits(req.phone),
    surl: callback,
    furl: callback,
    hash: data.hash,
  }

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = PAYU_URL
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
  return null
}
