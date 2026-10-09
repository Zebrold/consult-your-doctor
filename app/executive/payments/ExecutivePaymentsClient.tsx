'use client'

import { useState, useTransition } from 'react'
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, CreditCard, Download, Filter, HelpCircle, History, IndianRupee, QrCode, RefreshCcw,
  Search, ShieldCheck, Tag, User, X, Loader2
} from 'lucide-react'
import {
  processPaymentRefund, adjustPaymentStatus, type TransactionRow, type PaymentStats,
  type PaymentStatus, type PaymentAuditRow
} from '@/app/actions/payments'
import { formatTime, timeAgo } from '@/components/patient/format'

interface Props {
  initialTransactions: TransactionRow[]
  stats: PaymentStats
}

const STATUS_BADGES: Record<PaymentStatus, { label: string; badge: string; dot: string }> = {
  success: { label: 'Successful', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  pending: { label: 'Pending', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  failed: { label: 'Failed', badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  refunded: { label: 'Refunded', badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
}

export function ExecutivePaymentsClient({ initialTransactions, stats }: Props) {
  const [transactions, setTransactions] = useState<TransactionRow[]>(initialTransactions)
  const [search, setSearch] = useState('')
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
  const now = Date.now()
  const filtered = transactions.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (gatewayFilter !== 'all' && t.gateway !== gatewayFilter) return false

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

  return (
    <div className="flex flex-col gap-6">
      {/* Payment Summary KPI Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-indigo-gray-600">Total Collections</span>
          <div className="text-xl md:text-2xl font-bold text-on-surface mt-2 text-primary">
            ₹{stats.totalCollections.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-outline mt-1">{stats.successfulCount} settled payments</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Successful
          </span>
          <div className="text-xl md:text-2xl font-bold text-emerald-800 mt-2">
            ₹{stats.successfulAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-600 mt-1">{stats.successfulCount} transactions</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Pending
          </span>
          <div className="text-xl md:text-2xl font-bold text-amber-800 mt-2">
            ₹{stats.pendingAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-amber-600 mt-1">{stats.pendingCount} awaiting gateway</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Failed
          </span>
          <div className="text-xl md:text-2xl font-bold text-red-800 mt-2">
            ₹{stats.failedAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-red-600 mt-1">{stats.failedCount} cancelled or failed</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Refunds
          </span>
          <div className="text-xl md:text-2xl font-bold text-purple-800 mt-2">
            ₹{stats.refundAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-purple-600 mt-1">{stats.refundCount} refunded payments</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-indigo-gray-600">Total Volume</span>
          <div className="text-xl md:text-2xl font-bold text-on-surface mt-2">
            {stats.totalTransactions}
          </div>
          <span className="text-[11px] text-outline mt-1">Platform transactions</span>
        </div>
      </section>

      {/* Filters and Search Bar */}
      <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search by Transaction ID, Patient ID, Hospital ID, Booking Reference..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-container-low rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 text-on-surface"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-2 text-sm bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface font-medium focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="success">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={gatewayFilter}
            onChange={(e) => {
              setGatewayFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-2 text-sm bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface font-medium focus:outline-none"
          >
            <option value="all">All Gateways</option>
            <option value="payu">PayU Online</option>
            <option value="upi_qr">UPI QR Scanner</option>
            <option value="cash">Cash Desk</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-2 text-sm bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface font-medium focus:outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Main Transactions Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/40 text-[12px] font-bold text-indigo-gray-700 uppercase tracking-wider">
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-4">Patient ID &amp; Name</th>
                <th className="py-3.5 px-4">Hospital / Diagnostic ID</th>
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Transaction Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 text-sm">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-on-surface-variant text-sm">
                    No transactions match your search or filters.
                  </td>
                </tr>
              ) : (
                paginated.map((t) => {
                  const statusCfg = STATUS_BADGES[t.status] || STATUS_BADGES.success
                  const orgCode = t.hospitalCode || t.diagnosticCenterCode || '—'
                  const orgName = t.hospitalName || t.diagnosticCenterName || 'Platform Service'
                  const isConsult = t.bookingKind === 'consultation'

                  return (
                    <tr key={t.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
                        {t.transactionId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-on-surface text-xs">{t.patientName || 'Patient'}</div>
                        <div className="font-mono text-[11px] text-outline">{t.patientCode || 'PAT-0000'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs font-bold text-indigo-gray-900">{orgCode}</div>
                        <div className="text-[11px] text-on-surface-variant truncate max-w-[150px]">{orgName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-container text-on-surface">
                          #{t.bookingReference}
                        </span>
                        <span className="block text-[10px] text-outline uppercase">{t.bookingKind}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-indigo-gray-700 capitalize font-medium">
                          {t.gateway === 'payu' ? <CreditCard className="w-3.5 h-3.5 text-vibrant-blue" /> : <QrCode className="w-3.5 h-3.5 text-emerald-600" />}
                          {t.gateway.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-on-surface text-sm">
                        ₹{t.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 ${statusCfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-on-surface-variant whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })},{' '}
                        {new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTxn(t)
                            setActionType(null)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-primary text-xs font-bold transition-all shadow-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant bg-surface-container-lowest">
          <div>
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} transactions
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-variant disabled:opacity-40"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-variant disabled:opacity-40"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Transaction Modal & Traceable Correction Drawer */}
      {selectedTxn && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-indigo-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-xl w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-5 border border-outline-variant/30 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-outline-variant/20 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary-fixed/50">
                  {selectedTxn.transactionId}
                </span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface mt-1.5">
                  Transaction Details • ₹{selectedTxn.amount.toLocaleString('en-IN')}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {STATUS_BADGES[selectedTxn.status].label} via {selectedTxn.gateway.toUpperCase()} on{' '}
                  {new Date(selectedTxn.createdAt).toLocaleString('en-IN')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTxn(null)
                  setActionType(null)
                }}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-outline hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-surface-container-low/50 p-4 rounded-xl border border-outline-variant/20">
              <div>
                <span className="text-outline block text-[11px]">Patient Details:</span>
                <strong className="text-on-surface font-semibold text-sm">{selectedTxn.patientName || 'Patient'}</strong>
                <span className="block font-mono text-outline">{selectedTxn.patientCode || 'PAT-0000'}</span>
              </div>

              <div>
                <span className="text-outline block text-[11px]">Provider Organization:</span>
                <strong className="text-on-surface font-semibold text-sm">
                  {selectedTxn.hospitalName || selectedTxn.diagnosticCenterName || 'Platform Clinic'}
                </strong>
                <span className="block font-mono text-primary font-bold">
                  {selectedTxn.hospitalCode || selectedTxn.diagnosticCenterCode || 'CYD-ORG-0000'}
                </span>
              </div>

              <div className="pt-2 border-t border-outline-variant/20">
                <span className="text-outline block text-[11px]">Booking Reference:</span>
                <span className="font-mono font-bold text-vibrant-blue text-sm">#{selectedTxn.bookingReference}</span>
                <span className="block capitalize text-outline">{selectedTxn.bookingKind}</span>
              </div>

              <div className="pt-2 border-t border-outline-variant/20">
                <span className="text-outline block text-[11px]">Payment Method:</span>
                <span className="font-semibold text-on-surface capitalize">{selectedTxn.gateway.replace('_', ' ')}</span>
                <span className="block text-outline">State: {selectedTxn.status.toUpperCase()}</span>
              </div>

              {selectedTxn.status === 'refunded' && (
                <div className="col-span-2 pt-2 border-t border-outline-variant/20 bg-purple-50/50 p-2.5 rounded-lg">
                  <span className="text-purple-800 font-bold block">Refund Processed:</span>
                  <span className="text-purple-700">Amount: ₹{(selectedTxn.refundAmount ?? selectedTxn.amount).toLocaleString('en-IN')}</span>
                  {selectedTxn.refundReason && <span className="block text-purple-600 mt-0.5">Reason: {selectedTxn.refundReason}</span>}
                  {selectedTxn.refundedAt && (
                    <span className="block text-[11px] text-purple-500 mt-0.5">
                      Date: {new Date(selectedTxn.refundedAt).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Role-based Traceable Actions */}
            <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-fresh-teal" /> Financial Corrections &amp; Auditing
                </span>
                <span className="text-[11px] text-outline">Non-silent • Fully Traceable</span>
              </div>

              {actionType === null ? (
                <div className="flex items-center gap-2">
                  {selectedTxn.status !== 'refunded' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionType('refund')
                        setRefundAmount(String(selectedTxn.amount))
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 transition-all flex items-center justify-center gap-1.5"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Process Refund
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('adjust')
                      setAdjustStatus(selectedTxn.status)
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    Adjust Status &amp; Reconcile
                  </button>
                </div>
              ) : actionType === 'refund' ? (
                <form onSubmit={handleRefundSubmit} className="flex flex-col gap-3 bg-purple-50/40 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">Initiate Traceable Refund</span>
                    <button type="button" onClick={() => setActionType(null)} className="text-xs text-outline hover:text-on-surface">
                      Cancel
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <label className="flex-1">
                      <span className="text-[11px] text-purple-800 font-semibold block mb-1">Refund Amount (₹)</span>
                      <input
                        type="number"
                        min={1}
                        max={selectedTxn.amount}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        required
                        className="w-full text-xs p-2.5 rounded-lg bg-surface-container-lowest border border-purple-300 font-bold"
                      />
                    </label>
                  </div>

                  <label>
                    <span className="text-[11px] text-purple-800 font-semibold block mb-1">
                      Reason for Refund (Audit Justification) *
                    </span>
                    <textarea
                      rows={2}
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Doctor unavailable / appointment cancelled / patient requested cancellation..."
                      required
                      minLength={5}
                      className="w-full text-xs p-2.5 rounded-lg bg-surface-container-lowest border border-purple-300 resize-none"
                    />
                  </label>

                  {actionError && <p className="text-xs text-red-600 font-semibold">{actionError}</p>}

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirm Traceable Refund
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAdjustSubmit} className="flex flex-col gap-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">Reconcile Status</span>
                    <button type="button" onClick={() => setActionType(null)} className="text-xs text-outline hover:text-on-surface">
                      Cancel
                    </button>
                  </div>

                  <label>
                    <span className="text-[11px] text-indigo-gray-700 font-semibold block mb-1">Select New Status</span>
                    <select
                      value={adjustStatus}
                      onChange={(e) => setAdjustStatus(e.target.value as PaymentStatus)}
                      className="w-full text-xs p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 font-medium"
                    >
                      <option value="success">Successful</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </label>

                  <label>
                    <span className="text-[11px] text-indigo-gray-700 font-semibold block mb-1">
                      Reason for Correction (Stored in Audit Log) *
                    </span>
                    <textarea
                      rows={2}
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Bank statement reconciliation / settlement dispute resolution..."
                      required
                      minLength={5}
                      className="w-full text-xs p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 resize-none"
                    />
                  </label>

                  {actionError && <p className="text-xs text-red-600 font-semibold">{actionError}</p>}

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="py-2.5 rounded-xl bg-vibrant-blue hover:bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirm Status Adjustment
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
