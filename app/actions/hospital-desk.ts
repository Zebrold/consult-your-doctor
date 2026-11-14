'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { vitalsSentence } from '@/lib/vitals'
import { RECORD_MAX_BYTES, RECORD_TYPES, storeRecordFile } from '@/lib/records'
import { issuePatientToken, readPatientToken } from '@/lib/desk-token'
import { ensurePatientProfile, indianMobile, sendPatientOtp, verifyPatientOtp } from '@/lib/patient-onboarding'
import { counterPaymentRecorded, migrationHint, recordDeskPayment, upiQr, validUpiReference, type DeskMethod } from '@/lib/desk-payments'
import { notifyBookingConfirmed, notifyHealthUpdate } from '@/lib/notify/patient'
import type { DeskPayment, DeskResult } from '@/components/portal/desk-types'
import { getBookingFees } from '@/lib/booking-fees'
import { bookedServices, sumPrices } from '@/lib/pricing'
import { appointmentBookingFee, shareColumns, type Shares } from '@/lib/wallet'
import { followUpBase } from '@/lib/follow-up'
import { slotHospitalId } from '@/lib/practices'
import { bookingOptionsReady } from '@/lib/booking-options'
import { ONLINE_GATEWAYS } from '@/lib/payment-gateways'

// The hospital desk: register a patient with a one-time code, book them with one of the hospital's doctors, take
// the payment (the UPI scanner or cash) and record their health details for the doctor.
//
// What the desk collects is the visit's booking fee, unless it was already paid online, plus the consultation fee and
// any services. The UPI scanner pays Consult your Doctor's account and cash stays with the hospital; each payment
// records whose part is whose, which is what moves the hospital's wallet (lib/wallet.ts).

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

const NOT_SIGNED_IN = 'Please log in with your hospital account.'

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
  return sendPatientOtp(ctx.admin, phone, ctx.scope)
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
  return { ok: true, token: issuePatientToken(verified.userId, ctx.scope, verified.created), patient: { name: profile.name, phone, email: email || null, created: profile.created } }
}

/** The doctor's slots over the next week, for booking at the desk. Booked ones come back `taken`, to show crossed out. */
export async function hospitalOpenSlots(doctorId: string): Promise<DeskResult<{ slots: { id: string; start: string; end: string | null; taken: boolean }[] }>> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const { data: doctor } = await ctx.admin.from('doctors').select('hospital_id').eq('id', doctorId).maybeSingle()
  if (doctor?.hospital_id !== ctx.hospital.id) return fail('Doctor not found in your hospital.')
  const query = (columns: string) =>
    ctx.admin
      .from('schedules')
      .select(columns)
      .eq('doctor_id', doctorId)
      .gte('start_time', new Date().toISOString())
      .lt('start_time', new Date(Date.now() + 7 * 86_400_000).toISOString())
      .order('start_time', { ascending: true })
      .limit(96)
  // Only this hospital's slots: a doctor's slots at a hospital they also visit (lib/practices.ts) carry that hospital's
  // id. Before 20261115_executive_workspace.sql there is no hospital_id and every slot is here.
  const first = await query('id, start_time, end_time, is_booked, hospital_id')
  const data = (first.error ? (await query('id, start_time, end_time, is_booked')).data : first.data) as unknown
  type Slot = { id: string; start_time: string; end_time: string | null; is_booked: boolean | null; hospital_id?: string | null }
  return {
    ok: true,
    slots: ((data ?? []) as Slot[]).filter((s) => !s.hospital_id || s.hospital_id === ctx.hospital.id).map((s) => ({ id: s.id, start: s.start_time, end: s.end_time, taken: !!s.is_booked })),
  }
}

/**
 * Creates a desk visit, unpaid until the desk takes payment. It carries the general booking fee, or none when it is the
 * patient's free follow-up with this doctor (lib/follow-up.ts). A fast-track visit carries the fast-track fee and is
 * never a free follow-up.
 */
