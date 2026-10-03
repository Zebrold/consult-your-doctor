import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { one } from '@/components/patient/data'
import { istDateKey } from '@/components/patient/format'
import type { Tone } from '@/components/portal/ui'
import { CONSULTATION_PLATFORM_FEE } from '@/lib/pricing'

type Admin = ReturnType<typeof createAdminClient>
type Joined<T> = T | T[] | null

// Generated placeholder addresses are not real inboxes.
const realEmail = (email: string | null | undefined) => (email && !email.endsWith('.internal') ? email : null)

export type HospitalInfo = {
  id: string
  name: string
  city: string | null
  address: string | null
  image: string | null
  phone: string | null
  email: string | null
  status: string | null
}

/** The signed-in hospital admin and their hospital. Everything in the portal is scoped to this hospital. */
export const requireHospital = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/hospital')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('full_name, email, role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) redirect('/')

  const { data: h } = await admin
    .from('hospitals')
    .select('id, name, city, address, image_url, contact_phone, contact_email, status')
    .eq('id', profile.hospital_id)
    .maybeSingle()
  if (!h) redirect('/')

  const hospital: HospitalInfo = {
    id: h.id,
    name: h.name || 'Hospital',
    city: h.city,
    address: h.address,
    image: h.image_url,
    phone: h.contact_phone,
    email: realEmail(h.contact_email),
    status: h.status,
  }
  return { user, admin, staff: { id: user.id, name: profile.full_name || 'Hospital admin' }, hospital }
})

export type HospitalDoctor = {
  id: string
  profileId: string
  name: string
  phone: string | null
  email: string | null
  staffId: string | null
  joined: string | null
  specialty: string | null
  department: string
  experience: number | null
  fee: number | null
  image: string | null
  qualifications: string | null
  bio: string | null
  address: string | null
}

type DoctorRow = {
  id: string
  specialty: string | null
  experience_years: number | null
  consultation_fee: number | string | null
  image_url: string | null
  qualifications: string | null
  bio: string | null
  address: string | null
  profiles: Joined<{ id: string; full_name: string | null; phone_number: string | null; email: string | null; staff_id: string | null; created_at: string | null }>
  departments: Joined<{ name: string | null }>
}

export async function loadHospitalDoctors(admin: Admin, hospitalId: string): Promise<HospitalDoctor[]> {
  const { data } = await admin
    .from('doctors')
    .select(`
      id, specialty, experience_years, consultation_fee, image_url, qualifications, bio, address,
      profiles!doctors_profile_id_fkey ( id, full_name, phone_number, email, staff_id, created_at ),
      departments ( name )
    `)
    .eq('hospital_id', hospitalId)

  return ((data ?? []) as DoctorRow[])
    .map((d) => {
      const p = one(d.profiles)
      return {
        id: d.id,
        profileId: p?.id ?? '',
        name: p?.full_name || 'Doctor',
        phone: p?.phone_number ?? null,
        email: realEmail(p?.email),
        staffId: p?.staff_id ?? null,
        joined: p?.created_at ?? null,
        specialty: d.specialty,
        department: one(d.departments)?.name || d.specialty || 'General',
        experience: d.experience_years,
        fee: d.consultation_fee != null ? Number(d.consultation_fee) : null,
        image: d.image_url,
        qualifications: d.qualifications,
        bio: d.bio,
        address: d.address,
      }
    })
    .sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name))
}

export type Payment = { amount: number; gateway: string | null; createdAt: string | null }

export type HospitalVisit = {
  id: string
  code: string
  status: string
  createdAt: string
  start: string | null
  end: string | null
  doctorId: string | null
  /** The front-desk executive who booked it, for walk-ins. */
  executiveId: string | null
  patient: { id: string; name: string; phone: string | null; email: string | null } | null
  payment: Payment | null
}

