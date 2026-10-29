import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatINR, formatLongDate, formatTime, istDateKey } from '@/components/patient/format'
import { dayStartIso, loadHospitalDoctors, loadHospitalSlots, requireHospital } from '../../../_lib/hospital'
import { EmptyLine, HosBackHeader, HosBody, Initials, Panel, PanelHead } from '../../../_components/hos-ui'
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
  const name = doctorName(doctor.name)
  const facts = [doctor.department, doctor.fee != null ? `${formatINR(doctor.fee)} per consultation` : null].filter(Boolean).join(' · ')
  const rosterHref = `/hospital/doctors${selected === istDateKey(now) ? '' : `?date=${selected}`}`

  return (
    <>
      <HosBackHeader backHref={rosterHref} backLabel="Back to the roster" title={`${name} · slots`}>
        <p className="mt-1 ml-[52px] text-[13px] text-[#DCE6FF] truncate">{facts}</p>
      </HosBackHeader>
      <HosBody>
        <div className="hidden lg:flex items-center gap-4 mb-[22px]">
          <Link href={rosterHref} aria-label="Back to the roster" className="w-[42px] h-[42px] rounded-[11px] border border-[#D6DDE8] bg-white flex items-center justify-center hover:bg-[#F4F6FA]">
            <ArrowLeft className="w-[18px] h-[18px]" />
          </Link>
          <Initials name={name} image={doctor.image} className="w-12 h-12 text-[14px]" />
          <div className="min-w-0">
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] leading-tight truncate">{name}</h1>
            <p className="text-[14px] text-[#5B667A] truncate">{facts}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-5 lg:items-start">
          <div className="flex flex-col gap-3.5 lg:gap-5">
            <Panel>
              <PanelHead title="Pick a day" sub="See the slots published for that day" />
              <DatePicker selectedDate={selected} />
            </Panel>
            <Panel>
              <PanelHead title="Publish slots" sub="Times are in India time. Existing slots are never duplicated." />
              <SlotGeneratorForm doctorId={doctor.id} selectedDate={selected} />
            </Panel>
          </div>

          <Panel>
            <PanelHead
              title={formatLongDate(`${selected}T12:00:00+05:30`)}
              sub="Open slots can be removed; booked ones can’t"
              right={
                <span className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0]">
                  {booked} / {slots.length} booked
                </span>
              }
            />
            {slots.length === 0 ? (
              <EmptyLine>No slots published for this day yet.</EmptyLine>
            ) : (
              <ul className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2 lg:gap-2.5 mt-1">
                {slots.map((s) => {
                  const past = Date.parse(s.start) < now
                  return (
                    <li
                      key={s.id}
                      className={`relative h-[58px] rounded-xl flex flex-col items-center justify-center ${
                        s.booked ? 'bg-[#2A4DD0] text-white' : past ? 'bg-[#F4F6FA] text-[#8A94A6]' : 'bg-white text-[#067647] shadow-[inset_0_0_0_1.5px_#ABEFC6]'
                      }`}
                    >
                      <span className="text-[13.5px] font-extrabold">{formatTime(s.start)}</span>
                      <span className="text-[11px] font-bold opacity-85">{s.booked ? 'Booked' : past ? 'Past' : 'Open'}</span>
                      {!s.booked && !past && (
                        <span className="absolute top-0.5 right-0.5">
                          <DeleteSlotButton scheduleId={s.id} doctorId={doctor.id} />
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-4 text-[12.5px] text-[#5B667A]">Patients can book open slots on the website straight away.</p>
          </Panel>
        </div>
      </HosBody>
    </>
  )
}
