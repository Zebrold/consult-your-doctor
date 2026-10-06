import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, CalendarDays, CircleAlert, CircleCheck, FileText, FlaskConical, HeartPulse, IdCard, MapPin, Microscope,
  Receipt, Siren, SquarePen, type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PatientDock } from '@/components/PatientDock'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientSidebar } from '@/components/PatientSidebar'
import { ProfileEditButton } from '@/components/patient/ProfileEditButton'
import { currentTime, one } from '@/components/patient/data'
import { ageFrom, doctorName, formatINR, formatShortDate, initials } from '@/components/patient/format'
import { matchBookedTests } from '@/lib/pricing'
import { signReportLinks } from '@/lib/lab-reports'

export const metadata: Metadata = { title: 'My Profile | Consult Your Doctor' }

type Joined<T> = T | T[] | null

type AppointmentRow = {
  id: string
  status: string
  created_at: string
  doctors: Joined<{ id: string; specialty: string | null; image_url: string | null; profiles: Joined<{ full_name: string | null }> }>
  hospitals: Joined<{ id: string; name: string; city: string | null; address: string | null }>
  schedules: Joined<{ start_time: string }>
  medical_records: { id: string; document_type: string | null; notes: string | null; file_url: string | null }[] | null
}

type LabRow = {
  id: string
  status: string
  test_name: string | null
  preferred_date: string | null
  created_at: string
  diagnostic_centers: Joined<{ id: string; name: string; city: string | null; test_prices: Record<string, number> | null }>
}

type PaymentRow = { appointment_id: string | null; diagnostic_booking_id?: string | null; amount: number | string; gateway: string | null; status: string; created_at?: string | null }
type Payment = PaymentRow & { booking_id: string }

