import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  BadgeCheck, Building2, CalendarCheck, Check, CircleCheck, CircleDashed, ExternalLink, FileCheck2, Globe, KeyRound, ListChecks, LogOut,
  MapPin, ShieldCheck, Store, TrendingUp, Users, type LucideIcon,
} from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { formatINR, formatShortDate, initials, istDateKey } from '@/components/patient/format'
import { Card } from '@/components/portal/ui'
import { DIAGNOSTIC_PLATFORM_FEE, pricedTests } from '@/lib/pricing'
import { awaitingReport, bookingCode, isPaid, loadLabBookings, requireCenter, shiftDay } from '../_lib/lab'
import { LabProfileEditor } from '../_components/LabProfileEditor'

export const metadata: Metadata = { title: 'Profile | Diagnostic Center' }
export const dynamic = 'force-dynamic'

export default async function LabProfilePage() {
  const { admin, lab, staff } = await requireCenter()
  const now = currentTime()
  const month = istDateKey(now).slice(0, 7)
  const lastMonth = shiftDay(`${month}-01`, -1).slice(0, 7)

  const [bookings, { data: logins }] = await Promise.all([
    loadLabBookings(admin, lab),
    admin.from('profiles').select('id, full_name, email').eq('diagnostic_center_id', lab.id).eq('role', 'diagnostic_admin'),
  ])
  const paid = bookings.filter(isPaid)
  const patients = new Set(paid.map((b) => b.patient?.id).filter(Boolean)).size
  const firstDay = new Map<string, string>()
  for (const b of paid) if (b.patient && b.date && (!firstDay.has(b.patient.id) || b.date < firstDay.get(b.patient.id)!)) firstDay.set(b.patient.id, b.date)
  const newThisMonth = Array.from(firstDay.values()).filter((d) => d.slice(0, 7) === month).length
  const thisMonth = paid.filter((b) => b.date?.slice(0, 7) === month).length
  const prevMonth = paid.filter((b) => b.date?.slice(0, 7) === lastMonth).length
  const sent = paid.filter((b) => b.status === 'report_sent').length
  const collected = paid.filter((b) => b.status !== 'confirmed').length
  const waiting = paid.filter(awaitingReport).length
  const reportRate = collected ? Math.floor((sent / collected) * 100) : null

  const priced = pricedTests(lab.prices)
  const unpriced = lab.tests.length - priced.length
  const prices = priced.map((t) => t.price)
  const live = lab.status === 'active'
  const place = [lab.address, lab.city].filter(Boolean).join(', ')

  const checks = [
    { label: 'Center name', done: !!lab.name },
    { label: 'City', done: !!lab.city },
    { label: 'Street address', done: !!lab.address },
    { label: 'Photo of the center', done: !!lab.image },
    { label: 'At least one priced test', done: priced.length > 0 },
  ]
  const completeness = Math.round((checks.filter((c) => c.done).length / checks.length) * 100)
  const staffList = ((logins ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((p) => ({
    id: p.id,
    name: p.full_name || 'Lab staff',
    email: p.email && !p.email.endsWith('.internal') ? p.email : null,
  }))

  const counts = new Map<string, number>()
  for (const b of paid) for (const t of b.tests) counts.set(t.name, (counts.get(t.name) ?? 0) + 1)
  const popular = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const badges: { icon: LucideIcon; iconClass: string; title: string; sub: string }[] = [
    live
      ? { icon: BadgeCheck, iconClass: 'text-fresh-teal', title: 'Live for Online Booking', sub: 'Patients can find and book you' }
      : { icon: CircleDashed, iconClass: 'text-soft-coral', title: 'Not Listed Yet', sub: 'Ask the team to go live' },
    { icon: ShieldCheck, iconClass: 'text-vibrant-blue', title: 'Online Payments', sub: 'Paid before the visit' },
    { icon: FileCheck2, iconClass: 'text-secondary', title: 'Digital Reports', sub: 'Sent to patient accounts' },
    { icon: Store, iconClass: 'text-fresh-teal', title: 'Walk-in Bookings', sub: 'Booked at your desk' },
  ]

  return (
    <>
      {/* Identity banner */}
      <section className="relative w-full rounded-xl md:rounded-2xl bg-surface-container-lowest shadow-sm md:shadow-[0_4px_24px_rgba(0,102,255,0.06)] border border-surface-container md:border-transparent overflow-hidden">
        <div aria-hidden className="hidden md:block absolute top-0 right-0 w-96 h-96 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div aria-hidden className="hidden md:block absolute bottom-0 left-1/3 w-80 h-80 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none -mb-24" />
        <div className="relative p-4 sm:p-8 flex flex-col lg:flex-row justify-between gap-4 md:gap-6 items-stretch lg:items-center">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 min-w-0">
            <div className="relative shrink-0">
              {lab.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lab.image} alt={lab.name} className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl object-cover shadow-[0_4px_16px_rgba(0,80,203,0.14)]" />
              ) : (
                <span className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary-fixed to-surface-container text-primary flex items-center justify-center shadow-[0_4px_16px_rgba(0,80,203,0.14)]">
                  <Building2 className="w-8 h-8 sm:w-11 sm:h-11" />
                </span>
              )}
              {live && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-fresh-teal ring-4 ring-surface-container-lowest flex items-center justify-center shadow-sm" title="Live for online booking">
                  <Check className="w-3 h-3 text-on-primary" strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 md:gap-1.5 min-w-0">
              <span className="self-start font-label-sm text-[11px] md:text-label-sm uppercase tracking-wider text-vibrant-blue bg-primary-fixed/50 px-2.5 py-0.5 rounded-full font-semibold">
                Center ID #{bookingCode(lab.id)}
              </span>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight leading-tight truncate">{lab.name}</h1>
              <p className="font-body-md text-[13px] md:text-body-md leading-snug text-on-surface-variant flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                <span className="font-semibold text-on-surface flex items-center gap-1 min-w-0">
                  <MapPin className="w-4 h-4 text-vibrant-blue shrink-0" />
                  <span className="truncate">{place || 'Add your address so patients can find you'}</span>
                </span>
                <span className="hidden sm:inline text-outline-variant">•</span>
                <span className="text-vibrant-blue font-medium">Signed in as {staff.name}</span>
                {lab.createdAt && (
                  <>
                    <span className="hidden sm:inline text-outline-variant">•</span>
                    <span className="hidden sm:inline">Listed since {formatShortDate(lab.createdAt)}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex lg:flex-col gap-2.5 w-full lg:w-auto shrink-0">
            <Link
              href={`/book/diagnostic/${lab.id}`}
              className="flex-1 lg:flex-initial min-h-[44px] inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-label-sm font-semibold shadow-[0_4px_16px_rgba(0,102,255,0.25)] md:hover:scale-[1.02] transition-transform"
            >
              <ExternalLink className="w-[18px] h-[18px]" />
              <span className="truncate">View Patient Page</span>
            </Link>
            <LabProfileEditor
              name={lab.name}
              city={lab.city}
              address={lab.address}
              label="Edit Details"
              className="lg:flex-initial min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold transition-colors"
            />
          </div>
        </div>

        {/* Listing strip (desktop) */}
        <div className="hidden md:flex relative bg-surface-container-low px-6 py-3.5 flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Listing &amp; Booking:</span>
          <div className="flex flex-wrap items-center gap-3">
            {badges.map((b) => (
              <span key={b.title} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest shadow-sm font-label-sm text-label-sm text-on-surface font-medium">
                <b.icon className={`w-4 h-4 ${b.iconClass}`} /> {b.title}
              </span>
            ))}
            {completeness < 100 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container/60 font-label-sm text-label-sm text-tertiary font-semibold">
                <CircleDashed className="w-4 h-4" /> Listing {completeness}% complete
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Listing chips (phone) */}
      <section className="md:hidden flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-indigo-gray-600 font-semibold">Listing &amp; Booking</span>
          <span className={`font-label-sm text-[11px] font-semibold flex items-center gap-1 ${live ? 'text-fresh-teal' : 'text-soft-coral'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-fresh-teal animate-pulse' : 'bg-soft-coral'}`} /> {live ? 'Active' : 'Not listed'}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {badges.map((b) => (
            <div key={b.title} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-lowest shadow-sm">
              <span className={`w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center ${b.iconClass}`}>
                <b.icon className="w-4 h-4" />
              </span>
              <span className="flex flex-col">
                <span className="font-label-sm text-[12px] font-semibold text-on-surface leading-tight">{b.title}</span>
                <span className="font-body-md text-[10px] text-indigo-gray-600">{b.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="flex flex-col gap-2 md:gap-0">
        <div className="md:hidden flex items-center justify-between px-1">
          <h2 className="font-title-md text-title-md text-on-surface">Center Overview</h2>
          <span className="font-label-sm text-[11px] text-indigo-gray-600">From your bookings</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          <Metric
            label="Test Menu"
            icon={ListChecks}
            tint="bg-secondary-container/40 text-secondary"
            value={`${priced.length} / ${lab.tests.length}`}
            note={unpriced ? `${unpriced} need price` : 'All priced'}
            noteClass={unpriced ? 'text-soft-coral' : 'text-fresh-teal'}
            pct={lab.tests.length ? (priced.length / lab.tests.length) * 100 : 0}
            bar="bg-fresh-teal"
            sub={lab.tests.length ? lab.tests.slice(0, 3).map((t) => t.name).join(', ') : 'Add tests on the Schedule page'}
          />
          <Metric
            label="This Month"
            icon={TrendingUp}
            tint="bg-primary-fixed/40 text-vibrant-blue"
            value={String(thisMonth)}
            note="Bookings"
            noteClass="text-on-surface-variant"
            pct={Math.max(thisMonth, prevMonth) ? (thisMonth / Math.max(thisMonth, prevMonth)) * 100 : 0}
            bar="bg-vibrant-blue"
            sub={`${prevMonth} last month • paid, by booked day`}
          />
          <Metric
            label="Patients Served"
            icon={Users}
            tint="bg-surface-container text-on-surface"
            value={patients.toLocaleString('en-IN')}
            note={newThisMonth ? `+${newThisMonth} this month` : 'With a paid booking'}
            noteClass="text-fresh-teal"
            pct={patients ? (newThisMonth / patients) * 100 : 0}
            bar="bg-secondary"
            sub={`${newThisMonth} new ${newThisMonth === 1 ? 'patient' : 'patients'} this month`}
          />
          <Metric
            label="Report Rate"
            icon={FileCheck2}
            tint="bg-secondary-fixed/50 text-secondary"
            value={reportRate != null ? `${reportRate}%` : '—'}
            note={`${sent} sent`}
            noteClass="text-fresh-teal"
            pct={reportRate ?? 0}
            bar="bg-fresh-teal"
            sub={waiting ? `${waiting} ${waiting === 1 ? 'sample' : 'samples'} awaiting report` : 'Every collected sample reported'}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-start">
        <div className="lg:col-span-7 min-w-0 flex flex-col gap-4 md:gap-6">
          {/* Portal access */}
          <Card className="md:!rounded-2xl md:!p-7 flex flex-col gap-3 md:gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="hidden sm:flex w-9 h-9 rounded-xl bg-primary-fixed/40 items-center justify-center text-vibrant-blue shrink-0">
                  <KeyRound className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">Portal Access &amp; Staff</h2>
                  <p className="font-label-sm text-[12px] md:text-label-sm text-on-surface-variant">People who can sign in to this portal</p>
                </div>
              </div>
              <span className="px-2 md:px-0 py-0.5 md:py-0 rounded-full bg-surface-container md:bg-transparent font-label-sm text-[10px] md:text-label-sm text-vibrant-blue font-semibold shrink-0">
                {staffList.length} {staffList.length === 1 ? 'Login' : 'Logins'}
              </span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-4">
              {staffList.map((p, i) => (
                <li key={p.id} className="p-2.5 md:p-4 rounded-xl bg-surface-container-low flex items-center gap-3 md:gap-3.5">
                  <span
                    className={`w-11 h-11 md:w-12 md:h-12 rounded-full md:rounded-xl flex items-center justify-center font-bold font-title-md text-[14px] shrink-0 ${
                      i % 2 ? 'bg-secondary-fixed text-secondary' : 'bg-primary-fixed text-vibrant-blue'
                    }`}
                  >
                    {initials(p.name)}
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-title-md text-[14px] md:font-body-md md:text-body-md font-bold text-on-surface truncate">{p.name}</h3>
                      {p.id === staff.id && <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-[10px] font-semibold shrink-0">You</span>}
                    </div>
                    <span className="font-label-sm text-[12px] md:text-label-sm text-vibrant-blue font-medium truncate">{p.email ?? 'Staff login'}</span>
                    <span className="hidden md:block font-label-sm text-label-sm text-outline">Diagnostic center admin</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-indigo-gray-600">To add or remove a login, contact the Consult Your Doctor team.</p>
          </Card>

          {/* Popular tests */}
          <Card className="md:!rounded-2xl md:!p-7 flex flex-col gap-3 md:gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="hidden sm:flex w-9 h-9 rounded-xl bg-secondary-container/40 items-center justify-center text-secondary">
                  <TrendingUp className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-title-md text-title-md text-on-surface font-bold">Popular Tests</h2>
                  <p className="font-label-sm text-[12px] md:text-label-sm text-on-surface-variant">Most booked at your center</p>
                </div>
              </div>
              <Link href="/diagnostic-center/schedule#tests" className="font-label-sm text-label-sm text-primary font-semibold hover:underline shrink-0">
                Manage Prices
              </Link>
            </div>
            {popular.length === 0 ? (
              <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600 text-center">No paid bookings yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {popular.map(([name, count]) => (
                  <li key={name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="font-semibold text-indigo-gray-900 truncate">{name}</span>
                      <span className="text-indigo-gray-600 shrink-0">
                        {count} {count === 1 ? 'booking' : 'bookings'}
                        {lab.prices[name] != null && <span className="text-primary font-semibold"> • {formatINR(lab.prices[name])}</span>}
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                      <div className="bg-vibrant-blue h-full rounded-full" style={{ width: `${(count / popular[0][1]) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5 min-w-0 flex flex-col gap-4 md:gap-6">
          {/* Booking & delivery */}
          <Card className="md:!rounded-2xl md:!p-7 flex flex-col gap-3.5 md:gap-5">
            <div className="flex items-center gap-2.5 md:gap-3">
              <span className="w-9 h-9 rounded-xl bg-primary-fixed/40 md:bg-primary-fixed/40 flex items-center justify-center text-vibrant-blue shrink-0">
                <Globe className="w-5 h-5" />
              </span>
              <div>
                <h2 className="font-title-md text-title-md text-on-surface font-bold leading-tight">Booking &amp; Report Delivery</h2>
                <p className="font-label-sm text-[12px] md:text-label-sm text-on-surface-variant">How patients book you and get results</p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 md:gap-3">
              <Channel
                icon={Globe}
                eyebrow="Online Booking"
                title={prices.length ? `${formatINR(Math.min(...prices))}${Math.max(...prices) !== Math.min(...prices) ? ` – ${formatINR(Math.max(...prices))}` : ''} per test` : 'Price your tests to go live'}
                sub={`Patients pay online plus a ${formatINR(DIAGNOSTIC_PLATFORM_FEE)} platform fee`}
                badge={<span className={`font-label-sm text-label-sm px-2.5 py-1 rounded-full font-semibold ${live ? 'text-secondary bg-secondary-fixed/50' : 'text-tertiary bg-error-container/60'}`}>{live ? 'Active' : 'Paused'}</span>}
              />
              <Channel
                icon={Store}
                eyebrow="Walk-ins & Phone"
                title="Book at your desk"
                sub="Any day up to 90 days ahead, paid at the center"
                badge={
                  <Link href="/diagnostic-center/schedule#book" className="font-label-sm text-label-sm px-2.5 py-1 rounded-full font-semibold text-primary bg-primary-fixed/60 hover:bg-primary-fixed">
                    Book
                  </Link>
                }
              />
              <Channel
                icon={FileCheck2}
                eyebrow="Report Delivery"
                title="Straight to the patient’s account"
                sub="Upload a PDF or photo (up to 5 MB) from Patients"
                badge={<CalendarCheck className="w-5 h-5 text-fresh-teal" />}
              />
            </div>
          </Card>

          {completeness < 100 && (
            <Card className="md:!rounded-2xl md:!p-7">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-fresh-teal">
                  <CircleCheck className="w-5 h-5" />
                  <h2 className="font-title-md text-[16px] md:text-title-md text-on-surface font-semibold">Listing Checklist</h2>
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

function Metric({
  label,
  icon: Icon,
  tint,
  value,
  note,
  noteClass,
  pct,
  bar,
  sub,
}: {
  label: string
  icon: LucideIcon
  tint: string
  value: string
  note: string
  noteClass: string
  pct: number
  bar: string
  sub: string
}) {
  return (
    <div className="bg-surface-container-lowest p-3.5 md:p-5 rounded-xl md:rounded-2xl shadow-sm md:shadow-[0_2px_12px_rgba(0,102,255,0.04)] border border-surface-container md:border-transparent flex flex-col justify-between min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-label-sm text-[11px] md:text-label-sm text-on-surface-variant font-medium truncate">{label}</span>
        <span className={`hidden md:flex w-8 h-8 rounded-xl items-center justify-center shrink-0 ${tint}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
      </div>
      <div className="mt-2.5 md:mt-4 flex items-baseline gap-1.5 md:gap-2 flex-wrap">
        <span className="font-headline-lg-mobile md:font-title-md text-[22px] md:text-title-md font-bold text-on-surface tracking-tight">{value}</span>
        <span className={`font-label-sm text-[10px] md:text-label-sm font-semibold ${noteClass}`}>{note}</span>
      </div>
      <div className="w-full bg-surface-container rounded-full h-1.5 mt-2 md:mt-3 overflow-hidden" role="img" aria-label={`${Math.round(pct)}%`}>
        <div className={`${bar} h-full rounded-full`} style={{ width: `${Math.max(0, Math.min(100, Math.round(pct)))}%` }} />
      </div>
      <p className="font-label-sm text-[11px] md:text-label-sm text-outline mt-2 truncate">{sub}</p>
    </div>
  )
}

function Channel({ icon: Icon, eyebrow, title, sub, badge }: { icon: LucideIcon; eyebrow: string; title: string; sub: string; badge: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 md:p-3.5 rounded-xl bg-surface-container-low">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="md:hidden w-5 h-5 text-primary shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="font-label-sm text-[11px] md:text-label-sm text-outline">{eyebrow}</span>
          <span className="font-title-md md:font-body-md text-[14px] md:text-body-md font-bold md:font-semibold text-on-surface truncate">{title}</span>
          <span className="font-label-sm text-[11px] md:text-label-sm text-on-surface-variant">{sub}</span>
        </div>
      </div>
      <span className="shrink-0 flex items-center">{badge}</span>
    </div>
  )
}

