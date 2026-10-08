'use client'

import { useMemo, useState } from 'react'
import { Download, Phone, Search, Users } from 'lucide-react'
import { Avatar, Chip, EmptyState, type Tone } from '@/components/portal/ui'
import { formatDayLabel, formatINR, formatTime } from '@/components/patient/format'
import { HealthRecordButton, TakePaymentButton } from './PatientDesk'

export type BoardRow = {
  id: string
  code: string
  status: string
  start: string | null
  day: string | null
  patientName: string
  phone: string | null
  ageSex: string | null
  doctor: string
  department: string
  payment: { label: string; amount: number | null } | null
}

export type BoardView = 'today' | 'upcoming' | 'past' | 'unpaid' | 'all'

const VIEWS: { key: BoardView; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'all', label: 'All' },
]

const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'coral' },
  confirmed: { label: 'Booked', tone: 'blue' },
  visited: { label: 'Checked in', tone: 'teal' },
  completed: { label: 'Completed', tone: 'neutral' },
}

function matchesView(r: BoardRow, v: BoardView, today: string) {
  return (
    v === 'all' ||
    (v === 'today' && r.day === today) ||
    (v === 'upcoming' && !!r.day && r.day > today && r.status !== 'pending_payment') ||
    (v === 'past' && !!r.day && r.day < today && r.status !== 'pending_payment') ||
    (v === 'unpaid' && r.status === 'pending_payment')
  )
}

