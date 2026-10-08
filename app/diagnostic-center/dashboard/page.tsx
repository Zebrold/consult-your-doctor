import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  AlarmClock, Armchair, BadgeCheck, CalendarDays, CalendarRange, CircleCheck, ClipboardCheck, FileCheck2, FileUp, FlaskConical,
  FolderOpen, IndianRupee, Microscope, Settings2, TrendingDown, TrendingUp, UserCheck, Users, type LucideIcon,
} from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { formatINR, istDateKey } from '@/components/patient/format'
import { Avatar, Card, ProgressBar } from '@/components/portal/ui'
import { loadPatientFacts } from '@/lib/patient-facts'
import { signReportLinks } from '@/lib/lab-reports'
import { pricedTests } from '@/lib/pricing'
import {
  ageSex,
  awaitingReport,
  bookingCode,
  bookingRef,
  dayToMs,
  isPaid,
  loadLabBookings,
  requireCenter,
  shiftDay,
  type LabBooking,
} from '../_lib/lab'
import { OVERDUE_DAYS } from '../_lib/constants'
import { CallLink, CheckInButton, ReportLink, UploadReportButton } from '../_components/BookingActions'
import { NewBookingButton } from '../_components/NewBooking'
import { TestWiseAmount, testWiseAmounts } from '../_components/TestWiseAmount'

