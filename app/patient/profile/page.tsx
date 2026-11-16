import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BedDouble, Bookmark, ChevronRight, CircleAlert, CircleCheck, CircleHelp, FileText, HeartPulse, LogOut, MapPin, Phone, Receipt, Settings, ShieldCheck, SquarePen,
  Stethoscope, UserPlus, Users, type LucideIcon,
} from 'lucide-react'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PatientDock } from '@/components/PatientDock'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { ProfileEditButton } from '@/components/patient/ProfileEditButton'
import { DeskTitle, PageBody, btnOutline, card } from '@/components/patient/app-ui'
import { currentTime, one } from '@/components/patient/data'
import { ageFrom, doctorName, formatINR, formatShortDate, initials, istDateKey, maskPhone } from '@/components/patient/format'
import { InsuranceCard } from '@/components/patient/InsuranceCard'
import { MY_HEALTH } from '@/components/patient/my-health'
import { MedicalDetailsButton } from '@/components/patient/health/medical'
import { knownInsurers, loadInsurance } from '@/lib/insurance'
import { matchBookedTests } from '@/lib/pricing'
import { parseVitals, showHR, showSpO2 } from '@/lib/vitals'
import { loadPatientAdmissions, stayDays } from '@/lib/beds'
import { loadFamily, RELATIONS } from '@/lib/patient-health'
import { LiveRefresh } from '@/components/portal/LiveRefresh'
import { isOnlineGateway } from '@/lib/payment-gateways'

export const metadata: Metadata = { title: 'Profile & insurance' }

type Joined<T> = T | T[] | null

type AppointmentRow = {
  id: string
  status: string
  created_at: string
  doctors: Joined<{ id: string; specialty: string | null; profiles: Joined<{ full_name: string | null }> }>
  schedules: Joined<{ start_time: string }>
  medical_records: { id: string; notes: string | null }[] | null
}

type LabRow = {
  id: string
  status: string
  test_name: string | null
  diagnostic_centers: Joined<{ id: string; name: string; test_prices: Record<string, number> | null }>
}

type PaymentRow = { appointment_id: string | null; diagnostic_booking_id?: string | null; amount: number | string; gateway: string | null; status: string; created_at?: string | null }
type Payment = PaymentRow & { booking_id: string }

/** The sub-lines under each My health row on phones. */
const MY_HEALTH_SUB: Record<string, string> = {
  insurance: 'Policy card, partner hospitals and your claim tracker',
  records: 'Prescriptions, lab reports and your files',
  family: 'Book visits and tests for your family',
  reminders: "Today's medicines and follow-ups",
  checkups: 'Lab test packages from partner labs',
  reviews: 'Rate your visits and see your reviews',
  emergency: 'Call 108, nearest hospitals and medical ID',
}


