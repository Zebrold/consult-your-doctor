import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Building2, Check, CircleAlert, ExternalLink } from 'lucide-react'
import { toLatLng } from '@/lib/geo'
import { currentTime } from '@/components/patient/data'
import { IST, formatINR, formatShortDate, istDateKey } from '@/components/patient/format'
import { RemoteImage } from '@/components/RemoteImage'
import { StaffAccount } from '@/components/portal/StaffAccount'
import { loadHospitalBeds, summarizeBeds } from '@/lib/beds'
import { loadHospitalReviews } from '@/lib/reviews'
import { removeHospitalTest, saveHospitalTest } from '@/app/actions/hospital-profile'
import { TestMenu } from '@/app/diagnostic-center/_components/TestMenu'
import { dayOf, isPaidVisit, loadHospitalDoctors, loadHospitalVisits, requireHospital } from '../_lib/hospital'
import { HospitalProfileEditor } from '../_components/HospitalProfileEditor'
import { BarChart, EmptyLine, HosBackHeader, HosBody, Meter, MoreLink, Panel, PanelHead, PhoneStats, Row, Verified, btnOutline, btnPrimary, card, plural, telHref } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Hospital Profile | Hospital Portal' }
export const dynamic = 'force-dynamic'

const stars = (n: number) => '★'.repeat(Math.round(n))