export const metadata: Metadata = { title: 'Dashboard | Diagnostic Center' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const dayLabel = (key: string, opts: Intl.DateTimeFormatOptions) => new Date(dayToMs(key)).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', ...opts })
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const testsShort = (b: LabBooking) => (b.tests.length > 1 ? `${b.tests[0].name} +${b.tests.length - 1} more` : b.testLabel)

type SpotKind = 'overdue' | 'checkin' | 'report'

export default async function LabDashboardPage() {
  const { admin, lab } = await requireCenter()
  const now = currentTime()
  const today = istDateKey(now)
  const live = lab.status === 'active'

  const bookings = await loadLabBookings(admin, lab)
  const paid = bookings.filter(isPaid)
  const todays = bookings.filter((b) => b.date === today)
  const order: Record<string, number> = { confirmed: 0, visited: 1, completed: 1, report_sent: 2 }
  const paidToday = todays.filter(isPaid).sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3))
  const unpaidToday = todays.length - paidToday.length
  const toCheckIn = paidToday.filter((b) => b.status === 'confirmed')
  const collectedToday = paidToday.length - toCheckIn.length
  const paidYesterday = paid.filter((b) => b.date === shiftDay(today, -1)).length
  const intakeTrend = paidYesterday ? Math.round(((paidToday.length - paidYesterday) / paidYesterday) * 100) : null

  const waitDays = (b: LabBooking) => (b.date ? Math.max(0, Math.round((dayToMs(today) - dayToMs(b.date)) / DAY)) : 0)
  const waiting = paid.filter(awaitingReport).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const overdue = waiting.filter((b) => waitDays(b) >= OVERDUE_DAYS)

  const month = today.slice(0, 7)
  const lastMonth = shiftDay(`${month}-01`, -1).slice(0, 7)
  const inMonth = (b: LabBooking, key: string) => !!b.date && b.date.slice(0, 7) === key
  const sentThisMonth = paid.filter((b) => b.status === 'report_sent' && inMonth(b, month)).length
  const sentLastMonth = paid.filter((b) => b.status === 'report_sent' && inMonth(b, lastMonth)).length
  const revenueThisMonth = paid.filter((b) => inMonth(b, month) && b.date! <= today).reduce((s, b) => s + (b.amount ?? 0), 0)
  const sentAll = paid.filter((b) => b.status === 'report_sent').length
  const collectedAll = paid.filter((b) => b.status !== 'confirmed').length
  // Floor, so 100% only shows once every collected sample really has its report.
  const reportRate = collectedAll ? Math.floor((sentAll / collectedAll) * 100) : null
  const valueToday = paidToday.reduce((s, b) => s + (b.amount ?? 0), 0)

  // What needs the lab first: an overdue report, then the next patient to check in today, then any report due.
  const spot: { booking: LabBooking; kind: SpotKind } | null = overdue[0]
    ? { booking: overdue[0], kind: 'overdue' }
    : toCheckIn[0]
      ? { booking: toCheckIn[0], kind: 'checkin' }
      : waiting[0]
        ? { booking: waiting[0], kind: 'report' }
        : null

  // Samples still waiting for a report (oldest first), topped up with today's sent reports.
  const pending = waiting.filter((b) => b.id !== spot?.booking.id).slice(0, 5)
  const queue = [...pending, ...todays.filter((b) => b.status === 'report_sent').slice(0, 5 - pending.length)]
  const waitingShown = pending.length + (spot && awaitingReport(spot.booking) ? 1 : 0)

  const [facts, reports] = await Promise.all([
    loadPatientFacts(admin, Array.from(new Set([spot?.booking, ...queue, ...paidToday].map((b) => b?.patient?.id).filter(Boolean) as string[]))),
    signReportLinks(admin, queue.filter((b) => b.status === 'report_sent').map((b) => ({ id: b.id, centerId: lab.id }))),
  ])
  const lineOf = (b: LabBooking) => (b.patient ? ageSex(facts[b.patient.id], now) : null)

  const days = [-1, 0, 1, 2, 3].map((offset) => {
    const key = shiftDay(today, offset)
    const list = paid.filter((b) => b.date === key)
    const counts = new Map<string, number>()
    for (const b of list) for (const t of b.tests) counts.set(t.name, (counts.get(t.name) ?? 0) + 1)
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name)
    return { day: key, offset, list, top }
  })

  const bookingProps = { tests: pricedTests(lab.prices), minDate: today, maxDate: shiftDay(today, 90), defaultDate: today }
  const nextUp = paid.find((b) => b.status === 'confirmed' && !!b.date && b.date > today) ?? null
  const spotlight = spot ? (
    <Spotlight booking={spot.booking} kind={spot.kind} days={waitDays(spot.booking)} line={lineOf(spot.booking)} today={today} />
  ) : (
    <AllClear
      next={nextUp}
      booking={
        <NewBookingButton
          {...bookingProps}
          label="Book a Walk-in"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-label-sm shadow-sm transition-all active:scale-95"
        />
      }
    />
  )
  const headerButton = 'flex items-center justify-center gap-1.5 md:gap-2 font-label-sm text-[12px] md:text-label-sm px-3 md:px-5 py-2.5 rounded-full transition-all active:scale-95'

  return (
    <>
      {/* Center banner & quick actions */}
      <section className="bg-surface-container-lowest rounded-2xl md:rounded-xl shadow-sm border border-surface-container md:border-transparent overflow-hidden">
        <div className="p-4 md:p-stack-md flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-stack-md">
          <div className="flex items-start md:items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <span className="relative shrink-0">
                <Avatar name={lab.name} image={lab.image} className="w-14 h-14 md:w-16 md:h-16 text-lg shadow-sm" />
                {live && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-fresh-teal border-2 border-surface-container-lowest" title="Live for online booking" />}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <h1 className="font-title-md text-[18px] md:text-title-md text-indigo-gray-900 font-bold truncate">{lab.name}</h1>
                  <span className="hidden md:inline-flex shrink-0 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-primary-fixed-variant font-label-sm text-label-sm">
                    {live ? 'Live for Booking' : 'Not Listed'}
                  </span>
                </div>
                <p className="text-[12px] md:text-sm text-on-surface-variant mt-0.5 truncate">
                  Diagnostic Center{lab.city ? ` • ${lab.city}` : ''}
                  <span className="mx-1.5 opacity-40">|</span>
                  Center ID #{bookingCode(lab.id)}
                </p>
                <span className={`md:hidden inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full font-label-sm text-[11px] ${live ? 'bg-fresh-teal/10 text-secondary' : 'bg-error-container text-tertiary'}`}>
                  <BadgeCheck className="w-3.5 h-3.5" /> {live ? 'Live for online booking' : 'Not listed yet'}
                </span>
              </div>
            </div>
            <Link href="/diagnostic-center/profile" aria-label="Center profile" className="md:hidden w-9 h-9 rounded-full bg-surface-container text-primary flex items-center justify-center shrink-0 active:scale-95">
              <Settings2 className="w-5 h-5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-3 shrink-0 -mx-4 -mb-4 p-3 md:m-0 md:p-0 bg-surface-container-low/60 md:bg-transparent">
            <Link
              href="/diagnostic-center/patients?status=collected"
              className={`${headerButton} bg-vibrant-blue text-on-primary shadow-sm md:shadow-none md:bg-surface-container md:text-primary md:hover:bg-surface-container-high`}
            >
              <FileUp className="w-[18px] h-[18px]" />
              Upload Reports
              {waiting.length > 0 && <span className="px-1.5 rounded-full bg-soft-coral text-on-tertiary text-[11px] leading-[18px]">{waiting.length}</span>}
            </Link>
            <NewBookingButton
              {...bookingProps}
              label="New Test Intake"
              className={`${headerButton} bg-surface-container-lowest text-indigo-gray-900 shadow-sm md:bg-vibrant-blue md:text-on-primary md:hover:scale-[1.02]`}
            />
          </div>
        </div>
      </section>

      <div className="md:hidden">{spotlight}</div>

      {/* KPI row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi
          label="Daily Intake"
          icon={FlaskConical}
          chip={
            intakeTrend != null ? (
              <Pill className={intakeTrend >= 0 ? 'bg-fresh-teal/10 text-secondary' : 'bg-soft-coral/10 text-soft-coral'}>
                {intakeTrend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {intakeTrend >= 0 ? '+' : ''}
                {intakeTrend}%
              </Pill>
            ) : (
              <Pill className="bg-surface-container text-indigo-gray-600">Today</Pill>
            )
          }
          value={collectedToday}
          unit={`/ ${paidToday.length} booked`}
          sub="Samples collected today"
        >
          <ProgressBar pct={paidToday.length ? (collectedToday / paidToday.length) * 100 : 0} label={`${collectedToday} of ${paidToday.length} collected`} />
          <span className={`md:hidden block mt-1.5 font-label-sm text-[11px] font-semibold ${intakeTrend == null || intakeTrend >= 0 ? 'text-fresh-teal' : 'text-soft-coral'}`}>
            {intakeTrend == null ? (unpaidToday ? `+${unpaidToday} unpaid online` : 'Booked & paid today') : `${intakeTrend >= 0 ? '↑' : '↓'} ${Math.abs(intakeTrend)}% vs yesterday`}
          </span>
        </Kpi>
        <Kpi
          label="Awaiting Report"
          icon={AlarmClock}
          iconClass="text-soft-coral"
          chip={
            overdue.length > 0 ? (
              <Pill className="bg-soft-coral/10 text-soft-coral font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-soft-coral animate-pulse" />
                {overdue.length} Overdue
              </Pill>
            ) : (
              <Pill className="bg-fresh-teal/10 text-secondary">On Track</Pill>
            )
          }
          value={waiting.length}
          unit="samples"
          sub="Collected, report not uploaded"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] md:text-xs text-indigo-gray-600">
            <span className="hidden md:flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-fresh-teal" />
              {waiting.length - overdue.length} On time
            </span>
            <span className="hidden md:inline opacity-30">•</span>
            <span className={`flex items-center gap-1 font-medium ${overdue.length ? 'text-soft-coral' : ''}`}>
              <span className={`w-2 h-2 rounded-full ${overdue.length ? 'bg-soft-coral' : 'bg-outline-variant'}`} />
              {overdue.length} waiting {OVERDUE_DAYS}+ days
            </span>
          </div>
        </Kpi>
        <Kpi label="Reports Sent" icon={FileCheck2} iconClass="text-vibrant-blue" value={sentThisMonth} unit="This month" unitClass="text-secondary font-semibold" sub="Uploaded to patients' accounts">
          <Row left="Last month" right={String(sentLastMonth)} />
        </Kpi>
        <Kpi
          label="Report Rate"
          icon={CircleCheck}
          iconClass="text-secondary"
          chip={<Pill className="bg-primary-fixed text-on-primary-fixed-variant">All Time</Pill>}
          value={reportRate != null ? `${reportRate}%` : '—'}
          valueClass="text-secondary"
          unit="sent"
          sub="Reports sent for collected samples"
        >
          <Row left={<span className="md:hidden">Revenue</span>} leftWide="Revenue this month" right={formatINR(revenueThisMonth)} rightClass="text-fresh-teal" />
        </Kpi>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        <div className="contents lg:flex lg:col-span-7 lg:flex-col lg:gap-6 min-w-0">
          <div className="hidden md:block min-w-0">
            {spotlight}
          </div>

          {/* Specimen queue */}
          <Card className="order-2 lg:order-none min-w-0">
            <div className="flex items-start sm:items-center justify-between gap-3 mb-3 md:mb-5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Microscope className="w-[22px] h-[22px] text-vibrant-blue shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-title-md text-[16px] md:text-title-md text-on-surface font-bold">
                    <span className="md:hidden">Specimen Queue</span>
                    <span className="hidden md:inline">Specimen Queue &amp; Report Status</span>
                  </h3>
                  <p className="md:hidden text-xs text-on-surface-variant">Oldest sample first</p>
                </div>
              </div>
              <span className="text-[11px] md:text-xs text-indigo-gray-600 bg-surface-container px-2.5 md:px-3 py-1 rounded-full font-medium shrink-0">{waiting.length} awaiting report</span>
            </div>
            {queue.length === 0 ? (
              <Placeholder
                icon={FileCheck2}
                title="No samples waiting"
                sub="Checked-in samples show here until their report is uploaded"
                aside={<span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold bg-fresh-teal/10 text-secondary whitespace-nowrap">All Reported</span>}
              />
            ) : (
              <ul className="flex flex-col gap-2 md:gap-3">
                {queue.map((b) => (
                  <QueueItem key={b.id} booking={b} days={waitDays(b)} line={lineOf(b)} reportUrl={reports[b.id]} />
                ))}
              </ul>
            )}
            {waiting.length > waitingShown && (
              <Link href="/diagnostic-center/patients?status=collected" className="mt-3 inline-flex text-vibrant-blue font-label-sm text-label-sm hover:underline">
                See all {waiting.length} samples awaiting report →
              </Link>
            )}
          </Card>
        </div>

        <div className="contents lg:flex lg:col-span-5 lg:flex-col lg:gap-6 min-w-0">
          {/* Day-by-day timeline */}
          <Card className="order-1 lg:order-none min-w-0">
            <div className="flex items-center justify-between gap-3 mb-4 md:mb-5">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarRange className="w-[22px] h-[22px] text-vibrant-blue shrink-0" />
                <h3 className="font-title-md text-[16px] md:text-title-md text-on-surface font-bold">Lab Schedule</h3>
              </div>
              {overdue.length > 0 ? (
                <span className="text-xs font-semibold text-soft-coral flex items-center gap-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-soft-coral" /> {overdue.length} overdue
                </span>
              ) : (
                <span className="text-xs font-semibold text-secondary flex items-center gap-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-secondary" /> On Schedule
                </span>
              )}
            </div>
            <ol className="relative pl-7 flex flex-col gap-5 md:gap-6 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
              {days.map((d) => (
                <TimelineDay key={d.day} {...d} />
              ))}
            </ol>
            <Link href="/diagnostic-center/schedule" className="mt-4 md:mt-5 inline-flex items-center gap-1 text-vibrant-blue font-label-sm text-label-sm hover:underline">
              <CalendarDays className="w-4 h-4" /> Open full schedule
            </Link>
          </Card>

          {/* Collection desk */}
          <Card className="order-3 lg:order-none min-w-0">
            <div className="flex items-center justify-between gap-3 mb-3 md:mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <Armchair className="w-[22px] h-[22px] text-vibrant-blue shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-title-md text-[16px] md:text-title-md text-on-surface font-bold">Collection Desk</h3>
                  <p className="md:hidden text-xs text-on-surface-variant">Patients booked for today</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-fresh-teal/10 text-secondary text-xs font-medium shrink-0">In-Centre Today</span>
            </div>
            {paidToday.length === 0 ? (
              <Placeholder
                icon={Users}
                title="No patients booked for today"
                sub={unpaidToday ? `${unpaidToday} booked online, waiting for payment` : 'Walk-in and online bookings for today show here'}
                aside={
                  <NewBookingButton
                    {...bookingProps}
                    label="Walk-in"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-fresh-teal hover:bg-secondary text-on-secondary text-[11px] font-semibold whitespace-nowrap"
                  />
                }
              />
            ) : (
              <ul className="flex flex-col gap-2.5 md:gap-3">
                {paidToday.slice(0, 4).map((b, i) => (
                  <DeskItem key={b.id} booking={b} index={i} />
                ))}
              </ul>
            )}
            {paidToday.length > 4 && (
              <Link href="/diagnostic-center/schedule" className="mt-2.5 inline-flex text-vibrant-blue font-label-sm text-label-sm hover:underline">
                +{paidToday.length - 4} more today →
              </Link>
            )}
            <div className="mt-3 md:mt-4 bg-surface-container-low p-3 rounded-lg flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 min-w-0">
                <IndianRupee className="w-[18px] h-[18px] text-vibrant-blue shrink-0" />
                <span className="text-xs font-medium text-on-surface truncate">Today&apos;s test value</span>
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono font-bold text-secondary">{formatINR(valueToday)}</span>
                <span className="text-xs text-indigo-gray-600">{unpaidToday ? `${unpaidToday} unpaid` : 'All paid'}</span>
              </span>
            </div>
          </Card>

          {/* Test-wise amount */}
          <TestWiseAmount rows={testWiseAmounts(lab.tests, paid, month)} className="order-4 lg:order-none" />
        </div>
      </section>
    </>
  )
}

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`px-2 py-0.5 rounded-full font-label-sm text-xs flex items-center gap-1 whitespace-nowrap shrink-0 ${className}`}>{children}</span>
}

