import { loadCheckout } from '@/lib/razorpay-client'

// Browser only: pays for a partner purchase (a verified badge payment or an equipment order) with Razorpay Checkout.
// The server opens the order (app/api/razorpay/purchase); after paying, Checkout's handler sends the result to
// ./verify, which checks the signature and settles it. The page stays put, so the caller can refresh its data.

type Result = { ok: true } | { ok: false; error: string }

type Request = {
  kind: 'badge' | 'equipment'
  id: string
  description: string
  name: string
  email?: string | null
  phone?: string | null
}

const tenDigits = (phone: string | null | undefined) => {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : ''
}

export async function startPurchase(req: Request): Promise<Result> {
  type OrderReply = { keyId?: string; orderId?: string; amount?: number; currency?: string; error?: string }
  const [order, ready] = await Promise.all([
    fetch('/api/razorpay/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: req.kind, id: req.id }) })
      .then(async (res) => ({ ok: res.ok, data: (await res.json().catch(() => ({}))) as OrderReply }))
      .catch(() => ({ ok: false, data: { error: 'Payment service did not respond.' } as OrderReply })),
    loadCheckout(),
  ])
  if (!order.ok || !order.data.orderId || !order.data.keyId) return { ok: false, error: order.data.error || 'Could not start the payment. Please try again.' }
  if (!ready || !window.Razorpay) return { ok: false, error: 'The payment window could not load. Check your connection and try again.' }

  return new Promise<Result>((resolve) => {
    let settling = false
    const checkout = new window.Razorpay!({
      key: order.data.keyId,
      order_id: order.data.orderId,
      amount: order.data.amount,
      currency: order.data.currency ?? 'INR',
      name: 'Consult your Doctor',
      description: req.description,
      image: `${window.location.origin}/logo-icon.png`,
      prefill: { name: req.name, ...(req.email ? { email: req.email } : {}), ...(tenDigits(req.phone) ? { contact: tenDigits(req.phone) } : {}) },
      theme: { color: '#2A4DD0' },
      handler: async (response: unknown) => {
        settling = true
        const reply = await fetch('/api/razorpay/purchase/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(response) })
          .then(async (res) => (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string })
          .catch(() => ({ ok: false, reason: 'We could not confirm the payment just now. If you were charged, it will show here shortly.' }))
        resolve(reply.ok ? { ok: true } : { ok: false, error: reply.reason || 'We could not confirm the payment.' })
      },
      modal: {
        ondismiss: () => {
          if (!settling) resolve({ ok: false, error: 'You closed the payment window before paying.' })
        },
      },
    })
    checkout.on('payment.failed', (r: unknown) => {
      const reason = (r as { error?: { description?: string } })?.error?.description
      // Checkout stays open so another method can be tried; this only records why.
      if (reason) console.warn('Razorpay payment failed:', reason)
    })
    checkout.open()
  })
}