const LAB_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'coral' },
  confirmed: { label: 'Confirmed', tone: 'blue' },
  visited: { label: 'Sample collected', tone: 'teal' },
  completed: { label: 'Report on the way', tone: 'blue' },
  report_sent: { label: 'Report sent', tone: 'teal' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

type Tone = 'blue' | 'teal' | 'coral' | 'neutral'
const TONES: Record<Tone, string> = {
  blue: 'bg-primary/10 text-primary',
  teal: 'bg-fresh-teal/10 text-secondary',
  coral: 'bg-soft-coral/10 text-tertiary',
  neutral: 'bg-surface-container text-on-surface-variant',
}

const bookingId = (id: string) => id.slice(0, 8).toUpperCase()

export default async function PatientProfilePage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = (await props.searchParams) ?? {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/patient?next=/patient/profile')

  const now = currentTime()
  const [{ data: profile }, { data: details }, { data: appts }, { data: labs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('patient_details').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('appointments')
      .select(`
        id, status, created_at,
        doctors ( id, specialty, image_url, profiles!doctors_profile_id_fkey ( full_name ) ),
        hospitals ( id, name, city, address ),
        schedules ( start_time ),
        medical_records ( id, document_type, notes, file_url )
      `)
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('diagnostic_bookings')
      .select('id, status, test_name, preferred_date, created_at, diagnostic_centers ( id, name, city, test_prices )')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const visits = ((appts ?? []) as AppointmentRow[]).map((a) => {
    const doctor = one(a.doctors)
    return {
      id: a.id,
      status: a.status,
      at: one(a.schedules)?.start_time ?? null,
      doctor: doctor ? { id: doctor.id, name: one(doctor.profiles)?.full_name ?? null, specialty: doctor.specialty } : null,
      hospital: one(a.hospitals),
      records: (a.medical_records ?? []).filter((r) => r.file_url && r.file_url !== 'none'),
    }
  })
  const labBookings = ((labs ?? []) as LabRow[]).map((b) => {
    const center = one(b.diagnostic_centers)
    const tests = matchBookedTests(b.test_name || '', center?.test_prices)
    return {
      id: b.id,
      status: b.status,
      tests: tests ? tests.map((t) => t.name).join(', ') : (b.test_name || 'Lab test').replace(/-/g, ' '),
      date: b.preferred_date,
      center,
    }
  })

  // Payments are keyed by the booking they settle; the ids come from this patient's own bookings.
  // Consultations use appointment_id, lab bookings use diagnostic_booking_id.
  const visitIds = visits.map((v) => v.id)
  const labIds = labBookings.map((b) => b.id)
  const admin = createAdminClient()
  const [visitPayments, labPayments] = await Promise.all([
    visitIds.length > 0
      ? admin.from('payments').select('*').in('appointment_id', visitIds).eq('status', 'success')
      : Promise.resolve({ data: [] as PaymentRow[] }),
    labIds.length > 0
      ? admin.from('payments').select('*').in('diagnostic_booking_id', labIds).eq('status', 'success')
      : Promise.resolve({ data: [] as PaymentRow[] }),
  ])
  const payments: Payment[] = [...((visitPayments.data ?? []) as PaymentRow[]), ...((labPayments.data ?? []) as PaymentRow[])]
    .map((p) => ({ ...p, booking_id: (p.appointment_id ?? p.diagnostic_booking_id) as string }))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  // Private, short-lived links to the reports labs have uploaded for this patient's own bookings.
  const reportLinks = await signReportLinks(
    createAdminClient(),
    labBookings.filter((b) => b.status === 'report_sent' && b.center).map((b) => ({ id: b.id, centerId: b.center!.id })),
  )

  const upcoming = visits
    .filter((v) => (v.status === 'confirmed' || v.status === 'pending_payment') && v.at && Date.parse(v.at) > now)
    .sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
  const reportsSent = labBookings.filter((b) => b.status === 'report_sent').length
  const records = visits.reduce((n, v) => n + v.records.length, 0)
  const awaitingPayment = [
    ...visits.filter((v) => v.status === 'pending_payment' && (!v.at || Date.parse(v.at) > now)).map((v) => ({ id: v.id, href: `/patient/checkout/${v.id}`, label: v.doctor ? doctorName(v.doctor.name) : 'Consultation' })),
    ...labBookings.filter((b) => b.status === 'pending_payment').map((b) => ({ id: b.id, href: `/patient/checkout/diagnostic/${b.id}`, label: b.tests })),
  ]
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const describePayment = (id: string) => {
    const visit = visits.find((v) => v.id === id)
    if (visit) return `Consultation · ${visit.doctor ? doctorName(visit.doctor.name) : 'Doctor'}`
    const lab = labBookings.find((b) => b.id === id)
    return lab ? `Lab test · ${lab.tests}` : 'Booking'
  }

  // Doctors and labs from the patient's own history, for quick re-booking.
  const careTeam = new Map<string, { href: string; name: string; sub: string; kind: 'doctor' | 'lab' }>()
  for (const v of visits) {
    if (v.doctor && !careTeam.has(v.doctor.id)) {
      careTeam.set(v.doctor.id, { href: `/book/${v.doctor.id}`, name: doctorName(v.doctor.name), sub: [v.doctor.specialty, v.hospital?.name].filter(Boolean).join(' • '), kind: 'doctor' })
    }
  }
  for (const b of labBookings) {
    if (b.center && !careTeam.has(b.center.id)) {
      careTeam.set(b.center.id, { href: `/book/diagnostic/${b.center.id}`, name: b.center.name, sub: b.center.city || 'Diagnostic lab', kind: 'lab' })
    }
  }

  const name = profile?.full_name || user.user_metadata?.full_name || 'Patient'
  const email = profile?.email || user.email || null
  const phone = profile?.phone_number || (user.phone ? `+${user.phone}` : null)
  const age = ageFrom(details?.date_of_birth, now)
  const editDetails = {
    full_name: profile?.full_name ?? null,
    phone_number: phone,
    blood_group: details?.blood_group ?? null,
    date_of_birth: details?.date_of_birth ?? null,
    gender: details?.gender ?? null,
    address: details?.address ?? null,
    emergency_contact_name: details?.emergency_contact_name ?? null,
    emergency_contact_relation: details?.emergency_contact_relation ?? null,
    emergency_contact_phone: details?.emergency_contact_phone ?? null,
  }
  const payment = typeof searchParams.payment === 'string' ? searchParams.payment : null

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <PatientNavHeader name={name} email={email} isSignedIn container="max-w-[1440px] px-margin-x-mobile lg:px-margin-x-desktop" />
      <main className="w-full bg-background min-h-[calc(100vh-5rem)] pb-28 md:pb-32">
        <div className="relative w-full overflow-hidden">
          <div aria-hidden className="absolute -top-32 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div aria-hidden className="absolute top-80 -left-20 w-80 h-80 bg-fresh-teal/5 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-16 pt-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1440px] mx-auto">
              <PatientSidebar user={user} profile={profile} patientDetails={details} activeAppointmentsCount={upcoming.length} />

              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="mb-2">
                  <h1 className="font-display-lg text-headline-lg font-bold text-on-surface">Personal Information &amp; History</h1>
                  <p className="font-body-md text-body-lg text-on-surface-variant mt-2">Your medical details, lab reports and payments in one place.</p>
                </div>

                {payment === 'success' && (
                  <Banner tone="teal" icon={CircleCheck}>Payment received. Your booking is confirmed. It&apos;s listed under My Appointments &amp; History with its booking ID.</Banner>
                )}
                {payment === 'failed' && (
                  <Banner tone="coral" icon={CircleAlert}>The payment didn&apos;t go through, so the booking isn&apos;t confirmed yet. You can try again from &ldquo;Awaiting payment&rdquo; below.</Banner>
                )}

                <div className="grid grid-cols-3 gap-3 md:gap-4">
                  <Stat href="/patient/appointments" label="Upcoming visits" value={upcoming.length} icon={CalendarDays} tint="text-primary" />
                  <Stat href="#labs" label="Lab reports" value={reportsSent} icon={Microscope} tint="text-fresh-teal" />
                  <Stat href="/patient/appointments" label="Prescriptions" value={records} icon={FileText} tint="text-on-surface-variant" />
                </div>

                <Section
                  id="personal"
                  icon={IdCard}
                  title="Personal & Medical Details"
                  subtitle="Shared with the doctors and labs you book"
                  action={
                    <ProfileEditButton details={editDetails} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold shrink-0 transition-colors">
                      <SquarePen className="w-4 h-4" /> Edit
                    </ProfileEditButton>
                  }
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Tile label="Blood Group" value={details?.blood_group} accent="text-soft-coral" />
                    <Tile label="Age" value={age != null ? `${age} yrs` : null} />
                    <Tile label="Sex" value={details?.gender} />
                    <Tile label="Date of Birth" value={details?.date_of_birth ? formatShortDate(details.date_of_birth) : null} small />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-surface-container-low text-sm">
                    <span className="flex items-start sm:items-center gap-2 text-on-surface min-w-0">
                      <Siren className="w-[18px] h-[18px] text-soft-coral shrink-0" />
                      <span className="font-semibold shrink-0">Emergency contact:</span>
                      <span className="text-on-surface-variant truncate">
                        {details?.emergency_contact_name
                          ? `${details.emergency_contact_name}${details.emergency_contact_relation ? ` (${details.emergency_contact_relation})` : ''}${details.emergency_contact_phone ? ` • ${details.emergency_contact_phone}` : ''}`
                          : 'Not added'}
                      </span>
                    </span>
                    <ProfileEditButton details={editDetails} className="self-end sm:self-auto font-label-sm text-label-sm text-primary hover:underline shrink-0">
                      {details?.emergency_contact_name ? 'Update' : 'Add'}
                    </ProfileEditButton>
                  </div>
                  {details?.address && (
                    <p className="flex items-start gap-2 px-1 text-sm text-on-surface-variant">
                      <MapPin className="w-[18px] h-[18px] text-outline shrink-0" /> {details.address}
                    </p>
                  )}
                </Section>

                <Section id="labs" icon={FlaskConical} title="Lab Tests & Reports" subtitle="Reports appear here as soon as the lab uploads them">
                  {labBookings.length === 0 ? (
                    <Empty>
                      No lab tests booked yet. <Link href="/diagnostics" className="text-primary font-semibold hover:underline">Find a lab</Link> to book one.
                    </Empty>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {labBookings.slice(0, 6).map((b) => (
                        <li key={b.id} className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
                          <span className="flex items-center gap-3 min-w-0">
                            <span className="w-10 h-10 rounded-full bg-surface-container text-on-surface flex items-center justify-center shrink-0">
                              <Microscope className="w-5 h-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block font-title-md text-[15px] text-on-surface truncate capitalize">{b.tests}</span>
                              <span className="block text-xs text-on-surface-variant truncate">
                                {[b.center?.name, b.date ? formatShortDate(`${b.date}T12:00:00+05:30`) : null, `ID ${bookingId(b.id)}`].filter(Boolean).join(' • ')}
                              </span>
                            </span>
                          </span>
                          {b.status === 'pending_payment' ? (
                            <Link href={`/patient/checkout/diagnostic/${b.id}`} className="px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary font-label-sm text-xs hover:bg-primary shrink-0">
                              Pay Now
                            </Link>
                          ) : reportLinks[b.id] ? (
                            <a href={reportLinks[b.id]} target="_blank" rel="noreferrer" className="px-3.5 py-1.5 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-xs hover:bg-fresh-teal/20 shrink-0 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" /> View Report
                            </a>
                          ) : (
                            <StatusChip status={LAB_STATUS[b.status]} small />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Section
                  id="payments"
                  icon={Receipt}
                  title="Payments & Billing"
                  subtitle="Paid online through PayU or at the desk"
                  action={
                    payments.length ? (
                      <span className="px-2.5 py-1 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-xs font-semibold shrink-0">{formatINR(totalPaid)} paid</span>
                    ) : undefined
                  }
                >
                  {awaitingPayment.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-soft-coral/10 flex flex-col gap-2">
                      <span className="font-label-sm text-label-sm text-tertiary font-bold">Awaiting payment ({awaitingPayment.length})</span>
                      {awaitingPayment.slice(0, 3).map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-on-surface truncate capitalize">{p.label}</span>
                          <Link href={p.href} className="font-label-sm text-label-sm text-primary hover:underline shrink-0">
                            Pay now
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                  {payments.length === 0 ? (
                    <Empty>No payments yet.</Empty>
                  ) : (
                    <ul className="flex flex-col divide-y divide-surface-container">
                      {payments.slice(0, 5).map((p, i) => (
                        <li key={`${p.booking_id}-${i}`} className="flex items-center justify-between gap-3 py-2.5 px-1">
                          <span className="min-w-0">
                            <span className="block text-sm text-on-surface truncate capitalize">{describePayment(p.booking_id)}</span>
                            <span className="block text-xs text-on-surface-variant">
                              {[p.created_at ? formatShortDate(p.created_at) : null, p.gateway === 'payu' ? 'Paid online' : p.gateway ? 'Paid at the desk' : null].filter(Boolean).join(' • ')}
                            </span>
                          </span>
                          <span className="font-title-md text-[15px] font-bold text-on-surface shrink-0">{formatINR(Number(p.amount) || 0)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Section
                  id="care-team"
                  icon={HeartPulse}
                  title="My Doctors & Labs"
                  subtitle="From your bookings, for quick re-booking"
                  action={
                    <Link href="/find" className="font-label-sm text-label-sm text-primary hover:underline shrink-0">
                      Find more
                    </Link>
                  }
                >
                  {careTeam.size === 0 ? (
                    <Empty>Doctors and labs you book will appear here.</Empty>
                  ) : (
                    Array.from(careTeam.values())
                      .slice(0, 4)
                      .map((c) => (
                        <div key={c.href} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                          <span className="flex items-center gap-3 min-w-0">
                            <span className="w-10 h-10 rounded-full bg-surface-container text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                              {c.kind === 'lab' ? <Building2 className="w-5 h-5 text-on-surface" /> : initials(c.name)}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-title-md text-[15px] text-on-surface truncate">{c.name}</span>
                              <span className="block text-xs text-on-surface-variant truncate">{c.sub}</span>
                            </span>
                          </span>
                          <Link href={c.href} className="px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary font-label-sm text-xs hover:bg-primary transition-all shrink-0">
                            Book again
                          </Link>
                        </div>
                      ))
                  )}
                </Section>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PatientDock activeTab="profile" name={name} />
    </div>
  )
}

function Banner({ tone, icon: Icon, children }: { tone: 'teal' | 'coral'; icon: LucideIcon; children: ReactNode }) {
  return (
    <div role="status" className={`p-4 rounded-xl flex items-start gap-3 text-sm ${tone === 'teal' ? 'bg-fresh-teal/10 text-on-secondary-fixed-variant' : 'bg-soft-coral/10 text-tertiary'}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function Stat({ href, label, value, icon: Icon, tint }: { href: string; label: string; value: number; icon: LucideIcon; tint: string }) {
  return (
    <Link href={href} className="group rounded-xl bg-surface-container-lowest p-4 md:p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-2">
      <span className="flex flex-col min-w-0">
        <span className="font-title-md text-[22px] md:text-[28px] font-bold text-on-surface leading-none">{value}</span>
        <span className="font-label-sm text-[11px] md:text-label-sm text-on-surface-variant mt-1.5 leading-tight">{label}</span>
      </span>
      <span className={`hidden md:flex w-11 h-11 rounded-xl bg-surface-container-low ${tint} items-center justify-center group-hover:scale-105 transition-transform shrink-0`}>
        <Icon className="w-[22px] h-[22px]" />
      </span>
    </Link>
  )
}

/** A card in the right-hand column, styled like the other sidebar pages' sections. */
function Section({
  id, icon: Icon, title, subtitle, action, children,
}: {
  id: string
  icon: LucideIcon
  title: string
  subtitle: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-surface-container text-primary flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-title-md text-title-md font-bold text-on-surface leading-snug">{title}</h3>
            <span className="font-body-md text-sm text-on-surface-variant">{subtitle}</span>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Tile({ label, value, accent, small }: { label: string; value: string | null | undefined; accent?: string; small?: boolean }) {
  return (
    <div className="p-3 rounded-xl bg-surface-container-low flex flex-col min-w-0">
      <span className="font-label-sm text-[11px] text-on-surface-variant uppercase">{label}</span>
      {value ? (
        <span className={`font-title-md ${small ? 'text-[15px] mt-1' : 'text-title-md mt-0.5'} ${accent ?? 'text-on-surface'} truncate`}>{value}</span>
      ) : (
        <span className="font-body-md text-sm text-outline mt-1">Not added</span>
      )}
    </div>
  )
}

function StatusChip({ status, small }: { status: { label: string; tone: Tone } | undefined; small?: boolean }) {
  const s = status ?? { label: 'Unknown', tone: 'neutral' as Tone }
  return <span className={`${small ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'} rounded-full font-label-sm font-semibold shrink-0 ${TONES[s.tone]}`}>{s.label}</span>
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="p-4 rounded-xl bg-surface-container-low text-sm text-on-surface-variant">{children}</p>
}

