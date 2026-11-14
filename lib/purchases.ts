import { createAdminClient } from '@/lib/supabase/admin'
import { formatINR } from '@/components/patient/format'
import { capturePayment, fromPaise, type PurchaseNotes, type RazorpayPayment } from '@/lib/razorpay'

// Partner purchases paid through Razorpay: a verified badge payment (badge_payments, covering one or more badges) or
// an equipment order. The amount was fixed by our server when the purchase was made; a payment is accepted only for
// exactly that amount, and settling twice (browser and webhook) does nothing the second time.

type Settled = { ok: true } | { ok: false; reason: string }

async function captured(payment: RazorpayPayment): Promise<RazorpayPayment> {
  if (payment.status !== 'authorized') return payment
  try {
    return await capturePayment(payment)
  } catch (err) {
    console.error('Razorpay capture (purchase):', err)
    return payment
  }
}

export async function settlePurchase(notes: PurchaseNotes, payment: RazorpayPayment): Promise<Settled> {
  const admin = createAdminClient()
  const table = notes.purchase === 'badge' ? 'badge_payments' : 'equipment_orders'
  const { data: row, error } = await admin.from(table).select(notes.purchase === 'badge' ? 'id, amount, status' : 'id, total, status').eq('id', notes.purchase_id).maybeSingle()
  if (error || !row) {
    console.error(`settlePurchase: ${notes.purchase} ${notes.purchase_id} not found`, error)
    return { ok: false, reason: 'We could not find this purchase. Our team will check the payment; you don’t need to pay again.' }
  }
  const r = row as unknown as { id: string; amount?: number | string; total?: number | string; status: string }
  const due = Number(r.amount ?? r.total) || 0
  const alreadyDone = notes.purchase === 'badge' ? r.status === 'paid' : r.status !== 'awaiting_payment' && r.status !== 'cancelled'
  if (alreadyDone) return { ok: true }

  const p = await captured(payment)
  if (p.status !== 'captured' && p.status !== 'authorized') return { ok: false, reason: p.error_description || 'The payment was not completed.' }
  const paid = fromPaise(p.amount)
  if (Math.abs(paid - due) > 0.5) {
    console.error(`settlePurchase: ${notes.purchase} ${r.id} paid ${paid}, due ${due}. Left for review.`)
    return { ok: false, reason: `The amount paid (${formatINR(paid)}) doesn't match the amount due (${formatINR(due)}). Our team will refund or confirm it.` }
  }

  const paidAt = new Date().toISOString()
  if (notes.purchase === 'badge') {
    const { error: e1 } = await admin
      .from('badge_payments')
      .update({ status: 'paid', razorpay_payment_id: p.id, razorpay_order_id: p.order_id, paid_at: paidAt })
      .eq('id', r.id)
      .neq('status', 'paid')
    if (e1) {
      console.error('settlePurchase badge payment:', e1)
      return { ok: false, reason: 'Paid, but we could not record it just now. Our team will confirm it; you don’t need to pay again.' }
    }
    // Paid badges go to the team to check (/executive/badges).
    await admin.from('verified_badges').update({ status: 'in_review' }).eq('payment_id', r.id).eq('status', 'awaiting_payment')
    return { ok: true }
  }

  const { data: placed, error: e2 } = await admin
    .from('equipment_orders')
    .update({ status: 'placed', razorpay_payment_id: p.id, razorpay_order_id: p.order_id, paid_at: paidAt, updated_at: paidAt })
    .eq('id', r.id)
    .eq('status', 'awaiting_payment')
    .select('id')
  if (e2) {
    console.error('settlePurchase equipment order:', e2)
    return { ok: false, reason: 'Paid, but we could not record it just now. Our team will confirm it; you don’t need to pay again.' }
  }
  // Takes the order's items out of stock, once: only the call that moved the order to placed (tracked products only;
  // does nothing before 20261115_executive_workspace.sql).
  if (placed?.length) {
    const { error: stockError } = await admin.rpc('take_equipment_stock', { p_order: r.id })
    if (stockError && !/function|schema cache/i.test(stockError.message ?? '')) console.error('settlePurchase stock:', stockError)
  }
  return { ok: true }
}
