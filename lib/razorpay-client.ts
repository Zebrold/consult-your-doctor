// Browser only: opens Razorpay Checkout for a booking that is waiting for its booking fee. The server creates the order
// (app/api/razorpay/order); after paying, Checkout posts the result to app/api/razorpay/callback, which confirms the
// booking and sends the patient to its confirmation page.

type CheckoutOptions = Record<string, unknown>
type RazorpayInstance = { open: () => void; on: (event: string, handler: (response: unknown) => void) => void }
declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => RazorpayInstance
  }
}

/** What startOnlinePayment resolves with when the patient closes Checkout without paying. */
export const WINDOW_CLOSED = 'You closed the payment window before paying. You can pay again while your slot is held.'

const CHECKOUT_JS = 'https://checkout.razorpay.com/v1/checkout.js'
let loading: Promise<boolean> | null = null

/** Loads Checkout once per page. */
function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true)
  loading ??= new Promise<boolean>((resolve) => {
    const script = document.createElement('script')
    script.src = CHECKOUT_JS
    script.async = true
    script.onload = () => resolve(!!window.Razorpay)
    script.onerror = () => {
      loading = null
      resolve(false)
    }
    document.body.appendChild(script)
  })
  return loading
}

type PaymentRequest = {
  bookingId: string
  product: 'Consultation' | 'Diagnostic'
  name: string
  email: string | null
  phone: string | null
}

const tenDigits = (phone: string | null) => {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : ''
}

/**
 * Resolves with a message if the payment didn't go ahead (it couldn't start, or the patient closed Checkout). After a
 * payment Checkout leaves the page for the callback, so the promise doesn't resolve then.
 */
export async function startOnlinePayment(req: PaymentRequest): Promise<string | null> {
  const [order, ready] = await Promise.all([
    fetch('/api/razorpay/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: req.bookingId, product: req.product }),
    })
      .then(async (res) => ({ ok: res.ok, data: (await res.json().catch(() => ({}))) as { keyId?: string; orderId?: string; amount?: number; currency?: string; error?: string } }))
      .catch(() => ({ ok: false, data: { error: 'Payment service did not respond.' } as { keyId?: string; orderId?: string; amount?: number; currency?: string; error?: string } })),
    loadCheckout(),
  ])
  if (!order.ok || !order.data.orderId || !order.data.keyId) return order.data.error || 'Could not start the payment. Please try again.'
  if (!ready || !window.Razorpay) return 'The payment window could not load. Check your connection and try again.'

  const name = req.name.trim() || 'Patient'
  const callback = `${window.location.origin}/api/razorpay/callback?booking=${encodeURIComponent(req.bookingId)}`

  return new Promise<string | null>((resolve) => {
    const checkout = new window.Razorpay!({
      key: order.data.keyId,
      order_id: order.data.orderId,
      amount: order.data.amount,
      currency: order.data.currency ?? 'INR',
      name: 'Consult your Doctor',
      description: req.product === 'Consultation' ? 'Appointment booking fee' : 'Lab test booking fee',
      image: `${window.location.origin}/logo-icon.png`,
      prefill: { name, ...(req.email ? { email: req.email } : {}), ...(tenDigits(req.phone) ? { contact: tenDigits(req.phone) } : {}) },
      notes: { booking_id: req.bookingId, kind: req.product },
      theme: { color: '#1D4ED8' },
      // After paying (or a failed attempt), Checkout posts the result to our server, which confirms the booking.
      callback_url: callback,
      redirect: true,
      modal: {
        confirm_close: true,
        ondismiss: () => resolve(WINDOW_CLOSED),
      },
    })
    checkout.open()
  })
}
