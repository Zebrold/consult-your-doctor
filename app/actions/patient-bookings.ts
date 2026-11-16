'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { overLimit } from '@/lib/rate-limit'
import { isOnlineGateway } from '@/lib/payment-gateways'
import { bookingStart, cancelTerms, rescheduleTerms } from '@/lib/booking-change'
import { moveAppointmentSlot, releaseSlot } from '@/lib/booking-move'
import { notifyBookingCancelled, notifyBookingConfirmed } from '@/lib/notify/patient'
import { slotHospitalId } from '@/lib/practices'
import { FOLLOW_UP_DAYS } from '@/lib/follow-up'
import { formatDayLabel, formatINR, formatTime, istDateKey } from '@/components/patient/format'
import { alertTeamLater } from '@/lib/notify/team'

// A patient changing their own booking from My bookings: cancel it (the online fee is refunded when this is at least
// 2 hours before it starts; the team records the refund on Payments) or move a doctor visit once to another open slot
// with the same doctor at the same hospital. The rules are in lib/booking-change.ts. Every read and write is filtered
// by the signed-in patient.

type Admin = ReturnType<typeof createAdminClient>
const DAY = 86_400_000
const HOUR = 60 * 60_000
const uuid = z.string().uuid()

const NOT_READY_CANCEL = 'Cancelling a paid booking opens after the next update. Contact support to cancel it now.'

export type CancelResult =
  | { ok: true; refundDue: boolean }
  | { ok: false; error: string; code?: 'refund_window_passed' | 'not_ready' }

const cancelSchema = z.object({ kind: z.enum(['visit', 'lab']), id: uuid, expectRefund: z.boolean() })

const missingTable = (e: { code?: string; message?: string } | null) => !!e && (e.code === '42P01' || e.code === 'PGRST205' || /booking_cancellations/.test(e.message ?? ''))