async function insertDeskVisit(admin: Admin, row: { patient_id: string; doctor_id: string; hospital_id: string; schedule_id: string }, fastTrack = false) {
  const fees = await getBookingFees()
  const insert = (values: Record<string, unknown>) => admin.from('appointments').insert(values).select('id').single()
  if (fastTrack) {
    const res = await insert({ ...row, status: 'pending_payment', booking_type: 'fast_track', booking_fee: fees.fastTrack })
    // Without the 20261102 booking_fee column the desk works the fee out from the booking type.
    if (res.error && /booking_fee|schema cache/.test(res.error.message)) return insert({ ...row, status: 'pending_payment', booking_type: 'fast_track' })
    return res
  }
  const followUpOf = await followUpBase(admin, row.patient_id, row.doctor_id)
  const paid = { ...row, status: 'pending_payment', booking_fee: fees.consultation }
  let res = await insert(followUpOf ? { ...row, status: 'pending_payment', booking_fee: 0, follow_up_of: followUpOf } : paid)
  if (res.error && followUpOf && /follow_up/.test(res.error.message)) res = await insert(paid)
  // A database without the 20261102 columns yet.
  if (res.error && /booking_fee|follow_up_of|schema cache/.test(res.error.message)) res = await insert({ ...row, status: 'pending_payment' })
  return res
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
    // Never a slot another hospital published for this doctor as a visiting consultant.
    const at = await slotHospitalId(ctx.admin, scheduleId, ctx.hospital.id)
    if (at !== ctx.hospital.id) return fail('That slot is at another hospital. Choose another time.')
    // Claim the slot only while it is still free, so two desks can't book the same time.
    const { data: claimed } = await ctx.admin.from('schedules').update({ is_booked: true }).eq('id', scheduleId).eq('doctor_id', doctor.id).eq('is_booked', false).select('id')
    if (!claimed?.length) return fail('That slot was just taken. Choose another time.')
  }

  const { data: visit, error } = await insertDeskVisit(ctx.admin, { patient_id: patientId, doctor_id: doctor.id, hospital_id: ctx.hospital.id, schedule_id: scheduleId })
  if (error || !visit) {
    console.error('createHospitalVisit:', error)
    await ctx.admin.from('schedules').update({ is_booked: false }).eq('id', scheduleId)
    return fail('Could not create the booking. Please try again.')
  }
  revalidateVisitPages()
  const payment = await paymentFor(ctx.admin, ctx.hospital.id, visit.id)
  return payment ? { ok: true, payment } : fail('The booking was made but its payment details couldn’t be loaded. Find it under Unpaid.')
}

/** Fills in the patient's sex on their own profile when they haven't, never changing what they set. */
async function fillGender(admin: Admin, patientId: string, gender: string) {
  try {
    const { data } = await admin.from('patient_details').select('gender').eq('id', patientId).maybeSingle()
    if (!data) await admin.from('patient_details').insert({ id: patientId, gender })
    else if (!data.gender) await admin.from('patient_details').update({ gender }).eq('id', patientId)
  } catch (err) {
    console.error('registerHospitalPatient gender:', err)
  }
}

const GENDERS = ['Female', 'Male', 'Other']

/**
 * Registers a patient at the hospital desk, books their visit (general or fast track), and keeps the desk's vitals and
 * notes for the doctor. The patient's number is confirmed first: either `token` from verifyHospitalPatient, or the
 * one-time `code` checked here.
 */
