import type { createAdminClient } from '@/lib/supabase/admin'
import { istDateKey } from '@/components/patient/format'
import { matchBookedTests } from '@/lib/pricing'

// A patient's doctor visits and lab bookings with what came out of them (prescriptions, health records, lab results),
// read with the service role and limited to this patient's own bookings. Rows are selected with `*` so columns added by
// later migrations (family_member_id, medicines, results) come through when they exist and nothing breaks before.

type Admin = ReturnType<typeof createAdminClient>
type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

export type VisitRecord = {
  id: string
  kind: 'prescription' | 'health'
  notes: string | null
  fileUrl: string | null
  medicines: unknown
  prescriptionNo: string | null
}

export type PatientVisit = {
  id: string
  status: string
  /** The slot's start, ISO. */
  at: string | null
  /** yyyy-mm-dd (IST) of the slot, or of the booking when there's no slot. */
  date: string
  bookingType: string | null
  familyMemberId: string | null
  doctor: { id: string; name: string | null; specialty: string | null; image: string | null } | null
  hospital: { id: string; name: string; city: string | null; address: string | null } | null
  records: VisitRecord[]
}

export type LabResultRow = { test: string; value: string; unit: string; range: string; flag: string }

export type PatientLab = {
  id: string
  status: string
  tests: string
  date: string | null
  createdAt: string
  familyMemberId: string | null
  center: { id: string; name: string; city: string | null } | null
  results: { rows: LabResultRow[]; reportedAt: string | null } | null
}

type VisitRow = {
  id: string
  status: string
  created_at: string
  booking_type?: string | null
  family_member_id?: string | null
  doctors: Joined<{ id: string; specialty: string | null; image_url: string | null; profiles: Joined<{ full_name: string | null }> }>
  hospitals: Joined<{ id: string; name: string; city: string | null; address: string | null }>
  schedules: Joined<{ start_time: string }>
  medical_records: { id: string; document_type: string | null; notes: string | null; file_url: string | null; medicines?: unknown; prescription_no?: string | null }[] | null
}

export async function loadPatientVisits(admin: Admin, patientId: string): Promise<PatientVisit[]> {
  const { data, error } = await admin
    .from('appointments')
    .select(`*,
      doctors ( id, specialty, image_url, profiles!doctors_profile_id_fkey ( full_name ) ),
      hospitals ( id, name, city, address ),
      schedules ( start_time ),
      medical_records ( * )`)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('loadPatientVisits:', error)
    return []
  }
  return ((data ?? []) as VisitRow[])
    .map((a) => {
      const doctor = one(a.doctors)
      const at = one(a.schedules)?.start_time ?? null
      return {
        id: a.id,
        status: a.status,
        at,
        date: istDateKey(at ?? a.created_at),
        bookingType: a.booking_type ?? null,
        familyMemberId: a.family_member_id ?? null,
        doctor: doctor ? { id: doctor.id, name: one(doctor.profiles)?.full_name ?? null, specialty: doctor.specialty, image: doctor.image_url } : null,
        hospital: one(a.hospitals),
        records: (a.medical_records ?? []).map((r) => ({
          id: r.id,
          kind: r.document_type === 'health_record' ? ('health' as const) : ('prescription' as const),
          notes: r.notes,
          fileUrl: r.file_url && r.file_url !== 'none' ? r.file_url : null,
          medicines: r.medicines ?? null,
          prescriptionNo: r.prescription_no ?? null,
        })),
      }
    })
    .sort((x, y) => (y.at ?? '').localeCompare(x.at ?? ''))
}

type LabRow = {
  id: string
  status: string
  test_name: string | null
  preferred_date: string | null
  created_at: string
  family_member_id?: string | null
  results?: { rows?: LabResultRow[]; reportedAt?: string } | null
  diagnostic_centers: Joined<{ id: string; name: string; city: string | null; test_prices: Record<string, number> | null }>
}

export async function loadPatientLabs(admin: Admin, patientId: string): Promise<PatientLab[]> {
  const { data, error } = await admin
    .from('diagnostic_bookings')
    .select('*, diagnostic_centers ( id, name, city, test_prices )')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('loadPatientLabs:', error)
    return []
  }
  return ((data ?? []) as LabRow[]).map((b) => {
    const center = one(b.diagnostic_centers)
    const tests = matchBookedTests(b.test_name || '', center?.test_prices)
    const rows = Array.isArray(b.results?.rows) ? b.results!.rows!.filter((r) => r && r.test && r.value) : []
    return {
      id: b.id,
      status: b.status,
      tests: tests ? tests.map((t) => t.name).join(', ') : (b.test_name || 'Lab test').replace(/-/g, ' '),
      date: b.preferred_date,
      createdAt: b.created_at,
      familyMemberId: b.family_member_id ?? null,
      center: center ? { id: center.id, name: center.name, city: center.city } : null,
      results: rows.length ? { rows, reportedAt: b.results?.reportedAt ?? null } : null,
    }
  })
}

/** Whether a lab value sits inside its printed range, when both are plain numbers ("0.4 - 4.0", "< 200", "> 40"). */
export function rangeCheck(value: string, range: string): { position: number; within: boolean } | null {
  const v = Number(value.replace(/,/g, '').trim())
  if (!Number.isFinite(v)) return null
  const between = /(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/i.exec(range)
  if (between) {
    const lo = Number(between[1])
    const hi = Number(between[2])
    if (!(hi > lo)) return null
    const span = hi - lo
    const position = Math.min(1, Math.max(0, (v - (lo - span / 2)) / (span * 2)))
    return { position, within: v >= lo && v <= hi }
  }
  const lessThan = /^\s*(?:<|≤|less than|up to)\s*(\d+(?:\.\d+)?)/i.exec(range)
  if (lessThan) {
    const hi = Number(lessThan[1])
    return { position: Math.min(1, Math.max(0, v / (hi * 1.5))), within: v <= hi }
  }
  const moreThan = /^\s*(?:>|≥|more than|above)\s*(\d+(?:\.\d+)?)/i.exec(range)
  if (moreThan) {
    const lo = Number(moreThan[1])
    return { position: Math.min(1, Math.max(0, v / (lo * 2))), within: v >= lo }
  }
  return null
}
