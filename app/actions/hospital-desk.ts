'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CONSULTATION_PLATFORM_FEE } from '@/lib/pricing'
import { vitalsSentence } from '@/lib/vitals'
import { RECORD_MAX_BYTES, RECORD_TYPES, storeRecordFile } from '@/lib/records'
import { issuePatientToken, readPatientToken } from '@/lib/desk-token'
import { ensurePatientProfile, indianMobile, sendPatientOtp, verifyPatientOtp } from '@/lib/patient-onboarding'
import { migrationHint, recordDeskPayment, upiQr, validUpiReference, type DeskMethod } from '@/lib/desk-payments'
import { notifyBookingConfirmed, notifyHealthUpdate } from '@/lib/notify/patient'
import type { DeskPayment, DeskResult } from '@/components/portal/desk-types'

// The hospital desk: register a patient with a one-time code, book them with one of the hospital's doctors, take
// the payment (PayU, the UPI scanner or cash) and record their health details for the doctor.

type Admin = ReturnType<typeof createAdminClient>
type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null
const fail = (error: string) => ({ ok: false as const, error })
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function hospitalContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return null
  const { data: hospital } = await admin.from('hospitals').select('id, name').eq('id', profile.hospital_id).maybeSingle()
  if (!hospital) return null
  return { admin, hospital: hospital as { id: string; name: string }, scope: `hospital:${hospital.id}:${user.id}` }
}

const NOT_SIGNED_IN = 'Please sign in with your hospital account.'

function revalidateVisitPages() {
  for (const path of ['/hospital/patients', '/hospital/dashboard', '/hospital/revenue', '/doctor/dashboard', '/doctor/patients', '/doctor/schedule', '/patient/profile', '/patient/appointments']) {
    revalidatePath(path)
  }
}

export async function sendHospitalPatientOtp(rawPhone: string): Promise<DeskResult> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const phone = indianMobile(rawPhone)
  if (!phone) return fail('Enter the patient’s 10-digit Indian mobile number.')
  return sendPatientOtp(phone)
}

/** Checks the code the patient received; their account is created if this is a new number. */
export async function verifyHospitalPatient(input: { name: string; phone: string; email: string; code: string }): Promise<DeskResult<{ token: string; patient: { name: string; phone: string; email: string | null; created: boolean } }>> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const name = input.name.trim().replace(/\s+/g, ' ')
  const phone = indianMobile(input.phone)
  const email = input.email.trim()
  if (name.length < 2) return fail('Enter the patient’s full name.')
  if (!phone) return fail('Enter the patient’s 10-digit Indian mobile number.')
  if (email && !emailPattern.test(email)) return fail('Enter a valid email address, or leave it blank.')

  const verified = await verifyPatientOtp(ctx.admin, phone, input.code)
  if (!verified.ok) return verified
  const profile = await ensurePatientProfile(ctx.admin, verified.userId, { name, phone, email })
  if (!profile.ok) return profile
  return { ok: true, token: issuePatientToken(verified.userId, ctx.scope), patient: { name: profile.name, phone, email: email || null, created: profile.created } }
}

/** The doctor's open slots over the next week, for booking at the desk. */
export async function hospitalOpenSlots(doctorId: string): Promise<DeskResult<{ slots: { id: string; start: string; end: string | null }[] }>> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const { data: doctor } = await ctx.admin.from('doctors').select('hospital_id').eq('id', doctorId).maybeSingle()
  if (doctor?.hospital_id !== ctx.hospital.id) return fail('Doctor not found in your hospital.')
  const { data } = await ctx.admin
    .from('schedules')
    .select('id, start_time, end_time')
    .eq('doctor_id', doctorId)
    .eq('is_booked', false)
    .gte('start_time', new Date().toISOString())
    .lt('start_time', new Date(Date.now() + 7 * 86_400_000).toISOString())
    .order('start_time', { ascending: true })
    .limit(48)
  return { ok: true, slots: ((data ?? []) as { id: string; start_time: string; end_time: string | null }[]).map((s) => ({ id: s.id, start: s.start_time, end: s.end_time })) }
}

