import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Building2, CalendarDays, ChevronRight, ExternalLink, House } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { IST, doctorName, formatINR, formatShortDate, formatTime, initials, istDateKey } from '@/components/patient/format'
import { getBookingFees } from '@/lib/booking-fees'
import { loadDoctorReviews } from '@/lib/reviews'
import { RECORD_BUCKET } from '@/lib/records'
import { signaturePath } from '@/lib/prescriptions'
import { loadSlots, loadVisits, requireDoctor } from '../_lib/doctor'
import { ProfileEditor, type EditableProfile } from '../_components/ProfileEditor'
import { PrescriptionTemplate } from '../_components/PrescriptionTemplate'
import { BarChart, DocBody, DocHeader, EmptyLine, Panel, PanelHead, Row, Verified, btnOutline, btnPrimary, card } from '../_components/doc-ui'

export const metadata: Metadata = { title: 'Profile | Doctor Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Council and registration number from the doctor's approved application, if they applied online. */
function parseRegistration(packed: string | null | undefined) {
  const parts = (packed || '').split(' | ')
  const get = (prefix: string) => parts.find((p) => p.startsWith(`${prefix}:`))?.slice(prefix.length + 1)?.trim() || null
  return { council: get('COUNCIL'), registration: get('REG') }
}

/** "Mon–Sat", "Mon, Wed & Fri" or "Daily" from the weekdays (0 = Sunday) the doctor has slots on. */
function dayRange(days: Set<number>) {
  const order = [1, 2, 3, 4, 5, 6, 0].filter((d) => days.has(d))
  if (order.length === 7) return 'Daily'
  if (order.length === 0) return null
  const all = [1, 2, 3, 4, 5, 6, 0]
  const first = all.indexOf(order[0])
  const consecutive = order.length > 2 && order.every((d, i) => all[first + i] === d)
  if (consecutive) return `${WEEKDAYS[order[0]]}–${WEEKDAYS[order[order.length - 1]]}`
  const names = order.map((d) => WEEKDAYS[d])
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0]
}