export async function cancelMyBooking(input: { kind: 'visit' | 'lab'; id: string; expectRefund: boolean }): Promise<CancelResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in again.' }
  const parsed = cancelSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Booking not found.' }
  const { kind, id, expectRefund } = parsed.data
  if (await overLimit(`booking-change:${user.id}`, 20, HOUR)) return { ok: false, error: 'Too many changes. Please try again in a little while.' }

  const admin = createAdminClient()
  let status: string
  let startsAt: number | null
  let scheduleId: string | null = null
  let doctorId: string | null = null
  if (kind === 'visit') {
    const { data } = await admin.from('appointments').select('*, schedules ( start_time )').eq('id', id).eq('patient_id', user.id).maybeSingle()
    if (!data) return { ok: false, error: 'Booking not found.' }
    const slot = (Array.isArray(data.schedules) ? data.schedules[0] : data.schedules) as { start_time: string } | null
    status = data.status as string
    startsAt = bookingStart({ kind: 'visit', slotStart: slot?.start_time ?? null })
    scheduleId = (data.schedule_id as string | null) ?? null
    doctorId = (data.doctor_id as string | null) ?? null
  } else {
    const { data } = await admin.from('diagnostic_bookings').select('id, patient_id, status, preferred_date').eq('id', id).eq('patient_id', user.id).maybeSingle()
    if (!data) return { ok: false, error: 'Booking not found.' }
    status = data.status as string
    startsAt = bookingStart({ kind: 'lab', day: (data.preferred_date as string | null) ?? null })
  }

  const { data: paidRows } = await admin
    .from('payments')
    .select('id, amount, gateway')
    .eq(kind === 'visit' ? 'appointment_id' : 'diagnostic_booking_id', id)
    .eq('status', 'success')
  const rows = (paidRows ?? []) as { id: string; amount: number | string | null; gateway: string | null }[]
  const onlinePayment = rows.find((p) => isOnlineGateway(p.gateway)) ?? null
  const deskPaid = !onlinePayment && rows.length > 0

  const terms = cancelTerms({ status, startsAt, now: Date.now(), online: !!onlinePayment, deskPaid, lab: kind === 'lab' })
  if (!terms.allowed) return { ok: false, error: terms.reason }
  if (expectRefund && !terms.refundDue) {
    return {
      ok: false,
      code: 'refund_window_passed',
      error: 'It is now less than 2 hours before your booking, so the booking fee can no longer be refunded. Cancel anyway?',
    }
  }

  const paidAmount = onlinePayment ? Number(onlinePayment.amount) || 0 : 0
  const bookingCol = kind === 'visit' ? 'appointment_id' : 'diagnostic_booking_id'
  const cancellation = {
    patient_id: user.id,
    [bookingCol]: id,
    starts_at: startsAt != null ? new Date(startsAt).toISOString() : null,
    payment_id: onlinePayment?.id ?? null,
    paid_amount: onlinePayment ? paidAmount : null,
    refund_due: terms.refundDue,
  }

  // A paid booking: the cancellation row goes in first. Its unique index stops a double tap, and the row is what puts the
  // refund on the payments team's list, so a cancelled paid booking never exists without it.
  let rowInserted = false
  if (terms.paid === 'online') {
    const { error } = await admin.from('booking_cancellations').insert(cancellation)
    if (error) {
      if (missingTable(error)) return { ok: false, code: 'not_ready', error: NOT_READY_CANCEL }
      if (error.code === '23505') return { ok: false, error: 'This booking is already cancelled.' }
      console.error('cancelMyBooking insert:', error)
      return { ok: false, error: 'Could not cancel the booking. Please try again.' }
    }
    rowInserted = true
  }

  const { data: changed, error: updateError } = await admin
    .from(kind === 'visit' ? 'appointments' : 'diagnostic_bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('patient_id', user.id)
    .in('status', [status])
    .select('id')
  if (updateError || !changed?.length) {
    if (rowInserted) await admin.from('booking_cancellations').delete().eq(bookingCol, id).eq('patient_id', user.id)
    if (updateError) console.error('cancelMyBooking update:', updateError)
    return { ok: false, error: updateError ? 'Could not cancel the booking. Please try again.' : 'This booking has just changed. Please refresh.' }
  }

  // Unpaid or free: the record is only for history, so a failure here changes nothing.
  if (!rowInserted) {
    const { error } = await admin.from('booking_cancellations').insert(cancellation)
    if (error && !missingTable(error) && error.code !== '23505') console.error('cancelMyBooking history:', error)
  }

  if (kind === 'visit' && scheduleId && doctorId) await releaseSlot(admin, scheduleId, doctorId)

  notifyBookingCancelled({ bookingId: id, refundDue: terms.refundDue, amount: paidAmount })
  if (terms.refundDue) {
    const code = id.slice(0, 8).toUpperCase()
    alertTeamLater('refund-due', {
      subject: `Refund due: ${formatINR(paidAmount)} for booking ${code}`,
      heading: 'A refund is due',
      lines: [
        `A patient cancelled booking ${code} more than 2 hours before it, so the ${formatINR(paidAmount)} paid online is to be refunded.`,
        'Refund it from the Razorpay dashboard, then record the refund on Payments (Refund due), which emails the patient.',
      ],
      facts: [['Booking ID', code], ['Refund', formatINR(paidAmount)], ['Booking', kind === 'visit' ? 'Doctor visit' : 'Lab tests']],
      page: '/executive/payments',
      button: 'Open Payments',
    })
  }
  revalidatePath('/patient/appointments')
  revalidatePath('/patient/payments')
  revalidatePath('/executive/payments')
  return { ok: true, refundDue: terms.refundDue }
}

// ---------------------------------------------------------------------------------------------------------------------
// Reschedule: once, up to 2 hours before, to another open slot with the same doctor at the same hospital.
// ---------------------------------------------------------------------------------------------------------------------

