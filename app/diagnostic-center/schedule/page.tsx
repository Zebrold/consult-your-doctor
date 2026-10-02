import type { Metadata } from 'next'
import { ListChecks, Plus } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { istDateKey } from '@/components/patient/format'
import { Avatar, Card, CardHeader, Chip } from '@/components/portal/ui'
import { loadPatientFacts } from '@/lib/patient-facts'
import { signReportLinks } from '@/lib/lab-reports'
import { pricedTests } from '@/lib/pricing'
import { ageSex, bookingRef, loadLabBookings, requireCenter, shiftDay } from '../_lib/lab'
import { LabSchedule, type ScheduleBooking } from '../_components/LabSchedule'
import { NewBookingForm } from '../_components/NewBooking'
import { TestMenu } from '../_components/TestMenu'

export const metadata: Metadata = { title: 'Schedule | Diagnostic Center' }
export const dynamic = 'force-dynamic'

export default async function LabSchedulePage(props: { searchParams?: Promise<{ date?: string }> }) {
  const params = (await props.searchParams) ?? {}
  const { admin, lab, staff } = await requireCenter()
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
    reportUrl: reports[b.id] ?? null,
  }))
  const priced = pricedTests(lab.prices)

  return (
    <>
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Avatar name={lab.name} image={lab.image} square className="w-12 h-12 md:w-14 md:h-14 text-base" />
          <div className="min-w-0">
            <h1 className="font-title-md text-[17px] md:text-[20px] font-bold text-indigo-gray-900 truncate">{lab.name}</h1>
            <p className="text-[12px] md:text-sm text-indigo-gray-600 truncate">
              {[lab.city, `Signed in as ${staff.name}`].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:flex items-center gap-2 shrink-0">
          <a
            href="#new-booking"
            className="flex items-center justify-center gap-1.5 bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-[12px] md:text-label-sm px-4 py-2.5 rounded-full shadow-[0_4px_14px_rgba(0,102,255,0.25)]"
          >
            <Plus className="w-[18px] h-[18px]" /> New Booking
          </a>
          <a href="#tests" className="flex items-center justify-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-[12px] md:text-label-sm px-4 py-2.5 rounded-full">
            <ListChecks className="w-[18px] h-[18px] text-vibrant-blue" /> Tests &amp; Prices
          </a>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-gutter items-start">
        <div className="lg:col-span-8 lg:row-start-1">
          <LabSchedule key={date} bookings={board} today={today} initialDate={date} />
        </div>

        <Card id="new-booking" className="lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-6 scroll-mt-20">
          <CardHeader title="New Booking" subtitle="Book a walk-in or phone patient. They pay at the desk." />
          <NewBookingForm tests={priced} minDate={today} maxDate={shiftDay(today, 90)} defaultDate={date < today ? today : date} />
        </Card>

        <Card id="tests" className="lg:col-span-8 lg:row-start-2 scroll-mt-20">
          <CardHeader
            title="Test Menu & Prices"
            subtitle="What patients can book with you, in rupees"
            action={<Chip tone="neutral">{lab.tests.length} {lab.tests.length === 1 ? 'test' : 'tests'}</Chip>}
          />
          <TestMenu tests={lab.tests} />
        </Card>
      </div>
    </>
  )
}
