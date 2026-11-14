import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Doctors' leave (supabase/migrations/20261114_grow_and_manage.sql). A doctor asks; their hospital approves, which
// closes the open slots on those days and tells the patients already booked (app/actions/leave.ts). Dates are India
// calendar days, "YYYY-MM-DD", both ends included.

export type LeaveReason = 'vacation' | 'conference' | 'personal' | 'unwell' | 'other'
export const LEAVE_REASONS: Record<LeaveReason, string> = { vacation: 'Vacation', conference: 'Conference', personal: 'Personal', unwell: 'Not well', other: 'Other' }

export type BookedPatients = 'same_doctor' | 'other_doctor'
export const BOOKED_CHOICES: Record<BookedPatients, { label: string; detail: string }> = {
  same_doctor: { label: 'Offer my patients a new slot with me', detail: 'The hospital moves them to one of your open slots after your leave. No extra charge.' },
  other_doctor: { label: 'Let the hospital move them to another doctor', detail: 'Same hospital, same day where possible. No extra charge.' },
}

export type LeaveStatus = 'pending' | 'approved' | 'declined' | 'cancelled'
export const LEAVE_STATUS: Record<LeaveStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#5B667A' },
  approved: { label: 'Approved', color: '#2A4DD0' },
  declined: { label: 'Declined', color: '#B42318' },
  cancelled: { label: 'Cancelled', color: '#98A2B3' },
}

export type Leave = {
  id: string
  doctorId: string
  hospitalId: string | null
  startsOn: string
  endsOn: string
  reason: LeaveReason
  bookedPatients: BookedPatients
  note: string | null
  status: LeaveStatus
  slotsClosed: number
  declineReason: string | null
  createdAt: string
  reviewedAt: string | null
}

type Row = {
  id: string
  doctor_id: string
  hospital_id: string | null
  starts_on: string
  ends_on: string
  reason: LeaveReason
  booked_patients: BookedPatients
  note: string | null
  status: LeaveStatus
  slots_closed: number
  decline_reason: string | null
  created_at: string
  reviewed_at: string | null
}

export const LEAVE_COLUMNS = 'id, doctor_id, hospital_id, starts_on, ends_on, reason, booked_patients, note, status, slots_closed, decline_reason, created_at, reviewed_at'

export const toLeave = (r: Row): Leave => ({
  id: r.id,
  doctorId: r.doctor_id,
  hospitalId: r.hospital_id,
  startsOn: r.starts_on,
  endsOn: r.ends_on,
  reason: r.reason,
  bookedPatients: r.booked_patients,
  note: r.note,
  status: r.status,
  slotsClosed: r.slots_closed ?? 0,
  declineReason: r.decline_reason,
  createdAt: r.created_at,
  reviewedAt: r.reviewed_at,
})

/** Leave for some doctors (or a hospital's doctors), soonest first. `ready` is false until the migration has run. */
export async function loadLeaves(admin: Admin, by: { doctorIds?: string[]; hospitalId?: string }): Promise<{ ready: boolean; leaves: Leave[] }> {
  let q = admin.from('doctor_leaves').select(LEAVE_COLUMNS).order('starts_on', { ascending: true }).limit(500)
  if (by.doctorIds) {
    if (!by.doctorIds.length) return { ready: true, leaves: [] }
    q = q.in('doctor_id', by.doctorIds)
  } else if (by.hospitalId) q = q.eq('hospital_id', by.hospitalId)
  const { data, error } = await q
  if (error) return { ready: false, leaves: [] }
  return { ready: true, leaves: ((data ?? []) as Row[]).map(toLeave) }
}

/** The leave's span as timestamps: from the first day's midnight in India to the midnight after the last day. */
export const leaveWindow = (l: Pick<Leave, 'startsOn' | 'endsOn'>) => ({
  from: new Date(`${l.startsOn}T00:00:00+05:30`).toISOString(),
  to: new Date(Date.parse(`${l.endsOn}T00:00:00+05:30`) + 86_400_000).toISOString(),
})

/** "20 to 21 Nov", "27 Nov", "28 Dec to 3 Jan 2027" */
export function leaveDates(l: Pick<Leave, 'startsOn' | 'endsOn'>, today = '') {
  const fmt = (key: string, withMonth: boolean, withYear: boolean) =>
    new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', ...(withMonth ? { month: 'short' } : {}), ...(withYear ? { year: 'numeric' } : {}) })
  const year = (k: string) => !!today && k.slice(0, 4) !== today.slice(0, 4)
  if (l.startsOn === l.endsOn) return fmt(l.startsOn, true, year(l.startsOn))
  const sameMonth = l.startsOn.slice(0, 7) === l.endsOn.slice(0, 7)
  return `${fmt(l.startsOn, !sameMonth, year(l.startsOn) && l.startsOn.slice(0, 4) !== l.endsOn.slice(0, 4))} to ${fmt(l.endsOn, true, year(l.endsOn))}`
}

/** The days of a leave, "YYYY-MM-DD" each. */
export function leaveDays(l: Pick<Leave, 'startsOn' | 'endsOn'>) {
  const days: string[] = []
  for (let t = Date.parse(`${l.startsOn}T12:00:00Z`); t <= Date.parse(`${l.endsOn}T12:00:00Z`); t += 86_400_000) days.push(new Date(t).toISOString().slice(0, 10))
  return days
}