function Kpi({
  label,
  icon: Icon,
  iconClass = 'text-primary',
  chip,
  value,
  valueClass = 'text-on-surface',
  unit,
  unitClass = 'text-on-surface-variant',
  sub,
  children,
}: {
  label: string
  icon: LucideIcon
  iconClass?: string
  chip?: ReactNode
  value: ReactNode
  valueClass?: string
  unit?: string
  unitClass?: string
  sub: string
  children: ReactNode
}) {
  return (
    <div className="bg-surface-container-lowest p-3.5 md:p-5 rounded-xl shadow-sm border border-surface-container md:border-transparent flex flex-col justify-between min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2 md:mb-3">
        <span className="font-label-sm text-[11px] md:text-label-sm text-indigo-gray-600 md:uppercase md:tracking-wider truncate">{label}</span>
        <span className={`md:hidden w-7 h-7 rounded-full bg-surface-container-low flex items-center justify-center shrink-0 ${iconClass}`}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="hidden md:flex shrink-0">{chip || <Icon className={`w-5 h-5 ${iconClass}`} />}</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5 md:gap-2 mb-1 flex-wrap">
          <span className={`font-display-lg text-[24px] md:text-[36px] font-bold leading-none tracking-tight ${valueClass}`}>{value}</span>
          {unit && <span className={`text-[11px] md:text-xs ${unitClass}`}>{unit}</span>}
        </div>
        <p className="hidden md:block text-xs text-on-surface-variant mb-3">{sub}</p>
        <p className="md:hidden text-[11px] text-on-surface-variant mb-2 truncate">{sub}</p>
        {children}
      </div>
    </div>
  )
}

