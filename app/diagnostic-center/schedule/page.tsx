import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { istDateKey } from '@/components/patient/format'
import { loadPatientFacts } from '@/lib/patient-facts'
import { signReportLinks } from '@/lib/lab-reports'
import { pricedTests } from '@/lib/pricing'
import { ageSex, bookingRef, isPaid, loadLabBookings, requireCenter } from '../_lib/lab'
import { LabSchedule, type ScheduleBooking } from '../_components/LabSchedule'

export const metadata: Metadata = { title: 'Schedule | Diagnostic Center' }
export const dynamic = 'force-dynamic'

export default async function LabSchedulePage(props: { searchParams?: Promise<{ date?: string }> }) {
  const params = (await props.searchParams) ?? {}
  const { admin, lab } = await requireCenter()
  const now = currentTime()
  const today = istDateKey(now)
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today

  const bookings = await loadLabBookings(admin, lab)
  const [facts, reports] = await Promise.all([
    loadPatientFacts(admin, Array.from(new Set(bookings.map((b) => b.patient?.id).filter(Boolean) as string[]))),
    signReportLinks(admin, bookings.filter((b) => b.status === 'report_sent').map((b) => ({ id: b.id, centerId: lab.id }))),
  ])

  const board: ScheduleBooking[] = bookings.map((b) => ({
    ...bookingRef(b),
    date: b.date,
    amount: b.amount,
    ageSex: b.patient ? ageSex(facts[b.patient.id], now) : null,
    bloodGroup: b.patient ? facts[b.patient.id]?.bloodGroup ?? null : null,
    testCount: b.tests.length,
    reportUrl: reports[b.id] ?? null,
  }))

  const booked: Record<string, number> = {}
  for (const b of bookings.filter(isPaid)) for (const t of b.tests) booked[t.name] = (booked[t.name] ?? 0) + 1

  return (
    <LabSchedule
      key={date}
      lab={{
        name: lab.name,
        image: lab.image,
        city: lab.city,
        address: lab.address,
        live: lab.status === 'active',
        tests: lab.tests,
        priced: pricedTests(lab.prices),
      }}
      bookings={board}
      today={today}
      initialDate={date}
      booked={booked}
    />
  )
}