export default async function DoctorProfilePage() {
  const { admin, doctor } = await requireDoctor()
  const now = currentTime()

  const [visits, slots, application, reviews, signature, fees] = await Promise.all([
    loadVisits(admin, doctor.id),
    loadSlots(admin, doctor.id, new Date(now).toISOString(), new Date(now + 14 * DAY).toISOString()),
    doctor.email
      ? admin.from('doctor_signup_requests').select('qualifications').eq('email', doctor.email).eq('status', 'approved').maybeSingle()
      : Promise.resolve({ data: null }),
    loadDoctorReviews(admin, doctor.id, 3),
    // The signature is private: show it through a short-lived link.
    admin.storage.from(RECORD_BUCKET).createSignedUrl(signaturePath(doctor.id), 60 * 10),
    getBookingFees(),
  ])
  // The registration the doctor saved on their profile, else the one from their approved application.
  const applied = parseRegistration((application.data as { qualifications: string | null } | null)?.qualifications)
  const license = { registration: doctor.registrationNumber || applied.registration, council: doctor.registrationCouncil || applied.council }

  const completed = visits.filter((v) => v.status === 'completed')
  const patientsSeen = new Set(completed.map((v) => v.patient?.id).filter(Boolean)).size
  const upcoming = visits.filter((v) => v.status === 'confirmed' && v.start && Date.parse(v.start) > now)

  // Profile completeness: the fields patients see when choosing a doctor
  const checks = [doctor.image, doctor.bio, doctor.qualifications, doctor.experience, doctor.fee, doctor.phone, doctor.specialty, doctor.address || doctor.hospital]
  const completeness = Math.round((checks.filter((c) => c !== null && c !== undefined && c !== '').length / checks.length) * 100)

  // When the doctor consults at the hospital (published slots, next 14 days)
  const weekdays = new Set(slots.map((s) => new Date(`${istDateKey(s.start)}T12:00:00+05:30`).getUTCDay()))
  const minuteOf = (iso: string) => {
    const [h, m] = new Date(iso).toLocaleTimeString('en-GB', { timeZone: IST, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).split(':').map(Number)
    return h * 60 + m
  }
  const earliest = slots.length ? slots.reduce((a, b) => (minuteOf(b.start) < minuteOf(a.start) ? b : a)) : null
  const latest = slots.length ? slots.reduce((a, b) => (minuteOf(b.end ?? b.start) > minuteOf(a.end ?? a.start) ? b : a)) : null
  const hours = earliest && latest ? [dayRange(weekdays), `${formatTime(earliest.start)}–${formatTime(latest.end ?? latest.start)}`].filter(Boolean).join(', ') : 'No slots published yet'

  // Consultations completed per month, the last six months
  const monthKeys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${istDateKey(now).slice(0, 7)}-15T12:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() - (5 - i))
    return d.toISOString().slice(0, 7)
  })
  const consultBars = monthKeys.map((m, i) => ({
    label: new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short' }),
    value: completed.filter((v) => v.start && istDateKey(v.start).slice(0, 7) === m).length,
    active: i === monthKeys.length - 1,
  }))

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

  const name = doctorName(doctor.name)
  const verified = license.registration ? <Verified /> : null
  const experience = doctor.experience != null ? `${doctor.experience} ${doctor.experience === 1 ? 'year' : 'years'}` : null
  const rating = reviews.summary.average
  const smallLink = 'shrink-0 inline-flex items-center gap-1 text-[13px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4'
  const photo = (cls: string) =>
    doctor.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={doctor.image} alt="" className={`${cls} rounded-full object-cover shrink-0 bg-white`} />
    ) : (
      <span className={`${cls} shrink-0 rounded-full bg-white text-[#2A4DD0] flex items-center justify-center font-extrabold`}>{initials(doctor.name)}</span>
    )

  const about = (
    <Panel>
      <PanelHead title="About" sub="What patients see when they book you" right={<span className="text-[12px] font-extrabold text-[#067647] whitespace-nowrap">{completeness}% complete</span>} />
      <p className={`text-[13.5px] lg:text-[14px] leading-relaxed ${doctor.bio ? 'text-[#27324A]' : 'text-[#98A2B3]'}`}>
        {doctor.bio || 'Add a short introduction so patients know your experience and areas of focus.'}
      </p>
      <div className="mt-2">
        <Row label="Speciality">{doctor.specialty ?? <span className="text-[#98A2B3]">Not added</span>}</Row>
        <Row label="Experience">{experience ?? <span className="text-[#98A2B3]">Not added</span>}</Row>
        <Row label="Qualifications">{doctor.qualifications ?? <span className="text-[#98A2B3]">Not added</span>}</Row>
        <Row label="Registration no.">
          {license.registration ? `${license.registration}${license.council ? ` · ${license.council}` : ''}` : <span className="text-[#98A2B3]">Not added</span>}
        </Row>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 lg:hidden">
        <ProfileEditor profile={editable} label="Edit profile" className={`${btnPrimary} [&_svg]:w-[15px] [&_svg]:h-[15px]`} />
        <Link href="/doctor/schedule" className={btnOutline}>
          <CalendarDays className="w-[15px] h-[15px]" /> Availability
        </Link>
      </div>
    </Panel>
  )

  const locations = (
    <Panel>
      <PanelHead title="Practice locations" />
      {doctor.hospital ? (
        <Place icon={<Building2 className="w-5 h-5" />} title={doctor.hospital.name} sub={[doctor.hospital.city, hours].filter(Boolean).join(' · ')} status="Active" />
      ) : (
        <EmptyLine>You aren&apos;t linked to a hospital yet. Ask the admin team to add you.</EmptyLine>
      )}
      {doctor.address && <Place icon={<House className="w-5 h-5" />} title="Your clinic" sub={doctor.address} status="On your profile" />}
    </Panel>
  )

  const feesCard = (
    <Panel>
      <PanelHead title="Fees" sub="Your consultation fee is paid at the hospital counter" />
      <Row label="In-person consultation">{doctor.fee ? formatINR(doctor.fee) : <span className="text-[#98A2B3]">Not set</span>}</Row>
      <Row label="Booking fee (paid in the app)">{formatINR(fees.consultation)}</Row>
      <Row label="Upcoming bookings">{upcoming.length}</Row>
      <ProfileEditor profile={editable} label="Update fee" className={`${btnOutline} lg:border w-full mt-3 [&_svg]:w-[15px] [&_svg]:h-[15px]`} />
    </Panel>
  )

  const reviewsCard = (
    <Panel>
      <PanelHead title="Patient reviews" sub={rating != null ? `${rating.toFixed(1)} average from ${reviews.summary.count} verified ${reviews.summary.count === 1 ? 'visit' : 'visits'}` : 'Patients rate their visit once it’s completed'} />
      {reviews.summary.count === 0 ? (
        <EmptyLine>No reviews yet. They show here and on your public profile.</EmptyLine>
      ) : (
        <>
          {([5, 4, 3, 2, 1] as const).map((n) => {
            const count = reviews.summary.distribution[n]
            return (
              <div key={n} className="grid grid-cols-[34px_minmax(0,1fr)_40px] gap-2.5 items-center py-[5px] text-[12.5px] font-bold">
                <span>{n} ★</span>
                <span className="block h-1.5 rounded-full bg-[#EEF2F7] overflow-hidden">
                  <span className="block h-full rounded-full bg-[#E0A100]" style={{ width: `${(count / reviews.summary.count) * 100}%` }} />
                </span>
                <span className="text-right text-[#5B667A]">{count}</span>
              </div>
            )
          })}
          <div className="h-2" />
          {reviews.reviews.map((r) => (
            <div key={r.id} className="py-3.5 border-t border-[#EEF2F7]">
              <div className="flex justify-between gap-3">
                <span className="text-[13.5px] font-extrabold">{r.patientName}</span>
                <span className="text-[12.5px] font-extrabold text-[#B54708]" aria-label={`${r.rating} out of 5`}>
                  {'★'.repeat(Math.round(r.rating))}
                </span>
              </div>
              {r.comment && <p className="mt-1 text-[13.5px] leading-normal text-[#27324A]">{r.comment}</p>}
              <p className="mt-1 text-[12px] text-[#5B667A]">{formatShortDate(r.createdAt)} · Verified visit</p>
            </div>
          ))}
        </>
      )}
    </Panel>
  )

  const education = (
    <Panel>
      <PanelHead title="Education & training" right={doctor.profileReady ? <ProfileEditor profile={editable} tab="education" label="Edit" className={`${smallLink} [&_svg]:w-3.5 [&_svg]:h-3.5`} /> : undefined} />
      {!doctor.profileReady ? (
        <EmptyLine>Education entries open up after the database update (20261009 migration).</EmptyLine>
      ) : doctor.education.length === 0 ? (
        <EmptyLine>Add your degrees, residencies and fellowships so patients can see your training.</EmptyLine>
      ) : (
        <ol className="relative flex flex-col gap-3 ml-1.5 pl-5 border-l-2 border-[#E3EAFF] mt-1">
          {doctor.education.map((e, i) => (
            <li key={`${e.title}-${i}`} className="relative">
              <span aria-hidden className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#2A4DD0] ring-4 ring-white" />
              <span className="text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">
                {e.kind}
                {e.year ? ` · ${e.year}` : ''}
              </span>
              <p className="text-[14px] font-extrabold">{e.title}</p>
              {e.institution && <p className="text-[13px] text-[#5B667A]">{e.institution}</p>}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )

  const insurance = (
    <Panel>
      <PanelHead title="Insurance accepted" right={doctor.profileReady ? <ProfileEditor profile={editable} tab="insurance" label="Edit" className={`${smallLink} [&_svg]:w-3.5 [&_svg]:h-3.5`} /> : undefined} />
      {!doctor.profileReady ? (
        <EmptyLine>Opens up after the database update (20261009 migration).</EmptyLine>
      ) : doctor.insurance.length === 0 ? (
        <EmptyLine>Add the insurers and schemes you accept. Patients see them on your profile.</EmptyLine>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {doctor.insurance.map((i) => (
            <span key={i} className="px-3 py-1.5 rounded-full bg-[#F4F6FA] text-[12.5px] font-bold text-[#27324A]">
              {i}
            </span>
          ))}
        </div>
      )}
    </Panel>
  )

  const links = (
    <section className={`${card} overflow-hidden`}>
      {[
        { href: `/doctors/${doctor.id}`, label: 'Public profile' },
        { href: '/doctor/ai', label: 'Help & support' },
        { href: '/terms-of-use', label: 'Terms & conditions' },
        { href: '/privacy-policy', label: 'Privacy policy' },
      ].map((l) => (
        <Link key={l.href} href={l.href} className="flex items-center gap-3 min-h-[52px] px-4 border-b border-[#EEF2F7] text-[14px] font-bold hover:bg-[#F7F9FC]">
          <span className="flex-1">{l.label}</span>
          <ChevronRight className="w-4 h-4 text-[#9AA4B5]" strokeWidth={2.4} />
        </Link>
      ))}
      <form action="/auth/signout" method="post">
        <button type="submit" className="w-full flex items-center min-h-[52px] px-4 text-[14px] font-extrabold text-[#B42318] hover:bg-[#FEF3F2] text-left">
          Log out
        </button>
      </form>
    </section>
  )

  const stats = [
    { v: completed.length.toLocaleString('en-IN'), k: 'Consultations' },
    { v: patientsSeen.toLocaleString('en-IN'), k: 'Patients' },
    { v: rating != null ? `${rating.toFixed(1)} ★` : '—', k: reviews.summary.count ? `${reviews.summary.count} ${reviews.summary.count === 1 ? 'review' : 'reviews'}` : 'No reviews yet' },
    { v: String(upcoming.length), k: 'Upcoming' },
    { v: `${completeness}%`, k: 'Profile complete' },
  ]

  return (
    <>
      <DocHeader
        doctor={{ name: doctor.name, image: doctor.image }}
        avatar={photo('w-16 h-16 text-[24px]')}
        title={name}
        titleExtra={verified}
        subtitle={
          <>
            {doctor.qualifications && <span className="block">{doctor.qualifications}</span>}
            {doctor.hospital && <span className="block">{[doctor.hospital.name, doctor.hospital.city].filter(Boolean).join(', ')}</span>}
          </>
        }
      />

      <DocBody>
        {/* Phones */}
        <div className="lg:hidden flex flex-col gap-3.5">
          <section aria-label="Your practice in numbers" className={`${card} grid grid-cols-4 overflow-hidden`}>
            {[
              { v: experience ? `${doctor.experience} yrs` : '—', k: 'Experience' },
              { v: completed.length.toLocaleString('en-IN'), k: 'Consults' },
              { v: patientsSeen.toLocaleString('en-IN'), k: 'Patients' },
              { v: String(upcoming.length), k: 'Upcoming' },
            ].map((s) => (
              <div key={s.k} className="px-2.5 py-3 text-center shadow-[inset_-1px_0_0_#EEF2F7]">
                <span className="block text-[18px] font-extrabold">{s.v}</span>
                <span className="block text-[11px] font-bold text-[#5B667A]">{s.k}</span>
              </div>
            ))}
          </section>
          {about}
          {locations}
          {feesCard}
          {reviewsCard}
          {education}
          <PrescriptionTemplate signatureUrl={signature.data?.signedUrl ?? null} registration={license.registration} />
          {insurance}
          {links}
        </div>

        {/* Desktops */}
        <div className="hidden lg:block">
          <section className={`${card} overflow-hidden mb-5`}>
            <div className="h-[92px] bg-[#2A4DD0]" />
            <div className="flex items-end gap-5 px-[26px] pb-[22px] -mt-11">
              <span className="rounded-full shadow-[0_0_0_4px_#ffffff,0_0_0_5px_#E6EAF0]">{photo('w-24 h-24 text-[34px]')}</span>
              <span className="flex-1 min-w-0 pb-1">
                <span className="flex items-center gap-2 text-[24px] font-extrabold">
                  {name}
                  {verified}
                </span>
                <span className="block text-[14px] text-[#5B667A] truncate">
                  {[doctor.qualifications, experience, license.registration && `Reg. ${license.registration}`].filter(Boolean).join(' · ') || doctor.specialty || 'Doctor'}
                </span>
              </span>
              <span className="flex gap-2.5 shrink-0">
                <Link href={`/doctors/${doctor.id}`} className={`${btnOutline} lg:border`}>
                  <ExternalLink className="w-[15px] h-[15px]" /> View public page
                </Link>
                <ProfileEditor profile={editable} label="Edit profile" className={`${btnPrimary} [&_svg]:w-[15px] [&_svg]:h-[15px]`} />
              </span>
            </div>
            <div className="grid grid-cols-5 border-t border-[#EEF2F7]">
              {stats.map((s, i) => (
                <div key={s.k} className={`px-[22px] py-4 ${i ? 'border-l border-[#EEF2F7]' : ''}`}>
                  <span className="block text-[22px] font-extrabold">{s.v}</span>
                  <span className="block text-[12.5px] font-bold text-[#5B667A]">{s.k}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px] gap-5 items-start">
            <div className="flex flex-col gap-5 min-w-0">
              {about}
              {locations}
              {insurance}
            </div>
            <div className="flex flex-col gap-5 min-w-0">
              {reviewsCard}
              {education}
            </div>
            <div className="flex flex-col gap-5 min-w-0">
              {feesCard}
              <Panel>
                <PanelHead title="Consultations" sub="Completed, last 6 months" />
                <BarChart bars={consultBars} width={320} height={160} label={`Completed consultations by month: ${consultBars.map((b) => `${b.label} ${b.value}`).join(', ')}`} />
              </Panel>
              <PrescriptionTemplate signatureUrl={signature.data?.signedUrl ?? null} registration={license.registration} />
              {links}
            </div>
          </section>
        </div>
      </DocBody>
    </>
  )
}

function Place({ icon, title, sub, status }: { icon: ReactNode; title: string; sub: string; status: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-t border-[#EEF2F7]">
      <span className="shrink-0 w-11 h-11 rounded-[10px] bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-extrabold truncate">{title}</span>
        <span className="block text-[12.5px] text-[#5B667A]">{sub}</span>
      </span>
      <span className="shrink-0 inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#067647]">
        <span aria-hidden className="w-[7px] h-[7px] rounded-full bg-[#067647]" />
        {status}
      </span>
    </div>
  )
}

