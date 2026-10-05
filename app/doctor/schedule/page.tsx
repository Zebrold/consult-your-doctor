import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { ageFrom, istDateKey } from '@/components/patient/format'
import { latestVitals, loadPatientFacts, loadSlots, loadVisits, requireDoctor } from '../_lib/doctor'
import { ScheduleBoard, type BoardPatientFacts, type BoardVisit } from '../_components/ScheduleBoard'

export const metadata: Metadata = { title: 'Schedule | Doctor Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000

export default async function DoctorSchedulePage(props: { searchParams?: Promise<{ date?: string }> }) {
  const params = (await props.searchParams) ?? {}
  const { admin, doctor } = await requireDoctor()
  const now = currentTime()
  const today = istDateKey(now)
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today

  // Load a window around the chosen date; picking a date outside it reloads the page for that date.
  const anchor = Date.parse(`${date}T00:00:00+05:30`)
  const windowStart = anchor - 35 * DAY
  const windowEnd = anchor + 63 * DAY

  const [visits, slots] = await Promise.all([
    loadVisits(admin, doctor.id),
    loadSlots(admin, doctor.id, new Date(windowStart).toISOString(), new Date(windowEnd).toISOString()),
  ])

  const inWindow = visits.filter((v) => v.status !== 'cancelled' && v.start && Date.parse(v.start) >= windowStart && Date.parse(v.start) < windowEnd)
  const facts = await loadPatientFacts(admin, Array.from(new Set(inWindow.map((v) => v.patient?.id).filter(Boolean) as string[])))

  const boardVisits: BoardVisit[] = inWindow.map((v) => ({
    id: v.id,
    status: v.status,
    scheduleId: v.scheduleId,
    start: v.start!,
    end: v.end,
    patient: v.patient ? { id: v.patient.id, name: v.patient.name, phone: v.patient.phone } : null,
    recordUrl: v.records.find((r) => r.fileUrl)?.fileUrl ?? null,
    hasNotes: v.records.length > 0,
  }))

  const vitals = latestVitals(visits)
  const boardFacts: Record<string, BoardPatientFacts> = {}
  for (const id of new Set(inWindow.map((v) => v.patient?.id).filter(Boolean) as string[])) {
    const f = facts[id]
    boardFacts[id] = { age: ageFrom(f?.dateOfBirth, now), gender: f?.gender ?? null, bloodGroup: f?.bloodGroup ?? null, vitals: vitals[id] ?? null }
  }

  return (
    <ScheduleBoard
      key={date}
      doctor={{
        name: doctor.name,
        image: doctor.image,
        specialty: doctor.specialty,
        qualifications: doctor.qualifications,
        hospital: doctor.hospital,
        fee: doctor.fee,
        editable: {
          name: doctor.name,
          phone: doctor.phone,
          specialty: doctor.specialty,
          qualifications: doctor.qualifications,
          experience: doctor.experience,
          fee: doctor.fee,
          bio: doctor.bio,
          address: doctor.address,
        },
      }}
      slots={slots}
      visits={boardVisits}
      facts={boardFacts}
      now={now}
      initialDate={date}
      windowKeys={{ from: istDateKey(windowStart), to: istDateKey(windowEnd - DAY) }}
    />
  )
}
