import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { loadPractices } from '@/lib/practices'
import { loadSlots, loadVisits, requireDoctor } from '../_lib/doctor'
import { DoctorPractice } from '../_components/DoctorPractice'
import { PracticeLinks, type DoctorLink } from '../_components/PracticeLinks'

export const metadata: Metadata = { title: 'Hospitals & clinics | Doctor Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000

export default async function DoctorPracticePage() {
  const { admin, doctor } = await requireDoctor()
  const now = currentTime()
  const fromIso = new Date(now).toISOString()
  const toIso = new Date(now + 28 * DAY).toISOString()
  const [slots, visits, { practices }, slotHospitals] = await Promise.all([
    loadSlots(admin, doctor.id, fromIso, toIso),
    loadVisits(admin, doctor.id),
    loadPractices(admin, { doctorId: doctor.id }),
    // Which hospital each slot is at: other hospitals the doctor visits publish slots with their own id (lib/practices.ts).
    admin.from('schedules').select('id, hospital_id, is_booked').eq('doctor_id', doctor.id).gte('start_time', fromIso).lt('start_time', toIso).not('hospital_id', 'is', null),
  ])
  const elsewhere = new Map<string, string>()
  for (const s of (slotHospitals.error ? [] : (slotHospitals.data ?? [])) as { id: string; hospital_id: string }[]) elsewhere.set(s.id, s.hospital_id)
  const own = slots.filter((s) => !elsewhere.has(s.id) || elsewhere.get(s.id) === doctor.hospital?.id)

  const open = practices.filter((p) => ['invited', 'accepted', 'confirmed'].includes(p.status))
  const { data: hospitals } = open.length ? await admin.from('hospitals').select('id, name, city').in('id', open.map((p) => p.hospitalId)) : { data: [] }
  const byId = new Map(((hospitals ?? []) as { id: string; name: string; city: string | null }[]).map((h) => [h.id, h]))
  const links: DoctorLink[] = open.map((p) => {
    const at = slots.filter((s) => elsewhere.get(s.id) === p.hospitalId)
    return {
      id: p.id,
      hospitalId: p.hospitalId,
      hospital: byId.get(p.hospitalId)?.name ?? 'Hospital',
      city: byId.get(p.hospitalId)?.city ?? null,
      status: p.status,
      note: p.note,
      slots: at.length,
      openSlots: at.filter((s) => !s.booked).length,
    }
  })

  return <DoctorPractice doctor={doctor} slots={own} visits={visits} now={now} others={<PracticeLinks links={links} />} />
}