function exportCsv(rows: BoardRow[]) {
  const header = ['Booking ID', 'Date', 'Time', 'Patient', 'Age/Sex', 'Phone', 'Doctor', 'Department', 'Status', 'Payment', 'Amount (INR)']
  const lines = rows.map((r) => [r.code, r.day ?? '', r.start ? formatTime(r.start) : '', r.patientName, r.ageSex ?? '', r.phone ?? '', r.doctor, r.department, STATUS[r.status]?.label ?? r.status, r.payment?.label ?? '', r.payment?.amount ?? ''])
  const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'hospital-appointments.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/** What the desk can do for a visit: take an unpaid booking's payment, or add health data to a paid one. */
function RowActions({ row }: { row: BoardRow }) {
  if (row.status === 'pending_payment') return <TakePaymentButton appointmentId={row.id} />
  return <HealthRecordButton appointmentId={row.id} patientName={row.patientName} />
}

export function PatientsBoard({ rows, today, now, initialView, departments }: { rows: BoardRow[]; today: string; now: number; initialView: BoardView; departments: string[] }) {
  const [view, setView] = useState<BoardView>(initialView)
  const [dept, setDept] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(30)

  // Patients whose slot started over 15 minutes ago today and who haven't been checked in
  const statusOf = (r: BoardRow) =>
    r.status === 'confirmed' && r.start && r.day === today && Date.parse(r.start) < now - 15 * 60_000 ? { label: 'Not checked in', tone: 'coral' as Tone } : STATUS[r.status]

  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.key, rows.filter((r) => matchesView(r, v.key, today)).length])) as Record<BoardView, number>, [rows, today])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = rows.filter(
      (r) =>
        matchesView(r, view, today) &&
        (dept === 'all' || r.department === dept) &&
        (!q || [r.patientName, r.code, r.phone, r.doctor, r.department].some((s) => s?.toLowerCase().includes(q))),
    )
    // Past and "all" read newest first; today and upcoming read in time order.
    return view === 'past' || view === 'all' ? [...list].reverse() : list
  }, [rows, view, dept, query, today])

  return (
    <section className="flex flex-col gap-3 md:gap-4">
      <div className="p-3 bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container md:border-transparent flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <label className="relative flex-1 min-w-0 lg:max-w-md">
          <Search className="w-5 h-5 text-indigo-gray-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient, booking ID, phone or doctor…"
            aria-label="Search appointments"
            className="w-full pl-11 pr-4 py-2.5 rounded-full bg-surface-container-low text-[14px] text-indigo-gray-900 placeholder:text-indigo-gray-600 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30"
          />
        </label>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 lg:mx-0 lg:px-0">
          {VIEWS.map((v) => {
            const active = v.key === view
            return (
              <button
                key={v.key}
                type="button"
                aria-pressed={active}
                onClick={() => setView(v.key)}
                className={`px-4 py-2 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors ${active ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-low text-indigo-gray-600 hover:text-indigo-gray-900'}`}
              >
                {v.label} <span className={active ? 'opacity-80' : 'text-vibrant-blue font-bold'}>{counts[v.key]}</span>
              </button>
            )
          })}
          <button type="button" onClick={() => exportCsv(shown)} disabled={shown.length === 0} className="ml-1 px-3 py-2 rounded-full text-vibrant-blue font-label-sm text-label-sm flex items-center gap-1 hover:bg-surface-container-low whitespace-nowrap disabled:opacity-50">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {departments.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {['all', ...departments].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={dept === d}
              onClick={() => setDept(d)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap ${dept === d ? 'bg-vibrant-blue text-on-primary' : 'bg-surface-container-lowest text-indigo-gray-600 shadow-sm hover:text-indigo-gray-900'}`}
            >
              {d === 'all' ? 'All departments' : d}
            </button>
          ))}
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl md:rounded-xl shadow-sm border border-surface-container md:border-transparent overflow-hidden">
        {shown.length === 0 ? (
          <div className="p-4 md:p-6">
            <EmptyState icon={Users}>{rows.length ? 'No appointments match these filters.' : 'No appointments yet. Bookings with your doctors will appear here.'}</EmptyState>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                    <th className="py-3 px-5">Slot</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Doctor &amp; Department</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-5 text-right">Desk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {shown.slice(0, limit).map((r) => {
                    const status = statusOf(r)
                    return (
                      <tr key={r.id} className="hover:bg-surface-container-low/40">
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className="block font-title-md text-[14px] font-bold text-indigo-gray-900">{r.start ? formatTime(r.start) : '—'}</span>
                          <span className="block text-[12px] text-indigo-gray-600">{r.start ? formatDayLabel(r.start, now) : 'No slot'}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.patientName} className="w-9 h-9 text-xs" />
                            <div className="min-w-0">
                              <span className="block font-title-md text-[15px] font-bold text-indigo-gray-900">{r.patientName}</span>
                              <span className="block text-[12px] text-indigo-gray-600 whitespace-nowrap">{[r.ageSex, `#${r.code}`].filter(Boolean).join(' • ')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="block text-[14px] font-semibold text-indigo-gray-900">{r.doctor}</span>
                          <span className="block text-[12px] text-indigo-gray-600">{r.department}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {r.payment ? (
                            <>
                              <span className="block text-[14px] font-bold text-indigo-gray-900">{r.payment.amount != null ? formatINR(r.payment.amount) : '—'}</span>
                              <span className="block text-[12px] text-indigo-gray-600">{r.payment.label}</span>
                            </>
                          ) : (
                            <span className="text-[12px] text-indigo-gray-600">{r.status === 'pending_payment' ? 'Not paid' : 'Not recorded'}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">{status && <Chip tone={status.tone}>{status.label}</Chip>}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {r.phone ? (
                            <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-[12px] font-semibold text-indigo-gray-900">
                              <Phone className="w-3.5 h-3.5 text-vibrant-blue" /> {r.phone}
                            </a>
                          ) : (
                            <span className="text-[12px] text-indigo-gray-600">No phone</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <RowActions row={r} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden flex flex-col gap-3 p-3">
              {shown.slice(0, limit).map((r) => {
                const status = statusOf(r)
                return (
                  <li key={r.id} className="rounded-xl p-3.5 bg-surface-container-low/60 flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={r.patientName} className="w-10 h-10 text-sm" />
                        <div className="min-w-0">
                          <span className="block font-title-md text-[15px] font-bold text-indigo-gray-900 truncate">{r.patientName}</span>
                          <span className="block text-[11px] text-indigo-gray-600 truncate">{[r.ageSex, `#${r.code}`].filter(Boolean).join(' • ')}</span>
                        </div>
                      </div>
                      {status && <Chip tone={status.tone}>{status.label}</Chip>}
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-container-lowest flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-indigo-gray-900 truncate">{r.doctor}</span>
                        <span className="block text-[11px] text-indigo-gray-600 truncate">{r.department}</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block text-[13px] font-bold text-indigo-gray-900">{r.start ? formatTime(r.start) : '—'}</span>
                        <span className="block text-[11px] text-indigo-gray-600">{r.start ? formatDayLabel(r.start, now) : ''}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-indigo-gray-600">
                        {r.payment ? `${r.payment.amount != null ? formatINR(r.payment.amount) : ''} • ${r.payment.label}` : r.status === 'pending_payment' ? 'Not paid yet' : 'Payment not recorded'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <RowActions row={r} />
                        {r.phone && (
                          <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${r.patientName}`} className="p-2 rounded-full bg-surface-container-lowest text-vibrant-blue">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="px-4 md:px-5 py-3 bg-surface-container-low flex items-center justify-between gap-3">
              <span className="font-label-sm text-label-sm text-indigo-gray-600">
                Showing {Math.min(limit, shown.length)} of {shown.length}
              </span>
              {shown.length > limit && (
                <button type="button" onClick={() => setLimit((l) => l + 30)} className="px-4 py-1.5 rounded-full bg-surface-container-lowest text-vibrant-blue font-label-sm text-label-sm shadow-sm">
                  Show more
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
