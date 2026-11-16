'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { ONLINE_GATEWAY, isOnlineGateway } from '@/lib/payment-gateways'
import { notifyRefund } from '@/lib/notify/patient'
import { executiveFor } from '@/app/executive/_lib/ops'
import { istDateKey } from '@/components/patient/format'

export type PaymentStatus = 'success' | 'failed' | 'pending' | 'refunded'

export type TransactionRow = {
  id: string
  transactionId: string
  patientId: string | null
  patientName: string | null
  patientCode: string | null
  hospitalId: string | null
  hospitalName: string | null
  hospitalCode: string | null
  diagnosticCenterId: string | null
  diagnosticCenterName: string | null
  diagnosticCenterCode: string | null
  bookingReference: string
  bookingKind: 'consultation' | 'diagnostic'
  gateway: string
  amount: number
  status: PaymentStatus
  refundAmount: number | null
  refundReason: string | null
  refundedAt: string | null
  createdAt: string
  /** The patient cancelled at least 2 hours before the booking: the whole payment is to be refunded and recorded here. */
  refundDue?: { cancelledAt: string; startsAt: string | null } | null
  audits?: PaymentAuditRow[]
}

export type PaymentAuditRow = {
  id: string
  paymentId: string
  action: string
  performedBy: string | null
  performedByName: string
  oldStatus: string | null
  newStatus: string | null
  amount: number | null
  reason: string
  createdAt: string
}

type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

type PaymentRow = {
  id: string
  transaction_id: string | null
  amount: number | string | null
  gateway: string | null
  status: string
  created_at: string | null
  appointment_id: string | null
  diagnostic_booking_id: string | null
  patient_id: string | null
  hospital_id: string | null
  diagnostic_center_id: string | null
  refund_amount: number | string | null
  refund_reason: string | null
  refunded_at: string | null
}
type PatientRef = { full_name: string | null; patient_code: string | null }
type AppointmentRef = {
  id: string
  patient_id: string | null
  hospital_id: string | null
  profiles: Joined<PatientRef>
  hospitals: Joined<{ id: string; name: string | null; hospital_code: string | null }>
}
type DiagnosticRef = {
  id: string
  patient_id: string | null
  center_id: string | null
  profiles: Joined<PatientRef>
  diagnostic_centers: Joined<{ id: string; name: string | null; center_code: string | null }>
}
type HospitalRef = { id: string; name: string | null; hospital_code: string | null }
type CenterRef = { id: string; name: string | null; center_code: string | null }
type AuditDbRow = {
  id: string
  payment_id: string
  action: string
  performed_by: string | null
  performed_by_name: string
  old_status: string | null
  new_status: string | null
  amount: number | string | null
  reason: string
  created_at: string
}

export type PaymentStats = {
  totalCollections: number
  successfulCount: number
  successfulAmount: number
  pendingCount: number
  pendingAmount: number
  failedCount: number
  failedAmount: number
  refundCount: number
  refundAmount: number
  totalTransactions: number
  /** Cancelled by the patient in time and not yet refunded (zero until 20261118_self_service_features.sql runs). */
  refundDueCount?: number
  refundDueAmount?: number
  /** Transactions created this calendar month (IST). */
  monthCount: number
}

/** Verifies that the signed-in user is an executive whose team may use Payments. */
async function requireExecutiveCaller() {
  const ctx = await executiveFor('payments')
  if (!ctx) throw new Error('Forbidden: Executive permissions required')
  return { user: ctx.user, profile: { full_name: ctx.fullName } }
}

