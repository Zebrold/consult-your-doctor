import type { createAdminClient } from '@/lib/supabase/admin'
import { doctorName } from '@/components/patient/format'

type Admin = ReturnType<typeof createAdminClient>
type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

// Inpatient beds (supabase/migrations/20261009_beds_reviews_profiles.sql). A hospital lists its beds by ward; an
// allocation puts a patient in a bed under an attending doctor until they are discharged. The hospital's Beds page
// manages them, and the doctor's and patient's portals show the current admissions.

export const BED_TYPES: Record<string, string> = {
  general: 'General',
  semi_private: 'Semi-private',
  private: 'Private',
  icu: 'ICU',
  hdu: 'HDU',
  nicu: 'NICU',
  picu: 'PICU',
  emergency: 'Emergency',
  maternity: 'Maternity',
  isolation: 'Isolation',
}

export const BED_STATUS = ['available', 'cleaning', 'maintenance'] as const
export type BedStatus = (typeof BED_STATUS)[number]

export type Admission = {
  id: string
  bedId: string
  patient: { id: string; name: string; phone: string | null }
  doctor: { id: string; name: string } | null
  reason: string | null
  notes: string | null
  admittedAt: string
  expectedDischarge: string | null
  dischargedAt: string | null
}

export type Bed = {
  id: string
  ward: string
  label: string
  type: string
  dailyRate: number | null
  status: BedStatus
  /** The patient in the bed now, if any. */
  admission: Admission | null
}

/** Whether the beds tables exist yet (they arrive with the 20261009 migration). */
export type BedsResult<T> = { ready: true; data: T } | { ready: false; data: T }

const missingTable = (error: { code?: string; message?: string } | null) =>
  !!error && (['42P01', 'PGRST205', 'PGRST200', '42703', 'PGRST204'].includes(error.code ?? '') || /does not exist|schema cache/i.test(error.message ?? ''))

type AllocationRow = {
  id: string
  bed_id: string
  reason: string | null
  notes: string | null
  admitted_at: string
  expected_discharge: string | null
  discharged_at: string | null
  patient: Joined<{ id: string; full_name: string | null; phone_number: string | null }>
  doctors: Joined<{ id: string; profiles: Joined<{ full_name: string | null }> }>
}

const ALLOCATION_SELECT = `
  id, bed_id, reason, notes, admitted_at, expected_discharge, discharged_at,
  patient:profiles!bed_allocations_patient_id_fkey ( id, full_name, phone_number ),
  doctors ( id, profiles!doctors_profile_id_fkey ( full_name ) )
`

function toAdmission(row: AllocationRow): Admission {
  const patient = one(row.patient)
  const doctor = one(row.doctors)
  return {
    id: row.id,
    bedId: row.bed_id,
    patient: { id: patient?.id ?? '', name: patient?.full_name || 'Patient', phone: patient?.phone_number ?? null },
    doctor: doctor ? { id: doctor.id, name: doctorName(one(doctor.profiles)?.full_name ?? 'Doctor') } : null,
    reason: row.reason,
    notes: row.notes,
    admittedAt: row.admitted_at,
    expectedDischarge: row.expected_discharge,
    dischargedAt: row.discharged_at,
  }
}

/** Natural order for bed labels, so "Bed 2" comes before "Bed 10". */
const byLabel = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })

/** Every bed at the hospital with whoever is in it now. */
export async function loadHospitalBeds(admin: Admin, hospitalId: string): Promise<BedsResult<Bed[]>> {
  const [beds, allocations] = await Promise.all([
    admin.from('hospital_beds').select('id, ward, label, bed_type, daily_rate, status').eq('hospital_id', hospitalId).limit(2000),
    admin.from('bed_allocations').select(ALLOCATION_SELECT).eq('hospital_id', hospitalId).is('discharged_at', null).limit(2000),
  ])
  if (missingTable(beds.error) || missingTable(allocations.error)) return { ready: false, data: [] }
  if (beds.error) console.error('loadHospitalBeds:', beds.error)
  if (allocations.error) console.error('loadHospitalBeds allocations:', allocations.error)

  const current = new Map(((allocations.data ?? []) as unknown as AllocationRow[]).map((r) => [r.bed_id, toAdmission(r)]))
  const list = ((beds.data ?? []) as { id: string; ward: string; label: string; bed_type: string; daily_rate: number | string | null; status: string }[]).map((b) => ({
    id: b.id,
    ward: b.ward,
    label: b.label,
    type: b.bed_type,
    dailyRate: b.daily_rate != null ? Number(b.daily_rate) : null,
    status: (BED_STATUS as readonly string[]).includes(b.status) ? (b.status as BedStatus) : 'available',
    admission: current.get(b.id) ?? null,
  }))
  list.sort((a, b) => a.ward.localeCompare(b.ward) || byLabel(a.label, b.label))
  return { ready: true, data: list }
}

