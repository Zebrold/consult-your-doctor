'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Download, Loader2, RefreshCcw, Search, ShieldCheck, X } from 'lucide-react'
import {
  processPaymentRefund, adjustPaymentStatus, type TransactionRow, type PaymentStats,
  type PaymentStatus
} from '@/app/actions/payments'
import { formatINR } from '@/components/patient/format'
import { gatewayName, isOnlineGateway } from '@/lib/payment-gateways'
import { Card, Stat, Stats, Status, Table, btnOutline, btnPrimary, btnSmall, segGroup, segTab, td, th } from '../_components/ui'

interface Props {
  initialTransactions: TransactionRow[]
  stats: PaymentStats
  /** From the top bar's search. */
  initialQuery?: string
}

const STATUS_BADGES: Record<PaymentStatus, { label: string; color: string }> = {
  success: { label: 'Successful', color: '#2A4DD0' },
  pending: { label: 'Pending', color: '#B54708' },
  failed: { label: 'Failed', color: '#B42318' },
  refunded: { label: 'Refunded', color: '#7A5AF8' },
}

/** "Online · Razorpay", "UPI QR at desk", "Cash at desk" */
function methodLabel(gateway: string) {
  if (isOnlineGateway(gateway)) return ['Online', gatewayName(gateway)].filter(Boolean).join(' · ')
  if (gateway === 'upi_qr') return 'UPI QR at desk'
  if (gateway === 'cash') return 'Cash at desk'
  return gateway.replace(/_/g, ' ')
}

