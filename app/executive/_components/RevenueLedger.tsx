'use client'

import { useState } from 'react'
import { Download, Receipt } from 'lucide-react'
import type { LedgerRow } from '../_lib/ops'
import { Card, EmptyState, Status, Table, btnOutline, segGroup, segTab, td, th } from './ui'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'consultation', label: 'Consultations' },
  { id: 'diagnostic', label: 'Lab tests' },
] as const

const PAGE = 20
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

function downloadCsv(rows: LedgerRow[]) {
  const header = ['Date', 'Patient', 'Type', 'Service', 'Provider', 'Status', 'Payment method', 'Amount (INR)']
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`
  }
  const lines = [header, ...rows.map((r) => [new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), r.patient, r.kind === 'consultation' ? 'Consultation' : 'Lab test', r.service, r.provider, r.status, r.method, r.amount])]
  const blob = new Blob(['﻿' + lines.map((l) => l.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `revenue-statement-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Every paid consultation and lab test, newest first, with a CSV statement of what's shown. */
export function RevenueLedger({ rows }: { rows: LedgerRow[] }) {
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('all')
  const [limit, setLimit] = useState(PAGE)
  const filtered = rows.filter((r) => tab === 'all' || r.kind === tab)
  const total = filtered.reduce((sum, r) => sum + r.amount, 0)

  return (
    <Card
      id="ledger"
      title="Revenue ledger"
      sub="Every paid consultation and lab test, valued at the recorded payment or, where none was recorded, the listed fee"
      right={
        <button type="button" onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0} className={btnOutline}>
          <Download className="w-4 h-4" /> Download statement
        </button>
      }
    >
      <div className="mb-3.5 -mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto no-scrollbar">
        <div role="tablist" aria-label="Filter" className={segGroup}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id)
                setLimit(PAGE)
              }}
              className={segTab(tab === t.id)}
            >
              {t.label} ({rows.filter((r) => t.id === 'all' || r.kind === t.id).length})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt}>No paid bookings yet.</EmptyState>
      ) : (
        <>
          <Table min={880}>
            <thead>
              <tr>
                <th className={th}>Patient</th>
                <th className={th}>Service and provider</th>
                <th className={th}>Outcome</th>
                <th className={th}>Method</th>
                <th className={th}>Date</th>
                <th className={`${th} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((r) => (
                <tr key={`${r.kind}-${r.id}`}>
                  <td className={td}>
                    <span className="block font-extrabold">{r.patient}</span>
                    <span className="block font-mono text-[11.5px] text-[#5B667A]">#{r.id.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td className={td}>
                    <span className="block font-bold truncate max-w-[300px]">{r.service}</span>
                    <span className="block text-[12px] text-[#5B667A] truncate max-w-[300px]">{r.provider || '—'}</span>
                  </td>
                  <td className={td}>
                    <Status label={r.status} color={r.status === 'Completed' || r.status === 'Report sent' ? '#067647' : '#2A4DD0'} />
                  </td>
                  <td className={`${td} whitespace-nowrap ${r.method === 'Not recorded' ? 'text-[#98A2B3]' : ''}`}>{r.method}</td>
                  <td className={`${td} text-[12.5px] text-[#5B667A] whitespace-nowrap`}>{new Date(r.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className={`${td} text-right font-extrabold tabular-nums`}>{inr(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="flex items-center justify-between gap-3 pt-3.5 text-[12.5px] text-[#5B667A]">
            <span>
              Showing {Math.min(limit, filtered.length)} of {filtered.length} · total <strong className="text-[#0B1B3F]">{inr(total)}</strong>
            </span>
            {filtered.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                Show more
              </button>
            )}
          </div>
        </>
      )}
    </Card>
  )
}
