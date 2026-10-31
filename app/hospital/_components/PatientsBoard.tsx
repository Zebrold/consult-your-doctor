'use client'

import { useMemo, useState } from 'react'
import { Download, FileText, Phone, Search } from 'lucide-react'
import { formatDayLabel, formatINR, formatTime } from '@/components/patient/format'
import { Initials, Status, btnOutline, btnPrimary, card, lineTab, segGroup, segTab } from '@/components/portal/workspace-ui'
import { HealthRecordButton, TakePaymentButton } from './PatientDesk'

export type BoardRow = {
  id: string
  code: string
  token: string
  status: string
  start: string | null
  day: string | null
  patientName: string
  phone: string | null
  ageSex: string | null
  doctor: string
  department: string
  payment: { label: string; amount: number | null } | null
  /** The payment column: what has been paid and where, and its colour. */
  pay: { label: string; color: string }
  /** Booked as fast track: seen ahead of general patients once checked in. */
  fastTrack: boolean
  /** Hospital services picked when booking, to collect at the counter. */
  services: string[]
  /** Booked and paid online; the consultation fee is still to be taken at the counter. */
  counterDue: boolean
}

export type BoardView = 'today' | 'upcoming' | 'past' | 'unpaid' | 'all'

const VIEWS: { key: BoardView; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'all', label: 'All' },
]

const STATUS_LABEL: Record<string, string> = { pending_payment: 'Awaiting payment', confirmed: 'Booked', visited: 'Checked in', completed: 'Completed' }

function matchesView(r: BoardRow, v: BoardView, today: string) {
  return (
    v === 'all' ||
    (v === 'today' && r.day === today) ||
    (v === 'upcoming' && !!r.day && r.day > today && r.status !== 'pending_payment') ||
    (v === 'past' && !!r.day && r.day < today && r.status !== 'pending_payment') ||
    (v === 'unpaid' && (r.status === 'pending_payment' || r.counterDue))
  )
}