/** Recent discharges at the hospital, newest first. */
export async function loadRecentDischarges(admin: Admin, hospitalId: string, limit = 12): Promise<(Admission & { bed: string })[]> {
  const { data, error } = await admin
    .from('bed_allocations')
    .select(`${ALLOCATION_SELECT}, hospital_beds ( ward, label )`)
    .eq('hospital_id', hospitalId)
    .not('discharged_at', 'is', null)
    .order('discharged_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return ((data ?? []) as unknown as (AllocationRow & { hospital_beds: Joined<{ ward: string; label: string }> })[]).map((r) => {
    const bed = one(r.hospital_beds)
    return { ...toAdmission(r), bed: bed ? `${bed.ward} • ${bed.label}` : 'Bed' }
  })
}

export type BedSummary = { total: number; occupied: number; available: number; unavailable: number; occupancy: number }

export function summarizeBeds(beds: Bed[]): BedSummary {
  const occupied = beds.filter((b) => b.admission).length
  const unavailable = beds.filter((b) => !b.admission && b.status !== 'available').length
  const available = beds.length - occupied - unavailable
  return { total: beds.length, occupied, available, unavailable, occupancy: beds.length ? Math.round((occupied / beds.length) * 100) : 0 }
}

/** Occupancy per ward, in ward order. */
export function wardSummaries(beds: Bed[]) {
  const wards = new Map<string, Bed[]>()
  for (const b of beds) wards.set(b.ward, [...(wards.get(b.ward) ?? []), b])
  return Array.from(wards.entries()).map(([ward, list]) => ({ ward, beds: list, ...summarizeBeds(list) }))
}

/** An admission as the doctor or patient portal shows it: with the hospital, ward and bed. */
export type PlacedAdmission = Admission & { hospital: string; ward: string; bed: string; bedType: string }

type PlacedRow = AllocationRow & {
  hospitals: Joined<{ name: string }>
  hospital_beds: Joined<{ ward: string; label: string; bed_type: string }>
}

function toPlaced(r: PlacedRow): PlacedAdmission {
  const bed = one(r.hospital_beds)
  return {
    ...toAdmission(r),
    hospital: one(r.hospitals)?.name ?? 'Hospital',
    ward: bed?.ward ?? 'Ward',
    bed: bed?.label ?? 'Bed',
    bedType: BED_TYPES[bed?.bed_type ?? ''] ?? 'General',
  }
}

/** Patients currently admitted under this doctor. */
export async function loadDoctorInpatients(admin: Admin, doctorId: string): Promise<PlacedAdmission[]> {
  const { data, error } = await admin
    .from('bed_allocations')
    .select(`${ALLOCATION_SELECT}, hospitals ( name ), hospital_beds ( ward, label, bed_type )`)
    .eq('doctor_id', doctorId)
    .is('discharged_at', null)
    .order('admitted_at', { ascending: true })
    .limit(200)
  if (error) {
    if (!missingTable(error)) console.error('loadDoctorInpatients:', error)
    return []
  }
  return ((data ?? []) as unknown as PlacedRow[]).map(toPlaced)
}

/** The patient's current admission (if any) and their past stays, newest first. */
export async function loadPatientAdmissions(admin: Admin, patientId: string): Promise<{ current: PlacedAdmission | null; past: PlacedAdmission[] }> {
  const { data, error } = await admin
    .from('bed_allocations')
    .select(`${ALLOCATION_SELECT}, hospitals ( name ), hospital_beds ( ward, label, bed_type )`)
    .eq('patient_id', patientId)
    .order('admitted_at', { ascending: false })
    .limit(20)
  if (error) {
    if (!missingTable(error)) console.error('loadPatientAdmissions:', error)
    return { current: null, past: [] }
  }
  const all = ((data ?? []) as unknown as PlacedRow[]).map(toPlaced)
  return { current: all.find((a) => !a.dischargedAt) ?? null, past: all.filter((a) => a.dischargedAt) }
}

/** Whole days since admission (a stay that began today is day 1). */
export function stayDays(admittedAt: string, until: number | string = Date.now()) {
  const end = typeof until === 'string' ? Date.parse(until) : until
  return Math.max(1, Math.ceil((end - Date.parse(admittedAt)) / 86_400_000))
}