export async function registerHospitalPatient(formData: FormData): Promise<DeskResult<{
  patientId: string
  appointmentId: string
  visitCode: string
  patientName: string
  doctorName: string
  fee: number
  fastTrack: boolean
  start: string
  payment: DeskPayment | null
}>> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)

  const rawFullName = String(formData.get('fullName') || '').trim().replace(/\s+/g, ' ')
  const rawPhone = String(formData.get('phone') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const doctorId = String(formData.get('doctorId') || '').trim()
  const scheduleId = String(formData.get('scheduleId') || 'now').trim()
  const code = String(formData.get('code') || '')
  const token = String(formData.get('token') || '')
  const wantsFastTrack = formData.get('bookingType') === 'fast_track'

  if (!doctorId) return fail('Please select an attending doctor.')
  if (wantsFastTrack && !(await bookingOptionsReady())) return fail('Fast track needs the latest database update (supabase/migrations/20261028_fast_track_services.sql). Book a general visit for now.')

  // The patient must confirm their number with the code sent to it before anything is booked to their account. Without
  // this, a desk could attach visits, records and payments to whoever owns a number.
  let patientId: string
  let fullName: string
  if (token) {
    const id = readPatientToken(token, ctx.scope)
    if (!id) return fail('The patient’s confirmation has expired. Send a new code and confirm the number again.')
    const { data: who } = await ctx.admin.from('profiles').select('full_name').eq('id', id).maybeSingle()
    patientId = id
    fullName = who?.full_name || rawFullName || 'Patient'
  } else {
    if (rawFullName.length < 2) return fail('Please enter the patient’s full name.')
    const phone = indianMobile(rawPhone)
    if (!phone) return fail('Please enter a valid 10-digit Indian mobile number.')
    if (email && !emailPattern.test(email)) return fail('Enter a valid email address or leave it blank.')
    const verified = await verifyPatientOtp(ctx.admin, phone, code)
    if (!verified.ok) return fail(verified.error)
    const profile = await ensurePatientProfile(ctx.admin, verified.userId, { name: rawFullName, phone, email })
    if (!profile.ok) return fail(profile.error)
    patientId = verified.userId
    fullName = profile.name
  }

  // 2. Verify doctor
  const { data: doctor } = await ctx.admin
    .from('doctors')
    .select('id, hospital_id, consultation_fee, profiles!doctors_profile_id_fkey ( full_name )')
    .eq('id', doctorId)
    .maybeSingle()

  if (!doctor || doctor.hospital_id !== ctx.hospital.id) return fail('Doctor not found in your hospital.')
  const fee = Number(doctor.consultation_fee) || 0
  if (!fee) return fail('Set this doctor’s consultation fee on the Roster first.')

  // 3. Slot handling
  let slotId = scheduleId
  let slotStart = new Date().toISOString()
  if (slotId === 'now') {
    const start = new Date()
    const { data: slot, error: slotErr } = await ctx.admin
      .from('schedules')
      .insert({
        doctor_id: doctor.id,
        start_time: start.toISOString(),
        end_time: new Date(start.getTime() + 15 * 60_000).toISOString(),
        is_booked: true,
      })
      .select('id')
      .single()
    if (slotErr || !slot) return fail('Could not create walk-in slot. Please try again.')
    slotId = slot.id
  } else {
    const { data: claimed } = await ctx.admin
      .from('schedules')
      .update({ is_booked: true })
      .eq('id', slotId)
      .eq('doctor_id', doctor.id)
      .eq('is_booked', false)
      .select('id, start_time')
    if (!claimed?.length) return fail('That appointment slot was just taken. Please choose another.')
    slotStart = (claimed[0] as { start_time: string }).start_time
  }

  // 4. Create appointment
  const { data: visit, error: visitErr } = await insertDeskVisit(ctx.admin, { patient_id: patientId, doctor_id: doctor.id, hospital_id: ctx.hospital.id, schedule_id: slotId }, wantsFastTrack)

  if (visitErr || !visit) {
    console.error('registerHospitalPatient appointment error:', visitErr)
    await ctx.admin.from('schedules').update({ is_booked: false }).eq('id', slotId)
    return fail('Could not book the appointment. Please try again.')
  }

  // 5. The patient's sex, if they haven't given it on their profile.
  const gender = String(formData.get('gender') || '')
  if (GENDERS.includes(gender)) await fillGender(ctx.admin, patientId, gender)

  // 6. The desk's vitals and notes, in the same form as a health record (lib/vitals.ts), so the doctor sees the readings.
  const field = (name: string, max = 200) => String(formData.get(name) || '').trim().replace(/\s+/g, ' ').slice(0, max)
  const sentence = (label: string, value: string) => (value ? `${label}: ${value.replace(/[.\s]+$/, '')}.` : '')
  const age = Number(field('age', 3))
  const vitals = vitalsSentence({ bp: field('bp', 20), hr: field('hr', 10), spo2: field('spo2', 10), temp: field('temp', 10), weight: field('weight', 10) })
  const notes = [
    sentence('Reason for visit', field('complaint', 1000)),
    sentence('Known allergies', field('allergies', 500)),
    Number.isInteger(age) && age > 0 && age <= 120 ? `Age at visit: ${age}.` : '',
    vitals,
  ]
    .filter(Boolean)
    .join(' ')
  if (notes) {
    const { error: recordErr } = await ctx.admin.from('medical_records').insert({ appointment_id: visit.id, document_type: 'health_record', notes, file_url: 'none' })
    if (recordErr) console.error('registerHospitalPatient health record:', recordErr)
  }

  revalidateVisitPages()
  const payment = await paymentFor(ctx.admin, ctx.hospital.id, visit.id)
  const docName = one(doctor.profiles)?.full_name ?? 'Doctor'

  return {
    ok: true,
    patientId,
    appointmentId: visit.id,
    visitCode: visit.id.slice(0, 8).toUpperCase(),
    patientName: fullName,
    doctorName: docName,
    fee,
    fastTrack: wantsFastTrack,
    start: slotStart,
    payment,
  }
}

type VisitRow = {
  id: string
  status: string
  hospital_id: string | null
  patient_id: string
  booking_fee?: number | string | null
  booking_type?: string | null
  services?: unknown
  doctors: Joined<{ hospital_id: string | null; consultation_fee: number | string | null; profiles: Joined<{ full_name: string | null }> }>
  patient: Joined<{ full_name: string | null; phone_number: string | null; email: string | null }>
}

