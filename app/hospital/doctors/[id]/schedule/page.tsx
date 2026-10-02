import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, CalendarDays, Clock } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatLongDate, formatTime, istDateKey } from '@/components/patient/format'
import { Avatar, Card, CardHeader, Chip, EmptyState } from '@/components/portal/ui'
import { dayStartIso, loadHospitalDoctors, loadHospitalSlots, requireHospital } from '../../../_lib/hospital'
import { SlotGeneratorForm } from './SlotGeneratorForm'
import { DeleteSlotButton } from './DeleteSlotButton'
import { DatePicker } from './DatePicker'

export const metadata: Metadata = { title: 'Doctor Schedule | Hospital Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000

export default async function DoctorSchedulePage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string }> }) {
  const { id } = await props.params
  const { date } = await props.searchParams
  const { admin, hospital } = await requireHospital()
  const now = currentTime()

  const doctor = (await loadHospitalDoctors(admin, hospital.id)).find((d) => d.id === id)
  if (!doctor) redirect('/hospital/doctors')

  const selected = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : istDateKey(now)
  const start = dayStartIso(selected)
  const slots = await loadHospitalSlots(admin, [doctor.id], start, new Date(Date.parse(start) + DAY).toISOString())
  const booked = slots.filter((s) => s.booked).length

  return (
    <>
      <Link href="/hospital/doctors" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-gray-600 hover:text-indigo-gray-900 self-start">
        <ArrowLeft className="w-4 h-4" /> Back to Roster
      </Link>

      <Card className="flex items-center gap-3 md:gap-4">
        <Avatar name={doctor.name} image={doctor.image} className="w-12 h-12 md:w-14 md:h-14 text-base" />
        <div className="min-w-0">
          <h1 className="font-title-md text-[18px] md:text-title-md font-bold text-indigo-gray-900 truncate">{doctorName(doctor.name)}</h1>
          <p className="text-sm text-indigo-gray-600 truncate">
            {[doctor.department, doctor.fee != null ? `₹${doctor.fee} per consultation` : null].filter(Boolean).join(' • ')}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-gutter items-start">
        <div className="flex flex-col gap-4 md:gap-gutter">
          <Card>
            <CardHeader title="Pick a Day" subtitle="See the slots published for that day" />
            <DatePicker selectedDate={selected} />
          </Card>
          <Card>
            <CardHeader title="Publish Slots" subtitle="Times are in India time. Existing slots are never duplicated." />
            <SlotGeneratorForm doctorId={doctor.id} selectedDate={selected} />
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title={formatLongDate(`${selected}T12:00:00+05:30`)}
            subtitle="Open slots can be removed; booked ones can’t"
            action={<Chip tone="blue">{booked}/{slots.length} booked</Chip>}
          />
          {slots.length === 0 ? (
            <EmptyState icon={Clock}>No slots published for this day yet.</EmptyState>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 md:gap-3">
              {slots.map((s) => {
                const past = Date.parse(s.start) < now
                return (
                  <li
                    key={s.id}
                    className={`relative rounded-xl p-3 text-center border ${
                      s.booked ? 'bg-primary-fixed/50 border-primary-fixed text-primary' : past ? 'bg-surface-container-low border-transparent text-indigo-gray-600 opacity-60' : 'bg-surface-container-lowest border-outline-variant/40 text-indigo-gray-900'
                    }`}
                  >
                    <div className="text-[14px] font-bold">{formatTime(s.start)}</div>
                    <div className="text-[11px] mt-0.5">{s.booked ? 'Booked' : past ? 'Past' : 'Open'}</div>
                    {!s.booked && !past && (
                      <div className="absolute top-1 right-1">
                        <DeleteSlotButton scheduleId={s.id} doctorId={doctor.id} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-[12px] text-indigo-gray-600 mt-4 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" /> Patients can book open slots on the website straight away.
          </p>
        </Card>
      </div>
    </>
  )
}
