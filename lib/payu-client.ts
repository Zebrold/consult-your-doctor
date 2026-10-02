// Browser-only: hands a pending booking over to the PayU hosted checkout.
// PayU calls /api/payu/callback afterwards, which confirms the booking.

// PayU test endpoint. For production, change this to 'https://secure.payu.in/_payment'
const PAYU_URL = 'https://test.payu.in/_payment'

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
  const firstname = req.firstname.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/)[0] || 'Patient'
  const res = await fetch('/api/payu/hash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txnid: req.txnid, productinfo: req.productinfo, firstname, email: req.email }),
  })
  const data = await res.json().catch(() => ({ error: 'Payment service did not respond.' }))
  if (!res.ok || data.error || !data.hash) return data.error || 'Could not start the payment. Please try again.'

  const callback = `${window.location.origin}/api/payu/callback`
  const fields: Record<string, string> = {
    key: req.payuKey,
    txnid: req.txnid,
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
