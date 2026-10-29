import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatShortDate, istDateKey } from '@/components/patient/format'
import { loadHospitalBeds, loadRecentDischarges, stayDays } from '@/lib/beds'
import { dayOf, loadHospitalDoctors, requireHospital } from '../_lib/hospital'
import { BedBoard, type BedStats } from '../_components/BedBoard'
import { BedSyncNotice } from '../_components/BedSyncNotice'
import { Panel, PanelHead } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Inpatient Beds | Hospital Portal' }
export const dynamic = 'force-dynamic'

// Discharges read for today's counts and the average stay; the card lists the latest few.
const DISCHARGES_READ = 40
const DISCHARGES_SHOWN = 6

export default async function HospitalBedsPage() {
  const { admin, hospital, staff } = await requireHospital()
  const now = currentTime()
  const today = istDateKey(now)
  const [beds, doctors, discharges] = await Promise.all([
    loadHospitalBeds(admin, hospital.id),
    loadHospitalDoctors(admin, hospital.id),
    loadRecentDischarges(admin, hospital.id, DISCHARGES_READ),
  ])

  const stays = discharges.map((d) => stayDays(d.admittedAt, d.dischargedAt!))
  const stats: BedStats = {
    admittedToday: [...beds.data.flatMap((b) => (b.admission ? [b.admission] : [])), ...discharges].filter((a) => dayOf(a.admittedAt) === today).length,
    dischargedToday: discharges.filter((d) => dayOf(d.dischargedAt) === today).length,
    avgStay: stays.length ? stays.reduce((s, n) => s + n, 0) / stays.length : null,
    staysCounted: stays.length,
  }

  const recent = (
    <Panel>
      <PanelHead title="Recent discharges" sub="Patients who went home from your wards" />
      {discharges.length === 0 ? (
        <p className="py-3 text-[13px] text-[#5B667A] border-t border-[#EEF2F7]">Discharged patients appear here.</p>
      ) : (
        <ul>
          {discharges.slice(0, DISCHARGES_SHOWN).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7]">
              <span className="min-w-0">
                <span className="block text-[13.5px] font-extrabold truncate">{d.patient.name}</span>
                <span className="block text-[12px] text-[#5B667A] truncate">{[d.bed, d.doctor?.name].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="text-right shrink-0">
                <span className="block text-[12.5px] font-bold">{formatShortDate(d.dischargedAt!)}</span>
                <span className="block text-[11.5px] text-[#5B667A]">{stayDays(d.admittedAt, d.dischargedAt!)} days</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )

  return (
    <BedBoard
      beds={beds.data}
      doctors={doctors.map((d) => ({ id: d.id, name: doctorName(d.name), department: d.department }))}
      now={now}
      staff={staff}
      ready={beds.ready}
      stats={stats}
      notice={
        beds.persistedInDb ? undefined : (
          <div className="mb-3.5 lg:mb-5 empty:hidden">
            <BedSyncNotice />
          </div>
        )
      }
      recent={recent}
    />
  )
}
