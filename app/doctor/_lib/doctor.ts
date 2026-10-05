import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { one } from '@/components/patient/data'
import type { Tone } from '@/components/portal/ui'

export { loadPatientFacts, type PatientFacts } from '@/lib/patient-facts'
export type { Tone }

type Admin = ReturnType<typeof createAdminClient>
type Joined<T> = T | T[] | null

export type DoctorInfo = {
  id: string
  name: string
  email: string | null
  phone: string | null
  specialty: string | null
  experience: number | null
  fee: number | null
  bio: string | null
  qualifications: string | null
  address: string | null
  image: string | null
  hospital: { id: string; name: string; city: string | null; address: string | null } | null
}

/** The signed-in doctor, loaded once per request (the layout and page both ask for it). */
export const requireDoctor = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/doctor')

  const admin = createAdminClient()
  const { data } = await admin
    .from('doctors')
    .select(`
      id, specialty, experience_years, consultation_fee, bio, qualifications, address, image_url,
      profiles!doctors_profile_id_fkey ( full_name, phone_number, email ),
      hospitals ( id, name, city, address )
    `)
    .eq('profile_id', user.id)
    .maybeSingle()
  if (!data) redirect('/auth/signout?next=/login/doctor')

  type Row = {
    id: string; specialty: string | null; experience_years: number | null; consultation_fee: number | null
    bio: string | null; qualifications: string | null; address: string | null; image_url: string | null
    profiles: Joined<{ full_name: string | null; phone_number: string | null; email: string | null }>
    hospitals: Joined<NonNullable<DoctorInfo['hospital']>>
  }
  const row = data as unknown as Row
  const profile = one(row.profiles)
  const doctor: DoctorInfo = {
    id: row.id,
    name: profile?.full_name || 'Doctor',
    email: profile?.email || user.email || null,
    phone: profile?.phone_number || null,
    specialty: row.specialty,
    experience: row.experience_years,
    fee: row.consultation_fee,
    bio: row.bio,
    qualifications: row.qualifications,
    address: row.address,
    image: row.image_url,
    hospital: one(row.hospitals),
  }
  return { user, admin, doctor }
})

export type VisitRecord = { id: string; type: string | null; notes: string | null; fileUrl: string | null; createdAt: string | null }

export type Visit = {
  id: string
  status: string
  createdAt: string
  scheduleId: string | null
  start: string | null
  end: string | null
  patient: { id: string; name: string; phone: string | null; email: string | null } | null
  records: VisitRecord[]
}

/** Every appointment booked with this doctor, oldest slot first. */
export async function loadVisits(admin: Admin, doctorId: string): Promise<Visit[]> {
  const { data } = await admin
    .from('appointments')
    .select(`
      id, status, created_at, schedule_id,
      patient:profiles!appointments_patient_id_fkey ( id, full_name, phone_number, email ),
      schedules ( start_time, end_time ),
      medical_records ( id, notes, document_type, file_url )
    `)
    .eq('doctor_id', doctorId)

  type Row = {
    id: string; status: string; created_at: string; schedule_id: string | null
    patient: Joined<{ id: string; full_name: string | null; phone_number: string | null; email: string | null }>
    schedules: Joined<{ start_time: string; end_time: string | null }>
    medical_records: { id: string; notes: string | null; document_type: string | null; file_url: string | null }[] | null
  }
  return ((data ?? []) as unknown as Row[])
    .map((r) => {
      const patient = one(r.patient)
      const slot = one(r.schedules)
      return {
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        scheduleId: r.schedule_id,
        start: slot?.start_time ?? null,
        end: slot?.end_time ?? null,
        patient: patient ? { id: patient.id, name: patient.full_name || 'Patient', phone: patient.phone_number, email: patient.email } : null,
        records: (r.medical_records ?? [])
          // medical_records has no timestamp column; a record dates from its visit.
          .map((m) => ({ id: m.id, type: m.document_type, notes: m.notes, fileUrl: m.file_url && m.file_url !== 'none' ? m.file_url : null, createdAt: null })),
      }
    })
    .sort((a, b) => (a.start ?? a.createdAt).localeCompare(b.start ?? b.createdAt))
}

export type Slot = { id: string; start: string; end: string | null; booked: boolean }

export async function loadSlots(admin: Admin, doctorId: string, fromIso: string, toIso: string): Promise<Slot[]> {
  const { data } = await admin
    .from('schedules')
    .select('id, start_time, end_time, is_booked')
    .eq('doctor_id', doctorId)
    .gte('start_time', fromIso)
    .lt('start_time', toIso)
    .order('start_time', { ascending: true })
  return ((data ?? []) as { id: string; start_time: string; end_time: string | null; is_booked: boolean }[]).map((s) => ({
    id: s.id,
    start: s.start_time,
    end: s.end_time,
    booked: s.is_booked,
  }))
}


export const VISIT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'coral' },
  confirmed: { label: 'Booked', tone: 'blue' },
  visited: { label: 'Checked in', tone: 'teal' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

/** Visits that still need the doctor today: booked, or checked in and waiting. */
export const isOpenVisit = (v: Visit) => v.status === 'confirmed' || v.status === 'visited'

export const patientCode = (id: string) => `CYD-${id.slice(0, 8).toUpperCase()}`
export const bookingCode = (id: string) => id.slice(0, 8).toUpperCase()

export function minutesBetween(start: string | null, end: string | null) {
  if (!start || !end) return null
  return Math.round((Date.parse(end) - Date.parse(start)) / 60000)
}