export type RescheduleDay = { key: string; label: string; slots: { id: string; time: string }[] }
export type RescheduleOptions =
  | { ok: true; days: RescheduleDay[] }
  | { ok: false; error: string; code?: 'not_ready' }
export type RescheduleResult = { ok: true; when: string } | { ok: false; error: string; code?: 'not_ready' }

type Appt = {
  id: string
  patient_id: string
  doctor_id: string
  hospital_id: string | null
  schedule_id: string | null
  status: string
  follow_up_of: string | null
  reschedule_count?: number
  start: string | null
}

async function ownVisit(admin: Admin, userId: string, id: string): Promise<Appt | null> {
  const { data } = await admin.from('appointments').select('*, schedules ( start_time )').eq('id', id).eq('patient_id', userId).maybeSingle()
  if (!data) return null
  const slot = (Array.isArray(data.schedules) ? data.schedules[0] : data.schedules) as { start_time: string } | null
  return {
    id: data.id,
    patient_id: data.patient_id,
    doctor_id: data.doctor_id,
    hospital_id: data.hospital_id ?? null,
    schedule_id: data.schedule_id ?? null,
    status: data.status,
    follow_up_of: data.follow_up_of ?? null,
    reschedule_count: 'reschedule_count' in data ? Number(data.reschedule_count) || 0 : undefined,
    start: slot?.start_time ?? null,
  }
}

/** The latest time a free follow-up may move to: FOLLOW_UP_DAYS after its base visit's slot. null = no limit. */
async function followUpLimit(admin: Admin, appt: Appt): Promise<number | null> {
  if (!appt.follow_up_of) return null
  const { data } = await admin.from('appointments').select('created_at, schedules ( start_time )').eq('id', appt.follow_up_of).maybeSingle()
  if (!data) return 0
  const slot = (Array.isArray(data.schedules) ? data.schedules[0] : data.schedules) as { start_time: string } | null
  const base = Date.parse(slot?.start_time ?? data.created_at)
  return Number.isNaN(base) ? 0 : base + FOLLOW_UP_DAYS * DAY
}

function termsFor(appt: Appt) {
  return rescheduleTerms({ kind: 'visit', status: appt.status, startsAt: bookingStart({ kind: 'visit', slotStart: appt.start }), now: Date.now(), count: appt.reschedule_count })
}

export async function rescheduleOptions(appointmentId: string): Promise<RescheduleOptions> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in again.' }
  if (!uuid.safeParse(appointmentId).success) return { ok: false, error: 'Booking not found.' }
  const admin = createAdminClient()
  const appt = await ownVisit(admin, user.id, appointmentId)
  if (!appt) return { ok: false, error: 'Booking not found.' }
  const terms = termsFor(appt)
  if (!terms.allowed) return { ok: false, error: terms.reason, code: terms.notReady ? 'not_ready' : undefined }

  const { data: doctor } = await admin.from('doctors').select('id, hospital_id').eq('id', appt.doctor_id).maybeSingle()
  if (!doctor) return { ok: false, error: 'Booking not found.' }
  const place = appt.hospital_id ?? (doctor.hospital_id as string | null)
  const limit = await followUpLimit(admin, appt)

  const now = Date.now()
  const base = () =>
    admin
      .from('schedules')
      .select('id, start_time, hospital_id')
      .eq('doctor_id', appt.doctor_id)
      .eq('is_booked', false)
      .gt('start_time', new Date(now).toISOString())
      .lt('start_time', new Date(now + 30 * DAY).toISOString())
      .order('start_time')
      .limit(300)
  let { data: slots, error } = await base()
  if (error) {
    // No practice column yet: every slot belongs to the doctor's own hospital.
    const retry = await admin
      .from('schedules')
      .select('id, start_time')
      .eq('doctor_id', appt.doctor_id)
      .eq('is_booked', false)
      .gt('start_time', new Date(now).toISOString())
      .lt('start_time', new Date(now + 30 * DAY).toISOString())
      .order('start_time')
      .limit(300)
    slots = retry.data as typeof slots
    error = retry.error
  }
  if (error) return { ok: false, error: 'Could not load open times. Please try again.' }

  const days = new Map<string, RescheduleDay>()
  for (const s of (slots ?? []) as { id: string; start_time: string; hospital_id?: string | null }[]) {
    if (s.id === appt.schedule_id) continue
    if (((s.hospital_id ?? null) ?? (doctor.hospital_id as string | null)) !== place) continue
    const t = Date.parse(s.start_time)
    if (limit != null && t > limit) continue
    const key = istDateKey(s.start_time)
    let day = days.get(key)
    if (!day) {
      if (days.size >= 14) continue
      day = { key, label: formatDayLabel(s.start_time, now), slots: [] }
      days.set(key, day)
    }
    day.slots.push({ id: s.id, time: formatTime(s.start_time) })
  }
  return { ok: true, days: [...days.values()] }
}

