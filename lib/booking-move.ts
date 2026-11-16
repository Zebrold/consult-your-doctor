import { createAdminClient } from '@/lib/supabase/admin'
import { istDateKey } from '@/components/patient/format'

// Moving a confirmed doctor visit to another open slot. Shared by the hospital desk (moveBooking in app/actions/leave.ts)
// and the patient's own reschedule. Callers do their own authorisation and slot checks first.

type Admin = ReturnType<typeof createAdminClient>
type Result = { ok: true } | { ok: false; error: string }

/** Frees a slot: deleted if it falls in the doctor's approved leave, otherwise open again. */
export async function releaseSlot(admin: Admin, scheduleId: string, doctorId: string) {
  const { data: old } = await admin.from('schedules').select('start_time').eq('id', scheduleId).maybeSingle()
  const oldDay = old ? istDateKey(old.start_time) : null
  const { data: onLeave, error } = oldDay
    ? await admin.from('doctor_leaves').select('id').eq('doctor_id', doctorId).eq('status', 'approved').lte('starts_on', oldDay).gte('ends_on', oldDay).limit(1)
    : { data: null, error: null }
  if (!error && onLeave?.length) await admin.from('schedules').delete().eq('id', scheduleId).eq('is_booked', true)
  else await admin.from('schedules').update({ is_booked: false }).eq('id', scheduleId)
}

export async function moveAppointmentSlot(
  admin: Admin,
  p: {
    appointmentId: string
    fromScheduleId: string | null
    fromDoctorId: string
    toScheduleId: string
    toDoctorId: string
    extra?: Record<string, unknown>
    match?: Record<string, string | number>
  },
): Promise<Result> {
  // Claim the new slot first, so two people can't be given it.
  const { data: claimed } = await admin
    .from('schedules')
    .update({ is_booked: true })
    .eq('id', p.toScheduleId)
    .eq('is_booked', false)
    .gt('start_time', new Date().toISOString())
    .select('id')
  if (!claimed?.length) return { ok: false, error: 'That slot has just been taken. Pick another.' }

  let q = admin
    .from('appointments')
    .update({ schedule_id: p.toScheduleId, doctor_id: p.toDoctorId, ...(p.extra ?? {}) })
    .eq('id', p.appointmentId)
    .eq('status', 'confirmed')
  for (const [k, v] of Object.entries(p.match ?? {})) q = q.eq(k, v)
  const { data: moved, error } = await q.select('id')
  if (error || !moved?.length) {
    // Nothing moved (the booking changed under us): give the new slot back and leave the old one alone.
    await admin.from('schedules').update({ is_booked: false }).eq('id', p.toScheduleId)
    if (error) console.error('moveAppointmentSlot:', error)
    return { ok: false, error: error ? 'Could not move the booking. Please try again.' : 'This booking has changed and can’t be moved. Please refresh.' }
  }

  if (p.fromScheduleId) await releaseSlot(admin, p.fromScheduleId, p.fromDoctorId)
  return { ok: true }
}
