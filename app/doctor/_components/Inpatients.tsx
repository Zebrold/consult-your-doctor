import { formatShortDate } from '@/components/patient/format'
import { LiveRefresh } from '@/components/portal/LiveRefresh'
import { stayDays, type PlacedAdmission } from '@/lib/beds'
import { EmptyLine, Panel, PanelHead } from './doc-ui'

/**
 * Patients admitted under this doctor, with their ward and bed. The hospital allocates beds, and this list follows
 * every admission, move and discharge on its own (LiveRefresh).
 */
export function Inpatients({ admissions, now, className = '' }: { admissions: PlacedAdmission[]; now: number; className?: string }) {
  const hospitals = Array.from(new Set(admissions.map((a) => a.hospital)))
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  return (
    <Panel className={className}>
      <PanelHead
        title="My inpatients"
        sub={admissions.length === 0 ? 'Patients the hospital admits under you' : hospitals.length === 1 ? `Admitted under you at ${hospitals[0]}` : `${admissions.length} admitted under your care`}
        right={<LiveRefresh />}
      />
      {admissions.length === 0 ? (
        <EmptyLine>No patients are admitted under you right now.</EmptyLine>
      ) : (
        <ul>
          {admissions.map((a) => {
            const due = a.expectedDischarge && a.expectedDischarge <= today
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 py-[11px] lg:py-3 border-t border-[#EEF2F7]">
                <span className="min-w-0">
                  <span className="block text-[14px] lg:text-[13.5px] font-extrabold truncate">{a.patient.name}</span>
                  <span className="block text-[12px] text-[#5B667A] truncate">{a.reason || `${a.bedType} bed`}{a.expectedDischarge ? ` · discharge ${formatShortDate(a.expectedDischarge)}` : ''}</span>
                </span>
                <span className="shrink-0 text-right text-[12.5px] font-extrabold">
                  {a.ward} · {a.bed}
                  <span className={`block text-[11.5px] lg:text-[12.5px] font-bold ${due ? 'text-[#B42318]' : 'text-[#5B667A]'}`}>Day {stayDays(a.admittedAt, now)}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
