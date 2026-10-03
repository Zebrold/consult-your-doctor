'use client'

import { useMemo, useState } from 'react'
import { Download, Receipt, Search } from 'lucide-react'
import { Avatar, Chip, EmptyState } from '@/components/portal/ui'
import { formatINR, formatShortDate } from '@/components/patient/format'

export type LedgerRow = {
  id: string
  code: string
  date: string
  day: string
  patientName: string
  doctor: string
  department: string
  /** What the patient paid; null when no payment was recorded for a seen patient. */
  paid: number | null
  /** The hospital's part of it (online payments include the platform fee). */
  share: number | null
  method: 'online' | 'cash' | 'other' | null
}

type Period = 'today' | 'month' | 'last' | 'all'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'This month' },
  { key: 'last', label: 'Last month' },
  { key: 'all', label: 'All time' },
]

const METHOD_LABEL = { online: 'Online (PayU)', cash: 'Cash at desk', other: 'Other' } as const

function exportCsv(rows: LedgerRow[]) {
  const header = ['Date', 'Booking ID', 'Patient', 'Doctor', 'Department', 'Paid (INR)', 'Hospital share (INR)', 'Method']
  const lines = rows.map((r) => [r.day, r.code, r.patientName, r.doctor, r.department, r.paid ?? '', r.share ?? '', r.method ? METHOD_LABEL[r.method] : 'Not recorded'])
  const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'hospital-payments.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function FinanceLedger({ rows, today, month, lastMonth }: { rows: LedgerRow[]; today: string; month: string; lastMonth: string }) {
  const [period, setPeriod] = useState<Period>('month')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(20)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (period === 'all' || (period === 'today' && r.day === today) || (period === 'month' && r.day.startsWith(month)) || (period === 'last' && r.day.startsWith(lastMonth))) &&
        (!q || [r.patientName, r.code, r.doctor, r.department].some((s) => s.toLowerCase().includes(q))),
    )
  }, [rows, period, query, today, month, lastMonth])
  const total = shown.reduce((s, r) => s + (r.share ?? 0), 0)

  return (
    <section className="bg-surface-container-lowest rounded-2xl md:rounded-xl shadow-sm border border-surface-container md:border-transparent overflow-hidden">
      <div className="p-4 md:p-stack-md flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-title-md text-[16px] md:text-title-md font-bold text-indigo-gray-900">Payments Ledger</h2>
            <p className="text-[12px] text-indigo-gray-600">Consultation payments for your doctors</p>
          </div>
          <label className="relative sm:w-64">
            <Search className="w-4 h-4 text-indigo-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patient, ID, doctor…"
              aria-label="Search payments"
              className="w-full pl-9 pr-3 py-2 rounded-full bg-surface-container-low text-[13px] text-indigo-gray-900 placeholder:text-indigo-gray-600 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30"
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={period === p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap ${period === p.key ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-indigo-gray-600 hover:text-indigo-gray-900'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => exportCsv(shown)} disabled={shown.length === 0} className="px-3 py-1.5 rounded-full text-vibrant-blue text-[12px] font-bold flex items-center gap-1 hover:bg-surface-container-low disabled:opacity-50 shrink-0">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="px-4 pb-4 md:px-stack-md md:pb-stack-md">
          <EmptyState icon={Receipt}>No payments in this period.</EmptyState>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/60 text-indigo-gray-600 font-label-sm text-label-sm">
                  <th className="py-3 px-5">Patient</th>
                  <th className="py-3 px-4">Doctor &amp; Department</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-5 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, limit).map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low/40">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.patientName} className="w-9 h-9 text-xs" />
                        <div className="min-w-0">
                          <span className="block font-title-md text-[15px] font-bold text-indigo-gray-900">{r.patientName}</span>
                          <span className="block text-[12px] text-indigo-gray-600">#{r.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="block text-[14px] text-indigo-gray-900">{r.doctor}</span>
                      <span className="block text-[12px] text-indigo-gray-600">{r.department}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {r.paid != null ? (
                        <>
                          <span className="block font-title-md text-[15px] font-bold text-indigo-gray-900">{formatINR(r.paid)}</span>
                          {r.share != null && r.share !== r.paid && <span className="block text-[12px] text-secondary">{formatINR(r.share)} to you</span>}
                        </>
                      ) : (
                        <span className="text-[12px] text-indigo-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {r.method ? (
                        <span className="flex items-center gap-2 text-[13px] text-indigo-gray-900">
                          <span className={`w-2 h-2 rounded-full ${r.method === 'online' ? 'bg-vibrant-blue' : 'bg-fresh-teal'}`} /> {METHOD_LABEL[r.method]}
                        </span>
                      ) : (
                        <Chip tone="coral">Not recorded</Chip>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right text-[13px] text-indigo-gray-600 whitespace-nowrap">{formatShortDate(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden flex flex-col gap-3 px-4 pb-4">
            {shown.slice(0, limit).map((r) => (
              <li key={r.id} className="p-3.5 rounded-xl bg-surface-container-low/70 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={r.patientName} className="w-10 h-10 text-sm" />
                    <div className="min-w-0">
                      <span className="block font-title-md text-[15px] font-bold text-indigo-gray-900 truncate">{r.patientName}</span>
                      <span className="block text-[12px] text-indigo-gray-600 truncate">{r.doctor}</span>
                    </div>
                  </div>
                  <span className="text-right shrink-0">
                    <span className="block font-title-md text-[16px] font-bold text-indigo-gray-900">{r.paid != null ? formatINR(r.paid) : '—'}</span>
                    {r.share != null && r.share !== r.paid && <span className="block text-[11px] text-secondary">{formatINR(r.share)} to you</span>}
                  </span>
                </div>
                <div className="px-3 py-2 rounded-lg bg-surface-container-lowest flex items-center justify-between text-[12px] text-indigo-gray-600">
                  <span>{r.method ? METHOD_LABEL[r.method] : 'Payment not recorded'}</span>
                  <span>
                    #{r.code} • {formatShortDate(r.date)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="px-4 md:px-5 py-3 bg-surface-container-low flex flex-wrap items-center justify-between gap-3">
            <span className="font-label-sm text-label-sm text-indigo-gray-600">
              {shown.length} {shown.length === 1 ? 'payment' : 'payments'} • {formatINR(total)} to the hospital
            </span>
            {shown.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + 20)} className="px-4 py-1.5 rounded-full bg-surface-container-lowest text-vibrant-blue font-label-sm text-label-sm shadow-sm">
                Show more
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