function Row({ left, leftWide, right, rightClass = 'text-on-surface' }: { left: ReactNode; leftWide?: string; right: string; rightClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] md:text-xs text-indigo-gray-600 pt-1">
      <span className="truncate">
        {left}
        {leftWide && <span className="hidden md:inline">{leftWide}</span>}
      </span>
      <span className={`font-semibold shrink-0 ${rightClass}`}>{right}</span>
    </div>
  )
}

const SPOT: Record<SpotKind, { wash: string; bar: string; iconWrap: string; icon: LucideIcon; badge: string; badgeText: string; chip: string }> = {
  overdue: {
    wash: 'from-soft-coral/[0.05]',
    bar: 'bg-soft-coral',
    iconWrap: 'bg-soft-coral/10 text-soft-coral',
    icon: AlarmClock,
    badge: 'bg-soft-coral text-on-tertiary',
    badgeText: 'Overdue Report',
    chip: 'bg-soft-coral/10 text-soft-coral',
  },
  checkin: {
    wash: 'from-vibrant-blue/[0.05]',
    bar: 'bg-vibrant-blue',
    iconWrap: 'bg-vibrant-blue/10 text-vibrant-blue',
    icon: UserCheck,
    badge: 'bg-vibrant-blue text-on-primary',
    badgeText: 'Next to Check In',
    chip: 'bg-vibrant-blue/10 text-vibrant-blue',
  },
  report: {
    wash: 'from-fresh-teal/[0.06]',
    bar: 'bg-fresh-teal',
    iconWrap: 'bg-fresh-teal/10 text-secondary',
    icon: ClipboardCheck,
    badge: 'bg-fresh-teal text-on-secondary',
    badgeText: 'Report Due',
    chip: 'bg-fresh-teal/10 text-secondary',
  },
}

