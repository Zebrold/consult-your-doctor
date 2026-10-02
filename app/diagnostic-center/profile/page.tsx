import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  CircleCheck, CircleDashed, FileCheck2, FlaskConical, Globe, IndianRupee, ListChecks, LogOut, MapPin, ReceiptText, ShieldCheck,
  Store, Users, type LucideIcon,
} from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { formatINR, formatShortDate, istDateKey } from '@/components/patient/format'
import { Avatar, Card, CardHeader, Chip, StatCard } from '@/components/portal/ui'
import { DIAGNOSTIC_PLATFORM_FEE, pricedTests } from '@/lib/pricing'
import { bookingCode, isPaid, loadLabBookings, requireCenter } from '../_lib/lab'
import { LabProfileEditor } from '../_components/LabProfileEditor'

export const metadata: Metadata = { title: 'Profile | Diagnostic Center' }
export const dynamic = 'force-dynamic'

function InfoRow({ icon: Icon, title, children, chip }: { icon: LucideIcon; title: string; children: ReactNode; chip?: ReactNode }) {
  return (
    <div className="p-3.5 rounded-xl bg-surface-container-low flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <Icon className="w-5 h-5 text-vibrant-blue shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-title-md text-[15px] font-bold text-indigo-gray-900">{title}</p>
          <p className="text-[13px] text-indigo-gray-600">{children}</p>
        </div>
      </div>
      {chip}
    </div>
  )
}

