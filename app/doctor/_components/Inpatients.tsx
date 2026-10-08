import { BedDouble } from 'lucide-react'
import { formatShortDate } from '@/components/patient/format'
import { Avatar, Card, CardHeader, EmptyState } from '@/components/portal/ui'
import { LiveRefresh } from '@/components/portal/LiveRefresh'
import { stayDays, type PlacedAdmission } from '@/lib/beds'

/**
 * Patients admitted under this doctor, with their ward and bed. The hospital allocates beds, and this list follows
 * every admission, move and discharge on its own (LiveRefresh).
 */
export function Inpatients({ admissions, now }: { admissions: PlacedAdmission[]; now: number }) {
  return (
    <Card>
      <CardHeader
        title="My Inpatients"
        subtitle={admissions.length ? `${admissions.length} admitted under your care` : 'Patients the hospital admits under you'}
        action={<LiveRefresh />}
      />
      {admissions.length === 0 ? (
        <EmptyState icon={BedDouble}>No patients are admitted under you right now.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {admissions.map((a) => {
            const day = stayDays(a.admittedAt, now)
            const due = a.expectedDischarge && a.expectedDischarge <= new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
            return (
              <li key={a.id} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={a.patient.name} className="w-10 h-10 text-sm" />
                  <div className="min-w-0">
                    <p className="font-bold text-[14px] text-on-surface truncate">{a.patient.name}</p>
                    <p className="text-[12px] text-indigo-gray-600 truncate">
                      {a.ward} • {a.bed} ({a.bedType}) • {a.hospital}
                    </p>
                    {a.reason && <p className="text-[12px] text-on-surface-variant truncate">{a.reason}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-[11px] font-bold">Day {day}</span>
                  <p className="text-[11px] text-indigo-gray-600 mt-1">Since {formatShortDate(a.admittedAt)}</p>
                  {a.expectedDischarge && (
                    <p className={`text-[11px] font-semibold ${due ? 'text-soft-coral' : 'text-indigo-gray-600'}`}>Discharge {formatShortDate(a.expectedDischarge)}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