/** Books the verified patient with a doctor, in an open slot or as a walk-in seen now. Unpaid until the desk takes payment. */
export async function createHospitalVisit(input: { token: string; doctorId: string; scheduleId: string }): Promise<DeskResult<{ payment: DeskPayment }>> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const patientId = readPatientToken(input.token, ctx.scope)
  if (!patientId) return fail('The patient’s verification has expired. Start again and send a new code.')

  const { data: doctor } = await ctx.admin.from('doctors').select('id, hospital_id, consultation_fee').eq('id', input.doctorId).maybeSingle()
  if (!doctor || doctor.hospital_id !== ctx.hospital.id) return fail('Doctor not found in your hospital.')
  if (!Number(doctor.consultation_fee)) return fail('Set this doctor’s consultation fee on the Roster first.')

  let scheduleId = input.scheduleId
  if (scheduleId === 'now') {
    const start = new Date()
    const { data: slot, error } = await ctx.admin
      .from('schedules')
      .insert({ doctor_id: doctor.id, start_time: start.toISOString(), end_time: new Date(start.getTime() + 15 * 60_000).toISOString(), is_booked: true })
      .select('id')
      .single()
    if (error || !slot) return fail('Could not add the walk-in slot. Please try again.')
    scheduleId = slot.id
  } else {
    // Claim the slot only while it is still free, so two desks can't book the same time.
    const { data: claimed } = await ctx.admin.from('schedules').update({ is_booked: true }).eq('id', scheduleId).eq('doctor_id', doctor.id).eq('is_booked', false).select('id')
    if (!claimed?.length) return fail('That slot was just taken. Choose another time.')
  }

  const { data: visit, error } = await ctx.admin
    .from('appointments')
    .insert({ patient_id: patientId, doctor_id: doctor.id, hospital_id: ctx.hospital.id, schedule_id: scheduleId, status: 'pending_payment' })
    .select('id')
    .single()
  if (error || !visit) {
    console.error('createHospitalVisit:', error)
    await ctx.admin.from('schedules').update({ is_booked: false }).eq('id', scheduleId)
    return fail('Could not create the booking. Please try again.')
  }
  revalidateVisitPages()
  const payment = await paymentFor(ctx.admin, ctx.hospital.id, visit.id)
  return payment ? { ok: true, payment } : fail('The booking was made but its payment details couldn’t be loaded. Find it under Unpaid.')
}

type VisitRow = {
  id: string
  status: string
  hospital_id: string | null
  patient_id: string
  doctors: Joined<{ hospital_id: string | null; consultation_fee: number | string | null; profiles: Joined<{ full_name: string | null }> }>
  patient: Joined<{ full_name: string | null; phone_number: string | null; email: string | null }>
}

/** One of this hospital's visits, with the patient and doctor. */
async function visitAt(admin: Admin, hospitalId: string, appointmentId: string) {
  const { data } = await admin
    .from('appointments')
    .select('id, status, hospital_id, patient_id, doctors ( hospital_id, consultation_fee, profiles!doctors_profile_id_fkey ( full_name ) ), patient:profiles!appointments_patient_id_fkey ( full_name, phone_number, email )')
    .eq('id', appointmentId)
    .maybeSingle()
  const row = data as unknown as VisitRow | null
  if (!row) return null
  const doctor = one(row.doctors)
  if (row.hospital_id !== hospitalId && doctor?.hospital_id !== hospitalId) return null
  return { row, doctor, patient: one(row.patient), fee: Number(doctor?.consultation_fee) || 0 }
}

async function paymentFor(admin: Admin, hospitalId: string, appointmentId: string): Promise<DeskPayment | null> {
  const visit = await visitAt(admin, hospitalId, appointmentId)
  if (!visit) return null
  const code = appointmentId.slice(0, 8).toUpperCase()
  const email = visit.patient?.email && !visit.patient.email.endsWith('.internal') ? visit.patient.email : null
  return {
    kind: 'appointment',
    id: appointmentId,
    code,
    status: visit.row.status,
    what: `Consultation${visit.doctor ? ` with ${one(visit.doctor.profiles)?.full_name ?? 'the doctor'}` : ''}`,
    patient: { name: visit.patient?.full_name || 'Patient', phone: visit.patient?.phone_number ?? null, email },
    amounts: { desk: visit.fee, online: visit.fee + CONSULTATION_PLATFORM_FEE, platformFee: CONSULTATION_PLATFORM_FEE },
    items: [{ label: 'Consultation fee', amount: visit.fee }],
    upi: await upiQr(visit.fee, code, `Consultation ${code}`),
    payuKey: process.env.PAYU_MERCHANT_KEY ?? null,
  }
}