/** Fetches payment transactions with full metadata, joins, and summary statistics */
export async function getExecutivePayments(): Promise<{
  transactions: TransactionRow[]
  stats: PaymentStats
  /** Set when the payments couldn't be read, so the page shows a message instead of an empty ledger with ₹0 totals. */
  loadError?: string
}> {
  await requireExecutiveCaller()
  const admin = createAdminClient()

  // 1. Fetch payments
  const { data: rawPayments, error } = await admin
    .from('payments')
    .select(`
      id, transaction_id, amount, gateway, status, created_at,
      appointment_id, diagnostic_booking_id, patient_id, hospital_id, diagnostic_center_id,
      refund_amount, refund_reason, refunded_at
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getExecutivePayments:', error)
    return {
      transactions: [],
      stats: {
        totalCollections: 0, successfulCount: 0, successfulAmount: 0, pendingCount: 0, pendingAmount: 0,
        failedCount: 0, failedAmount: 0, refundCount: 0, refundAmount: 0, totalTransactions: 0, monthCount: 0,
      },
      loadError: 'Could not load payments. Please refresh the page.',
    }
  }
  const payments = (rawPayments ?? []) as unknown as PaymentRow[]

  // 2. Fetch linked appointments & diagnostic bookings for references and organization IDs
  const appointmentIds = payments.map((p) => p.appointment_id).filter(Boolean) as string[]
  const diagBookingIds = payments.map((p) => p.diagnostic_booking_id).filter(Boolean) as string[]

  const [{ data: appointments }, { data: diagBookings }, { data: allHospitals }, { data: allCenters }] = await Promise.all([
    appointmentIds.length > 0
      ? admin
          .from('appointments')
          .select(`
            id, patient_id, hospital_id,
            profiles!appointments_patient_id_fkey ( full_name, patient_code ),
            hospitals ( id, name, hospital_code )
          `)
          .in('id', appointmentIds)
      : Promise.resolve({ data: [] }),
    diagBookingIds.length > 0
      ? admin
          .from('diagnostic_bookings')
          .select(`
            id, patient_id, center_id, test_name,
            profiles!diagnostic_bookings_patient_id_fkey ( full_name, patient_code ),
            diagnostic_centers ( id, name, center_code )
          `)
          .in('id', diagBookingIds)
      : Promise.resolve({ data: [] }),
    admin.from('hospitals').select('id, name, hospital_code'),
    admin.from('diagnostic_centers').select('id, name, center_code'),
  ])

  const aptMap = new Map(((appointments ?? []) as unknown as AppointmentRef[]).map((a) => [a.id, a]))
  const diagMap = new Map(((diagBookings ?? []) as unknown as DiagnosticRef[]).map((d) => [d.id, d]))
  const hospMap = new Map(((allHospitals ?? []) as unknown as HospitalRef[]).map((h) => [h.id, h]))
  const centerMap = new Map(((allCenters ?? []) as unknown as CenterRef[]).map((c) => [c.id, c]))

  // Cancellations that owe the patient a refund. An error (the table doesn't exist yet) just means none.
  const { data: dueRows, error: dueError } = await admin
    .from('booking_cancellations')
    .select('payment_id, cancelled_at, starts_at')
    .eq('refund_due', true)
    .not('payment_id', 'is', null)
    .limit(5000)
  const dueMap = new Map<string, { cancelledAt: string; startsAt: string | null }>()
  if (!dueError) {
    for (const r of (dueRows ?? []) as { payment_id: string; cancelled_at: string; starts_at: string | null }[]) {
      dueMap.set(r.payment_id, { cancelledAt: r.cancelled_at, startsAt: r.starts_at })
    }
  }

  // 3. Map into structured TransactionRows
  const transactions: TransactionRow[] = payments.map((p) => {
    let patientName: string | null = null
    let patientCode: string | null = null
    let patientId: string | null = p.patient_id ?? null
    let hospitalName: string | null = null
    let hospitalCode: string | null = null
    let hospitalId: string | null = p.hospital_id ?? null
    let diagName: string | null = null
    let diagCode: string | null = null
    let diagId: string | null = p.diagnostic_center_id ?? null
    let bookingRef = p.transaction_id ? p.transaction_id.slice(0, 8).toUpperCase() : p.id.slice(0, 8).toUpperCase()
    const bookingKind: 'consultation' | 'diagnostic' = p.diagnostic_booking_id ? 'diagnostic' : 'consultation'

    if (p.appointment_id && aptMap.has(p.appointment_id)) {
      const apt = aptMap.get(p.appointment_id)!
      patientName = one(apt.profiles)?.full_name ?? null
      patientCode = one(apt.profiles)?.patient_code ?? null
      patientId = patientId ?? apt.patient_id ?? null
      hospitalName = one(apt.hospitals)?.name ?? null
      hospitalCode = one(apt.hospitals)?.hospital_code ?? null
      hospitalId = hospitalId ?? apt.hospital_id ?? null
      bookingRef = p.appointment_id.slice(0, 8).toUpperCase()
    } else if (p.diagnostic_booking_id && diagMap.has(p.diagnostic_booking_id)) {
      const db = diagMap.get(p.diagnostic_booking_id)!
      patientName = one(db.profiles)?.full_name ?? null
      patientCode = one(db.profiles)?.patient_code ?? null
      patientId = patientId ?? db.patient_id ?? null
      diagName = one(db.diagnostic_centers)?.name ?? null
      diagCode = one(db.diagnostic_centers)?.center_code ?? null
      diagId = diagId ?? db.center_id ?? null
      bookingRef = p.diagnostic_booking_id.slice(0, 8).toUpperCase()
    }

    if (hospitalId && hospMap.has(hospitalId)) {
      const h = hospMap.get(hospitalId)!
      hospitalName = hospitalName ?? h.name
      hospitalCode = hospitalCode ?? h.hospital_code
    }
    if (diagId && centerMap.has(diagId)) {
      const c = centerMap.get(diagId)!
      diagName = diagName ?? c.name
      diagCode = diagCode ?? c.center_code
    }

    const normStatus = (['success', 'failed', 'pending', 'refunded'].includes(p.status)
      ? p.status
      : 'success') as PaymentStatus

    return {
      id: p.id,
      transactionId: p.transaction_id || `TXN-${p.id.slice(0, 8).toUpperCase()}`,
      patientId,
      patientName,
      patientCode: patientCode || (patientId ? `PAT-${patientId.slice(0, 4).toUpperCase()}` : null),
      hospitalId,
      hospitalName,
      hospitalCode: hospitalCode || (hospitalId ? `CYD-HOSP-${hospitalId.slice(0, 4).toUpperCase()}` : null),
      diagnosticCenterId: diagId,
      diagnosticCenterName: diagName,
      diagnosticCenterCode: diagCode || (diagId ? `CYD-DIAG-${diagId.slice(0, 4).toUpperCase()}` : null),
      bookingReference: bookingRef,
      bookingKind,
      gateway: p.gateway || ONLINE_GATEWAY,
      amount: Number(p.amount) || 0,
      status: normStatus,
      refundAmount: p.refund_amount ? Number(p.refund_amount) : null,
      refundReason: p.refund_reason ?? null,
      refundedAt: p.refunded_at ?? null,
      createdAt: p.created_at || new Date().toISOString(),
      refundDue: normStatus === 'success' && !p.refund_amount ? (dueMap.get(p.id) ?? null) : null,
    }
  })

  // 4. Compute statistics
  const successT = transactions.filter((t) => t.status === 'success')
  const pendingT = transactions.filter((t) => t.status === 'pending')
  const failedT = transactions.filter((t) => t.status === 'failed')

  const thisMonth = istDateKey(Date.now()).slice(0, 7)
  const stats: PaymentStats = {
    totalCollections: successT.reduce((acc, t) => acc + t.amount, 0),
    successfulCount: successT.length,
    successfulAmount: successT.reduce((acc, t) => acc + t.amount, 0),
    pendingCount: pendingT.length,
    pendingAmount: pendingT.reduce((acc, t) => acc + t.amount, 0),
    failedCount: failedT.length,
    failedAmount: failedT.reduce((acc, t) => acc + t.amount, 0),
    refundCount: transactions.filter((t) => t.status === 'refunded' || t.refundAmount != null).length,
    // Partial refunds keep status 'success' and carry a refund amount, so count every row that has one.
    refundAmount: transactions.reduce((acc, t) => acc + (t.status === 'refunded' ? (t.refundAmount ?? t.amount) : (t.refundAmount ?? 0)), 0),
    totalTransactions: transactions.length,
    monthCount: transactions.filter((t) => istDateKey(t.createdAt).slice(0, 7) === thisMonth).length,
    refundDueCount: transactions.filter((t) => t.refundDue).length,
    refundDueAmount: transactions.reduce((acc, t) => acc + (t.refundDue ? t.amount : 0), 0),
  }

  return { transactions, stats }
}

/**
 * Cancels the booking a fully refunded payment was for, and frees its slot so it can be sold again. A visit that has
 * already happened is not cancelled, and nor is a booking that still has another successful payment behind it.
 */
async function cancelRefundedBooking(admin: ReturnType<typeof createAdminClient>, payment: { appointment_id: string | null; diagnostic_booking_id: string | null }): Promise<string | null> {
  if (payment.appointment_id) {
    const { data: remaining } = await admin.from('payments').select('id').eq('appointment_id', payment.appointment_id).eq('status', 'success').limit(1)
    if ((remaining ?? []).length) return 'The booking still has another payment on it, so it stays booked.'
    const { data: appointment } = await admin.from('appointments').select('id, status, schedule_id').eq('id', payment.appointment_id).maybeSingle()
    if (!appointment) return null
    if (appointment.status === 'visited' || appointment.status === 'completed') return 'The visit has already happened, so the booking was left as it is.'
    if (appointment.status === 'cancelled') return null
    const { data: cancelled } = await admin
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointment.id)
      .in('status', ['pending_payment', 'confirmed'])
      .select('id')
    if (cancelled?.length && appointment.schedule_id) {
      await admin.from('schedules').update({ is_booked: false }).eq('id', appointment.schedule_id)
    }
    return null
  }
  if (payment.diagnostic_booking_id) {
    const { data: remaining } = await admin.from('payments').select('id').eq('diagnostic_booking_id', payment.diagnostic_booking_id).eq('status', 'success').limit(1)
    if ((remaining ?? []).length) return 'The booking still has another payment on it, so it stays booked.'
    await admin
      .from('diagnostic_bookings')
      .update({ status: 'cancelled' })
      .eq('id', payment.diagnostic_booking_id)
      .in('status', ['pending_payment', 'confirmed'])
    return null
  }
  return null
}

/**
 * Records a traceable refund for a payment. The money itself goes back to the patient outside this app: online payments
 * are refunded from the Razorpay dashboard, and cash or UPI from the desk. A full refund then cancels the booking and frees
 * its slot; a partial refund only records the amount.
 */
export async function processPaymentRefund(
  paymentId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; error?: string; note?: string }> {
  const { user, profile } = await requireExecutiveCaller()
  if (!reason || reason.trim().length < 5) {
    return { success: false, error: 'A specific reason of at least 5 characters is required for financial corrections.' }
  }

  const admin = createAdminClient()
  const { data: currentPayment, error: fetchErr } = await admin
    .from('payments')
    .select('id, amount, status, gateway, appointment_id, diagnostic_booking_id')
    .eq('id', paymentId)
    .single()

  if (fetchErr || !currentPayment) {
    return { success: false, error: 'Payment transaction not found' }
  }

  if (currentPayment.status !== 'success') {
    return { success: false, error: 'Only a successful payment can be refunded.' }
  }
  const paid = Number(currentPayment.amount) || 0
  const refundAmt = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : paid
  if (refundAmt > paid) {
    return { success: false, error: `The refund can't be more than the ₹${paid.toLocaleString('en-IN')} paid.` }
  }

  // 1. Update payment record, only while it is still a successful payment: two refunds at the same moment can't both
  // go through.
  const full = refundAmt >= paid
  const { data: marked, error: updateErr } = await admin
    .from('payments')
    .update({
      ...(full ? { status: 'refunded' } : {}),
      refund_amount: refundAmt,
      refund_reason: reason.trim(),
      refunded_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('status', 'success')
    .is('refund_amount', null)
    .select('id')

  if (updateErr) {
    console.error('processPaymentRefund:', updateErr)
    return { success: false, error: 'Could not record the refund. Ask your administrator to run supabase/migrations/20261031_audit_fixes.sql.' }
  }
  if (!marked?.length) return { success: false, error: 'This payment has already been refunded.' }

  // 1b. A full refund ends the booking.
  const note = full ? await cancelRefundedBooking(admin, currentPayment) : 'Partial refund recorded; the booking stays as it is.'

  // 1c. Tell the patient (after the response; the email shows whether the booking was cancelled).
  const bookingId = currentPayment.appointment_id ?? currentPayment.diagnostic_booking_id
  if (bookingId) notifyRefund({ bookingId, amount: refundAmt, full, online: isOnlineGateway(currentPayment.gateway) })

  // 2. Insert into payment_audits table (traceable financial history)
  try {
    await admin
      .from('payment_audits')
      .insert({
        payment_id: paymentId,
        action: full ? 'refund' : 'partial_refund',
        performed_by: user.id,
        performed_by_name: profile.full_name || 'Executive Officer',
        old_status: currentPayment.status,
        new_status: full ? 'refunded' : 'success',
        amount: refundAmt,
        reason: reason.trim(),
      })
  } catch (err) {
    console.warn('payment_audits insert:', err)
  }

  revalidatePath('/executive/payments')
  revalidatePath('/executive/revenue')
  revalidatePath('/executive/dashboard')
  return { success: true, note: note ?? undefined }
}

/** Adjusts a payment transaction status with mandatory traceable justification */
export async function adjustPaymentStatus(
  paymentId: string,
  newStatus: PaymentStatus,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { user, profile } = await requireExecutiveCaller()
  // Server actions take any value from the browser, so the status is checked here, not only in the menu.
  if (!(['success', 'failed', 'pending', 'refunded'] as string[]).includes(newStatus)) {
    return { success: false, error: 'Choose a valid status.' }
  }
  if (!reason || reason.trim().length < 5) {
    return { success: false, error: 'A valid reason is required for status adjustment.' }
  }

  const admin = createAdminClient()
  const { data: currentPayment } = await admin.from('payments').select('id, status, amount').eq('id', paymentId).single()
  if (!currentPayment) return { success: false, error: 'Payment not found' }

  // Only change the row if it still has the status that was read, so two overrides can't overwrite each other.
  const { data: changed, error: updateError } = await admin
    .from('payments')
    .update({ status: newStatus })
    .eq('id', paymentId)
    .eq('status', currentPayment.status)
    .select('id')
  if (updateError) {
    console.error('adjustPaymentStatus:', updateError)
    return { success: false, error: 'Could not change the payment status. Please try again.' }
  }
  if (!changed?.length) {
    return { success: false, error: 'This payment changed while you were editing it. Refresh and try again.' }
  }

  // Create audit trail entry (only once the change has gone through)
  try {
    await admin
      .from('payment_audits')
      .insert({
        payment_id: paymentId,
        action: 'status_adjustment',
        performed_by: user.id,
        performed_by_name: profile.full_name || 'Executive Officer',
        old_status: currentPayment.status,
        new_status: newStatus,
        amount: Number(currentPayment.amount),
        reason: reason.trim(),
      })
  } catch (err) {
    console.warn('payment_audits insert:', err)
  }

  revalidatePath('/executive/payments')
  revalidatePath('/executive/revenue')
  return { success: true }
}

/** Fetches audit history for a specific payment */
export async function getPaymentAuditTrail(paymentId: string): Promise<PaymentAuditRow[]> {
  await requireExecutiveCaller()
  const admin = createAdminClient()
  const { data: audits } = await admin
    .from('payment_audits')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: false })

  if (!audits) return []
  return (audits as unknown as AuditDbRow[]).map((a) => ({
    id: a.id,
    paymentId: a.payment_id,
    action: a.action,
    performedBy: a.performed_by,
    performedByName: a.performed_by_name,
    oldStatus: a.old_status,
    newStatus: a.new_status,
    amount: a.amount ? Number(a.amount) : null,
    reason: a.reason,
    createdAt: a.created_at,
  }))
}
