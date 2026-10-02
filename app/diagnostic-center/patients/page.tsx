import type { Metadata } from 'next'
import { FileCheck2, FlaskConical, ReceiptText, Users } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { istDateKey } from '@/components/patient/format'
import { StatCard } from '@/components/portal/ui'
import { loadPatientFacts } from '@/lib/patient-facts'
import { signReportLinks } from '@/lib/lab-reports'
import { pricedTests } from '@/lib/pricing'
import { ageSex, awaitingReport, bookingRef, dayToMs, isPaid, loadLabBookings, requireCenter, shiftDay } from '../_lib/lab'
import { LabRoster, type RosterBooking, type RosterGroup } from '../_components/LabRoster'
import { NewBookingButton } from '../_components/NewBooking'

export const metadata: Metadata = { title: 'Patients | Diagnostic Center' }
export const dynamic = 'force-dynamic'

const GROUPS: RosterGroup[] = ['all', 'booked', 'collected', 'sent']

export default async function LabPatientsPage(props: { searchParams?: Promise<{ status?: string }> }) {
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
  const waiting = bookings.filter(awaitingReport)
  const oldestWait = waiting.reduce<string | null>((min, b) => (b.date && (!min || b.date < min) ? b.date : min), null)
  const waitDays = oldestWait ? Math.max(0, Math.round((dayToMs(today) - dayToMs(oldestWait)) / 86_400_000)) : 0
  const sentThisMonth = bookings.filter((b) => b.status === 'report_sent' && inMonth(b.date, month)).length

  const initialGroup = GROUPS.includes(params.status as RosterGroup) ? (params.status as RosterGroup) : 'all'

  return (
    <>
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-gutter">
        <StatCard label="Patients" value={patientIds.length} note={newThisMonth ? `+${newThisMonth} new` : undefined} icon={Users} tone="blue" footer={<span className="text-[11px] text-indigo-gray-600">Booked and paid with you</span>} />
        <StatCard
          label="Bookings This Month"
          value={bookingsThisMonth}
          note={bookingsLastMonth ? `${bookingsThisMonth >= bookingsLastMonth ? '+' : ''}${bookingsThisMonth - bookingsLastMonth}` : undefined}
          noteTone={bookingsThisMonth >= bookingsLastMonth ? 'teal' : 'coral'}
          icon={ReceiptText}
          tone="neutral"
          footer={<span className="text-[11px] text-indigo-gray-600">Last month: {bookingsLastMonth}</span>}
        />
        <StatCard
          label="Awaiting Report"
          value={waiting.length}
          note={waiting.length ? 'samples' : undefined}
          noteTone="coral"
          icon={FlaskConical}
          tone="coral"
          alert={waitDays >= 3}
          footer={<span className="text-[11px] text-indigo-gray-600">{waiting.length ? `Oldest: ${waitDays === 0 ? 'today' : `${waitDays} ${waitDays === 1 ? 'day' : 'days'} ago`}` : 'All reports are out'}</span>}
        />
        <StatCard label="Reports Sent" value={sentThisMonth} note="this month" icon={FileCheck2} tone="teal" footer={<span className="text-[11px] text-indigo-gray-600">Delivered to patients’ accounts</span>} />
      </section>

      <section className="bg-surface-container-lowest rounded-2xl md:rounded-xl p-4 md:p-stack-md shadow-sm border border-surface-container md:border-transparent flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline-lg text-[22px] md:text-headline-lg font-extrabold text-indigo-gray-900 tracking-tight">Patients &amp; Reports</h1>
          <p className="text-sm md:text-body-md text-indigo-gray-600 mt-0.5">Every paid booking at {lab.name}: check patients in, upload reports and keep track of what’s been sent.</p>
        </div>
        <NewBookingButton
          tests={pricedTests(lab.prices)}
          minDate={today}
          maxDate={shiftDay(today, 90)}
          defaultDate={today}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-label-sm shadow-md"
        />
      </section>

      <LabRoster key={initialGroup} bookings={rows} initialGroup={initialGroup} today={today} />
    </>
  )
}
