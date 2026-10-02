import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarCheck, CalendarDays, CircleCheck, FileCheck2, FileUp, FlaskConical, IndianRupee, ListChecks, Users } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { formatINR, istDateKey } from '@/components/patient/format'
import { Avatar, Card, CardHeader, Chip, EmptyState, SegmentBar, StatCard } from '@/components/portal/ui'
import { loadPatientFacts } from '@/lib/patient-facts'
import { signReportLinks } from '@/lib/lab-reports'
import { pricedTests } from '@/lib/pricing'
import {
  ageSex,
  awaitingReport,
  bookingRef,
  dayToMs,
  isPaid,
  LAB_STATUS,
  loadLabBookings,
  requireCenter,
  shiftDay,
  type LabBooking,
} from '../_lib/lab'
import { CallLink, CheckInButton, NextStep, UploadReportButton } from '../_components/BookingActions'
import { NewBookingButton } from '../_components/NewBooking'

export const metadata: Metadata = { title: 'Dashboard | Diagnostic Center' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const dayLabel = (key: string, opts: Intl.DateTimeFormatOptions) => new Date(dayToMs(key)).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', ...opts })

function greeting(now: number) {
  const hour = Number(new Date(now).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hourCycle: 'h23' }))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

export default async function LabDashboardPage() {
  const { admin, lab, staff } = await requireCenter()
  const now = currentTime()
  const today = istDateKey(now)

  const bookings = await loadLabBookings(admin, lab)
  const paid = bookings.filter(isPaid)
  const order = ['confirmed', 'visited', 'completed', 'report_sent', 'pending_payment']
  const todays = bookings.filter((b) => b.date === today).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
  const paidToday = todays.filter(isPaid)
  const n = (s: string) => paidToday.filter((b) => b.status === s).length
  const waiting = paid.filter(awaitingReport).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const waitDays = (b: LabBooking) => (b.date ? Math.max(0, Math.round((dayToMs(today) - dayToMs(b.date)) / DAY)) : 0)

  const month = today.slice(0, 7)
  const lastMonth = shiftDay(`${month}-01`, -1).slice(0, 7)
  const inMonth = (b: LabBooking, key: string) => !!b.date && b.date.slice(0, 7) === key
  const sentThisMonth = paid.filter((b) => b.status === 'report_sent' && inMonth(b, month)).length
  const sentLastMonth = paid.filter((b) => b.status === 'report_sent' && inMonth(b, lastMonth)).length
  const revenue = (key: string) => paid.filter((b) => inMonth(b, key) && b.date! <= today).reduce((s, b) => s + (b.amount ?? 0), 0)
  const revenueThisMonth = revenue(month)
  const revenueLastMonth = revenue(lastMonth)

  const spotlight = waiting[0] ?? paidToday.find((b) => b.status === 'confirmed') ?? null
  const [facts, reports] = await Promise.all([
    loadPatientFacts(admin, spotlight?.patient ? [spotlight.patient.id] : []),
    signReportLinks(admin, todays.filter((b) => b.status === 'report_sent').map((b) => ({ id: b.id, centerId: lab.id }))),
  ])
  const week = Array.from({ length: 7 }, (_, i) => {
    const key = shiftDay(today, i)
    return { key, count: paid.filter((b) => b.date === key).length }
  })
  const weekMax = Math.max(1, ...week.map((d) => d.count))

  return (
    <>
      {/* Center header */}
      <Card className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-gutter">
        <div className="flex items-center gap-3 md:gap-gutter min-w-0">
          <span className="relative shrink-0">
            <Avatar name={lab.name} image={lab.image} square className="w-12 h-12 md:w-16 md:h-16 text-lg" />
            {lab.status === 'active' && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 md:w-4 md:h-4 bg-fresh-teal rounded-full ring-2 ring-surface-container-lowest" title="Live on Consult Your Doctor" />}
          </span>
          <div className="min-w-0">
            <span className="text-[11px] md:text-label-sm font-semibold text-secondary uppercase tracking-wider">
              {greeting(now)}, {staff.name.split(' ')[0]}
            </span>
            <h1 className="font-title-md text-[17px] md:font-headline-lg md:text-headline-lg text-indigo-gray-900 font-bold leading-tight truncate">{lab.name}</h1>
            <p className="hidden md:block text-sm text-indigo-gray-600 truncate">{[lab.address, lab.city].filter(Boolean).join(', ') || 'Add your address on the Profile page'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/diagnostic-center/patients?status=collected"
            className="flex items-center justify-center gap-1.5 md:gap-2 bg-surface-container-low hover:bg-surface-container text-primary font-label-sm text-[12px] md:text-label-sm px-3 md:px-stack-md py-2.5 md:py-3 rounded-full transition-colors"
          >
            <FileUp className="w-[18px] h-[18px]" /> Upload Reports
            {waiting.length > 0 && <span className="px-1.5 rounded-full bg-soft-coral text-on-tertiary text-[11px]">{waiting.length}</span>}
          </Link>
          <NewBookingButton
            tests={pricedTests(lab.prices)}
            minDate={today}
            maxDate={shiftDay(today, 90)}
            defaultDate={today}
            className="flex items-center justify-center gap-1.5 md:gap-2 bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-[12px] md:text-label-sm px-3 md:px-stack-md py-2.5 md:py-3 rounded-full shadow-[0_4px_16px_rgba(0,102,255,0.22)] transition-all active:scale-95"
          />
        </div>
      </Card>

      {/* Metrics */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-gutter">
        <StatCard
          label="Today's Bookings"
          value={paidToday.length}
          note={todays.length > paidToday.length ? `+${todays.length - paidToday.length} unpaid` : 'patients'}
          noteTone={todays.length > paidToday.length ? 'coral' : 'teal'}
          icon={CalendarDays}
          tone="blue"
          footer={
            <div className="flex flex-col gap-1.5">
              <SegmentBar
                parts={[
                  { value: n('report_sent'), className: 'bg-secondary', label: 'report sent' },
                  { value: n('visited') + n('completed'), className: 'bg-fresh-teal', label: 'sample collected' },
                  { value: n('confirmed'), className: 'bg-vibrant-blue', label: 'to check in' },
                ]}
              />
              <span className="hidden md:block text-[11px] text-indigo-gray-600">
                {n('confirmed')} to check in • {n('visited') + n('completed')} collected • {n('report_sent')} sent
              </span>
            </div>
          }
        />
        <StatCard
          label="Awaiting Report"
          value={waiting.length}
          note={waiting.length ? 'samples' : undefined}
          noteTone="coral"
          icon={FlaskConical}
          tone="coral"
          alert={waiting.length > 0 && waitDays(waiting[0]) >= 3}
          footer={
            <span className="text-[11px] text-indigo-gray-600">
              {waiting.length ? `Oldest: ${waitDays(waiting[0]) === 0 ? 'today' : `${waitDays(waiting[0])} ${waitDays(waiting[0]) === 1 ? 'day' : 'days'} ago`}` : 'Every collected sample has a report'}
            </span>
          }
        />
        <StatCard
          label="Reports Sent"
          value={sentThisMonth}
          note={sentThisMonth !== sentLastMonth && sentLastMonth ? `${sentThisMonth > sentLastMonth ? '+' : ''}${sentThisMonth - sentLastMonth} vs last` : 'this month'}
          noteTone={sentThisMonth >= sentLastMonth ? 'teal' : 'coral'}
          icon={FileCheck2}
          tone="teal"
          footer={<span className="text-[11px] text-indigo-gray-600">Last month: {sentLastMonth}</span>}
        />
        <StatCard
          label="Test Revenue"
          value={formatINR(revenueThisMonth)}
          icon={IndianRupee}
          tone="neutral"
          footer={<span className="text-[11px] text-indigo-gray-600">This month so far, at today’s prices • last month {formatINR(revenueLastMonth)}</span>}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-gutter items-start">
        <div className="lg:col-span-7 flex flex-col gap-4 md:gap-stack-md">
          {/* Needs attention */}
          <Card className="relative overflow-hidden">
            {spotlight ? (
              <Spotlight booking={spotlight} kind={awaitingReport(spotlight) ? 'report' : 'checkin'} days={waitDays(spotlight)} line={spotlight.patient ? ageSex(facts[spotlight.patient.id], now) : null} bloodGroup={spotlight.patient ? facts[spotlight.patient.id]?.bloodGroup ?? null : null} />
            ) : (
              <EmptyState icon={CircleCheck}>All caught up: no samples are waiting for a report and no one is left to check in today.</EmptyState>
            )}
          </Card>

          {/* Report queue */}
          <Card>
            <CardHeader
              title="Report Queue"
              subtitle="Samples collected, report not uploaded yet (oldest first)"
              action={
                <Link href="/diagnostic-center/patients?status=collected" className="text-vibrant-blue font-label-sm text-label-sm hover:underline shrink-0">
                  View all
                </Link>
              }
            />
            {waiting.length === 0 ? (
              <EmptyState icon={FileCheck2}>Nothing waiting. Reports for every collected sample have been sent.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2.5 md:gap-3">
                {waiting.slice(0, 6).map((b) => {
                  const d = waitDays(b)
                  return (
                    <li key={b.id} className="p-3 md:p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${d >= 3 ? 'bg-soft-coral/10 text-soft-coral' : 'bg-primary-fixed text-primary'}`}>
                          <FlaskConical className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-title-md text-[14px] md:text-[15px] font-bold text-indigo-gray-900 truncate">{b.patient?.name ?? 'Patient'}</span>
                            <span className="text-[11px] font-mono text-indigo-gray-600 bg-surface-container-highest px-1.5 py-0.5 rounded shrink-0">#{b.code}</span>
                          </div>
                          <p className="text-[12px] text-indigo-gray-600 truncate">{b.testLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Chip tone={d >= 3 ? 'coral' : 'neutral'} className="hidden sm:inline-flex">{d === 0 ? 'Today' : `${d}d waiting`}</Chip>
                        <UploadReportButton booking={bookingRef(b)} kind="blue" className="!px-3">
                          <span className="hidden sm:inline">Upload</span>
                        </UploadReportButton>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4 md:gap-stack-md">
          {/* Today */}
          <Card>
            <CardHeader
              title="Today"
              subtitle={dayLabel(today, { weekday: 'long', day: 'numeric', month: 'long' })}
              action={
                <Link href="/diagnostic-center/schedule" className="text-vibrant-blue font-label-sm text-label-sm hover:underline flex items-center gap-1 shrink-0">
                  <ListChecks className="w-4 h-4" /> Schedule
                </Link>
              }
            />
            {todays.length === 0 ? (
              <EmptyState icon={CalendarCheck}>No bookings for today yet.</EmptyState>
            ) : (
              <ul className="relative flex flex-col gap-3 pl-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                {todays.map((b) => {
                  const status = LAB_STATUS[b.status]
                  const dot = b.status === 'report_sent' ? 'bg-fresh-teal' : b.status === 'visited' || b.status === 'completed' ? 'bg-vibrant-blue ring-4 ring-primary-fixed' : b.status === 'pending_payment' ? 'bg-soft-coral' : 'bg-outline-variant'
                  return (
                    <li key={b.id} className="relative flex items-center justify-between gap-2">
                      <span aria-hidden className={`absolute -left-[19px] top-1.5 w-3 h-3 rounded-full border-2 border-surface-container-lowest ${dot}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[14px] font-semibold text-indigo-gray-900 truncate">{b.patient?.name ?? 'Patient'}</span>
                          {status && <Chip tone={status.tone}>{status.label}</Chip>}
                        </div>
                        <p className="text-[12px] text-indigo-gray-600 truncate">{b.testLabel}</p>
                      </div>
                      <span className="flex items-center gap-0.5 shrink-0">
                        <CallLink phone={b.patient?.phone ?? null} name={b.patient?.name ?? 'patient'} kind="icon" />
                        <NextStep booking={bookingRef(b)} reportUrl={reports[b.id]} kind="icon" />
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {/* Next 7 days */}
          <Card>
            <CardHeader title="Next 7 Days" subtitle="Paid bookings per day" action={<Chip tone="blue">{week.reduce((s, d) => s + d.count, 0)} booked</Chip>} />
            <div className="grid grid-cols-7 gap-1.5 items-end h-36">
              {week.map((d) => (
                <Link key={d.key} href={`/diagnostic-center/schedule${d.key === today ? '' : `?date=${d.key}`}`} className="group flex flex-col items-center justify-end gap-1 h-full" title={`${d.count} on ${dayLabel(d.key, { weekday: 'long', day: 'numeric', month: 'short' })}`}>
                  <span className="text-[11px] font-bold text-indigo-gray-900">{d.count || ''}</span>
                  <span
                    className={`w-full max-w-[34px] rounded-t-lg transition-colors ${d.key === today ? 'bg-vibrant-blue' : 'bg-primary-fixed group-hover:bg-primary-fixed-dim'}`}
                    style={{ height: `${Math.max(6, (d.count / weekMax) * 88)}%` }}
                  />
                  <span className={`text-[10px] font-semibold ${d.key === today ? 'text-vibrant-blue' : 'text-indigo-gray-600'}`}>{d.key === today ? 'Today' : dayLabel(d.key, { weekday: 'short' })}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </>
  )
}

function Spotlight({ booking: b, kind, days, line, bloodGroup }: { booking: LabBooking; kind: 'report' | 'checkin'; days: number; line: string | null; bloodGroup: string | null }) {
  const ref = bookingRef(b)
  const urgent = kind === 'report' && days >= 3
  return (
    <div className={`flex flex-col gap-4 -m-4 md:-m-stack-md p-4 md:p-stack-md ${urgent ? 'bg-gradient-to-r from-soft-coral/[0.06] to-transparent' : 'bg-gradient-to-r from-vibrant-blue/[0.05] to-transparent'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${urgent ? 'bg-soft-coral/10 text-soft-coral' : 'bg-primary-fixed text-primary'}`}>
            {kind === 'report' ? <FlaskConical className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${urgent ? 'bg-soft-coral text-on-tertiary' : 'bg-vibrant-blue text-on-primary'}`}>
                {kind === 'report' ? 'Report due' : 'Next to check in'}
              </span>
              <span className="text-[12px] font-mono text-indigo-gray-600">#{b.code}</span>
            </div>
            <h2 className="font-title-md text-[18px] md:text-title-md text-indigo-gray-900 font-bold mt-0.5 truncate">
              {b.patient?.name ?? 'Patient'}
              {line && <span className="text-indigo-gray-600 font-semibold">, {line}</span>}
            </h2>
          </div>
        </div>
        {kind === 'report' && (
          <Chip tone={urgent ? 'coral' : 'neutral'} className="shrink-0">
            {days === 0 ? 'Collected today' : `Waiting ${days} ${days === 1 ? 'day' : 'days'}`}
          </Chip>
        )}
      </div>

      <div className="bg-surface-container-low rounded-lg p-3.5 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] text-indigo-gray-600 uppercase font-semibold">Tests</span>
          <p className="font-title-md text-[15px] md:text-base text-indigo-gray-900 font-semibold">{b.testLabel}</p>
          <span className="text-[12px] text-indigo-gray-600">Booked for {b.date ? dayLabel(b.date, { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</span>
        </div>
        <div className="sm:text-right shrink-0">
          <span className="text-[11px] text-indigo-gray-600 uppercase font-semibold">Blood group</span>
          <p className="font-title-md text-[18px] font-bold text-indigo-gray-900">{bloodGroup ?? '—'}</p>
          <span className="text-[12px] text-indigo-gray-600">{b.amount != null ? formatINR(b.amount) : ''}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {kind === 'report' ? <UploadReportButton booking={ref} kind="blue" /> : <CheckInButton booking={ref} kind="teal" />}
        <CallLink phone={ref.phone} name={ref.patientName} kind="soft" />
        <Link href="/diagnostic-center/patients" className="px-3.5 py-2 rounded-full bg-surface-container text-indigo-gray-900 font-label-sm text-label-sm hover:bg-surface-container-high">
          All patients
        </Link>
      </div>
    </div>
  )
}