/** How much to collect for an unpaid visit, and the scanner code for it. */
export async function hospitalPaymentInfo(appointmentId: string): Promise<DeskResult<{ payment: DeskPayment }>> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const payment = await paymentFor(ctx.admin, ctx.hospital.id, appointmentId)
  if (!payment) return fail('Booking not found.')
  if (payment.status !== 'pending_payment') return fail('This booking is already paid.')
  return { ok: true, payment }
}

/** Records a scanner (UPI) or cash payment taken at the desk and confirms the visit. */
export async function recordHospitalPayment(input: { appointmentId: string; method: DeskMethod; reference: string }): Promise<DeskResult> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  if (input.method !== 'upi_qr' && input.method !== 'cash') return fail('Choose how the patient paid.')
  const reference = input.reference.trim()
  if (input.method === 'upi_qr' && !validUpiReference(reference)) return fail('Enter the UPI reference (UTR) shown in the patient’s payment app.')

  const visit = await visitAt(ctx.admin, ctx.hospital.id, input.appointmentId)
  if (!visit) return fail('Booking not found.')
  if (visit.row.status !== 'pending_payment') return fail('This booking is already paid.')
  if (!visit.fee) return fail('This doctor’s fee isn’t set.')

  try {
    const result = await recordDeskPayment(ctx.admin, { kind: 'appointment', id: input.appointmentId }, {
      method: input.method,
      amount: visit.fee,
      reference: input.method === 'cash' ? `CASH-${Date.now()}` : `UPI-${reference.toUpperCase()}`,
    })
    if (!result.recorded) return fail('This booking is already paid.')
  } catch (err) {
    console.error('recordHospitalPayment:', err)
    const pgError = err as { code?: string; message?: string }
    if (pgError.code === '23505') return fail('That UPI reference has already been used for another payment.')
    return fail(migrationHint(pgError) ?? 'Could not record the payment. Please try again.')
  }

  notifyBookingConfirmed({
    patientId: visit.row.patient_id,
    what: `consultation with ${one(visit.doctor?.profiles)?.full_name ?? 'your doctor'}`,
    where: ctx.hospital.name,
    bookingId: input.appointmentId.slice(0, 8).toUpperCase(),
    amount: `₹${visit.fee.toLocaleString('en-IN')}`,
  })
  revalidateVisitPages()
  return { ok: true }
}

/**
 * Saves health details for a visit: vitals (BMI is worked out from weight and height), notes and an optional
 * document. They show in the patient's profile and to the doctor on the visit.
 */
export async function saveHospitalHealthRecord(formData: FormData): Promise<DeskResult> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)

  const appointmentId = String(formData.get('appointmentId') || '')
  const visit = await visitAt(ctx.admin, ctx.hospital.id, appointmentId)
  if (!visit) return fail('Booking not found.')
  if (visit.row.status === 'cancelled') return fail('This booking was cancelled.')

  const field = (name: string) => String(formData.get(name) || '').trim()
  const vitals = vitalsSentence({ bp: field('bp'), hr: field('hr'), spo2: field('spo2'), temp: field('temp'), weight: field('weight'), height: field('height') })
  const notes = [field('notes').slice(0, 4000), vitals].filter(Boolean).join(' ')
  const file = formData.get('file')
  const hasFile = file instanceof File && file.size > 0
  if (!notes && !hasFile) return fail('Enter at least one reading, a note or a document.')

  let fileUrl = 'none'
  if (hasFile) {
    const ext = RECORD_TYPES[file.type]
    if (!ext) return fail('Upload the document as a PDF, JPG, PNG or WebP file.')
    if (file.size > RECORD_MAX_BYTES) return fail('The document must be under 5 MB.')
    try {
      fileUrl = await storeRecordFile(ctx.admin, `health-records/${ctx.hospital.id}/${appointmentId}/${Date.now()}.${ext}`, file, file.type)
    } catch (err) {
      console.error('saveHospitalHealthRecord upload:', err)
      return fail('Could not upload the document. Please try again.')
    }
  }

  const { error } = await ctx.admin.from('medical_records').insert({
    appointment_id: appointmentId,
    document_type: 'health_record',
    notes: notes || 'Document uploaded by the hospital.',
    file_url: fileUrl,
  })
  if (error) {
    console.error('saveHospitalHealthRecord:', error)
    return fail(migrationHint(error) ?? 'Could not save the health details. Please try again.')
  }

  notifyHealthUpdate({ patientId: visit.row.patient_id, hospital: ctx.hospital.name })
  revalidateVisitPages()
  return { ok: true }
}
