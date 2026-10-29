'use client'

import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { formatINR, formatShortDate } from '@/components/patient/format'
import { Initials, btnOutline, card, lineTab, segGroup, segTab } from './hos-ui'
import { METHOD_LABEL, type LedgerMethod } from '../_lib/ledger'

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
  /** What the hospital takes: for an online booking, the consultation fee paid at its counter. */
  share: number | null
  method: LedgerMethod | null
}

type Period = 'today' | 'month' | 'last'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'This month' },
  { key: 'last', label: 'Last month' },
]

/** The status column: how it was paid, in the ledger's colours. */
function statusOf(r: LedgerRow): { label: string; color: string } {
  switch (r.method) {
    case 'online':
      return { label: 'Online · fee at counter', color: '#2A4DD0' }
    case 'upi':
      return { label: 'Paid · UPI', color: '#067647' }
    case 'cash':
      return { label: 'Paid · cash', color: '#067647' }
    case 'other':
      return { label: 'Paid at desk', color: '#067647' }
    default:
      return { label: 'Not recorded', color: '#B54708' }
  }
}

function exportCsv(rows: LedgerRow[], name: string) {
  const header = ['Date', 'Booking ID', 'Patient', 'Doctor', 'Department', 'Paid (INR)', 'Hospital share (INR)', 'Method']
  const lines = rows.map((r) => [r.day, r.code, r.patientName, r.doctor, r.department, r.paid ?? '', r.share ?? '', r.method ? METHOD_LABEL[r.method] : 'Not recorded'])
  const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/** Downloads payments as a CSV (the desktop header's Export CSV: the month's ledger). */
export function ExportLedgerButton({ rows, name, className, label = 'Export CSV' }: { rows: LedgerRow[]; name: string; className: string; label?: string }) {
  return (
    <button type="button" onClick={() => exportCsv(rows, name)} disabled={rows.length === 0} className={`${className} disabled:opacity-50`}>
      <Download className="w-4 h-4" /> {label}
    </button>
  )
}

const tableGrid = 'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_110px_96px_100px_170px] gap-3.5'

export function FinanceLedger({ rows, today, month, lastMonth }: { rows: LedgerRow[]; today: string; month: string; lastMonth: string }) {
  const [period, setPeriod] = useState<Period>('month')
  const [limit, setLimit] = useState(20)

  const shown = useMemo(
    () => rows.filter((r) => (period === 'today' && r.day === today) || (period === 'month' && r.day.startsWith(month)) || (period === 'last' && r.day.startsWith(lastMonth))),
    [rows, period, today, month, lastMonth],
  )
  const total = shown.reduce((s, r) => s + (r.share ?? 0), 0)
  const empty = 'No payments in this period.'
  const more = shown.length > limit && (
    <button type="button" onClick={() => setLimit((l) => l + 20)} className={`${btnOutline} !h-9`}>
      Show more ({shown.length - limit})
    </button>
  )

  return (
    <>
      {/* Phones */}
      <section className="lg:hidden">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-[16px] font-extrabold">Payments ledger</h2>
          <ExportLedgerButton rows={shown} name={`hospital-payments-${period}.csv`} className="flex items-center gap-[5px] text-[13px] font-extrabold text-[#2A4DD0]" />
        </div>
        <div role="tablist" aria-label="Period" className="flex border-b border-[#E1E7F0]">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" role="tab" aria-selected={period === p.key} onClick={() => setPeriod(p.key)} className={lineTab(period === p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className={`${card} mt-1.5 px-3.5`}>
          {shown.length === 0 ? (
            <p className="py-4 text-[13px] text-[#5B667A] border-b border-[#EEF2F7]">{empty}</p>
          ) : (
            <ul>
              {shown.slice(0, limit).map((r) => {
                const st = statusOf(r)
                return (
                  <li key={r.id} className="flex items-center gap-3 py-3 border-b border-[#EEF2F7]">
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-extrabold truncate">{r.patientName}</span>
                      <span className="block text-[12px] text-[#5B667A] truncate">
                        {r.doctor} · #{r.code} · {r.day === today ? 'Today' : formatShortDate(r.date)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[14px] font-extrabold">{r.share != null ? formatINR(r.share) : '—'}</span>
                      <span className="block text-[11.5px] font-extrabold" style={{ color: st.color }}>
                        {st.label}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="flex justify-between py-3 text-[13px]">
            <span className="text-[#5B667A]">Total in view</span>
            <strong>{formatINR(total)}</strong>
          </p>
        </div>
        {more && <div className="mt-2.5 [&>button]:w-full">{more}</div>}
      </section>

      {/* Desktops */}
      <section className={`hidden lg:block ${card} p-[22px] min-w-0`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[16px] font-extrabold tracking-[-0.01em]">Payments ledger</h2>
            <p className="mt-[3px] text-[13px] text-[#5B667A]">Consultation payments for your doctors</p>
          </div>
          <div role="tablist" aria-label="Period" className={segGroup}>
            {PERIODS.map((p) => (
              <button key={p.key} type="button" role="tab" aria-selected={period === p.key} onClick={() => setPeriod(p.key)} className={segTab(period === p.key)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div role="table" aria-label="Payments ledger">
          <div role="row" className={`${tableGrid} px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]`}>
            {['Patient', 'Doctor', 'Reference', 'Date', 'Amount', 'Status'].map((h) => (
              <span key={h} role="columnheader" className={h === 'Amount' ? 'text-right' : ''}>
                {h}
              </span>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="py-5 text-center text-[13.5px] text-[#5B667A]">{empty}</p>
          ) : (
            shown.slice(0, limit).map((r) => {
              const st = statusOf(r)
              return (
                <div key={r.id} role="row" className={`${tableGrid} items-center py-[13px] border-b border-[#EEF2F7] text-[13.5px]`}>
                  <span role="cell" className="flex items-center gap-2.5 min-w-0">
                    <Initials name={r.patientName} className="w-8 h-8 text-[11px]" />
                    <span className="font-extrabold truncate">{r.patientName}</span>
                  </span>
                  <span role="cell" className="min-w-0">
                    <span className="block text-[#27324A] truncate">{r.doctor}</span>
                    <span className="block text-[12px] text-[#5B667A] truncate">{r.department}</span>
                  </span>
                  <span role="cell" className="text-[#5B667A] truncate">
                    #{r.code}
                  </span>
                  <span role="cell" className="text-[#5B667A]">
                    {r.day === today ? 'Today' : formatShortDate(r.date)}
                  </span>
                  <span role="cell" className="text-right font-extrabold">
                    {r.share != null ? formatINR(r.share) : '—'}
                  </span>
                  <span role="cell" className="text-[12.5px] font-extrabold truncate" style={{ color: st.color }}>
                    {st.label}
                  </span>
                </div>
              )
            })
          )}
        </div>
        <div className="flex items-center justify-between gap-3 pt-3.5 text-[13.5px]">
          <span className="text-[#5B667A]">
            Total in view <strong className="ml-1.5 text-[#0B1B3F]">{formatINR(total)}</strong>
          </span>
          {more}
        </div>
      </section>
    </>
  )
}