function Spotlight({ booking: b, kind, days, line, today }: { booking: LabBooking; kind: SpotKind; days: number; line: string | null; today: string }) {
  const ref = bookingRef(b)
  const s = SPOT[kind]
  const when = b.date === today ? 'today' : b.date ? dayLabel(b.date, { weekday: 'short', day: 'numeric', month: 'short' }) : 'no date'
  const waited = days === 0 ? 'Today' : plural(days, 'day')
  const fullWidth = 'w-full sm:w-auto'
  return (
    <section className={`relative overflow-hidden bg-surface-container-lowest bg-gradient-to-r ${s.wash} to-transparent rounded-2xl md:rounded-xl p-4 md:p-6 shadow-sm border border-surface-container md:border-transparent`}>
      <div aria-hidden className={`md:hidden absolute top-0 inset-x-0 h-1.5 ${s.bar}`} />
      <div className="flex items-start justify-between gap-3 md:gap-4 mb-3 md:mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`hidden sm:flex w-10 h-10 rounded-full items-center justify-center shrink-0 ${s.iconWrap}`}>
            <s.icon className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider ${s.badge}`}>{s.badgeText}</span>
              <span className="text-[11px] md:text-xs font-mono text-indigo-gray-600">Booking #{b.code}</span>
            </div>
            <h2 className="font-title-md text-[17px] md:text-title-md text-on-surface font-bold mt-1 md:mt-0.5 truncate">
              {b.patient?.name ?? 'Patient'}
              {line && <span className="font-medium">, {line}</span>}
            </h2>
          </div>
        </div>
        <span className={`hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${s.chip}`}>
          {kind === 'checkin' ? 'Booked for today' : days === 0 ? 'Collected today' : `Waiting ${plural(days, 'day')}`}
        </span>
      </div>

      <div className="bg-surface-container-low rounded-lg p-3 md:p-4 mb-3 md:mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] md:text-xs text-indigo-gray-600 uppercase font-semibold">Tests Ordered</span>
          <p className="font-title-md text-[14px] md:text-base text-on-surface font-semibold truncate">{testsShort(b)}</p>
          <span className="text-[11px] md:text-xs text-on-surface-variant">
            {plural(b.tests.length, 'test')} • booked for {when}
          </span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] md:text-xs text-indigo-gray-600 uppercase font-semibold">{kind === 'checkin' ? 'Amount' : 'Waiting'}</span>
          <div className="flex items-baseline justify-end gap-1">
            {kind === 'checkin' ? (
              <span className="font-display-lg text-[22px] md:text-[28px] font-bold text-vibrant-blue leading-none">{b.amount != null ? formatINR(b.amount) : '—'}</span>
            ) : (
              <span className={`font-display-lg text-[22px] md:text-[28px] font-bold leading-none ${kind === 'overdue' ? 'text-soft-coral' : 'text-secondary'}`}>{waited}</span>
            )}
          </div>
          <span className="text-[11px] md:text-xs text-indigo-gray-600">{kind === 'checkin' ? 'At your prices' : 'Since the booked day'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-2 md:gap-3">
        {kind === 'checkin' ? (
          <CheckInButton booking={ref} kind="blue" className={fullWidth} />
        ) : (
          <UploadReportButton booking={ref} kind={kind === 'overdue' ? 'coral' : 'blue'} className={fullWidth} />
        )}
        <CallLink phone={ref.phone} name={ref.patientName} kind={kind === 'overdue' ? 'blue' : 'soft'} className={fullWidth} />
        <Link
          href={`/diagnostic-center/patients?booking=${b.id}`}
          className={`${fullWidth} inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm transition-colors`}
        >
          <FolderOpen className="w-4 h-4" /> Patient Record
        </Link>
      </div>
    </section>
  )
}

function QueueItem({ booking: b, days, line, reportUrl }: { booking: LabBooking; days: number; line: string | null; reportUrl?: string }) {
  const ref = bookingRef(b)
  const sent = b.status === 'report_sent'
  const late = !sent && days >= OVERDUE_DAYS
  const look = sent
    ? { icon: FileCheck2, tint: 'bg-fresh-teal/15 text-secondary', chip: 'bg-surface-container-highest text-on-surface-variant', text: 'Report Sent' }
    : late
      ? { icon: AlarmClock, tint: 'bg-soft-coral/10 text-soft-coral', chip: 'bg-soft-coral/10 text-soft-coral', text: `Overdue ${days}d` }
      : days === 0
        ? { icon: ClipboardCheck, tint: 'bg-primary-fixed text-primary', chip: 'bg-fresh-teal/10 text-secondary', text: 'Collected Today' }
        : { icon: FlaskConical, tint: 'bg-surface-container-highest text-vibrant-blue', chip: 'bg-primary-fixed text-on-primary-fixed-variant', text: `Waiting ${days}d` }
  return (
    <li className="p-3 md:p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between gap-2 md:gap-3">
      <div className="flex items-center gap-2.5 md:gap-3.5 min-w-0">
        <span className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${look.tint}`}>
          <look.icon className="w-[18px] h-[18px] md:w-5 md:h-5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="font-semibold text-[13px] md:text-body-md text-on-surface truncate">{b.patient?.name ?? 'Patient'}</h4>
            <span className="hidden sm:inline text-xs font-mono text-indigo-gray-600 bg-surface-container-highest px-1.5 py-0.5 rounded shrink-0">#{b.code}</span>
          </div>
          <p className="text-[11px] md:text-xs text-on-surface-variant mt-0.5 truncate">
            {b.testLabel}
            {line ? ` • ${line}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
        <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold whitespace-nowrap ${look.chip}`}>{look.text}</span>
        {sent ? <ReportLink href={reportUrl} kind="icon" /> : <UploadReportButton booking={ref} kind="icon" />}
      </div>
    </li>
  )
}

