'use client'

import { useState } from 'react'
import { CircleCheck, Download, Microscope, Receipt, Stethoscope } from 'lucide-react'
import type { LedgerRow } from '../_lib/ops'
import { Chip, EmptyState } from './ui'

const tabs = [
  { id: 'all', label: 'All transactions' },
  { id: 'consultation', label: 'Consultations' },
  { id: 'diagnostic', label: 'Diagnostic orders' },
] as const

const PAGE = 20
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

function downloadCsv(rows: LedgerRow[]) {
  const header = ['Date', 'Patient', 'Type', 'Service', 'Provider', 'Status', 'Payment method', 'Amount (INR)']
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [header, ...rows.map((r) => [new Date(r.createdAt).toISOString(), r.patient, r.kind, r.service, r.provider, r.status, r.method, r.amount])]
  const blob = new Blob([lines.map((l) => l.map(escape).join(',')).join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `revenue-ledger-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function RevenueLedger({ rows }: { rows: LedgerRow[] }) {
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('all')
  const [limit, setLimit] = useState(PAGE)
  const filtered = rows.filter((r) => tab === 'all' || r.kind === tab)
  const total = filtered.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-full overflow-x-auto" role="group" aria-label="Filter">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setLimit(PAGE) }}
              aria-pressed={tab === t.id}
              className={`px-4 py-1.5 rounded-full font-label-sm text-[12px] whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-vibrant-blue text-on-primary font-bold shadow-sm' : 'text-indigo-gray-600 hover:text-indigo-gray-900 font-medium'
              }`}
            >
              {t.label} ({rows.filter((r) => t.id === 'all' || r.kind === t.id).length})
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(filtered)}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-surface-container-lowest ring-1 ring-surface-container text-indigo-gray-900 font-label-sm text-[13px] font-bold hover:bg-surface-container transition-all"
        >
          <Download className="w-4 h-4 text-indigo-gray-600" /> Download ledger (CSV)
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt}>No paid transactions yet.</EmptyState>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl ring-1 ring-surface-container">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/70 text-indigo-gray-600 font-label-sm text-[11px] uppercase tracking-wider">
                <th className="py-3 px-5 font-semibold">Patient</th>
                <th className="py-3 px-4 font-semibold">Service &amp; Provider</th>
                <th className="py-3 px-4 font-semibold">Outcome</th>
                <th className="py-3 px-4 font-semibold">Payment method</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-5 text-right font-bold text-indigo-gray-900">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-indigo-gray-900 font-label-sm text-[13px]">
              {filtered.slice(0, limit).map((r) => {
                const Icon = r.kind === 'consultation' ? Stethoscope : Microscope
                return (
                  <tr key={`${r.kind}-${r.id}`} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-indigo-gray-900">{r.patient}</div>
                      <div className="text-indigo-gray-600 text-[11px] font-mono">#{r.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${r.kind === 'consultation' ? 'bg-primary-fixed text-primary' : 'bg-fresh-teal/20 text-secondary'}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-indigo-gray-900 truncate">{r.service}</div>
                          <div className="text-indigo-gray-600 text-[11px] truncate">{r.provider || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Chip tone={r.status === 'Completed' || r.status === 'Report sent' ? 'teal' : 'primary'} dot>{r.status}</Chip>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`flex items-center gap-1 ${r.method === 'Not recorded' ? 'text-indigo-gray-600' : 'text-secondary font-semibold'}`}>
                        {r.method !== 'Not recorded' && <CircleCheck className="w-4 h-4" />}
                        {r.method}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-indigo-gray-600 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-5 text-right font-title-md text-[15px] font-bold text-indigo-gray-900">{inr(r.amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="p-4 px-5 bg-surface-container-low/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-indigo-gray-600 font-label-sm text-[12px]">
            <span>
              Showing <strong>{Math.min(limit, filtered.length)}</strong> of {filtered.length} • total {inr(total)}
            </span>
            {filtered.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="px-4 py-1.5 rounded-full bg-surface-container-lowest text-indigo-gray-900 font-bold hover:bg-surface shadow-sm">
                Show more
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