/** Profile & insurance: who the patient is, their medical details, vitals over time, family, insurance card and payments. */
export default async function PatientProfilePage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = (await props.searchParams) ?? {}
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login/patient?next=/patient/profile')

  const now = currentTime()
  const admin = createAdminClient()
  const [{ data: profile }, { data: details }, { data: appts }, { data: labs }] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('patient_details').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('appointments')
      .select(`
        id, status, created_at,
        doctors ( id, specialty, profiles!doctors_profile_id_fkey ( full_name ) ),
        schedules ( start_time ),
        medical_records ( id, notes )
      `)
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('diagnostic_bookings').select('id, status, test_name, diagnostic_centers ( id, name, test_prices )').eq('patient_id', user.id).order('created_at', { ascending: false }),
  ])

  const visits = ((appts ?? []) as AppointmentRow[]).map((a) => {
    const doctor = one(a.doctors)
    return {
      id: a.id,
      status: a.status,
      at: one(a.schedules)?.start_time ?? null,
      doctor: doctor ? { id: doctor.id, name: one(doctor.profiles)?.full_name ?? null, specialty: doctor.specialty } : null,
      records: a.medical_records ?? [],
    }
  })
  const labBookings = ((labs ?? []) as LabRow[]).map((b) => {
    const center = one(b.diagnostic_centers)
    const tests = matchBookedTests(b.test_name || '', center?.test_prices)
    return { id: b.id, status: b.status, tests: tests ? tests.map((t) => t.name).join(', ') : (b.test_name || 'Lab test').replace(/-/g, ' ') }
  })

  // Payments are keyed by the booking they settle; the ids come from this patient's own bookings.
  const visitIds = visits.map((v) => v.id)
  const labIds = labBookings.map((b) => b.id)
  const [visitPayments, labPayments, admissions, insurance, insurers, family] = await Promise.all([
    visitIds.length > 0 ? admin.from('payments').select('*').in('appointment_id', visitIds).eq('status', 'success') : Promise.resolve({ data: [] as PaymentRow[] }),
    labIds.length > 0 ? admin.from('payments').select('*').in('diagnostic_booking_id', labIds).eq('status', 'success') : Promise.resolve({ data: [] as PaymentRow[] }),
    // The patient's own hospital stays: the bed the hospital has given them now, and earlier ones.
    loadPatientAdmissions(admin, user.id),
    // Their health insurance card, and the insurers partner hospitals list (suggested when adding one).
    loadInsurance(admin, user.id),
    knownInsurers(admin),
    loadFamily(admin, user.id),
  ])
  const payments: Payment[] = [...((visitPayments.data ?? []) as PaymentRow[]), ...((labPayments.data ?? []) as PaymentRow[])]
    .map((p) => ({ ...p, booking_id: (p.appointment_id ?? p.diagnostic_booking_id) as string }))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  // Vitals the doctors recorded, oldest to newest, for the trend.
  const vitalsHistory = visits
    .flatMap((v) => v.records.map((r) => ({ at: v.at, vitals: parseVitals(r.notes) })))
    .filter((h): h is { at: string | null; vitals: NonNullable<ReturnType<typeof parseVitals>> } => !!h.vitals)
    .sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
  const latestVitals = vitalsHistory[vitalsHistory.length - 1] ?? null
  const bpTrend = vitalsHistory
    .map((h) => {
      const m = /(\d{2,3})\s*\/\s*(\d{2,3})/.exec(h.vitals.bp ?? '')
      return m ? { at: h.at, sys: Number(m[1]), dia: Number(m[2]) } : null
    })
    .filter((x): x is { at: string | null; sys: number; dia: number } => !!x)
    .slice(-6)

  const awaitingPayment = [
    ...visits.filter((v) => v.status === 'pending_payment' && (!v.at || Date.parse(v.at) > now)).map((v) => ({ id: v.id, href: `/patient/checkout/${v.id}`, label: v.doctor ? doctorName(v.doctor.name) : 'Consultation' })),
    ...labBookings.filter((b) => b.status === 'pending_payment').map((b) => ({ id: b.id, href: `/patient/checkout/diagnostic/${b.id}`, label: b.tests })),
  ]
  // Online payments are booking fees. A desk payment is what the hospital or lab counter took (the consultation fee or test
  // charges), which booking screens never show, so it is listed without its amount.
  const describePayment = (id: string) => {
    const visit = visits.find((v) => v.id === id)
    if (visit) return `Booking · ${visit.doctor ? doctorName(visit.doctor.name) : 'Doctor'}`
    const lab = labBookings.find((b) => b.id === id)
    return lab ? `Lab booking · ${lab.tests}` : 'Booking'
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
  const medical = {
    bloodGroup: details?.blood_group ?? null,
    allergies: details?.allergies ?? null,
    conditions: details?.conditions ?? null,
    currentMedicines: details?.current_medicines ?? null,
    heightCm: details?.height_cm != null ? Number(details.height_cm) : null,
  }
  // The 20261116 columns (allergies, conditions, medicines, height) exist once the migration has run.
  const medicalReady = !details || 'allergies' in details
  const payment = typeof searchParams.payment === 'string' ? searchParams.payment : null
  const isSetupMandatory = searchParams.setup === 'mandatory' || !profile?.phone_number

  const uhid = `CYD-${user.id.slice(0, 8).toUpperCase()}`
  const masked = phone ? maskPhone(phone) : null
  const memberSince = typeof profile?.created_at === 'string' ? new Date(profile.created_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', month: 'short', year: 'numeric' }) : null
  const editButton = 'flex-none inline-flex items-center gap-[5px] h-8 px-2.5 rounded-[9px] border-[1.5px] border-[#D6DDE8] bg-white text-[12.5px] font-extrabold text-[#27324A] hover:bg-[#F4F6FA] transition-colors'
  const emergency = details?.emergency_contact_name
    ? [details.emergency_contact_name, details.emergency_contact_relation ? `(${details.emergency_contact_relation})` : null, details.emergency_contact_phone ? `· ${maskPhone(details.emergency_contact_phone)}` : null].filter(Boolean).join(' ')
    : null

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
            title="Profile & insurance"
            subtitle="Shared only with the doctors, hospitals and labs you book."
            actions={
              <ProfileEditButton details={editDetails} className={btnOutline}>
                <SquarePen className="w-[15px] h-[15px]" /> Edit details
              </ProfileEditButton>
            }
          />

          {/* Phones: quick links; the My health pages are listed further down, and desktops have them in the sidebar. */}
          <nav aria-label="Quick links" className="lg:hidden grid grid-cols-5 gap-1 pt-[18px] px-4 md:px-6">
            <QuickLink href="/patient/family" icon={Users} label="Family" />
            <QuickLink href="/patient/insurance" icon={ShieldCheck} label="Insurance" />
            <QuickLink href="/patient/saved" icon={Bookmark} label="Saved" />
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
            {payment === 'success' && <Banner tone="teal" icon={CircleCheck}>Payment received. Your booking is confirmed and listed under My bookings with its booking ID.</Banner>}
            {payment === 'failed' && <Banner tone="coral" icon={CircleAlert}>The payment didn&apos;t go through, so the booking isn&apos;t confirmed yet. You can pay it from My bookings.</Banner>}
          </div>

          <div className="flex flex-col gap-3.5 px-4 md:px-6 lg:px-0 pt-1 lg:pt-0 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-5 lg:items-start">
            <div className="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0">
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
                <Panel id="admission" className="order-1 lg:order-none" title={admissions.current ? 'Current hospital admission' : 'Hospital stays'} sub={admissions.current ? 'Your bed and care team, updated by the hospital' : 'Your earlier admissions'} action={<LiveRefresh />}>
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
                    <div key={a.id} className="flex items-center gap-3 py-[11px] border-t border-[#EEF2F7]">
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-extrabold truncate">{a.hospital}</span>
                        <span className="block text-[12px] text-[#5B667A] truncate">{[a.ward, a.bed, a.doctor?.name].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className="shrink-0 text-right text-[12px] text-[#5B667A]">
                        {formatShortDate(a.admittedAt)} – {formatShortDate(a.dischargedAt!)}
                        <span className="block font-extrabold text-[#0B1B3F]">{stayDays(a.admittedAt, a.dischargedAt!)} days</span>
                      </span>
                    </div>
                  ))}
                </Panel>
              )}

              <Panel
                id="medical"
                className="order-2 lg:order-none"
                title="Personal & medical details"
                sub="Shared only with the doctors, hospitals and labs you book"
                action={
                  <span className="flex gap-2">
                    <ProfileEditButton details={editDetails} className={`${editButton} lg:hidden`}>
                      <SquarePen className="w-3.5 h-3.5" /> Edit
                    </ProfileEditButton>
                    <MedicalDetailsButton details={medical} ready={medicalReady} className={editButton}>
                      <HeartPulse className="w-3.5 h-3.5" /> Medical
                    </MedicalDetailsButton>
                  </span>
                }
              >
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 lg:gap-x-6">
                  <Field label="Blood group" value={details?.blood_group} accent="text-[#B42318]" />
                  <Field label="Age" value={age != null ? `${age} yrs` : null} />
                  <Field label="Sex" value={details?.gender} />
                  <Field label="Date of birth" value={details?.date_of_birth ? formatShortDate(details.date_of_birth) : null} />
                  <Field label="Allergies" value={medical.allergies} accent="text-[#B42318]" />
                  <Field label="Height" value={medical.heightCm != null ? `${medical.heightCm} cm` : null} />
                  <Field label="Conditions" value={medical.conditions} />
                  <Field label="Medicines" value={medical.currentMedicines} />
                  <Field label="Emergency contact" value={emergency} />
                </div>
                {details?.address && (
                  <p className="flex items-start gap-2 pt-3 text-[13px] text-[#4A5878]">
                    <MapPin className="w-4 h-4 text-[#7A8599] shrink-0 mt-px" /> {details.address}
                  </p>
                )}
              </Panel>

              <Panel
                id="vitals"
                className="order-4 lg:order-none"
                title={<><span className="lg:hidden">Latest vitals</span><span className="hidden lg:inline">Vitals trend</span></>}
                sub={bpTrend.length ? <span className="hidden lg:inline">{`Blood pressure, last ${bpTrend.length} ${bpTrend.length === 1 ? 'visit' : 'visits'}`}</span> : undefined}
                action={latestVitals?.at ? <span className="shrink-0 text-[12px] text-[#5B667A]"><span className="lg:hidden">Updated</span><span className="hidden lg:inline">Latest</span> {formatShortDate(latestVitals.at)}</span> : undefined}
              >
                {!latestVitals ? (
                  <p className="py-2.5 border-t border-[#EEF2F7] text-[13px] text-[#5B667A] leading-relaxed">Your doctor records your blood pressure, pulse and other vitals at your visit; they show here afterwards.</p>
                ) : (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_200px] items-end">
                    {bpTrend.length > 0 ? (
                      <div className="hidden lg:flex items-end gap-3 h-[150px] pt-2 border-b border-[#EEF2F7]" role="img" aria-label={`Blood pressure readings: ${bpTrend.map((b) => `${b.sys}/${b.dia}`).join(', ')}`}>
                        {bpTrend.map((b, i) => (
                          <div key={i} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1">
                            <span className="text-[10.5px] font-extrabold tabular-nums text-[#27324A]">{b.sys}/{b.dia}</span>
                            <span className="relative w-full max-w-[34px] rounded-t-md bg-[#DCE6FF]" style={{ height: `${Math.min(100, (b.sys / 200) * 100)}%` }}>
                              <span className="absolute inset-x-0 bottom-0 rounded-t-md bg-[#2A4DD0]" style={{ height: `${Math.min(100, (b.dia / b.sys) * 100)}%` }} />
                            </span>
                            <span className="pb-1 text-[10.5px] text-[#8A94A6] whitespace-nowrap">{b.at ? formatShortDate(b.at).replace(/ \d{4}$/, '') : '–'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="hidden lg:block text-[13px] text-[#5B667A]">No blood pressure readings yet.</p>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 lg:flex lg:flex-col">
                      <Field label="Blood pressure" value={latestVitals.vitals.bp} />
                      <Field label="Pulse" value={latestVitals.vitals.hr ? showHR(latestVitals.vitals.hr) : null} />
                      <Field label="SpO₂" value={latestVitals.vitals.spo2 ? showSpO2(latestVitals.vitals.spo2) : null} />
                    </div>
                  </div>
                )}
                {bpTrend.length > 0 && <p className="hidden lg:block mt-2 text-[11.5px] text-[#8A94A6]">Light bar: top number (systolic). Dark bar: bottom number (diastolic). Ask your doctor what your readings mean.</p>}
              </Panel>

              <Panel
                id="family"
                className="hidden lg:block"
                title="Family members"
                sub="Book for the people you care for"
                action={
                  <Link href="/patient/family" className={editButton}>
                    <UserPlus className="w-3.5 h-3.5" /> {family.members.length ? 'Manage' : 'Add member'}
                  </Link>
                }
              >
                {family.members.length === 0 ? (
                  <p className="py-2.5 border-t border-[#EEF2F7] text-[13px] text-[#5B667A]">Add your family to book visits and lab tests for them from your account.</p>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {family.members.map((m) => {
                      const a = ageFrom(m.dateOfBirth, now)
                      return (
                        <Link key={m.id} href="/patient/family" className="flex items-center gap-3 p-3 rounded-[14px] shadow-[inset_0_0_0_1px_#E6EAF0] hover:bg-[#F7F9FC] transition-colors">
                          <span className="shrink-0 w-10 h-10 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[12.5px] font-extrabold">{initials(m.name)}</span>
                          <span className="min-w-0">
                            <span className="block text-[13.5px] font-extrabold truncate">{m.name}</span>
                            <span className="block text-[12px] text-[#5B667A] truncate">{[RELATIONS[m.relation], a != null ? `${a} yrs` : null].filter(Boolean).join(' · ')}</span>
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </Panel>
            </div>

            <div className="contents lg:flex lg:flex-col lg:gap-5">
              <Panel
                id="insurance"
                className="order-3 lg:order-none"
                title="Health insurance"
                sub="Your digital insurance card"
                action={
                  <Link href="/patient/insurance" className="shrink-0 flex items-center gap-0.5 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
                    Claims & cover <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.6} />
                  </Link>
                }
              >
                <InsuranceCard policy={insurance.policy} patientName={name} ready={insurance.ready} insurers={insurers} today={istDateKey(now)} />
              </Panel>

              <Panel
                id="payments"
                className="hidden lg:block"
                title="Recent payments"
                action={
                  <Link href="/patient/payments" className="shrink-0 flex items-center gap-0.5 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
                    All <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.6} />
                  </Link>
                }
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
                  <p className="py-3 border-t border-[#EEF2F7] text-[13px] text-[#5B667A]">No payments yet.</p>
                ) : (
                  payments.slice(0, 3).map((p, i) => (
                    <div key={`${p.booking_id}-${i}`} className="flex justify-between gap-3 py-[11px] border-t border-[#EEF2F7] text-[13.5px]">
                      <span className="min-w-0 block text-[#27324A] truncate capitalize">{describePayment(p.booking_id)}</span>
                      <span className="shrink-0 text-right">
                        {isOnlineGateway(p.gateway) ? <span className="font-extrabold">{formatINR(Number(p.amount) || 0)}</span> : <span className="text-[12px] text-[#5B667A]">At the counter</span>}
                        {p.created_at && <span className="block text-[11.5px] text-[#8A94A6]">{formatShortDate(p.created_at)}</span>}
                      </span>
                    </div>
                  ))
                )}
              </Panel>

              {/* Phones: the My health pages (desktops have them in the sidebar). */}
              <section aria-labelledby="my-health-title" className="order-5 lg:hidden mt-1.5">
                <h2 id="my-health-title" className="mx-1 mb-2.5 text-[12px] font-extrabold tracking-[0.04em] text-[#5B667A]">MY HEALTH</h2>
                <div className="rounded-[18px] bg-white shadow-[0_0_0_1px_#E6EBF3] overflow-hidden">
                  {MY_HEALTH.map((item) => (
                    <Link key={item.key} href={item.href} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EEF2F7] last:border-b-0">
                      <item.icon className="w-[20px] h-[20px] shrink-0 text-[#2A4DD0]" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14.5px] font-extrabold">{item.label}</span>
                        <span className="block text-[12px] text-[#5B667A]">{MY_HEALTH_SUB[item.key]}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 shrink-0 text-[#9AA4B5]" strokeWidth={2.4} />
                    </Link>
                  ))}
                </div>
              </section>

              <section aria-label="More" className="order-6 lg:order-none lg:hidden rounded-[20px] bg-white shadow-[0_0_0_1px_#E6EBF3] overflow-hidden">
                <MenuRow href="/patient/records" icon={FileText} label="Prescriptions & reports" />
                <MenuRow href="/patient/payments" icon={Receipt} label="Payment history" />
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
function Panel({ id, title, sub, action, className = '', children }: { id: string; title: ReactNode; sub?: ReactNode; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-24 lg:scroll-mt-[96px] p-4 lg:p-[22px] ${card} rounded-[20px]! lg:rounded-2xl! ${className}`}>
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
function Field({ label, value, accent }: { label: string; value: string | null | undefined; accent?: string }) {
  return (
    <div className="py-2.5 border-b lg:border-b-0 lg:border-t border-[#EEF2F7] min-w-0">
      <span className="block text-[11px] lg:text-[12px] font-bold uppercase lg:normal-case tracking-[0.02em] lg:tracking-normal text-[#5B667A]">{label}</span>
      {value ? (
        <span className={`block mt-[3px] lg:mt-0.5 text-[14.5px] lg:text-[15px] font-extrabold break-words ${accent ?? ''}`}>{value}</span>
      ) : (
        <span className="block mt-[3px] lg:mt-0.5 text-[14.5px] font-semibold text-[#8A94A6]">Not added</span>
      )}
    </div>
  )
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5 text-[11.5px] font-bold text-[#27324A] text-center">
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