function TimelineDay({ day, offset, list, top }: { day: string; offset: number; list: LabBooking[]; top: string[] }) {
  const sent = list.filter((b) => b.status === 'report_sent').length
  const collected = list.filter((b) => b.status !== 'confirmed').length
  const toCheck = list.length - collected
  const current = offset === 0
  const past = offset < 0
  const done = list.length > 0 && sent === list.length
  const date = dayLabel(day, { weekday: 'short', day: 'numeric', month: 'short' })
  const label = current ? 'Today • Current' : past ? `Yesterday • ${date}` : date

  let chip: ReactNode
  if (list.length === 0) chip = <span className="text-xs font-medium text-indigo-gray-600">Open</span>
  else if (done) chip = <span className="text-xs font-medium text-secondary bg-fresh-teal/10 px-2 py-0.5 rounded-full">Completed</span>
  else if (current) chip = <span className="text-xs font-semibold text-on-primary bg-vibrant-blue px-2 py-0.5 rounded-full">In Progress</span>
  else if (past) chip = <span className="text-xs font-medium text-soft-coral">{plural(collected - sent + toCheck, 'open item')}</span>
  else chip = <span className="text-xs font-medium text-indigo-gray-600">Scheduled</span>

  const title = list.length ? (current ? `${plural(list.length, 'booking')} today` : plural(list.length, 'booking')) : current ? 'No bookings yet today' : 'No bookings yet'
  const sub = past
    ? list.length
      ? `${collected} collected • ${plural(sent, 'report')} sent${toCheck ? ` • ${toCheck} never came` : ''}`
      : 'Nothing was booked'
    : current
      ? list.length
        ? `${toCheck} to check in • ${collected} collected • ${sent} sent`
        : 'Walk-ins can still be booked from the schedule'
      : top.length
        ? top.slice(0, 3).join(', ')
        : 'Patients can still book this day'
  const dot = done || (past && list.length) ? 'bg-fresh-teal' : 'bg-outline-variant'

  return (
    <li className={`relative ${current ? 'bg-surface-container-low p-3.5 rounded-lg -ml-2' : ''}`}>
      {current ? (
        <span className="absolute -left-[17px] top-4 w-3.5 h-3.5 rounded-full bg-vibrant-blue ring-4 ring-primary-fixed" />
      ) : (
        <span className={`absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest ${dot}`} />
      )}
      <Link href={`/diagnostic-center/schedule${current ? '' : `?date=${day}`}`} className="block group">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className={`text-[11px] md:text-xs font-bold uppercase tracking-wide ${current ? 'text-vibrant-blue' : past ? 'text-on-surface' : 'text-indigo-gray-600'}`}>{label}</span>
          {chip}
        </div>
        <h4 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">{title}</h4>
        <p className="text-xs text-on-surface-variant mt-0.5 truncate">{sub}</p>
      </Link>
    </li>
  )
}

