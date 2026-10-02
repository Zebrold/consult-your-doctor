import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { one } from '@/components/patient/data'
import type { Tone } from '@/components/portal/ui'
import { matchBookedTests, sumPrices, type BookedTest } from '@/lib/pricing'
export { ageSex } from '@/lib/patient-facts'

type Admin = ReturnType<typeof createAdminClient>

export type LabTest = { name: string; price: number | null }

export type LabInfo = {
  id: string
  name: string
  city: string | null
  address: string | null
  image: string | null
  email: string | null
  status: string | null
  createdAt: string | null
  /** Tests in the lab's own order, with the price patients pay the lab (before the platform fee). */
  tests: LabTest[]
  prices: Record<string, number>
}

export type LabStaff = { id: string; name: string; email: string | null }

type CenterRow = {
  id: string
  name: string | null
  city: string | null
  address: string | null
  image_url: string | null
  contact_email: string | null
  status: string | null
  created_at: string | null
  available_tests: string[] | null
  test_prices: Record<string, number | string> | null
}

// Generated placeholder addresses are not real inboxes.
const realEmail = (email: string | null | undefined) => (email && !email.endsWith('.internal') ? email : null)

function toLab(c: CenterRow): LabInfo {
  const prices: Record<string, number> = {}
  for (const [name, price] of Object.entries(c.test_prices ?? {})) {
    const n = Number(price)
    if (Number.isFinite(n)) prices[name] = n
  }
  // available_tests holds the order; prices can also exist for tests missing from it.
  const names = Array.from(new Set([...(c.available_tests ?? []), ...Object.keys(prices)]))
  return {
    id: c.id,
    name: c.name || 'Diagnostic center',
    city: c.city,
    address: c.address,
    image: c.image_url,
    email: realEmail(c.contact_email),
    status: c.status,
    createdAt: c.created_at,
    tests: names.map((name) => ({ name, price: name in prices ? prices[name] : null })),
    prices,
  }
}

/** The signed-in diagnostic center staff member and their center (null when the account isn't linked to one). */
export const requireLab = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/diagnostic')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email, role, diagnostic_center_id')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'diagnostic_admin') redirect('/')

  const staff: LabStaff = { id: user.id, name: profile.full_name || 'Lab staff', email: realEmail(profile.email || user.email) }
  if (!profile.diagnostic_center_id) return { user, admin, staff, lab: null }

  const { data: center } = await admin
    .from('diagnostic_centers')
    .select('id, name, city, address, image_url, contact_email, status, created_at, available_tests, test_prices')
    .eq('id', profile.diagnostic_center_id)
    .maybeSingle()
  return { user, admin, staff, lab: center ? toLab(center as CenterRow) : null }
})

/** Like requireLab, for pages that need the center (the layout explains when the account has none). */
export const requireCenter = cache(async () => {
  const context = await requireLab()
  if (!context.lab) notFound()
  return { ...context, lab: context.lab }
})

export type LabBooking = {
  id: string
  code: string
  status: string
  /** "2026-10-17": the day the patient chose (bookings have no time of day). */
  date: string | null
  createdAt: string
  tests: LabTest[]
  testLabel: string
  /** What the lab charges for these tests at today's prices; null when a test can't be priced. */
  amount: number | null
  patient: { id: string; name: string; phone: string | null; email: string | null } | null
}

type BookingRow = {
  id: string
  status: string
  test_name: string | null
  preferred_date: string | null
  created_at: string
  profiles: { id: string; full_name: string | null; phone_number: string | null; email: string | null } | { id: string; full_name: string | null; phone_number: string | null; email: string | null }[] | null
}

/** The code patients see on their booking ("ID 1A2B3C4D"). */
export const bookingCode = (id: string) => id.slice(0, 8).toUpperCase()

function describeTests(testName: string, prices: Record<string, number>): { tests: LabTest[]; label: string; amount: number | null } {
  const matched: BookedTest[] | null = matchBookedTests(testName, prices)
  if (matched) return { tests: matched, label: matched.map((t) => t.name).join(', '), amount: sumPrices(matched) }
  // Old bookings stored a slug ("lipid-profile"); show it readably even if the lab no longer prices it.
  const label = testName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Lab test'
  return { tests: [{ name: label, price: null }], label, amount: null }
}

/** This center's bookings (never another center's), oldest day first. Cancelled bookings are left out. */
export async function loadLabBookings(admin: Admin, lab: LabInfo): Promise<LabBooking[]> {
  const { data } = await admin
    .from('diagnostic_bookings')
    .select('id, status, test_name, preferred_date, created_at, profiles ( id, full_name, phone_number, email )')
    .eq('center_id', lab.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(2000)

  return ((data ?? []) as BookingRow[])
    .map((row) => {
      const patient = one(row.profiles)
      const tests = describeTests(row.test_name || '', lab.prices)
      return {
        id: row.id,
        code: bookingCode(row.id),
        status: row.status,
        date: row.preferred_date,
        createdAt: row.created_at,
        tests: tests.tests,
        testLabel: tests.label,
        amount: tests.amount,
        patient: patient
          ? {
              id: patient.id,
              name: patient.full_name || 'Patient',
              phone: patient.phone_number,
              email: realEmail(patient.email),
            }
          : null,
      }
    })
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.createdAt.localeCompare(b.createdAt))
}

export const LAB_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'coral' },
  confirmed: { label: 'Booked', tone: 'blue' },
  visited: { label: 'Sample collected', tone: 'teal' },
  completed: { label: 'Awaiting report', tone: 'coral' },
  report_sent: { label: 'Report sent', tone: 'teal' },
}

/** Paid bookings the lab works on (unpaid ones are shown but can't be checked in yet). */
export const isPaid = (b: { status: string }) => b.status !== 'pending_payment'
/** Sample taken, report not yet uploaded. */
export const awaitingReport = (b: { status: string }) => b.status === 'visited' || b.status === 'completed'

/** Noon in India on a "YYYY-MM-DD" day, so date formatting never slips a day. */
export const dayToMs = (key: string) => Date.parse(`${key}T12:00:00+05:30`)

/** "YYYY-MM-DD" n days after the given day. */
export const shiftDay = (key: string, days: number) => new Date(dayToMs(key) + days * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

/** The plain booking details the client-side action buttons need. */
export const bookingRef = (b: LabBooking) => ({
  id: b.id,
  code: b.code,
  status: b.status,
  patientName: b.patient?.name ?? 'Patient',
  phone: b.patient?.phone ?? null,
  testLabel: b.testLabel,
})

