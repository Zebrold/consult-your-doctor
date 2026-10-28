import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signRecordFiles } from '@/lib/records'
import { signReportLinks } from '@/lib/lab-reports'
import { bookedServices, doctorBookingFee, isFastTrack, labBookingFee, matchBookedTests } from '@/lib/pricing'
import { getBookingFees } from '@/lib/booking-fees'
import { siteUrl } from '@/lib/site-url'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientDock } from '@/components/PatientDock'
import { PatientFooter } from '@/components/AppFooter'
import { PageBody } from '@/components/patient/app-ui'
import { BookingsClient, type BookingItem, type BookingTab } from '@/components/patient/BookingsClient'
import type { ExistingReview } from '@/components/patient/ReviewButton'
import { currentTime, one } from '@/components/patient/data'
import { directionsHref, doctorName, formatDayLabel, formatINR, formatTime, istDateKey, visitToken } from '@/components/patient/format'

export const metadata: Metadata = { title: 'My bookings' }

type Rel<T> = T | T[] | null
type VisitRow = {
  id: string
  status: string
  doctor_id: string | null
  /** Missing until 20261028_fast_track_services.sql runs. */
  booking_type?: string | null
  services?: unknown
  doctors: Rel<{ id: string; specialty: string | null; image_url: string | null; profiles: Rel<{ full_name: string | null }> }>
  hospitals: Rel<{ id: string; name: string; city: string | null; address: string | null }>
  schedules: Rel<{ start_time: string }>
  medical_records: { id: string; document_type: string | null; file_url: string | null }[] | null
}
type LabRow = {
  id: string
  status: string
  test_name: string | null
  preferred_date: string | null
  booking_type: string | null
  doorstep_fee: number | null
  diagnostic_centers: Rel<{ id: string; name: string; city: string | null; address: string | null; test_prices: Parameters<typeof matchBookedTests>[1] }>
}
type PaymentRow = { appointment_id: string | null; diagnostic_booking_id: string | null; amount: number | string | null; gateway: string | null }

const DAY_MS = 86_400_000
const ACTIVE = ['scheduled', 'confirmed', 'pending_payment', 'pending', 'rescheduled']

/** "today", "tomorrow", "in 3 days" for a visit coming up. */
function relativeDay(at: string, now: number) {
  const days = Math.round((Date.parse(`${istDateKey(at)}T00:00:00+05:30`) - Date.parse(`${istDateKey(now)}T00:00:00+05:30`)) / DAY_MS)
  if (days < 0) return null
  return days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
}