function DeskItem({ booking: b, index }: { booking: LabBooking; index: number }) {
  const ref = bookingRef(b)
  const waitingHere = b.status === 'confirmed'
  const sent = b.status === 'report_sent'
  return (
    <li className="p-2.5 md:p-3 rounded-lg bg-surface-container-low flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
            waitingHere ? 'bg-primary-fixed text-vibrant-blue' : 'bg-surface-container-high text-indigo-gray-600'
          }`}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] md:text-sm font-semibold text-on-surface truncate">{b.patient?.name ?? 'Patient'}</p>
          <p className="text-[11px] md:text-xs text-on-surface-variant truncate">{b.testLabel}</p>
        </div>
      </div>
      {waitingHere ? (
        <CheckInButton booking={ref} kind="teal" className="!px-2.5 !py-1 !text-[11px] shrink-0" />
      ) : (
        <span className={`text-[11px] md:text-xs font-semibold px-2 py-1 rounded shrink-0 ${sent ? 'bg-fresh-teal/15 text-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
          {sent ? 'Report Sent' : 'Sample Collected'}
        </span>
      )}
    </li>
  )
}

function Placeholder({ icon: Icon, title, sub, aside }: { icon: LucideIcon; title: string; sub: string; aside: ReactNode }) {
  return (
    <div className="p-3 md:p-4 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 md:gap-3.5 min-w-0">
        <span className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-fresh-teal/15 text-secondary flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px] md:w-5 md:h-5" />
        </span>
        <div className="min-w-0">
          <h4 className="font-semibold text-[13px] md:text-body-md text-on-surface">{title}</h4>
          <p className="text-[11px] md:text-xs text-on-surface-variant mt-0.5">{sub}</p>
        </div>
      </div>
      <span className="shrink-0">{aside}</span>
    </div>
  )
}

