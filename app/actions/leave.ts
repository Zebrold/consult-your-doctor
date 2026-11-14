'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { doctorName, istDateKey } from '@/components/patient/format'
import { BOOKED_CHOICES, LEAVE_REASONS, leaveDates, leaveWindow, type BookedPatients, type LeaveReason } from '@/lib/leave'
import { notifyBookingConfirmed, notifyDoctorLeave } from '@/lib/notify/patient'

// Doctors' leave. The doctor asks (/doctor/leave); their hospital approves or declines (/hospital/doctors/leave).
// Approving closes the doctor's open slots on those days and tells each patient already booked that the hospital will
// move their visit; the desk then moves each booking to a new slot (moveBooking), which sends the patient the new time.

type Result = { ok: true } | { ok: false; error: string }
const NOT_SET_UP = 'Leave requests are being set up. Please try again later.'
const uuid = z.string().uuid()
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick the dates.')
const DAY = 86_400_000

async function doctorCaller() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: doctor } = await admin.from('doctors').select('id, hospital_id').eq('profile_id', user.id).maybeSingle()
  return doctor ? { user, admin, doctorId: doctor.id as string, hospitalId: (doctor.hospital_id as string | null) ?? null } : null
}

async function hospitalCaller() {
  const user = await getCurrentUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return null
  return { user, admin, hospitalId: profile.hospital_id as string }
}