export default async function PatientAppointments() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login/patient?next=/patient/appointments')

  const now = currentTime()
  const today = istDateKey(now)
  const [{ data: profile }, { data: visitRows }, { data: labRows }, { data: myReviews }, fees] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
    supabase
      .from('appointments')
      // `*` so booking_type and services come back once 20261028_fast_track_services.sql has run.
      .select(`
        *,
        doctors ( id, specialty, image_url, profiles!doctors_profile_id_fkey ( full_name ) ),
        hospitals ( id, name, city, address ),
        schedules ( start_time ),
        medical_records ( id, document_type, file_url )
      `)
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('diagnostic_bookings')
      .select('id, status, test_name, preferred_date, booking_type, doorstep_fee, diagnostic_centers ( id, name, city, address, test_prices )')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false }),
    // The patient's own reviews, so finished visits show their rating instead of "Rate your visit".
    supabase.from('doctor_reviews').select('appointment_id, rating, comment').eq('patient_id', user.id),
    getBookingFees(),
  ])

  const visits = (visitRows ?? []) as VisitRow[]
  const labs = (labRows ?? []) as LabRow[]
  const admin = createAdminClient()

  // Booking fees paid online, the prescriptions doctors sent and the reports labs uploaded (private files get short-lived links).
  const [visitPayments, labPayments, recordLinks, reportLinks] = await Promise.all([
    visits.length ? admin.from('payments').select('appointment_id, diagnostic_booking_id, amount, gateway').in('appointment_id', visits.map((v) => v.id)).eq('status', 'success') : Promise.resolve({ data: [] as PaymentRow[] }),
    labs.length ? admin.from('payments').select('appointment_id, diagnostic_booking_id, amount, gateway').in('diagnostic_booking_id', labs.map((b) => b.id)).eq('status', 'success') : Promise.resolve({ data: [] as PaymentRow[] }),
    signRecordFiles(admin, visits.flatMap((v) => (v.medical_records ?? []).filter((r) => r.document_type === 'prescription').map((r) => r.file_url))),
    signReportLinks(admin, labs.filter((b) => b.status === 'report_sent' && one(b.diagnostic_centers)).map((b) => ({ id: b.id, centerId: one(b.diagnostic_centers)!.id }))),
  ])
  const payments = [...((visitPayments.data ?? []) as PaymentRow[]), ...((labPayments.data ?? []) as PaymentRow[])]
  const paidOnline = (id: string) => payments.find((p) => (p.appointment_id ?? p.diagnostic_booking_id) === id && p.gateway === 'payu')

  const reviews: Record<string, ExistingReview> = Object.fromEntries(
    ((myReviews ?? []) as { appointment_id: string; rating: number; comment: string | null }[]).map((r) => [r.appointment_id, { rating: r.rating, comment: r.comment }]),
  )

  const items: BookingItem[] = []
  const sortAt = (b: BookingItem) => b.at ?? ''

  for (const v of visits) {
    const doctor = one(v.doctors)
    const hospital = one(v.hospitals)
    const at = one(v.schedules)?.start_time ?? null
    const done = v.status === 'completed' || v.status === 'visited'
    const cancelled = v.status === 'cancelled'
    const upcoming = !done && !cancelled && ACTIVE.includes(v.status) && (!at || istDateKey(at) >= today)
    const unpaid = v.status === 'pending_payment' || v.status === 'pending'
    const state: BookingItem['state'] = cancelled ? 'cancelled' : done ? 'done' : !upcoming ? 'past' : unpaid ? 'unpaid' : 'ok'
    const tab: BookingTab = cancelled ? 'cancelled' : upcoming ? 'upcoming' : 'completed'
    const paid = paidOnline(v.id)
    const rx = (v.medical_records ?? []).find((r) => r.document_type === 'prescription' && r.file_url && recordLinks[r.file_url])
    const name = doctorName(one(doctor?.profiles)?.full_name)
    items.push({
      id: v.id,
      kind: 'visit',
      tab,
      state,
      statusLabel: { ok: 'Confirmed', unpaid: 'Awaiting payment', done: 'Completed', past: 'Date passed', cancelled: 'Cancelled' }[state],
      title: name,
      sub: `${doctor?.specialty || 'General'} · ${isFastTrack(v.booking_type) ? 'Fast track' : 'Consultation'}`,
      image: doctor?.image_url ?? null,
      at,
      date: at ? formatDayLabel(at, now) : 'Date to be set',
      time: at ? formatTime(at) : null,
      relative: at && state === 'ok' ? relativeDay(at, now) : null,
      where: [hospital?.name, hospital?.city].filter(Boolean).join(', ') || 'Partner hospital',
      directions: directionsHref(hospital?.name, hospital?.address, hospital?.city),
      token: visitToken(v.id),
      bookingId: v.id.slice(0, 8).toUpperCase(),
      fee: paid ? formatINR(Number(paid.amount) || 0) : unpaid ? formatINR(doctorBookingFee(fees, v.booking_type)) : null,
      rest: ['Consultation fee', ...bookedServices(v.services).map((s) => `${s.name} ${formatINR(s.price)}`)].join(' · '),
      payHref: unpaid && upcoming ? `/patient/checkout/${v.id}` : null,
      passHref: `/book/confirmation/${v.id}`,
      qr: null,
      prescription: rx?.file_url ? recordLinks[rx.file_url] : null,
      report: null,
      rebookHref: v.doctor_id ? `/book/${v.doctor_id}` : null,
      supportHref: `/patient/support?bookingId=${v.id.slice(0, 8).toUpperCase()}`,
      review: done ? { doctorName: name, hospital: hospital ? { id: hospital.id, name: hospital.name, city: hospital.city } : null, existing: reviews[v.id] ?? null } : null,
    })
  }

  for (const b of labs) {
    const center = one(b.diagnostic_centers)
    const tests = matchBookedTests(b.test_name || '', center?.test_prices)
    const day = b.preferred_date
    const done = ['visited', 'completed', 'report_sent'].includes(b.status)
    const cancelled = b.status === 'cancelled'
    const upcoming = !done && !cancelled && (!day || day >= today)
    const unpaid = b.status === 'pending_payment'
    const state: BookingItem['state'] = cancelled ? 'cancelled' : done ? 'done' : !upcoming ? 'past' : unpaid ? 'unpaid' : 'ok'
    const paid = paidOnline(b.id)
    const due = tests ? labBookingFee(tests, fees.diagnosticPercent) : null
    const at = day ? `${day}T09:00:00+05:30` : null
    const doorstep = b.booking_type === 'doorstep'
    items.push({
      id: b.id,
      kind: 'lab',
      tab: cancelled ? 'cancelled' : upcoming ? 'upcoming' : 'completed',
      state,
      statusLabel:
        { ok: 'Confirmed', unpaid: 'Awaiting payment', past: 'Date passed', cancelled: 'Cancelled', done: b.status === 'report_sent' ? 'Report ready' : b.status === 'visited' ? 'Sample collected' : 'Report on the way' }[state],
      title: tests ? tests.map((t) => t.name).join(', ') : (b.test_name || 'Lab test').replace(/-/g, ' '),
      sub: `Lab test · ${doorstep ? 'Sample collected at home' : 'Visit the lab'}`,
      image: null,
      at,
      date: at ? formatDayLabel(at, now) : 'Day to be set',
      time: null,
      relative: at && state === 'ok' ? relativeDay(at, now) : null,
      where: [center?.name, center?.city].filter(Boolean).join(', ') || 'Partner lab',
      directions: doorstep ? null : directionsHref(center?.name, center?.address, center?.city),
      token: visitToken(b.id),
      bookingId: b.id.slice(0, 8).toUpperCase(),
      fee: paid ? formatINR(Number(paid.amount) || 0) : unpaid && due != null ? formatINR(due) : null,
      rest: doorstep && b.doorstep_fee ? `Test charges + ${formatINR(b.doorstep_fee)} home collection` : 'Test charges',
      payHref: unpaid && upcoming ? `/patient/checkout/diagnostic/${b.id}` : null,
      passHref: `/book/confirmation/${b.id}`,
      qr: null,
      prescription: null,
      report: reportLinks[b.id] ?? null,
      rebookHref: center ? `/book/diagnostic/${center.id}` : null,
      supportHref: `/patient/support?bookingId=${b.id.slice(0, 8).toUpperCase()}`,
      review: null,
    })
  }

  // Upcoming soonest first; past and cancelled newest first.
  items.sort((a, b) => (a.tab === 'upcoming' && b.tab === 'upcoming' ? sortAt(a).localeCompare(sortAt(b)) : sortAt(b).localeCompare(sortAt(a))))

  // The QR code on each pass opens the booking slip, as on the printed slip.
  await Promise.all(
    items
      .filter((b) => b.state === 'ok' || b.state === 'done')
      .slice(0, 12)
      .map(async (b) => {
        b.qr = await QRCode.toDataURL(`${siteUrl()}${b.passHref}`, { margin: 1, width: 240 })
      }),
  )

  const name = profile?.full_name || user.user_metadata?.full_name || 'Patient'
  const uhid = `CYD-${user.id.slice(0, 8).toUpperCase()}`
  const spent = payments.filter((p) => p.gateway === 'payu').reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const stats = {
    upcoming: items.filter((b) => b.tab === 'upcoming').length,
    completed: items.filter((b) => b.state === 'done').length,
    spent: formatINR(spent),
    records: Object.keys(reportLinks).length + items.filter((b) => b.prescription).length,
  }

  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen">
      <PatientNavHeader
        name={name}
        email={profile?.email || user.email}
        isSignedIn
        container="max-w-[900px] px-4 md:px-6"
        eyebrow="Your bookings"
        title="Appointments & history"
        subtitle="Consultations, lab tests and prescriptions."
        deskHidden
      />
      <PageBody>
        <div className="max-w-[900px] lg:max-w-none mx-auto lg:mx-0">
          <BookingsClient items={items} stats={stats} patient={{ name, uhid }} />
        </div>
      </PageBody>
      <PatientFooter isSignedIn />
      <PatientDock activeTab="book" name={name} detail={`UHID ${uhid}`} />
    </div>
  )
}