/** One of this hospital's visits, with the patient and doctor. */
async function visitAt(admin: Admin, hospitalId: string, appointmentId: string) {
  const { data } = await admin
    .from('appointments')
    // `*`: booking_fee, booking_type and services come back once their migrations have run.
    .select('*, doctors ( hospital_id, consultation_fee, profiles!doctors_profile_id_fkey ( full_name ) ), patient:profiles!appointments_patient_id_fkey ( full_name, phone_number, email )')
    .eq('id', appointmentId)
    .maybeSingle()
  const row = data as unknown as VisitRow | null
  if (!row) return null
  const doctor = one(row.doctors)
  if (row.hospital_id !== hospitalId && doctor?.hospital_id !== hospitalId) return null
  return { row, doctor, patient: one(row.patient), fee: Number(doctor?.consultation_fee) || 0 }
}

type Visit = NonNullable<Awaited<ReturnType<typeof visitAt>>>

/**
 * What the desk collects for a visit: the booking fee unless it was paid online, the consultation fee and the services
 * picked when booking. `shares` says which part is Consult your Doctor's and which the hospital's.
 */
async function deskCharge(admin: Admin, visit: Visit): Promise<{ items: { label: string; amount: number }[]; total: number; shares: Shares }> {
  const [fees, { data: online }] = await Promise.all([
    getBookingFees(),
    admin.from('payments').select('id').eq('appointment_id', visit.row.id).in('gateway', [...ONLINE_GATEWAYS]).eq('status', 'success').limit(1),
  ])
  const bookingFee = online?.length ? 0 : appointmentBookingFee(visit.row, fees)
  const services = bookedServices(visit.row.services)
  const hospital = visit.fee + sumPrices(services)
  return {
    items: [
      ...(bookingFee > 0 ? [{ label: 'Booking fee (Consult your Doctor)', amount: bookingFee }] : []),
      { label: 'Consultation fee', amount: visit.fee },
      ...services.map((s) => ({ label: s.name, amount: s.price })),
    ],
    total: bookingFee + hospital,
    shares: { platform: bookingFee, hospital },
  }
}

async function paymentFor(admin: Admin, hospitalId: string, appointmentId: string): Promise<DeskPayment | null> {
  const visit = await visitAt(admin, hospitalId, appointmentId)
  if (!visit) return null
  const code = appointmentId.slice(0, 8).toUpperCase()
  const email = visit.patient?.email && !visit.patient.email.endsWith('.internal') ? visit.patient.email : null
  const charge = await deskCharge(admin, visit)
  return {
    kind: 'appointment',
    id: appointmentId,
    code,
    status: visit.row.status,
    what: `Consultation${visit.doctor ? ` with ${one(visit.doctor.profiles)?.full_name ?? 'the doctor'}` : ''}`,
    patient: { name: visit.patient?.full_name || 'Patient', phone: visit.patient?.phone_number ?? null, email },
    amounts: { desk: charge.total },
    items: charge.items,
    upi: await upiQr(charge.total, code, `Consultation ${code}`),
  }
}

/** How much to collect for an unpaid visit, and the scanner code for it. */
export async function hospitalPaymentInfo(appointmentId: string): Promise<DeskResult<{ payment: DeskPayment }>> {
  const ctx = await hospitalContext()
  if (!ctx) return fail(NOT_SIGNED_IN)
  const payment = await paymentFor(ctx.admin, ctx.hospital.id, appointmentId)
  if (!payment) return fail('Booking not found.')
  if (payment.status === 'cancelled') return fail('This booking was cancelled.')
  // A booking paid online (the booking fee) still takes the consultation fee here, at the counter.
  if (await counterPaymentRecorded(ctx.admin, { kind: 'appointment', id: appointmentId })) return fail('This booking is already paid.')
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
  if (visit.row.status === 'cancelled') return fail('This booking was cancelled.')
  if (!visit.fee) return fail('This doctor’s fee isn’t set.')

  const charge = await deskCharge(ctx.admin, visit)
  try {
    const result = await recordDeskPayment(ctx.admin, { kind: 'appointment', id: input.appointmentId }, {
      method: input.method,
      amount: charge.total,
      reference: input.method === 'cash' ? `CASH-${Date.now()}` : `UPI-${reference.toUpperCase()}`,
      columns: shareColumns(ctx.hospital.id, charge.shares, input.method === 'cash' ? 'Cash' : 'UPI'),
    })
    if (!result.recorded) return fail('This booking is already paid.')
  } catch (err) {
    console.error('recordHospitalPayment:', err)
    const pgError = err as { code?: string; message?: string }
    if (pgError.code === '23505') return fail('That UPI reference has already been used for another payment.')
    return fail(migrationHint(pgError) ?? 'Could not record the payment. Please try again.')
  }

  notifyBookingConfirmed(input.appointmentId)
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