function exportCsv(rows: BoardRow[]) {
  const header = ['Booking ID', 'Token', 'Date', 'Time', 'Patient', 'Age/Sex', 'Phone', 'Doctor', 'Department', 'Type', 'Services', 'Status', 'Payment', 'Amount (INR)']
  const lines = rows.map((r) => [r.code, r.token, r.day ?? '', r.start ? formatTime(r.start) : '', r.patientName, r.ageSex ?? '', r.phone ?? '', r.doctor, r.department, r.fastTrack ? 'Fast track' : 'General', r.services.join('; '), STATUS_LABEL[r.status] ?? r.status, r.payment?.label ?? '', r.payment?.amount ?? ''])
  const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'hospital-appointments.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const smallBtn = '!h-[38px] !px-3 !text-[12.5px] !shadow-none'
const tableGrid = 'grid grid-cols-[96px_minmax(0,1.4fr)_minmax(0,1.1fr)_60px_84px_124px_minmax(0,0.9fr)_176px] gap-3.5'

/** The desk's main action for a visit: take an unpaid booking's payment, or add health data to a paid one. */
function MainAction({ row, className }: { row: BoardRow; className: string }) {
  if (row.status === 'pending_payment' || row.counterDue) return <TakePaymentButton appointmentId={row.id} className={className} />
  return <HealthRecordButton appointmentId={row.id} patientName={row.patientName} className={className} />
}

/** A paid booking's slip (PDF), for the patient or the file. */
function SlipLink({ row, className }: { row: BoardRow; className: string }) {
  if (row.status === 'pending_payment') return null
  return (
    <a href={`/api/booking/${row.id}/slip`} target="_blank" rel="noreferrer" className={className}>
      <FileText className="w-3.5 h-3.5" /> Slip
    </a>
  )
}

export function PatientsBoard({ rows, today, now, initialView, initialQuery = '', departments }: { rows: BoardRow[]; today: string; now: number; initialView: BoardView; initialQuery?: string; departments: string[] }) {
  const [view, setView] = useState<BoardView>(initialView)
  const [dept, setDept] = useState<string>('all')
  const [query, setQuery] = useState(initialQuery)
  const [limit, setLimit] = useState(30)

  // Patients whose slot started over 15 minutes ago today and who haven't been checked in
  const lateOf = (r: BoardRow) => r.status === 'confirmed' && !!r.start && r.day === today && Date.parse(r.start) < now - 15 * 60_000

  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.key, rows.filter((r) => matchesView(r, v.key, today)).length])) as Record<BoardView, number>, [rows, today])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = rows.filter(
      (r) =>
        matchesView(r, view, today) &&
        (dept === 'all' || r.department === dept) &&
        (!q || [r.patientName, r.code, r.token, r.phone, r.doctor, r.department].some((s) => s?.toLowerCase().includes(q))),
    )
    // Past and "all" read newest first; today and upcoming read in time order.
    return view === 'past' || view === 'all' ? [...list].reverse() : list
  }, [rows, view, dept, query, today])

  const status = (r: BoardRow, dot = true) => (lateOf(r) ? <Status label="Not checked in" color="#B42318" dot={dot} /> : <Status status={r.status} dot={dot} />)
  const empty = rows.length ? 'No appointments match this view.' : 'No appointments yet. Bookings with your doctors appear here.'

  return (
    <>
      {/* Phones: underlined tabs, then a card per booking */}
      <section className="lg:hidden">
        <div role="tablist" aria-label="Appointments" className="flex border-b border-[#E1E7F0] overflow-x-auto no-scrollbar">
          {VIEWS.map((v) => (
            <button key={v.key} type="button" role="tab" aria-selected={view === v.key} onClick={() => setView(v.key)} className={`${lineTab(view === v.key)} !flex-none px-3`}>
              {v.label} {counts[v.key]}
            </button>
          ))}
        </div>
        {query && (
          <p className="mt-2.5 flex items-center justify-between gap-2 text-[12.5px] text-[#5B667A]">
            <span className="truncate">
              Matching “<strong className="text-[#0B1B3F]">{query}</strong>”
            </span>
            <button type="button" onClick={() => setQuery('')} className="shrink-0 font-extrabold text-[#2A4DD0]">
              Clear
            </button>
          </p>
        )}
        {shown.length === 0 ? (
          <p className="my-6 text-center text-[13px] text-[#5B667A]">{empty}</p>
        ) : (
          <ul>
            {shown.slice(0, limit).map((r) => (
              <li key={r.id} className={`${card} mt-2.5 p-3.5`}>
                <div className="flex items-center gap-3">
                  <Initials name={r.patientName} className="w-[42px] h-[42px] text-[13px]" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-extrabold truncate">{r.patientName}</span>
                    <span className="block text-[12px] text-[#5B667A] truncate">
                      {r.fastTrack && <span className="font-extrabold text-[#B93815]">Fast track · </span>}
                      {r.doctor} · Token {r.token}
                    </span>
                  </span>
                  {status(r, false)}
                </div>
                <div className="flex justify-between gap-2 mt-2.5 pt-2.5 border-t border-[#EEF2F7] text-[12.5px]">
                  <span className="font-bold text-[#27324A] truncate">{r.start ? `${formatDayLabel(r.start, now)}, ${formatTime(r.start)}` : 'No slot'}</span>
                  <span className="shrink-0 font-extrabold" style={{ color: r.pay.color }}>
                    {r.pay.label}
                  </span>
                </div>
                {r.services.length > 0 && <p className="mt-1.5 text-[12px] text-[#5B667A] truncate">Services: {r.services.join(', ')}</p>}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {r.status === 'pending_payment' ? (
                    r.phone ? (
                      <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className={`${btnOutline} ${smallBtn}`}>
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    ) : (
                      <span className={`${btnOutline} ${smallBtn} opacity-50`}>No phone</span>
                    )
                  ) : (
                    <SlipLink row={r} className={`${btnOutline} ${smallBtn}`} />
                  )}
                  <MainAction row={r} className={`${btnPrimary} ${smallBtn}`} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {shown.length > limit && (
          <button type="button" onClick={() => setLimit((l) => l + 30)} className={`${btnOutline} w-full mt-3`}>
            Show more ({shown.length - limit})
          </button>
        )}
      </section>

      {/* Desktops: segmented tabs and the table */}
      <section className={`hidden lg:block ${card} p-[22px] min-w-0`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-[16px] font-extrabold">Appointments</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-2 h-[42px] px-3 rounded-xl bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0] w-[260px]">
              <Search className="w-4 h-4 text-[#5B667A] shrink-0" />
              <span className="sr-only">Search appointments</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Patient, booking ID, token or doctor" className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] placeholder:text-[#7A8599]" />
            </label>
            {departments.length > 1 && (
              <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department" className="h-[42px] px-3 rounded-xl bg-white border-[1.5px] border-[#D6DDE8] text-[13px] font-bold text-[#27324A]">
                <option value="all">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
            <div role="tablist" aria-label="Appointments" className={segGroup}>
              {VIEWS.map((v) => (
                <button key={v.key} type="button" role="tab" aria-selected={view === v.key} onClick={() => setView(v.key)} className={segTab(view === v.key)}>
                  {v.label} <span className={view === v.key ? '' : 'text-[#8A94A6]'}>{counts[v.key]}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => exportCsv(shown)} disabled={shown.length === 0} className={`${btnOutline} disabled:opacity-50`}>
              <Download className="w-[15px] h-[15px]" /> Export
            </button>
          </div>
        </div>

        <div role="table" aria-label="Appointments">
          <div role="row" className={`${tableGrid} px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]`}>
            {['Time', 'Patient', 'Doctor', 'Token', 'Type', 'Status', 'Payment', 'Desk'].map((h) => (
              <span key={h} role="columnheader" className={h === 'Desk' ? 'text-right' : ''}>
                {h}
              </span>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="py-5 text-center text-[13.5px] text-[#5B667A]">{empty}</p>
          ) : (
            shown.slice(0, limit).map((r) => (
              <div key={r.id} role="row" className={`${tableGrid} items-center py-[13px] border-b border-[#EEF2F7] text-[13.5px]`}>
                <span role="cell" className="min-w-0">
                  <span className="block font-extrabold">{r.start ? formatTime(r.start) : '—'}</span>
                  <span className="block text-[12px] text-[#5B667A] truncate">{r.start ? formatDayLabel(r.start, now) : 'No slot'}</span>
                </span>
                <span role="cell" className="flex items-center gap-2.5 min-w-0">
                  <Initials name={r.patientName} className="w-8 h-8 text-[11px]" />
                  <span className="min-w-0">
                    <span className="block font-extrabold truncate">{r.patientName}</span>
                    <span className="block text-[12px] text-[#5B667A] truncate">{[r.ageSex, `#${r.code}`, ...r.services].filter(Boolean).join(' · ')}</span>
                  </span>
                </span>
                <span role="cell" className="min-w-0">
                  <span className="block text-[#27324A] truncate">{r.doctor}</span>
                  <span className="block text-[12px] text-[#5B667A] truncate">{r.department}</span>
                </span>
                <span role="cell" className="font-bold">{r.token}</span>
                <span role="cell" className={`text-[12.5px] font-extrabold ${r.fastTrack ? 'text-[#B93815]' : 'text-[#5B667A]'}`}>{r.fastTrack ? 'Fast track' : 'General'}</span>
                <span role="cell">{status(r)}</span>
                <span role="cell" className="text-[12.5px] font-extrabold truncate" style={{ color: r.pay.color }}>
                  {r.pay.label}
                </span>
                <span role="cell" className="flex items-center justify-end gap-1.5">
                  {r.phone && (
                    <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${r.patientName}`} title={r.phone} className="shrink-0 w-[34px] h-[34px] rounded-[10px] border border-[#D6DDE8] flex items-center justify-center text-[#2A4DD0] hover:bg-[#F4F6FA]">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <MainAction row={r} className={`${r.status === 'pending_payment' ? btnPrimary : btnOutline} !h-[34px] !px-3 !text-[12.5px] !shadow-none`} />
                </span>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-3 pt-3.5 text-[13px] text-[#5B667A]">
          <span>
            Showing {Math.min(limit, shown.length)} of {shown.length}
            {shown.some((r) => r.payment) && ` · ${formatINR(shown.reduce((s, r) => s + (r.payment?.amount ?? 0), 0))} to the hospital`}
          </span>
          {shown.length > limit && (
            <button type="button" onClick={() => setLimit((l) => l + 30)} className={`${btnOutline} !h-9`}>
              Show more
            </button>
          )}
        </div>
      </section>
    </>
  )
}