function AllClear({ next, booking }: { next: LabBooking | null; booking: ReactNode }) {
  const when = next?.date ? dayLabel(next.date, { day: 'numeric', month: 'short' }) : null
  return (
    <section className="relative overflow-hidden bg-surface-container-lowest bg-gradient-to-r from-fresh-teal/[0.06] to-transparent rounded-2xl md:rounded-xl p-4 md:p-6 shadow-sm border border-surface-container md:border-transparent">
      <div aria-hidden className="md:hidden absolute top-0 inset-x-0 h-1.5 bg-fresh-teal" />
      <div className="flex items-start justify-between gap-3 md:gap-4 mb-3 md:mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden sm:flex w-10 h-10 rounded-full items-center justify-center shrink-0 bg-fresh-teal/10 text-secondary">
            <CircleCheck className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <span className="px-2 py-0.5 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider bg-fresh-teal text-on-secondary">All Clear</span>
            <h2 className="font-title-md text-[17px] md:text-title-md text-on-surface font-bold mt-1 md:mt-0.5">Nothing needs you right now</h2>
          </div>
        </div>
        <span className="hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded-full shrink-0 bg-fresh-teal/10 text-secondary">No reports due</span>
      </div>

      <div className="bg-surface-container-low rounded-lg p-3 md:p-4 mb-3 md:mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] md:text-xs text-indigo-gray-600 uppercase font-semibold">Next Booking</span>
          <p className="font-title-md text-[14px] md:text-base text-on-surface font-semibold truncate">{next ? next.patient?.name ?? 'Patient' : 'No upcoming bookings yet'}</p>
          <span className="text-[11px] md:text-xs text-on-surface-variant truncate block">{next ? next.testLabel : 'Paid online bookings and walk-ins show here'}</span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] md:text-xs text-indigo-gray-600 uppercase font-semibold">{next ? 'Booked For' : 'Waiting'}</span>
          <div className="font-display-lg text-[22px] md:text-[28px] font-bold leading-none text-secondary">{when ?? '0'}</div>
          <span className="text-[11px] md:text-xs text-indigo-gray-600">{next?.date ? dayLabel(next.date, { weekday: 'long' }) : 'Samples or check-ins'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-2 md:gap-3">
        {booking}
        <Link
          href="/diagnostic-center/schedule"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm transition-colors"
        >
          <CalendarDays className="w-4 h-4" /> Open Schedule
        </Link>
        <Link
          href="/diagnostic-center/schedule#tests"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm transition-colors"
        >
          <IndianRupee className="w-4 h-4" /> Test Prices
        </Link>
      </div>
    </section>
  )
}
