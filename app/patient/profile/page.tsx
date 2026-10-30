import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BedDouble, Building2, ChevronRight, CircleAlert, CircleCheck, CircleHelp, Download, FileText, FlaskConical, HeartPulse, LogOut,
  MapPin, Phone, Pill, Receipt, Settings, ShieldCheck, SquarePen, Stethoscope, type LucideIcon,
} from 'lucide-react'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PatientDock } from '@/components/PatientDock'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { ProfileEditButton } from '@/components/patient/ProfileEditButton'
import { DeskTitle, PageBody, btnOutline, card } from '@/components/patient/app-ui'
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
  blue: 'bg-[#EEF3FF] text-[#2A4DD0]',
  teal: 'bg-[#ECFDF3] text-[#067647]',
  coral: 'bg-[#FEF3F2] text-[#B42318]',
  neutral: 'bg-[#F2F4F7] text-[#475467]',
}

const bookingId = (id: string) => id.slice(0, 8).toUpperCase()

/** "+91 ••••• ••210": enough to recognise the number without showing it all. */
function maskPhone(phone: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.length < 6) return phone
  const local = digits.slice(-10)
  return `${digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : ''}••••• ••${local.slice(-3)}`
}

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

  const uhid = `CYD-${user.id.slice(0, 8).toUpperCase()}`
  const masked = maskPhone(phone)
  const vitals = latestVitals?.vitals ? vitalsList(latestVitals.vitals) : []
  const memberSince = typeof profile?.created_at === 'string' ? new Date(profile.created_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', month: 'short', year: 'numeric' }) : null
  const editButton = 'flex-none inline-flex items-center gap-[5px] h-8 px-2.5 rounded-[9px] border-[1.5px] border-[#D6DDE8] bg-white text-[12.5px] font-extrabold text-[#27324A] hover:bg-[#F4F6FA] transition-colors'

  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen">
      <PatientNavHeader
        name={name}
        email={email}
        isSignedIn
        container="max-w-[900px] px-4 md:px-6"
        eyebrow="My profile"
        title={name}
        subtitle={[`UHID ${uhid}`, masked].filter(Boolean).join(' · ')}
        deskHidden
      />
      <PageBody>
        <div className="max-w-[900px] lg:max-w-none mx-auto lg:mx-0">
          <DeskTitle
            title="Profile & records"
            subtitle="Shared only with the doctors, hospitals and labs you book."
            actions={
              <ProfileEditButton details={editDetails} className={btnOutline}>
                <SquarePen className="w-[15px] h-[15px]" /> Edit details
              </ProfileEditButton>
            }
          />

          <nav aria-label="Your account" className="lg:hidden grid grid-cols-5 gap-1 pt-[18px] px-4 md:px-6">
            <QuickLink href="#records" icon={Pill} label="Records" />
            <QuickLink href="#labs" icon={FlaskConical} label="Reports" />
            <QuickLink href="#payments" icon={Receipt} label="Payments" />
            <QuickLink href="/patient/preferences" icon={Settings} label="Settings" />
            <QuickLink href="/patient/support" icon={CircleHelp} label="Help" />
          </nav>

          <div className="flex flex-col gap-3 px-4 md:px-6 lg:px-0 pt-4 lg:pt-0 empty:hidden lg:mb-5">
            {isSetupMandatory && (
              <div className="p-3.5 rounded-2xl bg-[#FFFAEB] shadow-[0_0_0_1px_#FEDF89] flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <span className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="shrink-0 w-10 h-10 rounded-full bg-white shadow-[0_0_0_1px_#FEDF89] flex items-center justify-center text-[#B54708]">
                    <Phone className="w-[18px] h-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-extrabold text-[#7A2E0E]">Add your mobile number</span>
                    <span className="block text-[12.5px] leading-snug text-[#93370D]">It is needed for booking slips, prescriptions and WhatsApp updates about your visits.</span>
                  </span>
                </span>
                <ProfileEditButton details={editDetails} initialOpen className="shrink-0 h-10 px-4 rounded-[11px] bg-[#B54708] hover:bg-[#93370D] text-white text-[13px] font-extrabold transition-colors">
                  Complete profile
                </ProfileEditButton>
              </div>
            )}
            {payment === 'success' && (
              <Banner tone="teal" icon={CircleCheck}>Payment received. Your booking is confirmed and listed under My bookings with its booking ID.</Banner>
            )}
            {payment === 'failed' && (
              <Banner tone="coral" icon={CircleAlert}>The payment didn&apos;t go through, so the booking isn&apos;t confirmed yet. You can try again from Payments below.</Banner>
            )}
          </div>

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-5 lg:items-start">
            <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0 px-4 md:px-6 lg:px-0 pt-1 lg:pt-0">
              <div className={`hidden lg:flex items-center gap-[18px] p-[22px] ${card}`}>
                <span className="shrink-0 w-[68px] h-[68px] rounded-full shadow-[inset_0_0_0_1.5px_#D6DDE8] text-[#2A4DD0] flex items-center justify-center text-[22px] font-extrabold">{initials(name)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[22px] font-extrabold truncate">{name}</span>
                  <span className="block text-[13.5px] text-[#5B667A] truncate">{[`UHID ${uhid}`, masked, email].filter(Boolean).join(' · ')}</span>
                </span>
                {memberSince && (
                  <span className="shrink-0 text-right">
                    <span className="block text-[12px] font-bold text-[#5B667A]">Member since</span>
                    <span className="text-[14px] font-extrabold">{memberSince}</span>
                  </span>
                )}
              </div>

              {(admissions.current || admissions.past.length > 0) && (
                <Panel id="admission" title={admissions.current ? 'Current hospital admission' : 'Hospital stays'} sub={admissions.current ? 'Your bed and care team, updated by the hospital' : 'Your earlier admissions'} action={<LiveRefresh />}>
                  {admissions.current && (
                    <div className="p-3.5 rounded-[14px] bg-[#EEF3FF] flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="shrink-0 w-11 h-11 rounded-full bg-[#2A4DD0] text-white flex items-center justify-center">
                            <BedDouble className="w-5 h-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-extrabold truncate">
                              {admissions.current.ward} · {admissions.current.bed}
                            </span>
                            <span className="block text-[12.5px] text-[#4A5878] truncate">
                              {admissions.current.bedType} bed at {admissions.current.hospital}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#2A4DD0] text-white text-[12px] font-extrabold">Day {stayDays(admissions.current.admittedAt, now)}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4">
                        <Field label="Admitted" value={formatShortDate(admissions.current.admittedAt)} />
                        <Field label="Attending doctor" value={admissions.current.doctor?.name ?? null} />
                        <Field label="Expected discharge" value={admissions.current.expectedDischarge ? formatShortDate(admissions.current.expectedDischarge) : null} />
                      </div>
                      {admissions.current.reason && (
                        <p className="flex items-start gap-2 text-[13px] text-[#4A5878]">
                          <Stethoscope className="w-[17px] h-[17px] text-[#2A4DD0] shrink-0" /> {admissions.current.reason}
                        </p>
                      )}
                    </div>
                  )}
                  {admissions.past.slice(0, 4).map((a) => (
                    <Row
                      key={a.id}
                      title={a.hospital}
                      sub={[a.ward, a.bed, a.doctor?.name].filter(Boolean).join(' · ')}
                      end={
                        <span className="text-right text-[12px] text-[#5B667A]">
                          {formatShortDate(a.admittedAt)} – {formatShortDate(a.dischargedAt!)}
                          <span className="block font-extrabold text-[#0B1B3F]">{stayDays(a.admittedAt, a.dischargedAt!)} days</span>
                        </span>
                      }
                    />
                  ))}
                </Panel>
              )}

              <Panel
                id="personal"
                title="Personal & medical details"
                sub="Shared only with the doctors and labs you book"
                action={
                  <ProfileEditButton details={editDetails} className={`${editButton} lg:hidden`}>
                    <SquarePen className="w-3.5 h-3.5" /> Edit
                  </ProfileEditButton>
                }
              >
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 lg:gap-x-6">
                  <Field label="Blood group" value={details?.blood_group} accent="text-[#B42318]" />
                  <Field label="Age" value={age != null ? `${age} yrs` : null} />
                  <Field label="Sex" value={details?.gender} />
                  <Field label="Date of birth" value={details?.date_of_birth ? formatShortDate(details.date_of_birth) : null} />
                  <Field
                    label="Emergency contact"
                    value={
                      details?.emergency_contact_name
                        ? `${details.emergency_contact_name}${details.emergency_contact_relation ? ` (${details.emergency_contact_relation})` : ''}${details.emergency_contact_phone ? ` · ${details.emergency_contact_phone}` : ''}`
                        : null
                    }
                    wide
                  />
                </div>
                {details?.address && (
                  <p className="flex items-start gap-2 pt-3 text-[13px] text-[#4A5878]">
                    <MapPin className="w-4 h-4 text-[#7A8599] shrink-0 mt-px" /> {details.address}
                  </p>
                )}
              </Panel>

              <Panel id="vitals" title="Latest vitals" action={latestVitals?.at ? <span className="shrink-0 text-[12px] text-[#5B667A]">Recorded {formatShortDate(latestVitals.at)}</span> : undefined}>
                {vitals.length === 0 ? (
                  <p className="py-2.5 border-t border-[#EEF2F7] text-[13px] text-[#5B667A] leading-relaxed">Your doctor records your blood pressure, pulse and other vitals at your visit; they show here afterwards.</p>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5">
                    {vitals.map((v) => (
                      <div key={v.label} className="py-2.5 border-b lg:border-b-0 lg:border-t border-[#EEF2F7]">
                        <span className="block text-[11.5px] lg:text-[12px] font-bold text-[#5B667A]">{v.label}</span>
                        <span className="block text-[15px] lg:text-[16px] font-extrabold">{v.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel id="records" title="Prescriptions & health records" sub="Prescription PDFs from your doctors and health details recorded at the hospital">
                {history.length === 0 ? (
                  <Empty>Nothing here yet. Prescriptions appear after your consultation, and health details when the hospital records them.</Empty>
                ) : (
                  history.slice(0, 8).map((h) => {
                    const health = h.kind === 'health'
                    return (
                      <div key={h.id} className="py-3 border-t border-[#EEF2F7]">
                        <div className="flex items-center gap-3">
                          <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${health ? 'bg-[#FEF3F2] text-[#B42318]' : 'bg-[#EEF3FF] text-[#2A4DD0]'}`}>
                            {health ? <HeartPulse className="w-5 h-5" /> : <Pill className="w-5 h-5" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14px] font-extrabold truncate">
                              {health ? `Health record${h.hospital ? ` · ${h.hospital}` : ''}` : `Prescription${h.doctor ? ` · ${doctorName(h.doctor.name)}` : ''}`}
                            </span>
                            <span className="block text-[12px] text-[#5B667A] truncate">
                              {[h.at ? formatShortDate(h.at) : null, health ? null : h.doctor?.specialty, `ID ${bookingId(h.visitId)}`].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          {h.file && (
                            <a href={h.file} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
                              <Download className="w-3.5 h-3.5" /> {health ? 'Document' : 'PDF'}
                            </a>
                          )}
                        </div>
                        {h.vitals && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pl-[52px]">
                            {vitalsList(h.vitals).map((v) => (
                              <span key={v.label} className="px-2 py-[3px] rounded-full bg-[#F4F6FA] text-[11.5px]">
                                <span className="text-[#5B667A]">{v.label}:</span> <span className="font-bold">{v.value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {h.notes && <p className="mt-1.5 pl-[52px] text-[12.5px] text-[#4A5878] line-clamp-3">{h.notes}</p>}
                      </div>
                    )
                  })
                )}
              </Panel>
            </div>

            <div className="flex flex-col gap-3.5 lg:gap-5 px-4 md:px-6 lg:px-0 pt-3.5 lg:pt-0">
              <Panel id="labs" title="Lab tests & reports" sub="Reports appear here as soon as the lab uploads them">
                {labBookings.length === 0 ? (
                  <Empty>
                    No lab tests booked yet.{' '}
                    <Link href="/diagnostics" className="font-extrabold text-[#2A4DD0] hover:underline">
                      Find a lab
                    </Link>{' '}
                    to book one.
                  </Empty>
                ) : (
                  labBookings.slice(0, 6).map((b) => (
                    <Row
                      key={b.id}
                      icon={FlaskConical}
                      title={<span className="capitalize">{b.tests}</span>}
                      sub={[b.center?.name, b.date ? formatShortDate(`${b.date}T12:00:00+05:30`) : null, `ID ${bookingId(b.id)}`].filter(Boolean).join(' · ')}
                      end={
                        b.status === 'pending_payment' ? (
                          <Link href={`/patient/checkout/diagnostic/${b.id}`} className="text-[12.5px] font-extrabold text-[#B42318] hover:underline">
                            Pay now
                          </Link>
                        ) : reportLinks[b.id] ? (
                          <a href={reportLinks[b.id]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
                            <FileText className="w-3.5 h-3.5" /> Report
                          </a>
                        ) : (
                          <StatusChip status={LAB_STATUS[b.status]} />
                        )
                      }
                    />
                  ))
                )}
              </Panel>

              <Panel
                id="payments"
                title="Payments"
                sub="Booking fees paid online through PayU"
                action={payments.length ? <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#ECFDF3] text-[#067647] text-[12px] font-extrabold">{formatINR(totalPaid)} paid</span> : undefined}
              >
                {awaitingPayment.length > 0 && (
                  <div className="mb-2 p-3 rounded-xl bg-[#FEF3F2] shadow-[0_0_0_1px_#FBD5D1] flex flex-col gap-1.5">
                    <span className="text-[12.5px] font-extrabold text-[#912018]">Awaiting payment ({awaitingPayment.length})</span>
                    {awaitingPayment.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="truncate capitalize text-[#27324A]">{p.label}</span>
                        <Link href={p.href} className="shrink-0 font-extrabold text-[#B42318] hover:underline">
                          Pay now
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
                {payments.length === 0 ? (
                  <Empty>No payments yet.</Empty>
                ) : (
                  payments.slice(0, 5).map((p, i) => (
                    <div key={`${p.booking_id}-${i}`} className="flex justify-between gap-3 py-[11px] border-t border-[#EEF2F7] text-[13.5px]">
                      <span className="min-w-0">
                        <span className="block text-[#27324A] truncate capitalize">{describePayment(p.booking_id)}</span>
                        <span className="block text-[12px] text-[#5B667A]">
                          {[p.created_at ? formatShortDate(p.created_at) : null, p.gateway === 'payu' ? 'Paid online' : p.gateway ? 'Booked at the desk' : null].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      {p.gateway === 'payu' ? (
                        <span className="shrink-0 font-extrabold">{formatINR(Number(p.amount) || 0)}</span>
                      ) : (
                        <span className="shrink-0 text-[12px] text-[#5B667A]">Paid at the counter</span>
                      )}
                    </div>
                  ))
                )}
              </Panel>

              <Panel
                id="care-team"
                title="My doctors & labs"
                sub="From your bookings, for quick re-booking"
                action={
                  <Link href="/find" className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
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
                      <div key={c.href} className="flex items-center gap-3 py-[11px] border-t border-[#EEF2F7]">
                        <span className="shrink-0 w-10 h-10 rounded-full shadow-[inset_0_0_0_1.5px_#D6DDE8] text-[#2A4DD0] flex items-center justify-center text-[13px] font-extrabold">
                          {c.kind === 'lab' ? <Building2 className="w-[18px] h-[18px]" /> : initials(c.name)}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] font-extrabold truncate">{c.name}</span>
                          <span className="block text-[12px] text-[#5B667A] truncate">{c.sub}</span>
                        </span>
                        <Link href={c.href} className="shrink-0 h-8 px-3 rounded-[9px] border-[1.5px] border-[#D6DDE8] text-[12.5px] font-extrabold text-[#27324A] flex items-center hover:bg-[#F4F6FA] transition-colors">
                          Book again
                        </Link>
                      </div>
                    ))
                )}
              </Panel>

              <section aria-label="More" className="lg:hidden rounded-[20px] bg-white shadow-[0_0_0_1px_#E6EBF3] overflow-hidden">
                <MenuRow href="#records" icon={FileText} label="Prescriptions & reports" />
                <MenuRow href="#payments" icon={Receipt} label="Payment history" />
                <MenuRow href="/legal" icon={ShieldCheck} label="Privacy & consent" />
                <form action="/auth/signout" method="post">
                  <button type="submit" className="w-full flex items-center gap-3 min-h-[52px] px-4 text-[14px] font-extrabold text-[#B42318] text-left">
                    <LogOut className="w-[19px] h-[19px]" />
                    Log out
                  </button>
                </form>
              </section>
            </div>
          </div>
        </div>
      </PageBody>

      <PatientDock activeTab="profile" name={name} detail={`UHID ${uhid}`} />
    </div>
  )
}

function Banner({ tone, icon: Icon, children }: { tone: 'teal' | 'coral'; icon: LucideIcon; children: ReactNode }) {
  return (
    <div role="status" className={`p-3.5 rounded-2xl flex items-start gap-3 text-[13px] font-bold ${tone === 'teal' ? 'bg-[#ECFDF3] text-[#067647] shadow-[0_0_0_1px_#ABEFC6]' : 'bg-[#FEF3F2] text-[#B42318] shadow-[0_0_0_1px_#FBD5D1]'}`}>
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span>{children}</span>
    </div>
  )
}

/** A white card with a title, an optional line under it and an action on the right. */
function Panel({ id, title, sub, action, children }: { id: string; title: string; sub?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-24 lg:scroll-mt-[96px] p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl!`}>
      <div className="flex items-start gap-3 mb-1.5 lg:mb-3">
        <span className="flex-1 min-w-0">
          <h2 id={`${id}-title`} className="text-[16px] font-extrabold tracking-[-0.01em]">{title}</h2>
          {sub && <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">{sub}</p>}
        </span>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A detail: a small grey label and the value, or "Not added". */
function Field({ label, value, accent, wide }: { label: string; value: string | null | undefined; accent?: string; wide?: boolean }) {
  return (
    <div className={`py-2.5 border-b lg:border-b-0 lg:border-t border-[#EEF2F7] ${wide ? 'col-span-2 lg:col-span-3' : ''}`}>
      <span className="block text-[11px] lg:text-[12px] font-bold uppercase lg:normal-case tracking-[0.02em] lg:tracking-normal text-[#5B667A]">{label}</span>
      {value ? (
        <span className={`block mt-[3px] lg:mt-0.5 text-[14.5px] lg:text-[15px] font-extrabold ${accent ?? ''}`}>{value}</span>
      ) : (
        <span className="block mt-[3px] lg:mt-0.5 text-[14.5px] font-semibold text-[#8A94A6]">Not added</span>
      )}
    </div>
  )
}

/** A list row: an optional icon, a title and a line, and something on the right. */
function Row({ icon: Icon, title, sub, end }: { icon?: LucideIcon; title: ReactNode; sub: string; end?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-[11px] border-t border-[#EEF2F7]">
      {Icon && (
        <span className="shrink-0 w-10 h-10 rounded-xl bg-[#F4F6FA] text-[#27324A] flex items-center justify-center">
          <Icon className="w-[18px] h-[18px]" />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-extrabold truncate">{title}</span>
        <span className="block text-[12px] text-[#5B667A] truncate">{sub}</span>
      </span>
      {end && <span className="shrink-0">{end}</span>}
    </div>
  )
}

function StatusChip({ status }: { status: { label: string; tone: Tone } | undefined }) {
  if (!status) return null
  return <span className={`px-2.5 py-1 rounded-full text-[11.5px] font-extrabold ${TONES[status.tone]}`}>{status.label}</span>
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-3 border-t border-[#EEF2F7] text-[13px] text-[#5B667A] leading-relaxed">{children}</p>
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5 text-[11.5px] font-bold text-[#27324A]">
      <span className="w-[52px] h-[52px] rounded-2xl bg-white shadow-[inset_0_0_0_1px_#E1E7F0] flex items-center justify-center text-[#2A4DD0]">
        <Icon className="w-[22px] h-[22px]" />
      </span>
      {label}
    </Link>
  )
}

function MenuRow({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 min-h-[52px] px-4 border-b border-[#EEF2F7] text-[14px] font-bold">
      <Icon className="w-[19px] h-[19px] text-[#4A5878]" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="w-4 h-4 text-[#9AA4B5]" strokeWidth={2.4} />
    </Link>
  )
}
