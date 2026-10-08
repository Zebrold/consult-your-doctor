import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Award, BadgeCheck, BedDouble, Building2, CalendarClock, Check, CircleAlert, CircleCheck, CircleDashed, ExternalLink, FlaskConical, Globe, LogOut, Mail,
  MapPin, Phone, ShieldCheck, Siren, Sparkles, Stethoscope, Users, type LucideIcon,
} from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatINR } from '@/components/patient/format'
import { Avatar, Card } from '@/components/portal/ui'
import { StaffAccount } from '@/components/portal/StaffAccount'
import { loadHospitalBeds, summarizeBeds } from '@/lib/beds'
import { removeHospitalTest, saveHospitalTest } from '@/app/actions/hospital-profile'
import { TestMenu } from '@/app/diagnostic-center/_components/TestMenu'
import { isPaidVisit, loadHospitalDoctors, loadHospitalVisits, requireHospital } from '../_lib/hospital'
import { HospitalProfileEditor } from '../_components/HospitalProfileEditor'

export const metadata: Metadata = { title: 'Hospital Profile | Hospital Portal' }
export const dynamic = 'force-dynamic'

export default async function HospitalProfilePage() {
  const { admin, user, hospital, staff } = await requireHospital()
  const now = currentTime()
  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const [visits, beds, { data: me }] = await Promise.all([
    loadHospitalVisits(admin, hospital.id, doctors.map((d) => d.id)),
    loadHospitalBeds(admin, hospital.id),
    admin.from('profiles').select('full_name, phone_number, staff_id').eq('id', user.id).maybeSingle(),
  ])
  const bedSummary = summarizeBeds(beds.data)
  const paid = visits.filter(isPaidVisit)
  const patients = new Set(paid.map((v) => v.patient?.id).filter(Boolean)).size
  const thisYear = new Date(now).getFullYear()

  const departments = new Map<string, typeof doctors>()
  for (const d of doctors) departments.set(d.department, [...(departments.get(d.department) ?? []), d])
  const priced = hospital.tests.filter((t) => t.price)
  const live = hospital.status === 'active'
  const place = [hospital.address, hospital.city].filter(Boolean).join(', ')

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
  const editButton =
    'flex-1 lg:flex-initial min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold transition-colors'

  return (
    <>
      {!hospital.profileReady && (
        <p role="status" className="flex items-start gap-2 p-3.5 rounded-xl bg-error-container/60 text-on-error-container text-sm">
          <CircleAlert className="w-5 h-5 shrink-0" /> Some profile sections need a database update. Ask your administrator to run supabase/migrations/20261009_beds_reviews_profiles.sql.
        </p>
      )}

      {/* Identity banner */}
      <section className="relative w-full rounded-xl md:rounded-2xl bg-surface-container-lowest shadow-sm md:shadow-[0_4px_24px_rgba(0,102,255,0.06)] border border-surface-container md:border-transparent overflow-hidden">
        <div aria-hidden className="hidden md:block absolute top-0 right-0 w-96 h-96 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative p-4 sm:p-8 flex flex-col lg:flex-row justify-between gap-4 md:gap-6 items-stretch lg:items-center">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 min-w-0">
            <div className="relative shrink-0">
              {hospital.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hospital.image} alt={hospital.name} className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl object-cover shadow-[0_4px_16px_rgba(0,80,203,0.14)]" />
              ) : (
                <span className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary-fixed to-surface-container text-primary flex items-center justify-center shadow-[0_4px_16px_rgba(0,80,203,0.14)]">
                  <Building2 className="w-8 h-8 sm:w-11 sm:h-11" />
                </span>
              )}
              {live && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-fresh-teal ring-4 ring-surface-container-lowest flex items-center justify-center shadow-sm" title="Live for booking">
                  <Check className="w-3 h-3 text-on-primary" strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 md:gap-1.5 min-w-0">
              <span className="self-start font-label-sm text-[11px] md:text-label-sm uppercase tracking-wider text-vibrant-blue bg-primary-fixed/50 px-2.5 py-0.5 rounded-full font-semibold">
                Hospital ID #{hospital.id.slice(0, 8).toUpperCase()}
              </span>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight leading-tight truncate">{hospital.name}</h1>
              <p className="font-body-md text-[13px] md:text-body-md leading-snug text-on-surface-variant flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                <span className="font-semibold text-on-surface flex items-center gap-1 min-w-0">
                  <MapPin className="w-4 h-4 text-vibrant-blue shrink-0" />
                  <span className="truncate">{place || 'Add your address so patients can find you'}</span>
                </span>
                {hospital.establishedYear && (
                  <>
                    <span className="hidden sm:inline text-outline-variant">•</span>
                    <span>
                      Since {hospital.establishedYear} ({thisYear - hospital.establishedYear} years)
                    </span>
                  </>
                )}
                <span className="hidden sm:inline text-outline-variant">•</span>
                <span className="text-vibrant-blue font-medium">Signed in as {staff.name}</span>
              </p>
            </div>
          </div>
          <div className="flex lg:flex-col gap-2.5 w-full lg:w-auto shrink-0">
            <Link
              href={`/hospitals/${hospital.id}`}
              className="flex-1 lg:flex-initial min-h-[44px] inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-label-sm font-semibold shadow-[0_4px_16px_rgba(0,102,255,0.25)]"
            >
              <ExternalLink className="w-[18px] h-[18px]" /> <span className="truncate">View Patient Page</span>
            </Link>
            <HospitalProfileEditor hospital={editable} className={editButton} />
          </div>
        </div>
        <div className="hidden md:flex relative bg-surface-container-low px-6 py-3.5 flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Listing:</span>
          <div className="flex flex-wrap items-center gap-3">
            <Badge icon={live ? BadgeCheck : CircleDashed} tint={live ? 'text-fresh-teal' : 'text-soft-coral'}>
              {live ? 'Live for Online Booking' : 'Not Listed Yet'}
            </Badge>
            {hospital.accreditations.map((a) => (
              <Badge key={a} icon={Award} tint="text-vibrant-blue">
                {a} Accredited
              </Badge>
            ))}
            {hospital.emergencyPhone && (
              <Badge icon={Siren} tint="text-soft-coral">
                24x7 Emergency
              </Badge>
            )}
            {completeness < 100 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container/60 font-label-sm text-label-sm text-tertiary font-semibold">
                <CircleDashed className="w-4 h-4" /> Profile {completeness}% complete
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <Metric label="Doctors" icon={Stethoscope} value={String(doctors.length)} sub={`${departments.size} ${departments.size === 1 ? 'department' : 'departments'}`} />
        <Metric
          label="Inpatient Beds"
          icon={BedDouble}
          value={beds.ready ? `${bedSummary.occupied} / ${bedSummary.total}` : '—'}
          sub={beds.ready ? (bedSummary.total ? `${bedSummary.occupancy}% occupied • ${bedSummary.available} free` : 'No beds set up yet') : 'Needs the database update'}
          href="/hospital/beds"
        />
        <Metric label="Patients Served" icon={Users} value={patients.toLocaleString('en-IN')} sub="With a paid consultation" />
        <Metric label="Test Charges" icon={FlaskConical} value={String(priced.length)} sub={priced.length ? `From ${formatINR(Math.min(...priced.map((t) => t.price!)))}` : 'Add your tests below'} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-start">
        <div className="lg:col-span-7 min-w-0 flex flex-col gap-4 md:gap-6">
          <Card className="md:!rounded-2xl md:!p-7 flex flex-col gap-4">
            <Title icon={Building2} title="About the Hospital" sub="Shown on your patient page" />
            <p className="text-[14px] leading-relaxed text-on-surface-variant whitespace-pre-line">
              {hospital.about || 'Add a short description of your hospital: specialities, history and what patients can expect.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Contact icon={Phone} label="Reception" value={hospital.phone} href={hospital.phone ? `tel:${hospital.phone.replace(/[^\d+]/g, '')}` : undefined} />
              <Contact icon={Siren} label="Emergency" value={hospital.emergencyPhone} href={hospital.emergencyPhone ? `tel:${hospital.emergencyPhone.replace(/[^\d+]/g, '')}` : undefined} />
              <Contact icon={Mail} label="Email" value={hospital.email} href={hospital.email ? `mailto:${hospital.email}` : undefined} />
              <Contact icon={Globe} label="Website" value={hospital.website} href={hospital.website && /^https?:\/\//i.test(hospital.website) ? hospital.website : undefined} />
            </div>
          </Card>

          <Card className="md:!rounded-2xl md:!p-7 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <Title icon={Stethoscope} title="Departments & Doctors" sub="Your roster, by department" />
              <Link href="/hospital/doctors" className="font-label-sm text-label-sm text-primary font-semibold hover:underline shrink-0">
                Manage Roster
              </Link>
            </div>
            {doctors.length === 0 ? (
              <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600 text-center">No doctors yet. Add them from the Duty Roster.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {Array.from(departments.entries()).map(([dept, list]) => (
                  <div key={dept} className="p-3 rounded-xl bg-surface-container-low">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-[14px] text-on-surface">{dept}</span>
                      <span className="text-[12px] text-indigo-gray-600">
                        {list.length} {list.length === 1 ? 'doctor' : 'doctors'}
                      </span>
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {list.map((d) => (
                        <li key={d.id} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-surface-container-lowest">
                          <Avatar name={d.name} image={d.image} className="w-7 h-7 text-[10px]" />
                          <span className="text-[13px] font-semibold text-on-surface">{doctorName(d.name)}</span>
                          {d.fee != null && <span className="text-[12px] text-indigo-gray-600">{formatINR(d.fee)}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card id="tests" className="md:!rounded-2xl md:!p-7 flex flex-col gap-4">
            <Title icon={FlaskConical} title="Test Charges" sub="Lab tests and investigations done at your hospital, with the amount for each" />
            {hospital.profileReady ? (
              <TestMenu
                tests={hospital.tests}
                actions={{ save: saveHospitalTest, remove: removeHospitalTest }}
                bookable={false}
                note="These amounts show on your hospital page so patients know the charges before they come in."
              />
            ) : (
              <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600">Test charges open up after the database update.</p>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5 min-w-0 flex flex-col gap-4 md:gap-6">
          <Card className="md:!rounded-2xl md:!p-7 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <Title icon={ShieldCheck} title="Insurance Accepted" sub="Cashless and reimbursement" />
              <span className="font-label-sm text-[12px] text-secondary font-semibold shrink-0">{hospital.insurance.length} listed</span>
            </div>
            <ChipList items={hospital.insurance} empty="Add the insurers and schemes you accept." />
          </Card>

          <Card className="md:!rounded-2xl md:!p-7 flex flex-col gap-4">
            <Title icon={Sparkles} title="Facilities & Accreditations" sub="What your hospital offers" />
            <ChipList items={hospital.facilities} empty="Add your facilities, e.g. ICU, pharmacy, blood bank." />
            {hospital.accreditations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hospital.accreditations.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/60 text-on-secondary-container font-label-sm text-[12px] font-bold">
                    <Award className="w-3.5 h-3.5" /> {a}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {completeness < 100 && (
            <Card className="md:!rounded-2xl md:!p-7">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-fresh-teal">
                  <CircleCheck className="w-5 h-5" />
                  <h2 className="font-title-md text-[16px] md:text-title-md text-on-surface font-semibold">Profile Checklist</h2>
                </div>
                <span className="font-title-md text-[16px] font-bold text-vibrant-blue">{completeness}%</span>
              </div>
              <ul className="flex flex-col gap-2">
                {checks.map((c) => (
                  <li key={c.label} className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between gap-2.5 text-[13px]">
                    <span className={c.done ? 'text-indigo-gray-900 font-medium' : 'text-indigo-gray-600'}>{c.label}</span>
                    {c.done ? <CircleCheck className="w-5 h-5 text-fresh-teal" /> : <CircleDashed className="w-5 h-5 text-outline" />}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="flex items-center gap-2 px-1">
            <CalendarClock className="w-4 h-4 text-indigo-gray-600" />
            <h2 className="font-title-md text-[15px] font-bold text-on-surface">My Sign-in Details</h2>
          </div>
          <StaffAccount name={me?.full_name ?? ''} phone={me?.phone_number ?? null} staffId={me?.staff_id ?? null} roleLabel="Hospital admin" />

          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-fresh-teal">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-title-md text-[15px] font-bold text-on-surface">Partner Terms &amp; Compliance</h3>
            </div>
            <p className="text-label-sm text-on-surface-variant text-[12px]">
              Review hospital partner agreements, inpatient care standards, and DPDP Act patient confidentiality.
            </p>
            <div className="flex flex-col gap-2 pt-1 border-t border-surface-container-high/70">
              <Link
                href="/terms-of-use"
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors text-xs font-semibold text-on-surface"
              >
                <span>Terms &amp; Conditions</span>
                <span className="text-vibrant-blue font-bold">View →</span>
              </Link>
              <Link
                href="/privacy-policy"
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors text-xs font-semibold text-on-surface"
              >
                <span>Privacy Policy</span>
                <span className="text-vibrant-blue font-bold">View →</span>
              </Link>
            </div>
          </div>

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

function Badge({ icon: Icon, tint, children }: { icon: LucideIcon; tint: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest shadow-sm font-label-sm text-label-sm text-on-surface font-medium">
      <Icon className={`w-4 h-4 ${tint}`} /> {children}
    </span>
  )
}

function Metric({ label, icon: Icon, value, sub, href }: { label: string; icon: LucideIcon; value: string; sub: string; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="font-label-sm text-[11px] md:text-label-sm text-on-surface-variant font-medium truncate">{label}</span>
        <span className="hidden md:flex w-8 h-8 rounded-xl items-center justify-center shrink-0 bg-primary-fixed/40 text-vibrant-blue">
          <Icon className="w-[18px] h-[18px]" />
        </span>
      </div>
      <span className="mt-2.5 md:mt-4 font-headline-lg-mobile md:font-title-md text-[22px] md:text-title-md font-bold text-on-surface tracking-tight">{value}</span>
      <p className="font-label-sm text-[11px] md:text-label-sm text-outline mt-1 truncate">{sub}</p>
    </>
  )
  const cls = 'bg-surface-container-lowest p-3.5 md:p-5 rounded-xl md:rounded-2xl shadow-sm md:shadow-[0_2px_12px_rgba(0,102,255,0.04)] border border-surface-container md:border-transparent flex flex-col min-w-0'
  return href ? (
    <Link href={href} className={`${cls} hover:shadow-md transition-shadow`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function Title({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="hidden sm:flex w-9 h-9 rounded-xl bg-primary-fixed/40 items-center justify-center text-vibrant-blue shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <h2 className="font-title-md text-title-md text-on-surface font-bold">{title}</h2>
        <p className="font-label-sm text-[12px] md:text-label-sm text-on-surface-variant">{sub}</p>
      </div>
    </div>
  )
}

function Contact({ icon: Icon, label, value, href }: { icon: LucideIcon; label: string; value: string | null; href?: string }) {
  const inner = (
    <>
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wider font-semibold text-indigo-gray-600">{label}</span>
        <span className={`block text-[13px] font-semibold truncate ${value ? 'text-on-surface' : 'text-outline'}`}>{value || 'Not added'}</span>
      </span>
    </>
  )
  const cls = 'p-3 rounded-xl bg-surface-container-low flex items-center gap-2.5 min-w-0'
  return value && href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={`${cls} hover:bg-surface-container transition-colors`}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

function ChipList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="p-3 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600">{empty}</p>
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((i) => (
        <li key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-[13px] font-semibold text-on-surface">
          <CircleCheck className="w-3.5 h-3.5 text-fresh-teal" /> {i}
        </li>
      ))}
    </ul>
  )
}
