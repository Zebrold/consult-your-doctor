import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Building2, CalendarCheck, CalendarDays, ClipboardCheck, ExternalLink, FileText, Globe, GraduationCap, History, House, IndianRupee, LogOut,
  MapPin, ShieldCheck, Star, Stethoscope, Users, type LucideIcon,
} from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatINR, formatShortDate, formatTime, istDateKey } from '@/components/patient/format'
import { CONSULTATION_PLATFORM_FEE } from '@/lib/pricing'
import { loadSlots, loadVisits, requireDoctor } from '../_lib/doctor'
import { Avatar, Card, EmptyState } from '@/components/portal/ui'
import { ProfileEditor, type EditableProfile } from '../_components/ProfileEditor'
import { Inpatients } from '../_components/Inpatients'
import { loadDoctorInpatients } from '@/lib/beds'
import { loadDoctorReviews } from '@/lib/reviews'
import { Stars } from '@/components/Stars'
import { RECORD_BUCKET } from '@/lib/records'
import { signaturePath } from '@/lib/prescriptions'
import { PrescriptionTemplate } from '../_components/PrescriptionTemplate'

export const metadata: Metadata = { title: 'Profile | Doctor Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000

/** Council and registration number from the doctor's approved application, if they applied online. */
function parseRegistration(packed: string | null | undefined) {
  const parts = (packed || '').split(' | ')
  const get = (prefix: string) => parts.find((p) => p.startsWith(`${prefix}:`))?.slice(prefix.length + 1)?.trim() || null
  return { council: get('COUNCIL'), registration: get('REG') }
}

export default async function DoctorProfilePage() {
  const { admin, doctor } = await requireDoctor()
  const now = currentTime()

  const [visits, slots, application, inpatients, reviews, signature] = await Promise.all([
    loadVisits(admin, doctor.id),
    loadSlots(admin, doctor.id, new Date(now).toISOString(), new Date(now + 14 * DAY).toISOString()),
    doctor.email
      ? admin.from('doctor_signup_requests').select('qualifications').eq('email', doctor.email).eq('status', 'approved').maybeSingle()
      : Promise.resolve({ data: null }),
    loadDoctorInpatients(admin, doctor.id),
    loadDoctorReviews(admin, doctor.id, 4),
    // The signature is private: show it through a short-lived link.
    admin.storage.from(RECORD_BUCKET).createSignedUrl(signaturePath(doctor.id), 60 * 10),
  ])
  // The registration the doctor saved on their profile, else the one from their approved application.
  const applied = parseRegistration((application.data as { qualifications: string | null } | null)?.qualifications)
  const license = { registration: doctor.registrationNumber || applied.registration, council: doctor.registrationCouncil || applied.council }

  const completed = visits.filter((v) => v.status === 'completed')
  const patientsSeen = new Set(completed.map((v) => v.patient?.id).filter(Boolean)).size
  const upcoming = visits.filter((v) => v.status === 'confirmed' && v.start && Date.parse(v.start) > now)
  const recent = [...completed].sort((a, b) => (b.start ?? '').localeCompare(a.start ?? '')).slice(0, 4)
  const last30 = completed.filter((v) => v.start && Date.parse(v.start) > now - 30 * DAY)
  const withDocs = completed.filter((v) => v.records.some((r) => r.fileUrl)).length

  // Profile completeness: the fields patients see when choosing a doctor
  const checks = [doctor.image, doctor.bio, doctor.qualifications, doctor.experience, doctor.fee, doctor.phone, doctor.specialty, doctor.address || doctor.hospital]
  const completeness = Math.round((checks.filter((c) => c !== null && c !== undefined && c !== '').length / checks.length) * 100)

  // Next 7 days of published slots, grouped by day
  const weekSlots = slots.filter((s) => Date.parse(s.start) < now + 7 * DAY)
  const byDay = new Map<string, typeof slots>()
  for (const s of weekSlots) byDay.set(istDateKey(s.start), [...(byDay.get(istDateKey(s.start)) ?? []), s])
  const days = Array.from(byDay.entries()).slice(0, 4)

  // Which weekdays the doctor consults on (next 14 days) and the busiest day's slot count
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const perDay = new Map<string, number>()
  const weekdays = new Set<number>()
  for (const s of slots) {
    const key = istDateKey(s.start)
    perDay.set(key, (perDay.get(key) ?? 0) + 1)
    weekdays.add(new Date(`${key}T12:00:00+05:30`).getUTCDay())
  }
  const consultingDays =
    weekdays.size === 7 ? 'Daily' : weekdays.size === 0 ? 'No slots yet' : [1, 2, 3, 4, 5, 6, 0].filter((d) => weekdays.has(d)).map((d) => WEEKDAYS[d]).join(' • ')
  const maxPerDay = Math.max(0, ...perDay.values())

  const editable: EditableProfile = {
    name: doctor.name,
    phone: doctor.phone,
    specialty: doctor.specialty,
    qualifications: doctor.qualifications,
    experience: doctor.experience,
    fee: doctor.fee,
    bio: doctor.bio,
    address: doctor.address,
    ...(doctor.profileReady
      ? { registrationNumber: license.registration, registrationCouncil: license.council, education: doctor.education, insurance: doctor.insurance }
      : {}),
  }
  const linkButton = 'font-label-sm text-[12px] md:text-label-sm text-primary hover:underline flex items-center gap-1 shrink-0'

  return (
    <>
      {/* Hero */}
      <Card className="relative overflow-hidden">
        <div aria-hidden className="hidden md:block absolute -right-20 -top-20 w-96 h-96 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none" />
        <div aria-hidden className="hidden md:block absolute -left-20 -bottom-20 w-80 h-80 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-stack-md">
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col items-center sm:items-start">
            <div className="relative w-28 h-28 sm:w-full sm:h-auto sm:aspect-[4/5] sm:max-w-[280px] lg:max-w-none rounded-full sm:rounded-xl overflow-hidden shadow-md bg-surface-container">
              {doctor.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doctor.image} alt={doctorName(doctor.name)} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-fixed to-surface-container text-primary font-headline-lg text-4xl sm:text-6xl font-bold">
                  {doctor.name.replace(/^Dr\.?\s+/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
              )}
              {license.registration && (
                <div className="hidden sm:flex absolute bottom-3 inset-x-3 bg-surface-container-lowest/90 backdrop-blur-md p-2.5 rounded-lg items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">Registration</span>
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold truncate">{license.registration}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold shrink-0">Verified</span>
                </div>
              )}
            </div>
            <div className="w-full mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm px-1">
                <span>Profile completeness</span>
                <span className="font-semibold text-primary">{completeness}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-vibrant-blue rounded-full" style={{ width: `${completeness}%` }} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between gap-4">
            <div className="text-center sm:text-left">
              <h1 className="font-headline-lg-mobile text-[22px] md:font-display-lg md:text-display-lg text-on-surface tracking-tight leading-tight md:leading-none mb-2">
                {doctorName(doctor.name)}
                {doctor.qualifications && <span className="text-primary font-semibold">, {doctor.qualifications}</span>}
              </h1>
              <p className="font-label-sm md:font-title-md text-[13px] md:text-title-md text-on-surface-variant font-medium mb-1">
                {[doctor.specialty, doctor.hospital?.name].filter(Boolean).join(' • ') || 'Add your specialty'}
              </p>
              <p className="font-body-md text-[12px] md:text-body-md text-on-surface-variant/80 max-w-3xl">
                {doctor.bio || 'Add a short introduction so patients know your experience and areas of focus.'}
              </p>
              {license.registration && (
                <span className="sm:hidden mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/30 border border-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-secondary" /> Reg. {license.registration}
                  {license.council ? ` • ${license.council}` : ''}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-stack-sm">
              <Tile label="Experience" value={doctor.experience != null ? `${doctor.experience}` : '—'} unit={doctor.experience != null ? 'Years' : undefined} sub="Clinical practice" icon={History} accent="text-primary" />
              <Tile label="Consultations" value={completed.length.toLocaleString('en-IN')} sub="Completed on the platform" icon={ClipboardCheck} />
              <Tile label="Patients Seen" value={patientsSeen.toLocaleString('en-IN')} sub="Unique patients" icon={Users} accent="text-fresh-teal" />
              <Tile label="Upcoming" value={String(upcoming.length)} sub="Booked visits" icon={CalendarCheck} accent="text-primary" />
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-stack-sm pt-stack-sm border-t border-surface-container">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-stack-sm">
                <ProfileEditor
                  profile={editable}
                  className="flex items-center justify-center gap-2 bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-[13px] md:text-label-sm px-5 py-2.5 rounded-xl sm:rounded-full transition-transform active:scale-95 shadow-[0_2px_12px_rgba(0,102,255,0.25)]"
                />
                <Link
                  href="/doctor/schedule"
                  className="flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-[13px] md:text-label-sm px-5 py-2.5 rounded-xl sm:rounded-full transition-colors"
                >
                  <CalendarDays className="w-[18px] h-[18px]" /> Manage Availability
                </Link>
              </div>
              <Link href={`/doctors/${doctor.id}`} className="inline-flex items-center justify-center gap-1.5 text-primary hover:text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold group">
                View Patient-Facing Profile <ExternalLink className="w-[18px] h-[18px] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-stack-md">
        <div className="xl:col-span-8 flex flex-col gap-4 md:gap-stack-lg">
          {/* Affiliations */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <SectionTitle icon={Building2} eyebrow="Active Locations" title="Clinic & Hospital Affiliations" />
              <Link href="/doctor/schedule" className="shrink-0 text-primary hover:bg-surface-container-low px-3 py-1.5 rounded-full font-label-sm text-[12px] md:text-label-sm transition-colors flex items-center gap-1">
                <CalendarDays className="w-[18px] h-[18px]" /> <span className="hidden sm:inline">My Schedule</span>
              </Link>
            </div>
            {doctor.hospital ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-stack-sm">
                <Affiliation
                  icon={Building2}
                  chip={consultingDays}
                  chipClass="bg-secondary-container text-on-secondary-container"
                  title={doctor.hospital.name}
                  address={[doctor.hospital.address, doctor.hospital.city].filter(Boolean).join(', ') || 'Address not listed'}
                  lines={[
                    { icon: Stethoscope, text: 'In-person consultations' },
                    { icon: CalendarCheck, text: `${slots.length} slots in the next 14 days` },
                  ]}
                  footLeft={maxPerDay ? `Max ${maxPerDay} Slots/Day` : 'Slots set by your hospital'}
                  footRight={<Link href="/doctor/schedule" className="text-primary hover:underline">View Times</Link>}
                />
                {doctor.address && (
                  <Affiliation
                    icon={House}
                    chip="Your clinic"
                    chipClass="bg-primary-fixed text-on-primary-fixed"
                    title="Clinic Address"
                    address={doctor.address}
                    lines={[{ icon: MapPin, text: 'Shown on your public profile' }]}
                    footLeft="Patients see this"
                    footRight={<Link href={`/doctors/${doctor.id}`} className="text-primary hover:underline">Preview</Link>}
                  />
                )}
                <Affiliation
                  icon={Globe}
                  iconClass="text-fresh-teal"
                  chip="Online booking"
                  chipClass="bg-fresh-teal/15 text-secondary"
                  title="Consult Your Doctor"
                  address="Patients find, book and pay for you online"
                  lines={[
                    { icon: IndianRupee, text: doctor.fee ? `${formatINR(doctor.fee)} consultation fee` : 'Set your fee to take bookings' },
                    { icon: ShieldCheck, text: 'Paid before the visit' },
                  ]}
                  footLeft={`${upcoming.length} upcoming ${upcoming.length === 1 ? 'booking' : 'bookings'}`}
                  footRight={<Link href="/doctor/patients" className="text-primary hover:underline">Patients</Link>}
                />
              </div>
            ) : (
              <EmptyState icon={Building2}>You aren&apos;t linked to a hospital yet. Ask the admin team to add you.</EmptyState>
            )}
          </Card>

          {/* Education & training */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <SectionTitle icon={GraduationCap} eyebrow="Credentials" title="Education & Training" />
              {doctor.profileReady && <ProfileEditor profile={editable} tab="education" label="Add / Edit" className={linkButton} />}
            </div>
            {license.registration && (
              <p className="mb-3 p-3 rounded-xl bg-secondary-container/30 text-[13px] text-on-surface flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-secondary shrink-0" />
                <span>
                  Registration <span className="font-bold">{license.registration}</span>
                  {license.council ? ` • ${license.council}` : ''}
                </span>
              </p>
            )}
            {!doctor.profileReady ? (
              <EmptyState icon={GraduationCap}>Education entries open up after the database update (20261009 migration).</EmptyState>
            ) : doctor.education.length === 0 ? (
              <EmptyState icon={GraduationCap}>Add your degrees, residencies and fellowships so patients can see your training.</EmptyState>
            ) : (
              <ol className="relative flex flex-col gap-3 pl-5 border-l-2 border-primary-fixed ml-2">
                {doctor.education.map((e, i) => (
                  <li key={`${e.title}-${i}`} className="relative">
                    <span aria-hidden className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-vibrant-blue ring-4 ring-surface-container-lowest" />
                    <span className="font-label-sm text-[11px] text-secondary font-semibold uppercase tracking-wider">
                      {e.kind}
                      {e.year ? ` • ${e.year}` : ''}
                    </span>
                    <p className="font-title-md text-[15px] font-bold text-on-surface">{e.title}</p>
                    {e.institution && <p className="text-[13px] text-on-surface-variant">{e.institution}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Patient reviews */}
          <Card>
            <SectionTitle icon={Star} eyebrow="What Patients Say" title="Patient Reviews" />
            {reviews.summary.count === 0 ? (
              <EmptyState icon={Star}>No reviews yet. Patients can rate their visit once it’s completed, and reviews show here and on your public profile.</EmptyState>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-low">
                  <span className="font-headline-lg text-[34px] font-extrabold text-on-surface leading-none">{reviews.summary.average?.toFixed(1)}</span>
                  <span className="flex flex-col gap-1">
                    <Stars value={reviews.summary.average ?? 0} />
                    <span className="text-[12px] text-on-surface-variant">
                      {reviews.summary.count} {reviews.summary.count === 1 ? 'review' : 'reviews'}
                    </span>
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {reviews.reviews.map((r) => (
                    <li key={r.id} className="p-3 rounded-xl bg-surface-container-low">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-[13px] text-on-surface">{r.patientName}</span>
                        <Stars value={r.rating} className="w-3.5 h-3.5" />
                      </div>
                      {r.comment && <p className="text-[13px] text-on-surface-variant">{r.comment}</p>}
                      <p className="text-[11px] text-outline mt-1">{formatShortDate(r.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Recent consultations */}
          <Card>
            <SectionTitle icon={Stethoscope} eyebrow="Your Practice" title="Recent Consultations" />
            <div className="grid grid-cols-3 gap-2 md:gap-stack-sm mb-4 md:mb-stack-md">
              <Score label="Completed (30 days)" value={last30.length} icon={ClipboardCheck} tint="bg-fresh-teal/15 text-fresh-teal" />
              <Score label="Patients (30 days)" value={new Set(last30.map((v) => v.patient?.id)).size} icon={Users} tint="bg-primary-fixed text-primary" />
              <Score label="With a document" value={withDocs} icon={FileText} tint="bg-secondary-container text-secondary" />
            </div>
            {recent.length === 0 ? (
              <EmptyState icon={Stethoscope}>Completed consultations will appear here.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2 md:gap-stack-sm">
                {recent.map((v) => {
                  const file = v.records.find((r) => r.fileUrl)
                  return (
                    <li key={v.id} className="p-3 md:p-4 rounded-xl bg-surface-container-low">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-title-md text-[13px] md:text-label-sm font-semibold text-on-surface flex items-center gap-2 min-w-0">
                          <Avatar name={v.patient?.name ?? null} className="w-7 h-7 text-[10px]" />
                          <span className="truncate">{v.patient?.name ?? 'Patient'}</span>
                        </span>
                        <span className="font-label-sm text-[11px] md:text-[12px] text-on-surface-variant shrink-0">{v.start ? formatShortDate(v.start) : ''}</span>
                      </div>
                      <p className="text-[11px] md:text-label-sm text-on-surface-variant line-clamp-2">{v.records[0]?.notes || 'No notes recorded'}</p>
                      {file?.fileUrl && (
                        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                          <FileText className="w-3.5 h-3.5" /> Prescription document
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="xl:col-span-4 flex flex-col gap-4 md:gap-stack-lg">
          <PrescriptionTemplate signatureUrl={signature.data?.signedUrl ?? null} registration={license.registration} />

          {/* Patients admitted under this doctor, live from the hospital's bed allocation */}
          <Inpatients admissions={inpatients} now={now} />

          {/* Insurance accepted */}
          <Card>
            <div className="flex items-center justify-between mb-stack-sm gap-2">
              <div className="flex items-center gap-2 text-fresh-teal">
                <ShieldCheck className="w-5 h-5" />
                <h2 className="font-title-md text-[16px] md:text-title-md text-on-surface font-semibold">Insurance Accepted</h2>
              </div>
              {doctor.profileReady && <ProfileEditor profile={editable} tab="insurance" label="Edit" className={linkButton} />}
            </div>
            {!doctor.profileReady ? (
              <EmptyState icon={ShieldCheck}>Opens up after the database update (20261009 migration).</EmptyState>
            ) : doctor.insurance.length === 0 ? (
              <EmptyState icon={ShieldCheck}>Add the insurers and schemes you accept. Patients see them on your profile.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2">
                {doctor.insurance.map((i) => (
                  <li key={i} className="p-2.5 rounded-lg bg-surface-container-low flex items-center gap-2.5 text-[13px] font-semibold text-on-surface">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">{i[0]?.toUpperCase()}</span>
                    {i}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Fee */}
          <Card>
            <div className="flex items-center justify-between mb-stack-sm">
              <div className="flex items-center gap-2 text-fresh-teal">
                <IndianRupee className="w-5 h-5" />
                <h2 className="font-title-md text-[16px] md:text-title-md text-on-surface font-semibold">Fee Structure</h2>
              </div>
              <ProfileEditor profile={editable} label="Update Fee" className="font-label-sm text-[12px] md:text-label-sm text-primary hover:underline flex items-center gap-1" />
            </div>
            <p className="text-label-sm text-on-surface-variant mb-4">What patients pay when they book you online.</p>
            <div className="flex flex-col gap-2.5">
              <FeeRow title="In-person consultation" sub="Your fee, paid out per visit" value={doctor.fee ? formatINR(doctor.fee) : 'Not set'} strong />
              <FeeRow title="Platform fee" sub="Added at checkout" value={formatINR(CONSULTATION_PLATFORM_FEE)} />
              {doctor.fee ? <FeeRow title="Patient pays" sub="Total at checkout" value={formatINR(doctor.fee + CONSULTATION_PLATFORM_FEE)} /> : null}
            </div>
          </Card>

          {/* Hours */}
          <Card>
            <div className="flex items-center justify-between mb-stack-sm">
              <div className="flex items-center gap-2 text-fresh-teal">
                <CalendarDays className="w-5 h-5" />
                <h2 className="font-title-md text-[16px] md:text-title-md text-on-surface font-semibold">Appointment Hours</h2>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                Next 7 days <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal animate-pulse" title="Live from your schedule" />
              </span>
            </div>
            {days.length === 0 ? (
              <EmptyState icon={CalendarDays}>No slots published for the next 7 days.</EmptyState>
            ) : (
              <div className="flex flex-col gap-2.5">
                {days.map(([key, list]) => (
                  <div key={key} className="p-2.5 md:p-3 bg-surface-container-low rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-title-md text-[13px] md:text-label-sm font-semibold text-on-surface">
                        {new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'short' })}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px] md:text-[11px] font-semibold">
                        {formatTime(list[0].start)} – {formatTime(list[list.length - 1].end ?? list[list.length - 1].start)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.slice(0, 8).map((s) => (
                        <span
                          key={s.id}
                          title={s.booked ? 'Booked' : 'Open'}
                          className={`px-2 py-1 rounded text-[11px] font-semibold ${s.booked ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-primary'}`}
                        >
                          {formatTime(s.start).replace(/ (AM|PM)$/, '')}
                        </span>
                      ))}
                      {list.length > 8 && <span className="px-2 py-1 text-[11px] text-on-surface-variant">+{list.length - 8}</span>}
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-on-surface-variant flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-primary" /> Booked</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-surface-container-highest" /> Open</span>
                </p>
              </div>
            )}
          </Card>

          {/* Platform Policies & Legal Terms */}
          <Card>
            <div className="flex items-center gap-2 text-fresh-teal mb-stack-sm">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="font-title-md text-[16px] md:text-title-md text-on-surface font-semibold">Legal &amp; Compliance</h2>
            </div>
            <p className="text-label-sm text-on-surface-variant mb-3">
              Platform terms, telemedicine standards, prescription validity, and DPDP Act compliance.
            </p>
            <div className="flex flex-col gap-2 pt-1 border-t border-surface-container-high/70">
              <Link
                href="/terms-of-use"
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors text-xs font-semibold text-on-surface"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-vibrant-blue" /> Terms &amp; Conditions
                </span>
                <span className="text-vibrant-blue font-bold">View →</span>
              </Link>
              <Link
                href="/privacy-policy"
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors text-xs font-semibold text-on-surface"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-fresh-teal" /> Privacy Policy
                </span>
                <span className="text-vibrant-blue font-bold">View →</span>
              </Link>
            </div>
          </Card>

          <form action="/auth/signout" method="post">
            <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-error/10 hover:bg-error-container text-error font-label-sm text-label-sm font-bold transition-colors">
              <LogOut className="w-[18px] h-[18px]" /> Sign Out
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

function Tile({ label, value, unit, sub, icon: Icon, accent = 'text-on-surface' }: { label: string; value: string; unit?: string; sub: string; icon: LucideIcon; accent?: string }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-2.5 md:p-3.5 flex flex-col justify-between">
      <span className="font-label-sm text-[10px] md:text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</span>
      <div className="mt-1 md:mt-2 flex items-baseline gap-1">
        <span className={`font-headline-lg-mobile md:font-headline-lg text-[20px] md:text-headline-lg font-bold ${accent}`}>{value}</span>
        {unit && <span className="font-label-sm text-[11px] md:text-label-sm text-on-surface-variant">{unit}</span>}
      </div>
      <span className="font-label-sm text-[10px] md:text-[11px] text-secondary mt-0.5 md:mt-1 flex items-center gap-1">
        <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" /> {sub}
      </span>
    </div>
  )
}

function Affiliation({
  icon: Icon,
  iconClass = 'text-primary',
  chip,
  chipClass,
  title,
  address,
  lines,
  footLeft,
  footRight,
}: {
  icon: LucideIcon
  iconClass?: string
  chip: string
  chipClass: string
  title: string
  address: string
  lines: { icon: LucideIcon; text: string }[]
  footLeft: string
  footRight: ReactNode
}) {
  return (
    <div className="bg-surface-container-low rounded-xl p-3 md:p-4 flex flex-col justify-between gap-2 md:gap-0 hover:bg-surface-container transition-colors">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1 md:mb-3">
          <span className={`hidden md:flex w-8 h-8 rounded-lg bg-surface-container-highest items-center justify-center ${iconClass}`}>
            <Icon className="w-5 h-5" />
          </span>
          <span className="md:hidden font-title-md text-[14px] font-semibold text-on-surface truncate">{title}</span>
          <span className={`px-2 md:px-2.5 py-0.5 rounded-full font-label-sm text-[10px] md:text-[11px] font-semibold whitespace-nowrap ${chipClass}`}>{chip}</span>
        </div>
        <h3 className="hidden md:block font-title-md text-title-md text-on-surface leading-tight mb-1">{title}</h3>
        <p className="text-[12px] md:text-label-sm text-on-surface-variant md:mb-3">{address}</p>
        <div className="hidden md:flex flex-col gap-1.5 text-on-surface-variant font-label-sm text-[13px]">
          {lines.map((l) => (
            <span key={l.text} className="flex items-center gap-2">
              <l.icon className="w-4 h-4 text-primary shrink-0" /> {l.text}
            </span>
          ))}
        </div>
      </div>
      <div className="md:mt-4 pt-1.5 md:pt-3 border-t border-surface-container-high/70 flex items-center justify-between gap-2 font-label-sm text-[11px] md:text-label-sm">
        <span className="text-secondary font-semibold">{footLeft}</span>
        <span className="text-[11px] md:text-[12px]">{footRight}</span>
      </div>
    </div>
  )
}

function SectionTitle({ icon: Icon, eyebrow, title }: { icon: LucideIcon; eyebrow: string; title: string }) {
  return (
    <div className="mb-3 md:mb-stack-md">
      <div className="flex items-center gap-2 text-fresh-teal">
        <Icon className="w-5 h-5" />
        <span className="font-label-sm text-[11px] md:text-label-sm uppercase tracking-wider font-semibold">{eyebrow}</span>
      </div>
      <h2 className="font-title-md md:font-headline-lg text-[16px] md:text-headline-lg text-on-surface">{title}</h2>
    </div>
  )
}

function Score({ label, value, icon: Icon, tint }: { label: string; value: number; icon: LucideIcon; tint: string }) {
  return (
    <div className="p-2 md:p-4 rounded-xl bg-surface-container-low flex flex-col md:flex-row items-center md:justify-between gap-1 text-center md:text-left">
      <div>
        <span className="font-label-sm text-[10px] md:text-label-sm text-on-surface-variant block">{label}</span>
        <div className="font-headline-lg-mobile md:font-headline-lg text-[16px] md:text-headline-lg font-bold text-on-surface mt-0.5">{value}</div>
      </div>
      <span className={`hidden md:flex w-12 h-12 rounded-full items-center justify-center ${tint}`}>
        <Icon className="w-6 h-6" />
      </span>
    </div>
  )
}

function FeeRow({ title, sub, value, strong }: { title: string; sub: string; value: string; strong?: boolean }) {
  return (
    <div className="p-2.5 md:p-3 bg-surface-container-low rounded-xl flex items-center justify-between gap-3">
      <div>
        <span className="font-title-md text-[13px] md:text-label-sm font-semibold text-on-surface block">{title}</span>
        <span className="text-[11px] md:text-[12px] text-on-surface-variant">{sub}</span>
      </div>
      <span className={`font-title-md text-[15px] md:text-title-md font-bold ${strong ? 'text-primary' : 'text-on-surface'}`}>{value}</span>
    </div>
  )
}