export function ExecutivePaymentsClient({ initialTransactions, stats, initialQuery = '' }: Props) {
  const [transactions, setTransactions] = useState<TransactionRow[]>(initialTransactions)
  const [search, setSearch] = useState(initialQuery)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [gatewayFilter, setGatewayFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('all')
  const [selectedTxn, setSelectedTxn] = useState<TransactionRow | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Correction / Refund Modal State
  const [actionType, setActionType] = useState<'refund' | 'adjust' | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundAmount, setRefundAmount] = useState<string>('')
  const [adjustStatus, setAdjustStatus] = useState<PaymentStatus>('success')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isProcessing, startProcessing] = useTransition()

  // Date filtering
  const [now] = useState(() => Date.now())
  const filtered = transactions.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (gatewayFilter !== 'all' && (gatewayFilter === 'online' ? !isOnlineGateway(t.gateway) : t.gateway !== gatewayFilter)) return false

    if (dateRange !== 'all') {
      const created = new Date(t.createdAt).getTime()
      if (dateRange === 'today' && now - created > 86_400_000) return false
      if (dateRange === '7d' && now - created > 7 * 86_400_000) return false
      if (dateRange === '30d' && now - created > 30 * 86_400_000) return false
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      const match =
        t.transactionId.toLowerCase().includes(q) ||
        (t.patientCode && t.patientCode.toLowerCase().includes(q)) ||
        (t.patientName && t.patientName.toLowerCase().includes(q)) ||
        (t.hospitalCode && t.hospitalCode.toLowerCase().includes(q)) ||
        (t.hospitalName && t.hospitalName.toLowerCase().includes(q)) ||
        (t.diagnosticCenterCode && t.diagnosticCenterCode.toLowerCase().includes(q)) ||
        (t.diagnosticCenterName && t.diagnosticCenterName.toLowerCase().includes(q)) ||
        t.bookingReference.toLowerCase().includes(q)
      if (!match) return false
    }

    return true
  })

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTxn) return
    setActionError(null)

    const amt = parseFloat(refundAmount) || selectedTxn.amount
    startProcessing(async () => {
      const res = await processPaymentRefund(selectedTxn.id, amt, refundReason)
      if (res.success) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === selectedTxn.id
              ? { ...t, status: 'refunded', refundAmount: amt, refundReason, refundedAt: new Date().toISOString() }
              : t
          )
        )
        setSelectedTxn((prev) =>
          prev ? { ...prev, status: 'refunded', refundAmount: amt, refundReason, refundedAt: new Date().toISOString() } : null
        )
        setActionType(null)
        setRefundReason('')
      } else {
        setActionError(res.error || 'Failed to process refund')
      }
    })
  }

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTxn) return
    setActionError(null)

    startProcessing(async () => {
      const res = await adjustPaymentStatus(selectedTxn.id, adjustStatus, refundReason)
      if (res.success) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === selectedTxn.id ? { ...t, status: adjustStatus } : t))
        )
        setSelectedTxn((prev) => (prev ? { ...prev, status: adjustStatus } : null))
        setActionType(null)
        setRefundReason('')
      } else {
        setActionError(res.error || 'Failed to adjust status')
      }
    })
  }

  const exportCsv = () => {
    const cell = (v: string | number | null) => {
      const t = v == null ? '' : String(v)
      const safe = typeof v === 'string' && /^[=+\-@\t\r]/.test(t) ? `'${t}` : t
      return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
    }
    const rows = [
      ['Transaction', 'Patient', 'Patient ID', 'Hospital or lab', 'Hospital or lab ID', 'Booking', 'Kind', 'Method', 'Amount', 'Status', 'Date'],
      ...filtered.map((t) => [
        t.transactionId,
        t.patientName,
        t.patientCode,
        t.hospitalName || t.diagnosticCenterName,
        t.hospitalCode || t.diagnosticCenterCode,
        t.bookingReference,
        t.bookingKind === 'consultation' ? 'Consultation' : 'Lab test',
        methodLabel(t.gateway),
        t.amount,
        STATUS_BADGES[t.status]?.label ?? t.status,
        new Date(t.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      ]),
    ]
    // The byte-order mark makes Excel read the file as UTF-8 (₹, names in Indian scripts).
    const url = URL.createObjectURL(new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const select = 'h-[38px] px-3 rounded-[10px] border border-[#D6DDE8] bg-white text-[13px] font-bold text-[#27324A] outline-none focus:border-[#2A4DD0]'

  return (
    <div className="flex flex-col gap-3.5 lg:gap-5">
      <Stats cols={5}>
        <Stat label="Total collections" value={formatINR(stats.totalCollections)} note={`${stats.successfulCount.toLocaleString('en-IN')} settled payments`} />
        <Stat label="Successful" value={formatINR(stats.successfulAmount)} note={`${stats.successfulCount.toLocaleString('en-IN')} transactions`} tone="blue" />
        <Stat label="Pending" value={formatINR(stats.pendingAmount)} note={`${stats.pendingCount} awaiting gateway`} tone={stats.pendingCount ? 'warn' : undefined} />
        <Stat label="Failed" value={formatINR(stats.failedAmount)} note={`${stats.failedCount} cancelled or failed`} tone={stats.failedCount ? 'high' : undefined} />
        <Stat label="Refunds" value={formatINR(stats.refundAmount)} note={`${stats.refundCount} refunded`} />
      </Stats>

      <Card
        title="Transactions"
        sub={`${stats.totalTransactions.toLocaleString('en-IN')} on record`}
        right={
          <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className={btnOutline}>
            <Download className="w-4 h-4" /> Export (CSV)
          </button>
        }
      >
        <div className="flex flex-col xl:flex-row xl:items-center gap-2.5 mb-3.5">
          <label className="flex-1 min-w-0 flex items-center gap-2.5 h-[42px] px-3.5 rounded-xl bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0]">
            <Search className="w-[17px] h-[17px] text-[#5B667A] shrink-0" />
            <span className="sr-only">Search payments</span>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by transaction, patient, hospital or booking ID"
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] placeholder:text-[#7A8599]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="overflow-x-auto no-scrollbar max-w-full">
              <div role="tablist" aria-label="Status" className={segGroup}>
                {(['all', 'success', 'pending', 'failed', 'refunded'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === k}
                    onClick={() => {
                      setStatusFilter(k)
                      setCurrentPage(1)
                    }}
                    className={segTab(statusFilter === k)}
                  >
                    {k === 'all' ? 'All' : k === 'refunded' ? 'Refunds' : STATUS_BADGES[k].label}
                  </button>
                ))}
              </div>
            </div>
            <select
              aria-label="Payment method"
              value={gatewayFilter}
              onChange={(e) => {
                setGatewayFilter(e.target.value)
                setCurrentPage(1)
              }}
              className={select}
            >
              <option value="all">Every method</option>
              <option value="online">Online</option>
              <option value="upi_qr">UPI QR at desk</option>
              <option value="cash">Cash at desk</option>
            </select>
            <select
              aria-label="When"
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value)
                setCurrentPage(1)
              }}
              className={select}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>

        <Table min={980}>
          <thead>
            <tr>
              <th className={th}>Transaction</th>
              <th className={th}>Patient</th>
              <th className={th}>Hospital or lab</th>
              <th className={th}>Booking</th>
              <th className={th}>Method</th>
              <th className={th}>Amount</th>
              <th className={th}>Status</th>
              <th className={th}>Date</th>
              <th className={th}>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className={`${td} py-10 text-center text-[#5B667A]`}>
                  No transactions match your search or filters.
                </td>
              </tr>
            ) : (
              paginated.map((t) => {
                const statusCfg = STATUS_BADGES[t.status] || STATUS_BADGES.success
                return (
                  <tr key={t.id} className="hover:bg-[#F9FAFC]">
                    <td className={`${td} font-mono text-[12.5px] font-bold text-[#2A4DD0] whitespace-nowrap`}>{t.transactionId}</td>
                    <td className={td}>
                      <span className="block font-extrabold">{t.patientName || 'Patient'}</span>
                      <span className="block font-mono text-[11.5px] text-[#5B667A]">{t.patientCode || '—'}</span>
                    </td>
                    <td className={td}>
                      <span className="block font-extrabold truncate max-w-[200px]">{t.hospitalName || t.diagnosticCenterName || '—'}</span>
                      <span className="block font-mono text-[11.5px] text-[#5B667A]">{t.hospitalCode || t.diagnosticCenterCode || '—'}</span>
                    </td>
                    <td className={td}>
                      <span className="block font-bold">{t.bookingKind === 'consultation' ? 'Consultation' : 'Lab test'}</span>
                      <span className="block font-mono text-[11.5px] text-[#5B667A]">#{t.bookingReference}</span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{methodLabel(t.gateway)}</td>
                    <td className={`${td} font-extrabold tabular-nums whitespace-nowrap`}>{formatINR(t.amount)}</td>
                    <td className={td}>
                      <Status label={statusCfg.label} color={statusCfg.color} />
                    </td>
                    <td className={`${td} text-[12.5px] text-[#5B667A] whitespace-nowrap`}>
                      {new Date(t.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </td>
                    <td className={`${td} text-right`}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTxn(t)
                          setActionType(null)
                        }}
                        className={btnSmall}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </Table>

        <div className="flex items-center justify-between gap-3 pt-3.5 text-[12.5px] text-[#5B667A]">
          <span>
            {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length.toLocaleString('en-IN')}
          </span>
          <span className="flex items-center gap-2">
            <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)} className={`${btnSmall} !px-2 disabled:opacity-40`} aria-label="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} className={`${btnSmall} !px-2 disabled:opacity-40`} aria-label="Next page">
              <ChevronRight className="w-4 h-4" />
            </button>
          </span>
        </div>
      </Card>

      {/* One transaction, with the traceable refund and status correction. */}
      {selectedTxn && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-[#0B1B3F]/55 backdrop-blur-[2px]">
          <div role="dialog" aria-modal="true" aria-labelledby="txn-title" className="bg-white w-full sm:max-w-xl rounded-t-[22px] sm:rounded-2xl p-5 lg:p-6 shadow-2xl flex flex-col gap-4 max-h-[92dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-mono text-[12px] font-bold text-[#2A4DD0]">{selectedTxn.transactionId}</span>
                <h3 id="txn-title" className="mt-1 text-[18px] font-extrabold tracking-[-0.01em]">
                  {formatINR(selectedTxn.amount)} · {selectedTxn.bookingKind === 'consultation' ? 'Consultation' : 'Lab test'}
                </h3>
                <p className="mt-0.5 text-[13px] text-[#5B667A]">
                  <Status label={STATUS_BADGES[selectedTxn.status].label} color={STATUS_BADGES[selectedTxn.status].color} /> · {methodLabel(selectedTxn.gateway)} ·{' '}
                  {new Date(selectedTxn.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setSelectedTxn(null)
                  setActionType(null)
                }}
                className="shrink-0 w-9 h-9 rounded-full bg-[#F4F6FA] hover:bg-[#EEF2F8] flex items-center justify-center text-[#5B667A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 rounded-xl shadow-[inset_0_0_0_1px_#E6EAF0] px-4 py-1">
              {(
                [
                  ['Patient', selectedTxn.patientName || 'Patient', selectedTxn.patientCode],
                  ['Hospital or lab', selectedTxn.hospitalName || selectedTxn.diagnosticCenterName || '—', selectedTxn.hospitalCode || selectedTxn.diagnosticCenterCode],
                  ['Booking', `#${selectedTxn.bookingReference}`, selectedTxn.bookingKind === 'consultation' ? 'Consultation' : 'Lab test'],
                  ['Method', methodLabel(selectedTxn.gateway), STATUS_BADGES[selectedTxn.status].label],
                ] as const
              ).map(([label, value, sub], i) => (
                <div key={label} className={`min-w-0 py-3 ${i > 1 ? 'border-t border-[#EEF2F7]' : ''}`}>
                  <dt className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[#5B667A]">{label}</dt>
                  <dd className="mt-0.5 text-[13.5px] font-extrabold truncate">{value}</dd>
                  {sub && <dd className="font-mono text-[11.5px] text-[#5B667A] truncate">{sub}</dd>}
                </div>
              ))}
            </dl>

            {selectedTxn.status === 'refunded' && (
              <div className="rounded-xl bg-[#F4F3FF] px-4 py-3 text-[13px] text-[#5925DC]">
                <strong className="block">Refunded {formatINR(selectedTxn.refundAmount ?? selectedTxn.amount)}</strong>
                {selectedTxn.refundReason && <span className="block mt-0.5">Reason: {selectedTxn.refundReason}</span>}
                {selectedTxn.refundedAt && <span className="block mt-0.5 text-[12px]">{new Date(selectedTxn.refundedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-3 border-t border-[#EEF2F7]">
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#5B667A]">
                  <ShieldCheck className="w-4 h-4 text-[#067647]" /> Corrections
                </span>
                <span className="text-[12px] text-[#5B667A]">Every change is logged with its reason</span>
              </span>

              {actionType === null ? (
                <div className="flex flex-wrap gap-2">
                  {selectedTxn.status !== 'refunded' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionType('refund')
                        setRefundAmount(String(selectedTxn.amount))
                      }}
                      className={`${btnOutline} flex-1`}
                    >
                      <RefreshCcw className="w-4 h-4" /> Refund
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('adjust')
                      setAdjustStatus(selectedTxn.status)
                    }}
                    className={`${btnOutline} flex-1`}
                  >
                    Correct the status
                  </button>
                </div>
              ) : (
                <form onSubmit={actionType === 'refund' ? handleRefundSubmit : handleAdjustSubmit} className="flex flex-col gap-3 p-4 rounded-xl bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0]">
                  <span className="flex items-center justify-between">
                    <strong className="text-[14px]">{actionType === 'refund' ? 'Refund this payment' : 'Correct the status'}</strong>
                    <button type="button" onClick={() => setActionType(null)} className="text-[13px] font-bold text-[#5B667A] hover:text-[#0B1B3F]">
                      Cancel
                    </button>
                  </span>
                  {actionType === 'refund' ? (
                    <label className="block">
                      <span className="block mb-1 text-[12px] font-extrabold text-[#27324A]">Amount (₹)</span>
                      <input
                        type="number"
                        min={1}
                        max={selectedTxn.amount}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        required
                        className="w-full h-[42px] px-3 rounded-[10px] border border-[#D6DDE8] bg-white text-[14px] font-extrabold outline-none focus:border-[#2A4DD0]"
                      />
                    </label>
                  ) : (
                    <label className="block">
                      <span className="block mb-1 text-[12px] font-extrabold text-[#27324A]">New status</span>
                      <select
                        value={adjustStatus}
                        onChange={(e) => setAdjustStatus(e.target.value as PaymentStatus)}
                        className="w-full h-[42px] px-3 rounded-[10px] border border-[#D6DDE8] bg-white text-[14px] font-bold outline-none focus:border-[#2A4DD0]"
                      >
                        <option value="success">Successful</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </label>
                  )}
                  <label className="block">
                    <span className="block mb-1 text-[12px] font-extrabold text-[#27324A]">Reason (kept in the audit log)</span>
                    <textarea
                      rows={2}
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder={actionType === 'refund' ? 'Doctor unavailable, appointment cancelled, patient asked to cancel…' : 'Matched with the bank statement, settlement dispute resolved…'}
                      required
                      minLength={5}
                      className="w-full px-3 py-2.5 rounded-[10px] border border-[#D6DDE8] bg-white text-[13.5px] resize-none outline-none focus:border-[#2A4DD0]"
                    />
                  </label>
                  {actionError && <p className="text-[13px] font-bold text-[#B42318]">{actionError}</p>}
                  <button type="submit" disabled={isProcessing} className={btnPrimary}>
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {actionType === 'refund' ? 'Confirm refund' : 'Save the status'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