export default async function LabProfilePage() {
  const { admin, lab, staff } = await requireCenter()
  const now = currentTime()
  const month = istDateKey(now).slice(0, 7)

  const [bookings, { data: logins }] = await Promise.all([
    loadLabBookings(admin, lab),
    admin.from('profiles').select('id, full_name, email').eq('diagnostic_center_id', lab.id).eq('role', 'diagnostic_admin'),
  ])
  const paid = bookings.filter(isPaid)
  const patients = new Set(paid.map((b) => b.patient?.id).filter(Boolean)).size
  const thisMonth = paid.filter((b) => b.date?.slice(0, 7) === month).length
  const sent = paid.filter((b) => b.status === 'report_sent').length
  const collected = paid.filter((b) => b.status !== 'confirmed').length

  const priced = pricedTests(lab.prices)
  const unpriced = lab.tests.length - priced.length
  const prices = priced.map((t) => t.price)
  const live = lab.status === 'active'

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

  return (
    <>
      {/* Hero */}
      <Card className="relative overflow-hidden !p-0">
        <div aria-hidden className="hidden md:block absolute top-0 right-0 w-96 h-96 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative p-4 md:p-8 flex flex-col lg:flex-row justify-between gap-4 md:gap-6 lg:items-center">
          <div className="flex items-start sm:items-center gap-3.5 md:gap-5 min-w-0">
            <Avatar name={lab.name} image={lab.image} square className="w-16 h-16 md:w-24 md:h-24 text-2xl shadow-[0_4px_16px_rgba(0,80,203,0.14)]" />
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-label-sm text-[11px] md:text-label-sm uppercase tracking-wider text-vibrant-blue bg-primary-fixed/50 px-2.5 py-0.5 rounded-full font-semibold">Center ID #{bookingCode(lab.id)}</span>
                <Chip tone={live ? 'teal' : 'coral'}>{live ? 'Live for booking' : `Not listed (${lab.status ?? 'inactive'})`}</Chip>
              </div>
              <h1 className="font-headline-lg text-[22px] leading-tight md:text-headline-lg text-indigo-gray-900 font-bold tracking-tight">{lab.name}</h1>
              <p className="text-[13px] md:text-body-md text-indigo-gray-600 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5 md:mt-1 text-vibrant-blue" />
                <span>{[lab.address, lab.city].filter(Boolean).join(', ') || 'No address yet'}</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2 lg:gap-2.5 shrink-0 lg:w-60">
            <Link href="/diagnostic-center/schedule#tests" className="inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-[12px] md:text-label-sm shadow-[0_4px_16px_rgba(0,102,255,0.25)] hover:bg-primary">
              <ListChecks className="w-[18px] h-[18px]" /> Tests &amp; Prices
            </Link>
            <LabProfileEditor
              name={lab.name}
              city={lab.city}
              address={lab.address}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-[12px] md:text-label-sm"
            />
          </div>
        </div>
        <div className="bg-surface-container-low px-4 md:px-8 py-3 md:py-3.5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Listing</span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest shadow-sm text-[12px] font-medium text-on-surface">
              <FlaskConical className="w-4 h-4 text-fresh-teal" /> {priced.length} bookable {priced.length === 1 ? 'test' : 'tests'}
            </span>
            {prices.length > 0 && (
              <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest shadow-sm text-[12px] font-medium text-on-surface">
                <IndianRupee className="w-4 h-4 text-vibrant-blue" /> {formatINR(Math.min(...prices))}
                {Math.max(...prices) !== Math.min(...prices) ? ` – ${formatINR(Math.max(...prices))}` : ''}
              </span>
            )}
            <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest shadow-sm text-[12px] font-medium text-on-surface">
              <ShieldCheck className="w-4 h-4 text-secondary" /> On Consult Your Doctor since {lab.createdAt ? formatShortDate(lab.createdAt) : '—'}
            </span>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-gutter">
        <StatCard label="Tests on Menu" value={lab.tests.length} note={unpriced ? `${unpriced} unpriced` : undefined} noteTone="coral" icon={ListChecks} tone="teal" footer={<span className="text-[11px] text-indigo-gray-600">{priced.length} can be booked online</span>} />
        <StatCard label="Patients Served" value={patients} icon={Users} tone="blue" footer={<span className="text-[11px] text-indigo-gray-600">With at least one paid booking</span>} />
        <StatCard label="Bookings This Month" value={thisMonth} icon={ReceiptText} tone="neutral" footer={<span className="text-[11px] text-indigo-gray-600">Paid, by booked day</span>} />
        <StatCard label="Reports Sent" value={sent} note={collected ? `of ${collected}` : undefined} noteTone="neutral" icon={FileCheck2} tone="teal" footer={<span className="text-[11px] text-indigo-gray-600">All time, for collected samples</span>} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-gutter items-start">
        <div className="lg:col-span-7 flex flex-col gap-4 md:gap-stack-md">
          <Card>
            <CardHeader title="Portal Access" subtitle="Logins linked to this center" action={<Chip tone="blue">{staffList.length} {staffList.length === 1 ? 'login' : 'logins'}</Chip>} />
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {staffList.map((p) => (
                <li key={p.id} className="p-3.5 rounded-xl bg-surface-container-low flex items-center gap-3">
                  <Avatar name={p.name} square className="w-11 h-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-title-md text-[15px] font-bold text-indigo-gray-900 truncate">{p.name}</span>
                      {p.id === staff.id && <Chip tone="teal">You</Chip>}
                    </div>
                    <span className="block text-[12px] text-indigo-gray-600 truncate">{p.email ?? 'Staff login'}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-indigo-gray-600 mt-3">To add or remove a login, contact the Consult Your Doctor team.</p>
          </Card>

          <Card>
            <CardHeader title="How Booking Works" subtitle="What patients see and pay" />
            <div className="flex flex-col gap-2.5">
              <InfoRow icon={Globe} title="Online booking" chip={<Chip tone={live ? 'teal' : 'coral'}>{live ? 'Active' : 'Paused'}</Chip>}>
                Patients pick tests and a day, then pay online: your price plus a {formatINR(DIAGNOSTIC_PLATFORM_FEE)} platform fee.
              </InfoRow>
              <InfoRow icon={Store} title="Walk-ins & phone bookings">
                Book them from the Schedule page. They pay at your desk at your menu prices.
              </InfoRow>
              <InfoRow icon={FileCheck2} title="Report delivery">
                Upload a report and it appears in the patient’s account straight away, through a private link.
              </InfoRow>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4 md:gap-stack-md">
          <Card>
            <CardHeader title="Listing Completeness" subtitle="Details patients see when choosing a lab" action={<span className="font-title-md text-[18px] font-bold text-vibrant-blue">{completeness}%</span>} />
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mb-4">
              <div className="bg-fresh-teal h-full rounded-full" style={{ width: `${completeness}%` }} />
            </div>
            <ul className="flex flex-col gap-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2.5 text-[14px]">
                  {c.done ? <CircleCheck className="w-5 h-5 text-fresh-teal" /> : <CircleDashed className="w-5 h-5 text-outline" />}
                  <span className={c.done ? 'text-indigo-gray-900' : 'text-indigo-gray-600'}>{c.label}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Popular Tests"
              subtitle="Most booked with you"
              action={
                <Link href="/diagnostic-center/schedule#tests" className="text-vibrant-blue font-label-sm text-label-sm hover:underline shrink-0">
                  Edit menu
                </Link>
              }
            />
            <PopularTests bookings={paid.map((b) => b.tests.map((t) => t.name))} prices={lab.prices} />
          </Card>

          <form action="/auth/signout" method="post">
            <button type="submit" className="w-full py-3 rounded-full bg-error/10 text-error text-sm font-bold flex items-center justify-center gap-2 hover:bg-error/15">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </form>
        </div>
      </section>
    </>
  )
}

function PopularTests({ bookings, prices }: { bookings: string[][]; prices: Record<string, number> }) {
  const counts = new Map<string, number>()
  for (const names of bookings) for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1)
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  if (top.length === 0) return <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600 text-center">No paid bookings yet.</p>
  const max = top[0][1]
  return (
    <ul className="flex flex-col gap-3">
      {top.map(([name, count]) => (
        <li key={name} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="font-semibold text-indigo-gray-900 truncate">{name}</span>
            <span className="text-indigo-gray-600 shrink-0">
              {count} {count === 1 ? 'booking' : 'bookings'}
              {prices[name] != null ? ` • ${formatINR(prices[name])}` : ''}
            </span>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div className="bg-vibrant-blue h-full rounded-full" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
