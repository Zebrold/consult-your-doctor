'use client'

import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { CheckInModal } from '@/components/CheckInModal'
import { EmptyState, Status, Table, segGroup, segTab, td, th } from './ui'

export type CheckinRow = {
  id: string
  kind: 'consultation' | 'lab'
  /** "10:30 AM", or "Any time" for a lab visit booked for the day. */
  time: string
  sort: number
  patient: string
  phone: string | null
  what: string
  where: string
  status: string
  state: 'in' | 'expected' | 'late' | 'other'
  /** Set when this executive can check the patient in (an appointment at their own branch). */
  checkIn?: { doctorName: string; department: string }
}

const STATE = {
  in: { label: 'Checked in', color: '#2A4DD0' },
  expected: { label: 'Expected', color: '#5B667A' },
  late: { label: 'Running late', color: '#B54708' },
} as const

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'consultation', label: 'Consultations' },
  { id: 'lab', label: 'Lab visits' },
  { id: 'in', label: 'Checked in' },
  { id: 'expected', label: 'Expected' },
  { id: 'late', label: 'Running late' },
] as const
type Tab = (typeof tabs)[number]['id']
const matches = (r: CheckinRow, t: Tab) => t === 'all' || r.kind === t || r.state === t

/** Today's schedule after DeskExeCheckins: every appointment and lab visit, with check-in for the executive's branch. */
export function CheckinBoard({ rows }: { rows: CheckinRow[] }) {
  const [tab, setTab] = useState<Tab>('all')
  const [limit, setLimit] = useState(30)
  const list = rows.filter((r) => matches(r, tab))

  return (
    <div>
      <div className="mb-3.5 -mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto no-scrollbar">
        <div role="tablist" aria-label="Filter" className={segGroup}>
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={segTab(tab === t.id)}>
              {t.label} ({rows.filter((r) => matches(r, t.id)).length})
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={CalendarClock}>Nothing scheduled here today.</EmptyState>
      ) : (
        <>
          <Table min={700}>
            <thead>
              <tr>
                <th className={th}>Time</th>
                <th className={th}>Patient</th>
                <th className={th}>Doctor or test</th>
                <th className={th}>Hospital or lab</th>
                <th className={th}>Status</th>
                <th className={th}>
                  <span className="sr-only">Check in</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, limit).map((r) => {
                const s = r.state === 'other' ? { label: r.status, color: '#98A2B3' } : STATE[r.state]
                return (
                  <tr key={`${r.kind}-${r.id}`}>
                    <td className={`${td} font-extrabold whitespace-nowrap tabular-nums`}>{r.time}</td>
                    <td className={td}>
                      <span className="block font-extrabold whitespace-nowrap">{r.patient}</span>
                      {r.phone && <span className="block text-[12px] text-[#5B667A] whitespace-nowrap">{r.phone}</span>}
                    </td>
                    <td className={`${td} max-w-[220px]`}>
                      <span className="block truncate">{r.what}</span>
                      <span className="block text-[12px] text-[#5B667A]">{r.kind === 'consultation' ? 'Consultation' : 'Lab visit'}</span>
                    </td>
                    <td className={`${td} max-w-[200px] truncate text-[#27324A]`}>{r.where}</td>
                    <td className={td}>
                      <Status label={s.label} color={s.color} />
                    </td>
                    <td className={`${td} text-right`}>
                      {r.checkIn && r.state !== 'in' && r.state !== 'other' ? (
                        <CheckInModal appointmentId={r.id} currentStatus="confirmed" patientName={r.patient} doctorName={r.checkIn.doctorName} departmentName={r.checkIn.department} />
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
          {list.length > limit && (
            <div className="pt-3.5 text-center">
              <button type="button" onClick={() => setLimit((l) => l + 30)} className="text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                Show all {list.length}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