export default async function HospitalProfilePage() {
  const { admin, user, hospital } = await requireHospital()
  const now = currentTime()
  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const [visits, beds, reviews, { data: me }, { data: pin }] = await Promise.all([
    loadHospitalVisits(admin, hospital.id, doctors.map((d) => d.id)),
    loadHospitalBeds(admin, hospital.id),
    loadHospitalReviews(admin, hospital.id),
    admin.from('profiles').select('full_name, phone_number, staff_id').eq('id', user.id).maybeSingle(),
    // The map pin (20261014_facility_locations.sql); null until that migration has run.
    admin.from('hospitals').select('latitude, longitude').eq('id', hospital.id).maybeSingle(),
  ])
  const bedSummary = summarizeBeds(beds.data)
  const paid = visits.filter(isPaidVisit)
  const patients = new Set(paid.map((v) => v.patient?.id).filter(Boolean)).size
  const thisYear = new Date(now).getFullYear()
  const { summary, reviews: latest } = reviews

  const departments = new Map<string, typeof doctors>()
  for (const d of doctors) departments.set(d.department, [...(departments.get(d.department) ?? []), d])
  const priced = hospital.tests.filter((t) => t.price)
  const live = hospital.status === 'active'
  const place = [hospital.address, hospital.city].filter(Boolean).join(', ')
  const hospitalId = hospital.id.slice(0, 8).toUpperCase()

  const checks = [
    { label: 'Hospital name and address', done: !!hospital.name && !!hospital.address && !!hospital.city },
    { label: 'Photo of the hospital', done: !!hospital.image },
    { label: 'Reception or emergency phone', done: !!(hospital.phone || hospital.emergencyPhone) },
    { label: 'About the hospital', done: !!hospital.about },
    { label: 'Facilities', done: hospital.facilities.length > 0 },
    { label: 'Insurance accepted', done: hospital.insurance.length > 0 },
    { label: 'Inpatient beds', done: bedSummary.total > 0 },
    { label: 'Test charges', done: priced.length > 0 },
  ]
  const completeness = Math.round((checks.filter((c) => c.done).length / checks.length) * 100)

  // Paid consultations in each of the last six months
  const month = istDateKey(now).slice(0, 7)
  const months = Array.from({ length: 6 }, (_, i) => {
    const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 - (5 - i)
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
  })
  const monthBars = months.map((m) => ({
    label: new Date(`${m}-15T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: IST, month: 'short' }),
    value: paid.filter((v) => dayOf(v.start ?? v.createdAt)?.startsWith(m)).length,
    active: m === month,
  }))

  const editable = {
    name: hospital.name,
    city: hospital.city,
    address: hospital.address,
    phone: hospital.phone,
    email: hospital.email,
    emergencyPhone: hospital.emergencyPhone,
    website: hospital.website,
    about: hospital.about,
    establishedYear: hospital.establishedYear,
    facilities: hospital.facilities,
    accreditations: hospital.accreditations,
    insurance: hospital.insurance,
  }
  const location = toLatLng(pin?.latitude, pin?.longitude)
  const addLink = (label: string) => <HospitalProfileEditor hospital={editable} location={location} label={label} icon={false} className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0] hover:underline" />

  const rating = summary.average != null ? summary.average.toFixed(1) : '—'
  const ratingNote = summary.count ? `from ${plural(summary.count, 'review')}` : 'No reviews yet'
  const photo = (size: number, className: string) =>
    hospital.image ? (
      <RemoteImage src={hospital.image} alt={hospital.name} width={size} height={size} load="eager" className={`object-cover shrink-0 ${className}`} />
    ) : (
      <span className={`shrink-0 bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center ${className}`}>
        <Building2 className="w-1/2 h-1/2" strokeWidth={1.6} />
      </span>
    )

  const contacts: [string, ReactNode][] = [
    ['Reception', hospital.phone ? <a href={telHref(hospital.phone)}>{hospital.phone}</a> : null],
    ['Emergency', hospital.emergencyPhone ? <a href={telHref(hospital.emergencyPhone)}>{hospital.emergencyPhone}</a> : null],
    ['Email', hospital.email ? <a href={`mailto:${hospital.email}`}>{hospital.email}</a> : null],
    ['Website', hospital.website && /^https?:\/\//i.test(hospital.website) ? <a href={hospital.website} target="_blank" rel="noopener noreferrer">{hospital.website.replace(/^https?:\/\//i, '')}</a> : hospital.website],
    ['Address', place || null],
    ['Established', hospital.establishedYear ? `${hospital.establishedYear} (${thisYear - hospital.establishedYear} years)` : null],
  ]

  const about = (
    <Panel>
      <PanelHead title="About the hospital" sub="Shown on your patient page" />
      <p className="mt-2.5 mb-2 text-[13.5px] leading-[1.55] text-[#27324A] whitespace-pre-line">
        {hospital.about || 'Add a short description of your hospital: specialities, history and what patients can expect.'}
      </p>
      {contacts.map(([label, value]) => (
        <Row key={label} label={label}>
          {value ?? <span className="font-bold text-[#98A2B3]">Not added</span>}
        </Row>
      ))}
    </Panel>
  )

  const departmentsCard = (
    <Panel>
      <PanelHead title="Departments & fees" sub="Consultation fee paid at the desk" right={<MoreLink href="/hospital/doctors">Roster</MoreLink>} />
      {departments.size === 0 ? (
        <EmptyLine>No doctors yet. Add them from the duty roster.</EmptyLine>
      ) : (
        Array.from(departments.entries()).map(([dept, list]) => {
          const fees = list.map((d) => d.fee).filter((f): f is number => f != null)
          const low = Math.min(...fees)
          const high = Math.max(...fees)
          return (
            <div key={dept} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7]">
              <span className="min-w-0">
                <span className="block text-[13.5px] font-extrabold truncate">{dept}</span>
                <span className="block text-[12px] text-[#5B667A]">{plural(list.length, 'doctor')}</span>
              </span>
              <span className="text-[14px] font-extrabold shrink-0">{fees.length === 0 ? '—' : low === high ? formatINR(low) : `${formatINR(low)} – ${formatINR(high)}`}</span>
            </div>
          )
        })
      )}
    </Panel>
  )

  const tests = (
    <Panel id="tests" className="scroll-mt-24">
      <PanelHead title="Test charges" sub="Lab tests and investigations at your hospital, with the amount for each" />
      {hospital.profileReady ? (
        <TestMenu
          tests={hospital.tests}
          actions={{ save: saveHospitalTest, remove: removeHospitalTest }}
          bookable={false}
          note="These amounts show on your hospital page so patients know the charges before they come in."
        />
      ) : (
        <EmptyLine>Test charges open up after the database update.</EmptyLine>
      )}
    </Panel>
  )

  const insurance = (
    <Panel>
      <PanelHead title="Insurance accepted" sub="Cashless and reimbursement" right={addLink('+ Add')} />
      {hospital.insurance.length === 0 ? (
        <EmptyLine>Add the insurers and schemes you accept.</EmptyLine>
      ) : (
        <ul>
          {hospital.insurance.map((i) => (
            <li key={i} className="py-2.5 border-t border-[#EEF2F7] text-[13.5px] font-bold">
              {i}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )

  const reviewsCard = (
    <Panel>
      <PanelHead title="Patient reviews" sub={summary.count ? `${rating} average from ${plural(summary.count, 'review')}` : 'Patients can rate your hospital after a visit'} />
      {summary.count === 0 ? (
        <EmptyLine>No reviews yet.</EmptyLine>
      ) : (
        <>
          {([5, 4, 3, 2, 1] as const).map((n) => (
            <div key={n} className="grid grid-cols-[34px_minmax(0,1fr)_44px] gap-2.5 items-center py-[5px] text-[12.5px] font-bold">
              <span>{n} ★</span>
              <span className="block h-1.5 rounded-full bg-[#EEF2F7] overflow-hidden">
                <span className="block h-full rounded-full bg-[#E0A100]" style={{ width: `${(summary.distribution[n] / summary.count) * 100}%` }} />
              </span>
              <span className="text-right text-[#5B667A]">{summary.distribution[n]}</span>
            </div>
          ))}
          {latest.map((r) => (
            <div key={r.id} className="py-3.5 border-t border-[#EEF2F7] first-of-type:mt-2">
              <div className="flex justify-between gap-3">
                <span className="text-[13.5px] font-extrabold">{r.patientName}</span>
                <span aria-label={`${r.rating} out of 5`} className="text-[12.5px] font-extrabold text-[#B54708]">
                  {stars(r.rating)}
                </span>
              </div>
              <p className="mt-1 text-[13.5px] leading-[1.5] text-[#27324A]">{r.comment}</p>
              <p className="mt-1 text-[12px] text-[#5B667A]">{formatShortDate(r.createdAt)}</p>
            </div>
          ))}
        </>
      )}
    </Panel>
  )

  const offers = [...hospital.facilities, ...hospital.accreditations.map((a) => `${a} accredited`)]
  const facilities = (
    <Panel>
      <PanelHead title="Facilities & accreditations" sub="What your hospital offers" right={addLink('+ Add')} />
      {offers.length === 0 ? (
        <EmptyLine>Add your facilities, e.g. ICU, pharmacy, blood bank.</EmptyLine>
      ) : (
        <ul className="grid grid-cols-2 gap-x-5">
          {offers.map((f) => (
            <li key={f} className="py-2.5 border-b border-[#EEF2F7] text-[13.5px] font-bold">
              {f}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )

  const checklist = (
    <Panel>
      <PanelHead title="Profile checklist" sub={`${completeness}% complete`} />
      <div className="mt-3 mb-1.5">
        <Meter pct={completeness} label={`Profile ${completeness}% complete`} />
      </div>
      <ul>
        {checks.map((c) => (
          <li key={c.label} className={`flex items-center justify-between gap-3 py-3 lg:py-[11px] border-t border-[#EEF2F7] text-[14px] lg:text-[13.5px] font-bold ${c.done ? '' : 'text-[#5B667A]'}`}>
            {c.label}
            <span aria-label={c.done ? 'Done' : 'Not done'} className={`w-[22px] h-[22px] lg:w-5 lg:h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${c.done ? 'bg-[#067647] border-[#067647]' : 'bg-white border-[#B7C1D1]'}`}>
              {c.done && <Check className="w-3 h-3 text-white" strokeWidth={3.2} />}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )

  const bookings = (
    <Panel>
      <PanelHead title="Bookings" sub="Paid consultations, last 6 months" />
      <BarChart bars={monthBars} label="Paid consultations each month, last 6 months" width={320} height={170} />
    </Panel>
  )

  const account = (
    <section id="account" className="scroll-mt-24">
      <h2 className="px-1 mb-2 text-[16px] font-extrabold">My sign-in details</h2>
      <StaffAccount name={me?.full_name ?? ''} phone={me?.phone_number ?? null} staffId={me?.staff_id ?? null} roleLabel="Hospital admin" />
    </section>
  )

  return (
    <>
      <HosBackHeader backHref="/hospital/more" backLabel="Back to more" title="Hospital profile">
        <div className="flex items-center gap-3.5 mt-3 mx-1">
          {photo(72, 'w-[72px] h-[72px] rounded-2xl shadow-[0_0_0_2px_#fff]')}
          <span className="min-w-0">
            <span className="block text-[12px] font-bold text-[#CFDCFF]">Hospital ID {hospitalId}</span>
            <span className="flex items-center gap-1.5 text-[22px] font-extrabold leading-tight">
              <span className="truncate">{hospital.name}</span>
              {live && <Verified />}
            </span>
            <span className="block text-[13px] text-[#DCE6FF] truncate">{place || 'Add your address so patients can find you'}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link href={`/hospitals/${hospital.id}`} className="h-[42px] px-3 rounded-[11px] bg-white text-[#2A4DD0] text-[13.5px] font-extrabold flex items-center justify-center gap-1.5">
            <ExternalLink className="w-4 h-4" /> View patient page
          </Link>
          <HospitalProfileEditor
            hospital={editable}
            location={location}
            label="Edit profile"
            className="h-[42px] px-3 rounded-[11px] border border-white/40 text-white text-[13.5px] font-extrabold flex items-center justify-center gap-1.5"
          />
        </div>
      </HosBackHeader>
      <HosBody>
        {!hospital.profileReady && (
          <p role="status" className="flex items-start gap-2 mb-3.5 lg:mb-5 p-3.5 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13px] font-bold">
            <CircleAlert className="w-5 h-5 shrink-0" /> Some profile sections need a database update. Ask your administrator to run supabase/migrations/20261009_beds_reviews_profiles.sql.
          </p>
        )}

        {/* Desktop banner */}
        <section className={`hidden lg:block ${card} overflow-hidden mb-5`}>
          <div className="h-[92px] bg-[#2A4DD0]" />
          <div className="flex items-end gap-5 px-[26px] pb-[22px] -mt-11">
            {photo(96, 'w-24 h-24 rounded-[20px] shadow-[0_0_0_4px_#fff,0_0_0_5px_#E6EAF0]')}
            <span className="flex-1 min-w-0 pb-1">
              <span className="flex items-center gap-2 text-[24px] font-extrabold">
                <span className="truncate">{hospital.name}</span>
                {live && <Verified />}
              </span>
              <span className="block text-[14px] text-[#5B667A] truncate">
                {[bedSummary.total ? plural(bedSummary.total, 'bed') : null, place || null, `Hospital ID ${hospitalId}`, live ? 'Live for booking' : 'Not listed yet'].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="flex gap-2.5 shrink-0">
              <Link href={`/hospitals/${hospital.id}`} className={btnOutline}>
                <ExternalLink className="w-4 h-4" /> View patient page
              </Link>
              <HospitalProfileEditor hospital={editable} location={location} label="Edit profile" className={btnPrimary} />
            </span>
          </div>
          <div className="grid grid-cols-5 border-t border-[#EEF2F7]">
            {[
              [String(doctors.length), `Doctors · ${plural(departments.size, 'department')}`],
              [beds.ready && bedSummary.total ? `${bedSummary.occupied} / ${bedSummary.total}` : '—', 'Beds in use'],
              [patients.toLocaleString('en-IN'), 'Patients served'],
              [summary.count ? `${rating} ★` : '—', summary.count ? plural(summary.count, 'review') : 'No reviews yet'],
              [`${completeness}%`, 'Profile complete'],
            ].map(([value, label], i) => (
              <div key={label} className={`px-[22px] py-4 ${i ? 'border-l border-[#EEF2F7]' : ''}`}>
                <span className="block text-[22px] font-extrabold">{value}</span>
                <span className="block text-[12.5px] font-bold text-[#5B667A]">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <PhoneStats
          className="mb-3.5"
          stats={[
            { label: 'Doctors', value: doctors.length, note: plural(departments.size, 'department') },
            { label: 'Inpatient beds', value: beds.ready && bedSummary.total ? `${bedSummary.occupied} / ${bedSummary.total}` : '—', note: bedSummary.total ? 'in use' : 'No beds set up', color: '#2A4DD0' },
            { label: 'Patients served', value: patients.toLocaleString('en-IN'), note: 'with a paid consultation', color: '#067647' },
            { label: 'Rating', value: rating, note: ratingNote },
          ]}
        />

        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px] lg:gap-5 lg:items-start">
          <div className="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0">
            {about}
            {departmentsCard}
          </div>
          <div className="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0">
            {insurance}
            {reviewsCard}
            {facilities}
          </div>
          <div className="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0">
            {checklist}
            {bookings}
          </div>
        </div>
        {/* Forms that need the room: full width under the cards */}
        <div className="flex flex-col gap-3.5 mt-3.5 lg:gap-5 lg:mt-5">
          {tests}
          {account}
        </div>
      </HosBody>
    </>
  )
}
