import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BedDouble, Building2, CircleAlert, CircleCheck, Download, FileText, FlaskConical, HeartPulse, IdCard, MapPin, Microscope,
  Pill, Receipt, Siren, SquarePen, Stethoscope, Phone, type LucideIcon,
} from 'lucide-react'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PatientDock } from '@/components/PatientDock'
import { PatientFooter } from '@/components/AppFooter'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientSidebar } from '@/components/PatientSidebar'
import { AccountShortcuts } from '@/components/patient/AccountShortcuts'
import { HeroStat, HeroStats } from '@/components/patient/PhoneHeader'
import { ProfileEditButton } from '@/components/patient/ProfileEditButton'
import { currentTime, one } from '@/components/patient/data'
import { ageFrom, doctorName, formatINR, formatShortDate, initials } from '@/components/patient/format'
import { matchBookedTests } from '@/lib/pricing'
import { signReportLinks } from '@/lib/lab-reports'
import { signRecordFiles } from '@/lib/records'
import { parseVitals, vitalsList, withoutVitals } from '@/lib/vitals'
import { loadPatientAdmissions, stayDays } from '@/lib/beds'
import { LiveRefresh } from '@/components/portal/LiveRefresh'

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
  const user = await getCurrentUser()
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
      records: a.medical_records ?? [],
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
  const [visitPayments, labPayments, admissions] = await Promise.all([
    visitIds.length > 0
      ? admin.from('payments').select('*').in('appointment_id', visitIds).eq('status', 'success')
      : Promise.resolve({ data: [] as PaymentRow[] }),
    labIds.length > 0
      ? admin.from('payments').select('*').in('diagnostic_booking_id', labIds).eq('status', 'success')
      : Promise.resolve({ data: [] as PaymentRow[] }),
    // The patient's own hospital stays: the bed the hospital has given them now, and earlier ones.
    loadPatientAdmissions(admin, user.id),
  ])
  const payments: Payment[] = [...((visitPayments.data ?? []) as PaymentRow[]), ...((labPayments.data ?? []) as PaymentRow[])]
    .map((p) => ({ ...p, booking_id: (p.appointment_id ?? p.diagnostic_booking_id) as string }))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  // Prescriptions, health records and lab reports are private: hand out short-lived signed links.
  const recordLinks = await signRecordFiles(admin, visits.flatMap((v) => v.records.map((r) => r.file_url)))
  const history = visits
    .flatMap((v) =>
      v.records.map((r) => ({
        id: r.id,
        kind: r.document_type === 'health_record' ? ('health' as const) : ('prescription' as const),
        at: v.at,
        visitId: v.id,
        doctor: v.doctor,
        hospital: v.hospital?.name ?? null,
        vitals: parseVitals(r.notes),
        notes: withoutVitals(r.notes),
        file: (r.file_url && recordLinks[r.file_url]) || null,
      })),
    )
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
  const latestVitals = history.find((h) => h.vitals)

  // Private, short-lived links to the reports labs have uploaded for this patient's own bookings.
  const reportLinks = await signReportLinks(
    createAdminClient(),
    labBookings.filter((b) => b.status === 'report_sent' && b.center).map((b) => ({ id: b.id, centerId: b.center!.id })),
  )

  const upcoming = visits
    .filter((v) => (v.status === 'confirmed' || v.status === 'pending_payment') && v.at && Date.parse(v.at) > now)
    .sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
  const reportsSent = labBookings.filter((b) => b.status === 'report_sent').length
  const records = history.filter((h) => h.kind === 'prescription' && h.file).length
  const awaitingPayment = [
    ...visits.filter((v) => v.status === 'pending_payment' && (!v.at || Date.parse(v.at) > now)).map((v) => ({ id: v.id, href: `/patient/checkout/${v.id}`, label: v.doctor ? doctorName(v.doctor.name) : 'Consultation' })),
    ...labBookings.filter((b) => b.status === 'pending_payment').map((b) => ({ id: b.id, href: `/patient/checkout/diagnostic/${b.id}`, label: b.tests })),
  ]
  // Online payments are booking fees. A desk payment is what the hospital or lab counter took (the consultation fee or test
  // charges), which booking screens never show, so it is listed without its amount and left out of the total.
  const totalPaid = payments.filter((p) => p.gateway === 'payu').reduce((s, p) => s + (Number(p.amount) || 0), 0)
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

  const isSetupMandatory = searchParams.setup === 'mandatory' || !profile?.phone_number

  return (
    <div className="bg-background font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <PatientNavHeader
        name={name}
        email={email}
        isSignedIn
        container="max-w-[1440px] px-margin-x-mobile lg:px-margin-x-desktop"
        eyebrow="My profile"
        title={name}
        subtitle={[`UHID CYD-${user.id.slice(0, 8).toUpperCase()}`, phone].filter(Boolean).join(' • ')}
        hero={
          <HeroStats>
            <HeroStat href="/patient/appointments" value={upcoming.length} label="Upcoming visits" />
            <HeroStat href="#labs" value={reportsSent} label="Lab reports" />
            <HeroStat href="#records" value={records} label="Prescriptions" />
          </HeroStats>
        }
      />
      <main className="w-full bg-background min-h-[calc(100vh-5rem)] pb-12 md:pb-16">
        <div className="relative w-full overflow-hidden">
          <div className="w-full px-margin-x-mobile lg:px-margin-x-desktop pb-16 pt-5 md:pt-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1440px] mx-auto">
              <PatientSidebar 
                user={user} 
                profile={profile} 
                patientDetails={details} 
                activeAppointmentsCount={upcoming.length} 
                initialOpen={Boolean(isSetupMandatory)}
                isMandatory={Boolean(isSetupMandatory)}
              />

              <div className="lg:col-span-8 flex flex-col gap-6">
                <AccountShortcuts />

                {isSetupMandatory && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                        <Phone className="w-5 h-5 text-amber-700" />
                      </span>
                      <div>
                        <h3 className="font-title-sm font-bold text-amber-950 text-base">Mobile Number is Mandatory</h3>
                        <p className="font-body-sm text-xs text-amber-900/80 mt-0.5">
                          Please complete your profile details. A valid phone number is mandatory to receive your appointment booking slips, doctor prescriptions, and live WhatsApp updates.
                        </p>
                      </div>
                    </div>
                    <ProfileEditButton 
                      details={editDetails} 
                      className="px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-label-sm text-xs font-bold shrink-0 transition-colors shadow-sm"
                    >
                      Complete Profile Details
                    </ProfileEditButton>
                  </div>
                )}

                {payment === 'success' && (
                  <Banner tone="teal" icon={CircleCheck}>Payment received. Your booking is confirmed. It&apos;s listed under My Appointments &amp; History with its booking ID.</Banner>
                )}
                {payment === 'failed' && (
                  <Banner tone="coral" icon={CircleAlert}>The payment didn&apos;t go through, so the booking isn&apos;t confirmed yet. You can try again from &ldquo;Awaiting payment&rdquo; below.</Banner>
                )}

                {(admissions.current || admissions.past.length > 0) && (
                  <Section
                    id="admission"
                    icon={BedDouble}
                    title={admissions.current ? 'Current Hospital Admission' : 'Hospital Stays'}
                    subtitle={admissions.current ? 'Your bed and care team, updated by the hospital' : 'Your earlier admissions'}
                    action={<LiveRefresh />}
                  >
                    {admissions.current && (
                      <div className="p-4 rounded-xl bg-primary-fixed/40 border border-vibrant-blue/20 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="flex items-center gap-3 min-w-0">
                            <span className="w-11 h-11 rounded-full bg-vibrant-blue text-on-primary flex items-center justify-center shrink-0">
                              <BedDouble className="w-5 h-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block font-title-md text-[16px] font-bold text-on-surface truncate">
                                {admissions.current.ward} • {admissions.current.bed}
                              </span>
                              <span className="block text-sm text-on-surface-variant truncate">
                                {admissions.current.bedType} bed at {admissions.current.hospital}
                              </span>
                            </span>
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-xs font-bold shrink-0">
                            Day {stayDays(admissions.current.admittedAt, now)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <Tile label="Admitted" value={formatShortDate(admissions.current.admittedAt)} small />
                          <Tile label="Attending doctor" value={admissions.current.doctor?.name ?? null} small />
                          <Tile label="Expected discharge" value={admissions.current.expectedDischarge ? formatShortDate(admissions.current.expectedDischarge) : null} small />
                        </div>
                        {admissions.current.reason && (
                          <p className="flex items-start gap-2 text-sm text-on-surface-variant">
                            <Stethoscope className="w-[18px] h-[18px] text-primary shrink-0" /> {admissions.current.reason}
                          </p>
                        )}
                      </div>
                    )}
                    {admissions.past.length > 0 && (
                      <ul className="flex flex-col gap-2">
                        {admissions.past.slice(0, 4).map((a) => (
                          <li key={a.id} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0">
                              <span className="block font-semibold text-on-surface truncate">{a.hospital}</span>
                              <span className="block text-xs text-on-surface-variant truncate">
                                {a.ward} • {a.bed}
                                {a.doctor ? ` • ${a.doctor.name}` : ''}
                              </span>
                            </span>
                            <span className="text-right text-xs text-on-surface-variant shrink-0">
                              {formatShortDate(a.admittedAt)} – {formatShortDate(a.dischargedAt!)}
                              <span className="block font-semibold text-on-surface">{stayDays(a.admittedAt, a.dischargedAt!)} days</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>
                )}

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
                  {latestVitals?.vitals && (
                    <div className="flex flex-col gap-2">
                      <span className="font-label-sm text-[11px] text-on-surface-variant uppercase px-1">
                        Latest vitals{latestVitals.at ? ` • ${formatShortDate(latestVitals.at)}` : ''}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {vitalsList(latestVitals.vitals).map((v) => (
                          <Tile key={v.label} label={v.label} value={v.value} small accent={v.label === 'BMI' ? 'text-primary' : undefined} />
                        ))}
                      </div>
                    </div>
                  )}
                  {details?.address && (
                    <p className="flex items-start gap-2 px-1 text-sm text-on-surface-variant">
                      <MapPin className="w-[18px] h-[18px] text-outline shrink-0" /> {details.address}
                    </p>
                  )}
                </Section>

                <Section id="records" icon={Pill} title="Prescriptions & Health Records" subtitle="Prescription PDFs from your doctors and health details recorded at the hospital">
                  {history.length === 0 ? (
                    <Empty>
                      Nothing here yet. Prescriptions appear after your consultation, and health details when the hospital records them.
                    </Empty>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {history.slice(0, 8).map((h) => {
                        const health = h.kind === 'health'
                        return (
                          <li key={h.id} className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <span className="flex items-center gap-3 min-w-0">
                                <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${health ? 'bg-soft-coral/10 text-soft-coral' : 'bg-primary/10 text-primary'}`}>
                                  {health ? <HeartPulse className="w-5 h-5" /> : <Pill className="w-5 h-5" />}
                                </span>
                                <span className="min-w-0">
                                  <span className="block font-title-md text-[15px] text-on-surface truncate">
                                    {health ? `Health record${h.hospital ? ` • ${h.hospital}` : ''}` : `Prescription${h.doctor ? ` • ${doctorName(h.doctor.name)}` : ''}`}
                                  </span>
                                  <span className="block text-xs text-on-surface-variant truncate">
                                    {[h.at ? formatShortDate(h.at) : null, health ? null : h.doctor?.specialty, `ID ${bookingId(h.visitId)}`].filter(Boolean).join(' • ')}
                                  </span>
                                </span>
                              </span>
                              {h.file && (
                                <a href={h.file} target="_blank" rel="noreferrer" className="px-3.5 py-1.5 rounded-full bg-primary/10 text-primary font-label-sm text-xs hover:bg-primary/15 shrink-0 flex items-center gap-1">
                                  <Download className="w-3.5 h-3.5" /> {health ? 'Document' : 'PDF'}
                                </a>
                              )}
                            </div>
                            {h.vitals && (
                              <div className="flex flex-wrap gap-1.5">
                                {vitalsList(h.vitals).map((v) => (
                                  <span key={v.label} className="px-2.5 py-1 rounded-full bg-surface-container-lowest text-[12px] text-on-surface">
                                    <span className="text-on-surface-variant">{v.label}:</span> <span className="font-semibold">{v.value}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            {h.notes && <p className="text-sm text-on-surface-variant line-clamp-3">{h.notes}</p>}
                          </li>
                        )
                      })}
                    </ul>
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
                  subtitle="Booking fees paid online through PayU"
                  action={
                    payments.length ? (
                      <span className="px-2.5 py-1 rounded-full bg-fresh-teal/10 text-secondary font-label-sm text-xs font-semibold shrink-0">{formatINR(totalPaid)} paid online</span>
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
                              {[p.created_at ? formatShortDate(p.created_at) : null, p.gateway === 'payu' ? 'Booking fee, paid online' : p.gateway ? 'Booked at the desk' : null].filter(Boolean).join(' • ')}
                            </span>
                          </span>
                          {p.gateway === 'payu' ? (
                            <span className="font-title-md text-[15px] font-bold text-on-surface shrink-0">{formatINR(Number(p.amount) || 0)}</span>
                          ) : (
                            <span className="text-xs text-on-surface-variant shrink-0">Paid at the counter</span>
                          )}
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

      <PatientFooter isSignedIn />
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