const moveSchema = z.object({ appointmentId: uuid, scheduleId: uuid })

export async function rescheduleMyBooking(appointmentId: string, scheduleId: string): Promise<RescheduleResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in again.' }
  const parsed = moveSchema.safeParse({ appointmentId, scheduleId })
  if (!parsed.success) return { ok: false, error: 'Booking not found.' }
  if (await overLimit(`booking-change:${user.id}`, 20, HOUR)) return { ok: false, error: 'Too many changes. Please try again in a little while.' }

  const admin = createAdminClient()
  const appt = await ownVisit(admin, user.id, parsed.data.appointmentId)
  if (!appt) return { ok: false, error: 'Booking not found.' }
  const terms = termsFor(appt)
  if (!terms.allowed) return { ok: false, error: terms.reason, code: terms.notReady ? 'not_ready' : undefined }

  const { data: doctor } = await admin.from('doctors').select('id, hospital_id').eq('id', appt.doctor_id).maybeSingle()
  if (!doctor) return { ok: false, error: 'Booking not found.' }
  const { data: slot } = await admin.from('schedules').select('id, doctor_id, start_time, is_booked').eq('id', parsed.data.scheduleId).maybeSingle()
  // Same doctor, never another doctor's slot, and not the slot the booking already has.
  if (!slot || slot.doctor_id !== appt.doctor_id || slot.id === appt.schedule_id) return { ok: false, error: 'Pick another time.' }
  if (slot.is_booked) return { ok: false, error: 'That slot has just been taken. Pick another.' }
  const startMs = Date.parse(slot.start_time)
  if (!(startMs > Date.now()) || startMs > Date.now() + 30 * DAY) return { ok: false, error: 'Pick a time in the next 30 days.' }
  const place = appt.hospital_id ?? (doctor.hospital_id as string | null)
  if ((await slotHospitalId(admin, slot.id, doctor.hospital_id as string | null)) !== place) return { ok: false, error: 'Pick a time at the same hospital.' }
  const limit = await followUpLimit(admin, appt)
  if (limit != null && startMs > limit) return { ok: false, error: `A free follow-up can only move to a time within ${FOLLOW_UP_DAYS} days of your first visit.` }

  const nowIso = new Date().toISOString()
  const moved = await moveAppointmentSlot(admin, {
    appointmentId: appt.id,
    fromScheduleId: appt.schedule_id,
    fromDoctorId: appt.doctor_id,
    toScheduleId: slot.id,
    toDoctorId: appt.doctor_id,
    extra: { reschedule_count: 1, rescheduled_at: nowIso },
    match: { reschedule_count: 0, patient_id: user.id },
  })
  if (!moved.ok) return moved

  notifyBookingConfirmed(appt.id, { moved: 'patient' })
  revalidatePath('/patient/appointments')
  revalidatePath('/hospital/patients')
  revalidatePath('/doctor/schedule')
  return { ok: true, when: `${formatDayLabel(slot.start_time, Date.now())}, ${formatTime(slot.start_time)}` }
}