type VisitRow = {
  id: string
  status: string
  created_at: string
  doctor_id: string | null
  executive_id: string | null
  schedules: Joined<{ start_time: string; end_time: string | null }>
  patient: Joined<{ id: string; full_name: string | null; phone_number: string | null; email: string | null }>
}

/** Every consultation at this hospital (booked with one of its doctors), with the payment that settled it, if any. */
export async function loadHospitalVisits(admin: Admin, hospitalId: string, doctorIds: string[]): Promise<HospitalVisit[]> {
  const scope = doctorIds.length ? `hospital_id.eq.${hospitalId},doctor_id.in.(${doctorIds.join(',')})` : `hospital_id.eq.${hospitalId}`
  const { data } = await admin
    .from('appointments')
    .select(`
      id, status, created_at, doctor_id, executive_id,
      schedules ( start_time, end_time ),
      patient:profiles!appointments_patient_id_fkey ( id, full_name, phone_number, email )
    `)
    .or(scope)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(5000)

  const rows = (data ?? []) as VisitRow[]
  const payments = await loadPayments(admin, rows.map((r) => r.id))
  return rows
    .map((r) => {
      const slot = one(r.schedules)
      const patient = one(r.patient)
      return {
        id: r.id,
        code: r.id.slice(0, 8).toUpperCase(),
        status: r.status,
        createdAt: r.created_at,
        start: slot?.start_time ?? null,
        end: slot?.end_time ?? null,
        doctorId: r.doctor_id,
        executiveId: r.executive_id,
        patient: patient ? { id: patient.id, name: patient.full_name || 'Patient', phone: patient.phone_number, email: realEmail(patient.email) } : null,
        payment: payments.get(r.id) ?? null,
      }
    })
    .sort((a, b) => (a.start ?? a.createdAt).localeCompare(b.start ?? b.createdAt))
}

async function loadPayments(admin: Admin, ids: string[]): Promise<Map<string, Payment>> {
  const map = new Map<string, Payment>()
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await admin
      .from('payments')
      .select('appointment_id, amount, gateway, status, created_at')
      .in('appointment_id', ids.slice(i, i + 150))
      .eq('status', 'success')
    for (const p of (data ?? []) as { appointment_id: string; amount: number | string; gateway: string | null; created_at: string | null }[]) {
      map.set(p.appointment_id, { amount: Number(p.amount) || 0, gateway: p.gateway, createdAt: p.created_at })
    }
  }
  return map
}

/** What the hospital keeps from a payment: online payments include the platform fee, desk payments don't. */
export const hospitalShare = (p: Payment) => (p.gateway === 'payu' ? Math.max(0, p.amount - CONSULTATION_PLATFORM_FEE) : p.amount)

export const PAYMENT_METHOD: Record<string, string> = { payu: 'Online (PayU)', cash: 'Cash at desk' }

export type Slot = { id: string; doctorId: string; start: string; end: string | null; booked: boolean }

export async function loadHospitalSlots(admin: Admin, doctorIds: string[], fromIso: string, toIso: string): Promise<Slot[]> {
  if (doctorIds.length === 0) return []
  const { data } = await admin
    .from('schedules')
    .select('id, doctor_id, start_time, end_time, is_booked')
    .in('doctor_id', doctorIds)
    .gte('start_time', fromIso)
    .lt('start_time', toIso)
    .order('start_time', { ascending: true })
    .limit(10000)
  return ((data ?? []) as { id: string; doctor_id: string; start_time: string; end_time: string | null; is_booked: boolean }[]).map((s) => ({
    id: s.id,
    doctorId: s.doctor_id,
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
}

export const isPaidVisit = (v: { status: string }) => v.status === 'confirmed' || v.status === 'visited' || v.status === 'completed'

/** "YYYY-MM-DD" in India time for an ISO timestamp. */
export const dayOf = (iso: string | null) => (iso ? istDateKey(iso) : null)

/** Start of a "YYYY-MM-DD" day in India, as an ISO timestamp. */
export const dayStartIso = (key: string) => new Date(`${key}T00:00:00+05:30`).toISOString()
