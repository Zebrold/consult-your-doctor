import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { matchBookedTests, sumPrices } from '@/lib/pricing'

type Admin = ReturnType<typeof createAdminClient>

/** Supabase may return a joined row as an object or a one-element array depending on the relation. */
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

// Executives now operate platform-wide, so reads go through the service-role client after this role check.
export async function requireExecutive() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/executive')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, hospital_id, hospital:hospitals ( name )')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'executive') redirect('/auth/signout?next=/login/executive')

  return {
    user,
    profile: {
      id: profile.id as string,
      fullName: (profile.full_name as string | null) ?? 'Executive',
      hospitalId: (profile.hospital_id as string | null) ?? null,
      hospitalName: one(profile.hospital as { name: string } | { name: string }[] | null)?.name ?? null,
    },
    admin: createAdminClient(),
  }
}

// ---------- Formatting helpers ----------

export function formatINR(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

export function timeAgo(iso: string | null | undefined, now: number) {
  if (!iso) return '—'
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function initials(name: string | null | undefined) {
  return (name || '?')
    .replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Splits the packed `qualifications` string written by submitDoctorSignup (see app/actions/doctorAuth.ts). */
export function parseApplication(qualifications: string | null) {
  const parts = (qualifications || '').split(' | ')
  const get = (prefix: string) => parts.find((p) => p.startsWith(`${prefix}:`))?.slice(prefix.length + 1) ?? null
  return {
    qualification: parts[0] || null,
    experience: get('EXP'),
    fee: get('FEE'),
    council: get('COUNCIL'),
    registration: get('REG'),
    subSpecialty: get('SUB'),
  }
}

// ---------- Status groups ----------

export const PAID_APPOINTMENT_STATUSES = ['confirmed', 'visited', 'completed']
export const isPaidLabStatus = (status: string) => status !== 'pending_payment' && status !== 'cancelled'

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  visited: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const LAB_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  visited: 'Sample collected',
  report_sent: 'Report sent',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// ---------- Loaders ----------

// Shapes of the joined rows returned by the queries below (the Supabase client here is untyped).
type Joined<T> = T | T[] | null
type RawAppointment = {
  id: string
  status: string
  created_at: string
  hospital_id: string | null
  executive_id: string | null
  patient: Joined<{ id: string; full_name: string | null; phone_number: string | null }>
  doctor: Joined<{ id: string; specialty: string | null; consultation_fee: number | null; profiles: Joined<{ full_name: string | null }> }>
  hospital: Joined<{ name: string; city: string | null }>
  schedule: Joined<{ start_time: string }>
}
type RawLabBooking = {
  id: string
  status: string
  test_name: string | null
  preferred_date: string | null
  created_at: string
  profiles: Joined<{ id: string; full_name: string | null; phone_number: string | null }>
  diagnostic_centers: Joined<{ id: string; name: string; city: string | null; test_prices: Record<string, number> | null }>
}
type RawPayment = { appointment_id: string | null; amount: number | string | null; gateway: string | null; status: string | null }
type RawApplication = {
  id: string
  full_name: string
  email: string
  phone_number: string | null
  specialty: string | null
  qualifications: string | null
  status: string
  created_at: string
  hospital: Joined<{ name: string }>
}
type RawDoctor = {
  id: string
  specialty: string | null
  experience_years: number | null
  consultation_fee: number | null
  qualifications: string | null
  profiles: Joined<{ full_name: string | null }>
  hospitals: Joined<{ name: string; city: string | null }>
}
type RawLab = {
  id: string
  name: string
  city: string | null
  status: string | null
  available_tests: string[] | null
  test_prices: Record<string, number> | null
}

export type Appointment = {
  id: string
  status: string
  createdAt: string
  hospitalId: string | null
  executiveId: string | null
  patient: { id: string; name: string; phone: string | null } | null
  doctor: { id: string; name: string; specialty: string; fee: number } | null
  hospital: { name: string; city: string | null } | null
  startTime: string | null
}

export async function loadAppointments(admin: Admin): Promise<Appointment[]> {
  const { data } = await admin
    .from('appointments')
    .select(`
      id, status, created_at, hospital_id, executive_id,
      patient:profiles!appointments_patient_id_fkey ( id, full_name, phone_number ),
      doctor:doctors ( id, specialty, consultation_fee, profiles!doctors_profile_id_fkey ( full_name ) ),
      hospital:hospitals ( name, city ),
      schedule:schedules ( start_time )
    `)
    .order('created_at', { ascending: false })

  return ((data ?? []) as RawAppointment[]).map((row) => {
    const patient = one(row.patient)
    const doctor = one(row.doctor)
    const hospital = one(row.hospital)
    return {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      hospitalId: row.hospital_id ?? null,
      executiveId: row.executive_id ?? null,
      patient: patient ? { id: patient.id, name: patient.full_name || 'Unknown patient', phone: patient.phone_number ?? null } : null,
      doctor: doctor
        ? {
            id: doctor.id,
            name: one(doctor.profiles)?.full_name || 'Unknown doctor',
            specialty: doctor.specialty || 'General',
            fee: Number(doctor.consultation_fee) || 0,
          }
        : null,
      hospital: hospital ? { name: hospital.name, city: hospital.city ?? null } : null,
      startTime: one(row.schedule)?.start_time ?? null,
    }
  })
}

export type LabBooking = {
  id: string
  status: string
  testName: string
  preferredDate: string | null
  createdAt: string
  patient: { id: string; name: string; phone: string | null } | null
  center: { id: string; name: string; city: string | null } | null
  price: number | null
}

/**
 * Bookings store the test as a slug (e.g. "lipid-profile") or as display names joined with ", " (several tests),
 * while labs key prices by display name.
 */
function resolveTest(testName: string, prices: Record<string, number> | null) {
  const tests = matchBookedTests(testName, prices)
  if (tests) return { label: tests.map((t) => t.name).join(' + '), price: sumPrices(tests) || null }
  const label = testName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return { label, price: null }
}

export async function loadLabBookings(admin: Admin): Promise<LabBooking[]> {
  const { data } = await admin
    .from('diagnostic_bookings')
    .select(`
      id, status, test_name, preferred_date, created_at,
      profiles ( id, full_name, phone_number ),
      diagnostic_centers ( id, name, city, test_prices )
    `)
    .order('created_at', { ascending: false })

  return ((data ?? []) as RawLabBooking[]).map((row) => {
    const patient = one(row.profiles)
    const center = one(row.diagnostic_centers)
    const test = resolveTest(row.test_name || '', center?.test_prices ?? null)
    return {
      id: row.id,
      status: row.status,
      testName: test.label,
      preferredDate: row.preferred_date ?? null,
      createdAt: row.created_at,
      patient: patient ? { id: patient.id, name: patient.full_name || 'Unknown patient', phone: patient.phone_number ?? null } : null,
      center: center ? { id: center.id, name: center.name, city: center.city ?? null } : null,
      price: test.price,
    }
  })
}

export type Payment = { amount: number; gateway: string | null }

/** Successful payments keyed by the appointment or diagnostic booking id they settle. */
export async function loadPayments(admin: Admin): Promise<Map<string, Payment>> {
  const { data } = await admin.from('payments').select('appointment_id, amount, gateway, status')
  const map = new Map<string, Payment>()
  for (const row of (data ?? []) as RawPayment[]) {
    if (row.status === 'success' && row.appointment_id) {
      map.set(row.appointment_id, { amount: Number(row.amount) || 0, gateway: row.gateway ?? null })
    }
  }
  return map
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = { payu: 'Online (PayU)', cash: 'Cash (walk-in)' }

export type Application = {
  id: string
  name: string
  email: string
  phone: string | null
  specialty: string | null
  status: string
  createdAt: string
  hospitalName: string | null
  details: ReturnType<typeof parseApplication>
}

export async function loadApplications(admin: Admin): Promise<Application[]> {
  const { data } = await admin
    .from('doctor_signup_requests')
    .select('id, full_name, email, phone_number, specialty, qualifications, status, created_at, hospital:hospitals ( name )')
    .order('created_at', { ascending: false })

  return ((data ?? []) as RawApplication[]).map((row) => ({
    id: row.id,
    name: row.full_name,
    email: row.email,
    phone: row.phone_number ?? null,
    specialty: row.specialty ?? null,
    status: row.status,
    createdAt: row.created_at,
    hospitalName: one(row.hospital)?.name ?? null,
    details: parseApplication(row.qualifications),
  }))
}

export type Doctor = {
  id: string
  name: string
  specialty: string
  experienceYears: number | null
  fee: number
  qualifications: string | null
  hospital: string | null
  city: string | null
}

export async function loadDoctors(admin: Admin): Promise<Doctor[]> {
  const { data } = await admin
    .from('doctors')
    .select('id, specialty, experience_years, consultation_fee, qualifications, profiles!doctors_profile_id_fkey ( full_name ), hospitals ( name, city )')

  return ((data ?? []) as RawDoctor[]).map((row) => {
    const hospital = one(row.hospitals)
    return {
      id: row.id,
      name: one(row.profiles)?.full_name || 'Unknown doctor',
      specialty: row.specialty || 'General',
      experienceYears: row.experience_years ?? null,
      fee: Number(row.consultation_fee) || 0,
      qualifications: row.qualifications ?? null,
      hospital: hospital?.name ?? null,
      city: hospital?.city ?? null,
    }
  })
}

export type Lab = {
  id: string
  name: string
  city: string | null
  status: string | null
  tests: string[]
  prices: Record<string, number>
}

export async function loadLabs(admin: Admin): Promise<Lab[]> {
  const { data } = await admin.from('diagnostic_centers').select('id, name, city, status, available_tests, test_prices')
  return ((data ?? []) as RawLab[]).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city ?? null,
    status: row.status ?? null,
    tests: Array.isArray(row.available_tests) ? row.available_tests : [],
    prices: row.test_prices ?? {},
  }))
}

export async function loadNetworkCounts(admin: Admin) {
  const [hospitals, labs, patients, doctors] = await Promise.all([
    admin.from('hospitals').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('diagnostic_centers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'patient'),
    admin.from('doctors').select('id', { count: 'exact', head: true }),
  ])
  return {
    hospitals: hospitals.count ?? 0,
    labs: labs.count ?? 0,
    patients: patients.count ?? 0,
    doctors: doctors.count ?? 0,
  }
}

// ---------- Derived views ----------

export type AttentionItem = {
  id: string
  category: 'doctors' | 'consultations' | 'diagnostics'
  severity: 'high' | 'medium'
  title: string
  detail: string
  who: string
  phone: string | null
  portal: string
  since: string
  sinceLabel: string
  status: string
  href: string
  actionLabel: string
}

const HOUR = 3600_000

/**
 * Items that need a person to act, derived from real booking and application data:
 * doctor applications awaiting review, bookings unpaid for over a day, appointments never checked in,
 * overdue lab visits, and lab reports not sent two days after collection.
 */
export function buildAttentionItems(
  { appointments, labBookings, applications }: { appointments: Appointment[]; labBookings: LabBooking[]; applications: Application[] },
  now: number
): AttentionItem[] {
  const items: AttentionItem[] = []
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  for (const app of applications) {
    if (app.status !== 'pending') continue
    const waited = now - new Date(app.createdAt).getTime()
    items.push({
      id: `app-${app.id}`,
      category: 'doctors',
      severity: waited > 48 * HOUR ? 'high' : 'medium',
      title: 'Doctor application awaiting review',
      detail: [app.specialty, app.details.council, app.hospitalName].filter(Boolean).join(' · '),
      who: app.name,
      phone: app.phone,
      portal: 'Doctor credentialing',
      since: app.createdAt,
      sinceLabel: `Applied ${timeAgo(app.createdAt, now)}`,
      status: 'Pending review',
      href: '/executive/doctors#applications',
      actionLabel: 'Review application',
    })
  }

  for (const apt of appointments) {
    const who = apt.patient?.name ?? 'Unknown patient'
    const where = [apt.doctor ? `Dr. ${apt.doctor.name}` : null, apt.hospital?.name].filter(Boolean).join(' · ')
    if (apt.status === 'pending_payment' && now - new Date(apt.createdAt).getTime() > 24 * HOUR) {
      items.push({
        id: `apt-unpaid-${apt.id}`,
        category: 'consultations',
        severity: 'medium',
        title: 'Consultation booked but not paid',
        detail: where,
        who,
        phone: apt.patient?.phone ?? null,
        portal: 'Consultation',
        since: apt.createdAt,
        sinceLabel: `Booked ${timeAgo(apt.createdAt, now)}`,
        status: 'Awaiting payment',
        href: '/executive/patients',
        actionLabel: 'Contact patient',
      })
    }
    if (apt.status === 'confirmed' && apt.startTime && now - new Date(apt.startTime).getTime() > 2 * HOUR) {
      items.push({
        id: `apt-missed-${apt.id}`,
        category: 'consultations',
        severity: 'high',
        title: 'Appointment time passed without check-in',
        detail: `${where} · scheduled ${formatDateTime(apt.startTime)}`,
        who,
        phone: apt.patient?.phone ?? null,
        portal: 'Consultation',
        since: apt.startTime,
        sinceLabel: `Due ${timeAgo(apt.startTime, now)}`,
        status: 'Not checked in',
        href: '/executive/patients',
        actionLabel: 'Contact patient',
      })
    }
  }

  for (const booking of labBookings) {
    const who = booking.patient?.name ?? 'Unknown patient'
    const where = [booking.testName, booking.center?.name].filter(Boolean).join(' · ')
    const preferred = booking.preferredDate ? new Date(booking.preferredDate) : null
    if (booking.status === 'pending_payment' && now - new Date(booking.createdAt).getTime() > 24 * HOUR) {
      items.push({
        id: `lab-unpaid-${booking.id}`,
        category: 'diagnostics',
        severity: 'medium',
        title: 'Lab test booked but not paid',
        detail: where,
        who,
        phone: booking.patient?.phone ?? null,
        portal: 'Diagnostic lab',
        since: booking.createdAt,
        sinceLabel: `Booked ${timeAgo(booking.createdAt, now)}`,
        status: 'Awaiting payment',
        href: '/executive/diagnostics',
        actionLabel: 'Contact patient',
      })
    }
    if (booking.status === 'confirmed' && preferred && preferred < today) {
      items.push({
        id: `lab-overdue-${booking.id}`,
        category: 'diagnostics',
        severity: 'high',
        title: 'Lab visit date passed',
        detail: `${where} · booked for ${formatDate(booking.preferredDate)}`,
        who,
        phone: booking.patient?.phone ?? null,
        portal: 'Diagnostic lab',
        since: booking.preferredDate!,
        sinceLabel: `Due ${timeAgo(booking.preferredDate, now)}`,
        status: 'Visit overdue',
        href: '/executive/diagnostics',
        actionLabel: 'Contact patient',
      })
    }
    if (booking.status === 'visited' && preferred && now - preferred.getTime() > 48 * HOUR) {
      items.push({
        id: `lab-report-${booking.id}`,
        category: 'diagnostics',
        severity: 'medium',
        title: 'Report not sent after sample collection',
        detail: where,
        who,
        phone: booking.patient?.phone ?? null,
        portal: 'Diagnostic lab',
        since: booking.preferredDate!,
        sinceLabel: `Collected ${timeAgo(booking.preferredDate, now)}`,
        status: 'Report pending',
        href: '/executive/diagnostics',
        actionLabel: 'Contact lab',
      })
    }
  }

  return items.sort((a, b) =>
    a.severity === b.severity ? new Date(a.since).getTime() - new Date(b.since).getTime() : a.severity === 'high' ? -1 : 1
  )
}

export type LedgerRow = {
  id: string
  kind: 'consultation' | 'diagnostic'
  patient: string
  service: string
  provider: string
  status: string
  method: string
  amount: number
  createdAt: string
}

/** Paid consultations and lab tests, valued at the recorded payment or, if none, the listed fee. */
export function buildLedger(appointments: Appointment[], labBookings: LabBooking[], payments: Map<string, Payment>): LedgerRow[] {
  const rows: LedgerRow[] = []
  for (const apt of appointments) {
    if (!PAID_APPOINTMENT_STATUSES.includes(apt.status)) continue
    const payment = payments.get(apt.id)
    rows.push({
      id: apt.id,
      kind: 'consultation',
      patient: apt.patient?.name ?? 'Unknown patient',
      service: `${apt.doctor?.specialty ?? 'Consultation'} consultation`,
      provider: [apt.doctor ? `Dr. ${apt.doctor.name}` : null, apt.hospital?.name].filter(Boolean).join(' · '),
      status: APPOINTMENT_STATUS_LABELS[apt.status] ?? apt.status,
      method: payment?.gateway ? PAYMENT_METHOD_LABELS[payment.gateway] ?? payment.gateway : 'Not recorded',
      amount: payment?.amount ?? apt.doctor?.fee ?? 0,
      createdAt: apt.createdAt,
    })
  }
  for (const booking of labBookings) {
    if (!isPaidLabStatus(booking.status)) continue
    const payment = payments.get(booking.id)
    rows.push({
      id: booking.id,
      kind: 'diagnostic',
      patient: booking.patient?.name ?? 'Unknown patient',
      service: booking.testName,
      provider: booking.center?.name ?? 'Diagnostic lab',
      status: LAB_STATUS_LABELS[booking.status] ?? booking.status,
      method: payment?.gateway ? PAYMENT_METHOD_LABELS[payment.gateway] ?? payment.gateway : 'Not recorded',
      amount: payment?.amount ?? booking.price ?? 0,
      createdAt: booking.createdAt,
    })
  }
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function currentTime() {
  return Date.now()
}
