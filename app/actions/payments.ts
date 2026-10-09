'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

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
}

/** Verifies that the signed-in user is an authorized executive or super admin */
async function requireExecutiveOrAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'executive' && profile?.role !== 'super_admin') {
    throw new Error('Forbidden: Executive permissions required')
  }
  return { user, profile }
}

/** Fetches payment transactions with full metadata, joins, and summary statistics */
export async function getExecutivePayments(): Promise<{
  transactions: TransactionRow[]
  stats: PaymentStats
}> {
  await requireExecutiveOrAdmin()
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

  const payments = rawPayments ?? []

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

  const aptMap = new Map((appointments ?? []).map((a: any) => [a.id, a]))
  const diagMap = new Map((diagBookings ?? []).map((d: any) => [d.id, d]))
  const hospMap = new Map((allHospitals ?? []).map((h: any) => [h.id, h]))
  const centerMap = new Map((allCenters ?? []).map((c: any) => [c.id, c]))

  // 3. Map into structured TransactionRows
  const transactions: TransactionRow[] = payments.map((p: any) => {
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
      const apt = aptMap.get(p.appointment_id)
      patientName = (apt.profiles as any)?.full_name ?? null
      patientCode = (apt.profiles as any)?.patient_code ?? null
      patientId = patientId ?? apt.patient_id ?? null
      hospitalName = (apt.hospitals as any)?.name ?? null
      hospitalCode = (apt.hospitals as any)?.hospital_code ?? null
      hospitalId = hospitalId ?? apt.hospital_id ?? null
      bookingRef = p.appointment_id.slice(0, 8).toUpperCase()
    } else if (p.diagnostic_booking_id && diagMap.has(p.diagnostic_booking_id)) {
      const db = diagMap.get(p.diagnostic_booking_id)
      patientName = (db.profiles as any)?.full_name ?? null
      patientCode = (db.profiles as any)?.patient_code ?? null
      patientId = patientId ?? db.patient_id ?? null
      diagName = (db.diagnostic_centers as any)?.name ?? null
      diagCode = (db.diagnostic_centers as any)?.center_code ?? null
      diagId = diagId ?? db.center_id ?? null
      bookingRef = p.diagnostic_booking_id.slice(0, 8).toUpperCase()
    }

    if (hospitalId && hospMap.has(hospitalId)) {
      const h = hospMap.get(hospitalId)
      hospitalName = hospitalName ?? h.name
      hospitalCode = hospitalCode ?? h.hospital_code
    }
    if (diagId && centerMap.has(diagId)) {
      const c = centerMap.get(diagId)
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
      gateway: p.gateway || 'payu',
      amount: Number(p.amount) || 0,
      status: normStatus,
      refundAmount: p.refund_amount ? Number(p.refund_amount) : null,
      refundReason: p.refund_reason ?? null,
      refundedAt: p.refunded_at ?? null,
      createdAt: p.created_at || new Date().toISOString(),
    }
  })

  // 4. Compute statistics
  const successT = transactions.filter((t) => t.status === 'success')
  const pendingT = transactions.filter((t) => t.status === 'pending')
  const failedT = transactions.filter((t) => t.status === 'failed')
  const refundT = transactions.filter((t) => t.status === 'refunded')

  const stats: PaymentStats = {
    totalCollections: successT.reduce((acc, t) => acc + t.amount, 0),
    successfulCount: successT.length,
    successfulAmount: successT.reduce((acc, t) => acc + t.amount, 0),
    pendingCount: pendingT.length,
    pendingAmount: pendingT.reduce((acc, t) => acc + t.amount, 0),
    failedCount: failedT.length,
    failedAmount: failedT.reduce((acc, t) => acc + t.amount, 0),
    refundCount: refundT.length,
    refundAmount: refundT.reduce((acc, t) => acc + (t.refundAmount ?? t.amount), 0),
    totalTransactions: transactions.length,
  }

  return { transactions, stats }
}

/** Processes a traceable refund for a payment record */
export async function processPaymentRefund(
  paymentId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { user, profile } = await requireExecutiveOrAdmin()
  if (!reason || reason.trim().length < 5) {
    return { success: false, error: 'A specific reason of at least 5 characters is required for financial corrections.' }
  }

  const admin = createAdminClient()
  const { data: currentPayment, error: fetchErr } = await admin
    .from('payments')
    .select('id, amount, status')
    .eq('id', paymentId)
    .single()

  if (fetchErr || !currentPayment) {
    return { success: false, error: 'Payment transaction not found' }
  }

  const refundAmt = amount > 0 ? amount : Number(currentPayment.amount)

  // 1. Update payment record
  const { error: updateErr } = await admin
    .from('payments')
    .update({
      status: 'refunded',
      refund_amount: refundAmt,
      refund_reason: reason.trim(),
      refunded_at: new Date().toISOString(),
    })
    .eq('id', paymentId)

  if (updateErr) {
    // If refund columns not in DB, update status
    await admin.from('payments').update({ status: 'refunded' }).eq('id', paymentId)
  }

  // 2. Insert into payment_audits table (traceable financial history)
  try {
    await admin
      .from('payment_audits')
      .insert({
        payment_id: paymentId,
        action: 'refund',
        performed_by: user.id,
        performed_by_name: profile.full_name || 'Executive Officer',
        old_status: currentPayment.status,
        new_status: 'refunded',
        amount: refundAmt,
        reason: reason.trim(),
      })
  } catch (err) {
    console.warn('payment_audits insert:', err)
  }

  revalidatePath('/executive/payments')
  revalidatePath('/executive/revenue')
  return { success: true }
}

/** Adjusts a payment transaction status with mandatory traceable justification */
export async function adjustPaymentStatus(
  paymentId: string,
  newStatus: PaymentStatus,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { user, profile } = await requireExecutiveOrAdmin()
  if (!reason || reason.trim().length < 5) {
    return { success: false, error: 'A valid reason is required for status adjustment.' }
  }

  const admin = createAdminClient()
  const { data: currentPayment } = await admin.from('payments').select('id, status, amount').eq('id', paymentId).single()
  if (!currentPayment) return { success: false, error: 'Payment not found' }

  await admin.from('payments').update({ status: newStatus }).eq('id', paymentId)

  // Create audit trail entry
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
  const admin = createAdminClient()
  const { data: audits } = await admin
    .from('payment_audits')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: false })

  if (!audits) return []
  return audits.map((a: any) => ({
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
