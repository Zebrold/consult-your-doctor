import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPurchaseOrder, razorpayKeys, RazorpayError } from '@/lib/razorpay'

// Starts paying for a partner purchase: a verified badge payment (badge_payments) or an equipment order. The purchase
// was made by a server action, which fixed its amount; this checks the caller may pay for it and opens a Razorpay order
// for exactly that amount. lib/purchase-client.ts opens Checkout; ./verify settles it.

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

export async function POST(request: Request) {
  try {
    const keys = razorpayKeys()
    if (!keys) return fail('Online payment is not set up yet. Please try again later.', 503)
    const body = (await request.json().catch(() => null)) as { kind?: unknown; id?: unknown } | null
    const kind = body?.kind === 'badge' || body?.kind === 'equipment' ? body.kind : null
    const id = typeof body?.id === 'string' && ID.test(body.id) ? body.id : null
    if (!kind || !id) return fail('Missing payment details.', 400)

    const user = await getCurrentUser()
    if (!user) return fail('Please log in to pay.', 401)
    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()

    let amount = 0
    if (kind === 'badge') {
      const { data } = await admin.from('badge_payments').select('payer_id, hospital_id, amount, status').eq('id', id).maybeSingle()
      if (!data) return fail('Payment not found.', 404)
      const mine = data.payer_id === user.id || (profile?.role === 'hospital_admin' && !!data.hospital_id && data.hospital_id === profile.hospital_id)
      if (!mine) return fail('Payment not found.', 404)
      if (data.status === 'paid') return fail('This is already paid.', 409)
      amount = Number(data.amount) || 0
    } else {
      const { data } = await admin.from('equipment_orders').select('hospital_id, total, status').eq('id', id).maybeSingle()
      if (!data || profile?.role !== 'hospital_admin' || data.hospital_id !== profile.hospital_id) return fail('Order not found.', 404)
      if (data.status !== 'awaiting_payment') return fail(data.status === 'cancelled' ? 'This order was cancelled.' : 'This order is already paid.', 409)
      amount = Number(data.total) || 0
    }
    if (!(amount >= 1)) return fail('There is nothing to pay.', 422)

    const order = await createPurchaseOrder(amount, { purchase: kind, purchase_id: id })
    await admin.from(kind === 'badge' ? 'badge_payments' : 'equipment_orders').update({ razorpay_order_id: order.id }).eq('id', id)
    return NextResponse.json({ keyId: keys.keyId, orderId: order.id, amount: order.amount, currency: order.currency })
  } catch (err) {
    console.error('Razorpay purchase order:', err)
    const message = err instanceof RazorpayError && err.status === 401 ? 'Online payment is not set up correctly. Please contact support.' : 'Could not start the payment. Please try again.'
    return fail(message, 502)
  }
}
