import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Doctors practising at more than one hospital (supabase/migrations/20261115_executive_workspace.sql,
// doctor_practices). A hospital invites a doctor from another hospital; the doctor accepts; the Consult your Doctor
// team confirms. Then the hospital publishes slots for that doctor at its own address (schedules.hospital_id), and
// bookings on those slots belong to that hospital.

export type PracticeStatus = 'invited' | 'accepted' | 'confirmed' | 'declined' | 'rejected' | 'ended'

export const PRACTICE_STATUS: Record<PracticeStatus, { label: string; color: string }> = {
  invited: { label: 'Waiting for the doctor', color: '#B54708' },
  accepted: { label: 'Waiting for our team', color: '#B54708' },
  confirmed: { label: 'Confirmed', color: '#2A4DD0' },
  declined: { label: 'Declined by the doctor', color: '#98A2B3' },
  rejected: { label: 'Not approved', color: '#B42318' },
  ended: { label: 'Ended', color: '#98A2B3' },
}

export type Practice = {
  id: string
  doctorId: string
  hospitalId: string
  status: PracticeStatus
  note: string | null
  reviewNote: string | null
  createdAt: string
  respondedAt: string | null
  reviewedAt: string | null
}

type Row = {
  id: string
  doctor_id: string
  hospital_id: string
  status: PracticeStatus
  note: string | null
  review_note: string | null
  created_at: string
  responded_at: string | null
  reviewed_at: string | null
}

export const PRACTICE_COLUMNS = 'id, doctor_id, hospital_id, status, note, review_note, created_at, responded_at, reviewed_at'

export const toPractice = (r: Row): Practice => ({
  id: r.id,
  doctorId: r.doctor_id,
  hospitalId: r.hospital_id,
  status: r.status,
  note: r.note,
  reviewNote: r.review_note,
  createdAt: r.created_at,
  respondedAt: r.responded_at,
  reviewedAt: r.reviewed_at,
})

/** Practice links for a hospital, a doctor, or everyone. `ready` is false until the migration has run. */
export async function loadPractices(admin: Admin, by: { hospitalId?: string; doctorId?: string } = {}): Promise<{ ready: boolean; practices: Practice[] }> {
  let q = admin.from('doctor_practices').select(PRACTICE_COLUMNS).order('created_at', { ascending: false }).limit(1000)
  if (by.hospitalId) q = q.eq('hospital_id', by.hospitalId)
  if (by.doctorId) q = q.eq('doctor_id', by.doctorId)
  const { data, error } = await q
  if (error) return { ready: false, practices: [] }
  return { ready: true, practices: ((data ?? []) as Row[]).map(toPractice) }
}

/** The doctors confirmed as visiting a hospital (empty before the migration). */
export async function visitingDoctorIds(admin: Admin, hospitalId: string): Promise<string[]> {
  const { data, error } = await admin.from('doctor_practices').select('doctor_id').eq('hospital_id', hospitalId).eq('status', 'confirmed').limit(500)
  if (error) return []
  return ((data ?? []) as { doctor_id: string }[]).map((r) => r.doctor_id)
}

/** Whether a doctor is confirmed as visiting a hospital. */
export async function isVisiting(admin: Admin, doctorId: string, hospitalId: string): Promise<boolean> {
  const { data, error } = await admin.from('doctor_practices').select('id').eq('doctor_id', doctorId).eq('hospital_id', hospitalId).eq('status', 'confirmed').limit(1)
  return !error && (data?.length ?? 0) > 0
}

/**
 * A slot's hospital: its own hospital_id when it was published by a hospital the doctor visits, else the doctor's
 * hospital. Before the migration there is no hospital_id on slots, so it is always the doctor's hospital.
 */
export async function slotHospitalId(admin: Admin, scheduleId: string, doctorHospitalId: string | null): Promise<string | null> {
  const { data, error } = await admin.from('schedules').select('hospital_id').eq('id', scheduleId).maybeSingle()
  if (error) return doctorHospitalId
  return ((data as { hospital_id?: string | null } | null)?.hospital_id ?? null) || doctorHospitalId
}
