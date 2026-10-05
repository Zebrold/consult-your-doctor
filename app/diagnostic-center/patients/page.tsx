import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AlarmClock, CalendarCheck, FileCheck2, TrendingDown, TrendingUp, Users, type LucideIcon } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { istDateKey } from '@/components/patient/format'
import { loadPatientFacts } from '@/lib/patient-facts'
import { signReportLinks } from '@/lib/lab-reports'
import { pricedTests } from '@/lib/pricing'
import { ageSex, awaitingReport, bookingRef, dayToMs, isPaid, loadLabBookings, requireCenter, shiftDay } from '../_lib/lab'
import { OVERDUE_DAYS } from '../_lib/constants'
import { LabRoster, type RosterBooking, type RosterGroup } from '../_components/LabRoster'
import { NewBookingButton } from '../_components/NewBooking'

export const metadata: Metadata = { title: 'Patients | Diagnostic Center' }
export const dynamic = 'force-dynamic'

const GROUPS: RosterGroup[] = ['all', 'booked', 'collected', 'sent']

export default async function LabPatientsPage(props: { searchParams?: Promise<{ status?: string; booking?: string }> }) {
  const params = (await props.searchParams) ?? {}
  const { admin, lab } = await requireCenter()
  const now = currentTime()
  const today = istDateKey(now)

  // Unpaid bookings aren't the lab's patients yet; they show on the schedule until the patient pays.
  const bookings = (await loadLabBookings(admin, lab)).filter(isPaid)
  const patientIds = Array.from(new Set(bookings.map((b) => b.patient?.id).filter(Boolean) as string[]))
  const [facts, reports] = await Promise.all([
    loadPatientFacts(admin, patientIds),
    signReportLinks(admin, bookings.filter((b) => b.status === 'report_sent').map((b) => ({ id: b.id, centerId: lab.id }))),
  ])

  const visitsByPatient = new Map<string, number>()
  for (const b of bookings) if (b.patient) visitsByPatient.set(b.patient.id, (visitsByPatient.get(b.patient.id) ?? 0) + 1)

  // Newest day first; within a day, the ones still needing work first.
  const order: Record<string, number> = { visited: 0, completed: 0, confirmed: 1, report_sent: 2 }
  const rows: RosterBooking[] = [...bookings]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || (order[a.status] ?? 3) - (order[b.status] ?? 3))
    .map((b) => {
      const f = b.patient ? facts[b.patient.id] : undefined
      return {
        ...bookingRef(b),
        date: b.date,
        amount: b.amount,
        email: b.patient?.email ?? null,
        ageSex: ageSex(f, now),
        bloodGroup: f?.bloodGroup ?? null,
        dateOfBirth: f?.dateOfBirth ?? null,
        gender: f?.gender ?? null,
        visitsHere: b.patient ? visitsByPatient.get(b.patient.id) ?? 1 : 1,
        reportUrl: reports[b.id] ?? null,
        tests: b.tests,
      }
    })

  // Month figures go by the booked day, in India time.
  const month = today.slice(0, 7)
  const lastMonth = shiftDay(`${month}-01`, -1).slice(0, 7)
  const inMonth = (date: string | null, key: string) => !!date && date.slice(0, 7) === key
  const firstDay = new Map<string, string>()
  for (const b of bookings) if (b.patient && b.date && (!firstDay.has(b.patient.id) || b.date < firstDay.get(b.patient.id)!)) firstDay.set(b.patient.id, b.date)
  const newThisMonth = Array.from(firstDay.values()).filter((d) => inMonth(d, month)).length
  const bookingsThisMonth = bookings.filter((b) => inMonth(b.date, month)).length
  const bookingsLastMonth = bookings.filter((b) => inMonth(b.date, lastMonth)).length
  const delta = bookingsThisMonth - bookingsLastMonth
  const waiting = bookings.filter(awaitingReport)
  const waitDays = (date: string | null) => (date ? Math.max(0, Math.round((dayToMs(today) - dayToMs(date)) / 86_400_000)) : 0)
  const overdue = waiting.filter((b) => waitDays(b.date) >= OVERDUE_DAYS).length
  const oldest = waiting.reduce<string | null>((min, b) => (b.date && (!min || b.date < min) ? b.date : min), null)
  const sentThisMonth = bookings.filter((b) => b.status === 'report_sent' && inMonth(b.date, month)).length
  const sentAll = bookings.filter((b) => b.status === 'report_sent').length
  const collectedAll = bookings.filter((b) => b.status !== 'confirmed').length

  const initialGroup = GROUPS.includes(params.status as RosterGroup) ? (params.status as RosterGroup) : 'all'
  const bookingProps = { tests: pricedTests(lab.prices), minDate: today, maxDate: shiftDay(today, 90), defaultDate: today }

  return (
    <>
      <section className="flex md:grid md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-gutter overflow-x-auto snap-x snap-mandatory scroll-px-4 md:scroll-px-0 -mx-4 px-4 md:mx-0 md:px-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Metric
          label="Patients"
          value={patientIds.length.toLocaleString('en-IN')}
          icon={Users}
          chip={
            newThisMonth > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />+{newThisMonth} new
              </span>
            )
          }
          footLeft="With a paid booking"
          footRight={`${newThisMonth} this month`}
          footRightClass="text-primary"
        />
        <Metric
          label="Bookings This Month"
          value={String(bookingsThisMonth)}
          icon={CalendarCheck}
          chipClass="bg-surface-container text-on-surface-variant"
          chip={
            (bookingsLastMonth > 0 || bookingsThisMonth > 0) && (
              <span className="inline-flex items-center gap-0.5">
                {delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {delta >= 0 ? '+' : ''}
                {delta} vs last
              </span>
            )
          }
          footLeft="Last month"
          footRight={`${bookingsLastMonth} bookings`}
          footRightClass="text-secondary"
        />
        <Metric
          label="Reports Sent"
          value={String(sentThisMonth)}
          icon={FileCheck2}
          chip="This month"
          footLeft="All time"
          footRight={`${sentAll} of ${collectedAll} collected`}
          footRightClass="text-primary"
        />
        <Metric
          label="Awaiting Report"
          value={String(waiting.length)}
          icon={AlarmClock}
          alert={waiting.length > 0}
          chipClass="bg-tertiary-fixed text-on-tertiary-fixed"
          chip={
            waiting.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-soft-coral animate-ping" />
                {overdue ? `${overdue} overdue` : 'Upload due'}
              </span>
            )
          }
          footLeft={oldest ? `Oldest: ${waitDays(oldest) === 0 ? 'today' : `${waitDays(oldest)}d ago`}` : 'Every sample reported'}
          footRight={
            waiting.length > 0 ? (
              <a href="/diagnostic-center/patients?status=collected" className="hover:underline">
                Upload now →
              </a>
            ) : (
              'All clear'
            )
          }
          footRightClass="text-secondary"
        />
      </section>

      <LabRoster
        key={`${initialGroup}-${params.booking ?? ''}`}
        bookings={rows}
        initialGroup={initialGroup}
        initialBooking={params.booking ?? null}
        today={today}
        mobileAction={
          <NewBookingButton
            key="mobile-booking"
            {...bookingProps}
            label="New Patient Booking"
            className="flex-1 h-12 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm font-bold shadow-lg shadow-vibrant-blue/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          />
        }
        header={
          <NewBookingButton
            key="header-booking"
            {...bookingProps}
            label="New Patient Booking"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm hover:bg-primary transition-transform active:scale-95 shadow-md"
          />
        }
      />
    </>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
  chip,
  chipClass = 'bg-secondary-container/40 text-on-secondary-fixed-variant',
  footLeft,
  footRight,
  footRightClass,
  alert,
}: {
  label: string
  value: string
  icon: LucideIcon
  chip?: ReactNode
  chipClass?: string
  footLeft: string
  footRight: ReactNode
  footRightClass: string
  alert?: boolean
}) {
  return (
    <div
      className={`snap-start shrink-0 min-w-[220px] md:min-w-0 rounded-xl p-3.5 md:p-6 relative overflow-hidden flex flex-col justify-between ${
        alert ? 'bg-soft-coral/10 md:bg-surface-container-lowest shadow-[0_4px_24px_rgba(244,63,94,0.1)]' : 'bg-surface-container-lowest shadow-[0_4px_24px_rgba(0,102,255,0.06)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`font-label-sm text-[11px] md:text-label-sm uppercase tracking-wider block mb-1 ${alert ? 'text-tertiary-container font-semibold' : 'text-indigo-gray-600'}`}>{label}</span>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`font-display-lg text-[28px] md:text-display-lg font-bold md:font-extrabold leading-tight tracking-tight ${alert ? 'text-tertiary' : 'text-on-surface'}`}>{value}</span>
            {chip && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] md:text-label-sm font-label-sm ${chipClass}`}>{chip}</span>}
          </div>
        </div>
        <span className={`w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${alert ? 'bg-tertiary-fixed/60 text-tertiary' : 'bg-primary-fixed/40 text-primary'}`}>
          <Icon className="w-[18px] h-[18px] md:w-6 md:h-6" />
        </span>
      </div>
      <div className={`mt-3 md:mt-4 -mx-3.5 md:-mx-6 -mb-3.5 md:-mb-6 px-3.5 md:px-6 py-2.5 md:py-3 flex items-center justify-between gap-2 ${alert ? 'bg-tertiary-fixed/20' : 'bg-surface-container-low/50'}`}>
        <span className={`font-label-sm text-[11px] md:text-label-sm truncate ${alert ? 'text-tertiary-container font-medium' : 'text-indigo-gray-600'}`}>{footLeft}</span>
        <span className={`font-label-sm text-[11px] md:text-label-sm font-semibold shrink-0 ${footRightClass}`}>{footRight}</span>
      </div>
    </div>
  )
}