const leaveSchema = z
  .object({
    startsOn: day,
    endsOn: day,
    reason: z.enum(Object.keys(LEAVE_REASONS) as [LeaveReason, ...LeaveReason[]]),
    bookedPatients: z.enum(Object.keys(BOOKED_CHOICES) as [BookedPatients, ...BookedPatients[]]),
    note: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.endsOn >= d.startsOn, { message: 'The last day can’t be before the first.' })
  .refine((d) => (Date.parse(d.endsOn) - Date.parse(d.startsOn)) / DAY <= 60, { message: 'Ask for up to 60 days at a time.' })

export async function requestLeave(form: FormData): Promise<Result> {
  const ctx = await doctorCaller()
  if (!ctx) return { ok: false, error: 'Please log in with your doctor account.' }
  if (!ctx.hospitalId) return { ok: false, error: 'You aren’t linked to a hospital yet, so there are no slots to close.' }
  const parsed = leaveSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const today = istDateKey(Date.now())
  if (d.startsOn < today) return { ok: false, error: 'Leave can’t start in the past.' }
  if (d.startsOn > istDateKey(Date.now() + 365 * DAY)) return { ok: false, error: 'Ask for leave up to a year ahead.' }

  // No two open requests over the same days.
  const { data: clash, error: clashError } = await ctx.admin
    .from('doctor_leaves')
    .select('id')
    .eq('doctor_id', ctx.doctorId)
    .in('status', ['pending', 'approved'])
    .lte('starts_on', d.endsOn)
    .gte('ends_on', d.startsOn)
    .limit(1)
  if (clashError) return { ok: false, error: NOT_SET_UP }
  if (clash?.length) return { ok: false, error: 'You already have leave on some of those days.' }

  const { error } = await ctx.admin.from('doctor_leaves').insert({
    doctor_id: ctx.doctorId,
    hospital_id: ctx.hospitalId,
    starts_on: d.startsOn,
    ends_on: d.endsOn,
    reason: d.reason,
    booked_patients: d.bookedPatients,
    note: d.note || null,
  })
  if (error) return { ok: false, error: NOT_SET_UP }
  revalidatePath('/doctor/leave')
  revalidatePath('/hospital/doctors/leave')
  return { ok: true }
}

/** Withdraws a request the hospital hasn't answered yet. */
export async function cancelLeave(leaveId: string): Promise<Result> {
  const ctx = await doctorCaller()
  if (!ctx || !uuid.safeParse(leaveId).success) return { ok: false, error: 'Not found.' }
  const { error } = await ctx.admin.from('doctor_leaves').update({ status: 'cancelled' }).eq('id', leaveId).eq('doctor_id', ctx.doctorId).eq('status', 'pending')
  if (error) return { ok: false, error: 'Could not withdraw it. Please try again.' }
  revalidatePath('/doctor/leave')
  revalidatePath('/hospital/doctors/leave')
  return { ok: true }
}

/**
 * The hospital approves or declines a leave request. Approving closes the doctor's open slots in those days and tells
 * the patients already booked (confirmed bookings) that the hospital will move their visit.
 */
export async function reviewLeave(leaveId: string, approve: boolean, reason = ''): Promise<Result> {
  const ctx = await hospitalCaller()
  if (!ctx || !uuid.safeParse(leaveId).success) return { ok: false, error: 'Not found.' }
  const { data: leave } = await ctx.admin.from('doctor_leaves').select('id, doctor_id, starts_on, ends_on, status, booked_patients').eq('id', leaveId).maybeSingle()
  if (!leave || leave.status !== 'pending') return { ok: false, error: 'This request has already been answered.' }
  const { data: doctor } = await ctx.admin.from('doctors').select('id, hospital_id, profiles!doctors_profile_id_fkey ( full_name )').eq('id', leave.doctor_id).maybeSingle()
  if (!doctor || doctor.hospital_id !== ctx.hospitalId) return { ok: false, error: 'Not found.' }
  const now = new Date().toISOString()

  if (!approve) {
    const why = reason.trim().slice(0, 300)
    if (why.length < 3) return { ok: false, error: 'Say why, so the doctor knows.' }
    const { error } = await ctx.admin.from('doctor_leaves').update({ status: 'declined', decline_reason: why, reviewed_by: ctx.user.id, reviewed_at: now }).eq('id', leaveId).eq('status', 'pending')
    if (error) return { ok: false, error: 'Could not decline it. Please try again.' }
    revalidatePath('/hospital/doctors/leave')
    revalidatePath('/doctor/leave')
    return { ok: true }
  }

  const span = leaveWindow({ startsOn: leave.starts_on, endsOn: leave.ends_on })
  // Close the open slots: the same filters as removing a slot by hand (unbooked, this doctor).
  const { data: open } = await ctx.admin.from('schedules').select('id').eq('doctor_id', leave.doctor_id).eq('is_booked', false).gte('start_time', span.from).lt('start_time', span.to).limit(5000)
  const openIds = ((open ?? []) as { id: string }[]).map((s) => s.id)
  let closed = 0
  for (let i = 0; i < openIds.length; i += 200) {
    const chunk = openIds.slice(i, i + 200)
    const { error, count } = await ctx.admin.from('schedules').delete({ count: 'exact' }).in('id', chunk).eq('is_booked', false)
    if (error) console.error('reviewLeave close slots:', error)
    else closed += count ?? chunk.length
  }

  const { error } = await ctx.admin
    .from('doctor_leaves')
    .update({ status: 'approved', slots_closed: closed, reviewed_by: ctx.user.id, reviewed_at: now })
    .eq('id', leaveId)
    .eq('status', 'pending')
  if (error) return { ok: false, error: 'Could not approve it. Please try again.' }

  // Tell the patients already booked on those days.
  const { data: hospital } = await ctx.admin.from('hospitals').select('name').eq('id', ctx.hospitalId).maybeSingle()
  const profile = (Array.isArray(doctor.profiles) ? doctor.profiles[0] : doctor.profiles) as { full_name: string | null } | null
  const booked = await bookedDuring(ctx.admin, leave.doctor_id, span)
  const plan = leave.booked_patients === 'other_doctor' ? 'to another doctor at the hospital' : 'to a new time with the same doctor'
  for (const b of booked) {
    notifyDoctorLeave({
      patientId: b.patientId,
      bookingCode: b.id.slice(0, 8).toUpperCase(),
      doctor: doctorName(profile?.full_name ?? 'Your doctor'),
      hospital: hospital?.name ?? 'The hospital',
      when: leaveDates({ startsOn: istDateKey(b.start), endsOn: istDateKey(b.start) }),
      plan,
    })
  }

  revalidatePath('/hospital/doctors/leave')
  revalidatePath('/hospital/doctors')
  revalidatePath('/doctor/leave')
  revalidatePath('/doctor/schedule')
  return { ok: true }
}

type Admin = ReturnType<typeof createAdminClient>

/** Confirmed bookings with this doctor whose slot falls in the span. */
async function bookedDuring(admin: Admin, doctorId: string, span: { from: string; to: string }) {
  const { data } = await admin
    .from('appointments')
    .select('id, patient_id, status, schedules!inner ( start_time )')
    .eq('doctor_id', doctorId)
    .eq('status', 'confirmed')
    .gte('schedules.start_time', span.from)
    .lt('schedules.start_time', span.to)
    .limit(1000)
  type Row = { id: string; patient_id: string; schedules: { start_time: string } | { start_time: string }[] }
  return ((data ?? []) as unknown as Row[]).map((r) => ({ id: r.id, patientId: r.patient_id, start: (Array.isArray(r.schedules) ? r.schedules[0] : r.schedules).start_time }))
}

/**
 * The desk moves a booking to another open slot: a later one with the same doctor, or another of the hospital's
 * doctors. The booking fee already paid carries over; the patient is sent the new time.
 */
export async function moveBooking(appointmentId: string, scheduleId: string): Promise<Result> {
  const ctx = await hospitalCaller()
  if (!ctx || !uuid.safeParse(appointmentId).success || !uuid.safeParse(scheduleId).success) return { ok: false, error: 'Not found.' }
  const { data: appt } = await ctx.admin.from('appointments').select('id, doctor_id, schedule_id, status').eq('id', appointmentId).maybeSingle()
  if (!appt || appt.status !== 'confirmed') return { ok: false, error: 'Only confirmed bookings can be moved.' }
  const { data: slot } = await ctx.admin.from('schedules').select('id, doctor_id, start_time, is_booked').eq('id', scheduleId).maybeSingle()
  if (!slot || slot.is_booked) return { ok: false, error: 'That slot has just been taken. Pick another.' }
  if (Date.parse(slot.start_time) <= Date.now()) return { ok: false, error: 'Pick a slot in the future.' }
  const { data: doctors } = await ctx.admin.from('doctors').select('id').in('id', [appt.doctor_id, slot.doctor_id]).eq('hospital_id', ctx.hospitalId)
  if ((doctors ?? []).length !== new Set([appt.doctor_id, slot.doctor_id]).size) return { ok: false, error: 'Not found.' }

  // Claim the new slot first, so two desks can't give it to two patients.
  const { data: claimed } = await ctx.admin.from('schedules').update({ is_booked: true }).eq('id', scheduleId).eq('is_booked', false).select('id')
  if (!claimed?.length) return { ok: false, error: 'That slot has just been taken. Pick another.' }
  const { error } = await ctx.admin.from('appointments').update({ schedule_id: scheduleId, doctor_id: slot.doctor_id }).eq('id', appointmentId).eq('status', 'confirmed')
  if (error) {
    await ctx.admin.from('schedules').update({ is_booked: false }).eq('id', scheduleId)
    console.error('moveBooking:', error)
    return { ok: false, error: 'Could not move the booking. Please try again.' }
  }

  // The old slot: closed if it falls in the doctor's approved leave, otherwise open again.
  if (appt.schedule_id) {
    const { data: old } = await ctx.admin.from('schedules').select('start_time').eq('id', appt.schedule_id).maybeSingle()
    const oldDay = old ? istDateKey(old.start_time) : null
    const { data: onLeave } = oldDay
      ? await ctx.admin.from('doctor_leaves').select('id').eq('doctor_id', appt.doctor_id).eq('status', 'approved').lte('starts_on', oldDay).gte('ends_on', oldDay).limit(1)
      : { data: null }
    if (onLeave?.length) await ctx.admin.from('schedules').delete().eq('id', appt.schedule_id).eq('is_booked', true)
    else await ctx.admin.from('schedules').update({ is_booked: false }).eq('id', appt.schedule_id)
  }

  notifyBookingConfirmed(appointmentId)
  revalidatePath('/hospital/doctors/leave')
  revalidatePath('/hospital/patients')
  revalidatePath('/hospital/dashboard')
  return { ok: true }
}
