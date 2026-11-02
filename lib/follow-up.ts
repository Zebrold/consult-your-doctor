import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Free follow-up: after a visit, the patient may book the same doctor once more within FOLLOW_UP_DAYS of it with no
// booking fee (a general booking; fast track is still charged). The new booking records the visit it follows
// (appointments.follow_up_of, supabase/migrations/20261102_hospital_wallets.sql), which allows one follow-up per visit.

export const FOLLOW_UP_DAYS = 12
const DAY = 86_400_000
const SEEN = ['visited', 'completed']

type Row = { id: string; doctor_id: string; created_at: string; follow_up_of?: string | null; schedules: { start_time: string } | { start_time: string }[] | null }

const startOf = (r: Row) => {
  const s = Array.isArray(r.schedules) ? r.schedules[0] : r.schedules
  return s?.start_time ? Date.parse(s.start_time) : Date.parse(r.created_at)
}

/** The patient's visits from the last FOLLOW_UP_DAYS that are not themselves follow-ups and have no follow-up yet. */
async function openVisits(admin: Admin, patientId: string, now: number, doctorId?: string): Promise<Row[]> {
  let query = admin
    .from('appointments')
    .select('id, doctor_id, created_at, follow_up_of, schedules ( start_time )')
    .eq('patient_id', patientId)
    .in('status', SEEN)
    .is('follow_up_of', null)
  if (doctorId) query = query.eq('doctor_id', doctorId)
  const { data, error } = await query
  // Before the migration there is no follow_up_of column, and so no free follow-ups.
  if (error || !data?.length) return []

  const recent = (data as Row[]).filter((r) => {
    const start = startOf(r)
    return start <= now && now - start <= FOLLOW_UP_DAYS * DAY
  })
  if (!recent.length) return []

  const { data: used } = await admin
    .from('appointments')
    .select('follow_up_of')
    .in('follow_up_of', recent.map((r) => r.id))
    .neq('status', 'cancelled')
  const taken = new Set(((used ?? []) as { follow_up_of: string }[]).map((u) => u.follow_up_of))
  return recent.filter((r) => !taken.has(r.id)).sort((a, b) => startOf(b) - startOf(a))
}

/** The visit a new general booking with this doctor would be a free follow-up of, or null. */
export async function followUpBase(admin: Admin, patientId: string, doctorId: string, now = Date.now()): Promise<string | null> {
  const visits = await openVisits(admin, patientId, now, doctorId)
  return visits[0]?.id ?? null
}

/** The doctors this patient can book a free follow-up with right now. */
export async function freeFollowUpDoctors(admin: Admin, patientId: string, now = Date.now()): Promise<string[]> {
  const visits = await openVisits(admin, patientId, now)
  return Array.from(new Set(visits.map((v) => v.doctor_id)))
}
