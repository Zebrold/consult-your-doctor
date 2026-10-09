'use client'

import { useState, useTransition } from 'react'
import {
  AlertCircle, CheckCircle2, ChevronRight, Clock, Filter, HelpCircle, LifeBuoy, Mail, MessageSquare,
  Phone, RefreshCw, Search, Send, ShieldAlert, Tag, Ticket, User, UserCheck, X, Loader2
} from 'lucide-react'
import { updateTicketStatus, replyToTicket, type SupportTicket, type TicketStatus, type TicketPriority, type TicketMessage } from '@/app/actions/tickets'
import { formatTime, timeAgo } from '@/components/patient/format'

interface Props {
  initialTickets: SupportTicket[]
  stats: { total: number; open: number; inProgress: number; awaiting: number; resolved: number; closed: number }
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; badge: string; dot: string }> = {
  open: { label: 'Open', badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  in_progress: { label: 'In Progress', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  awaiting_response: { label: 'Awaiting Response', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  resolved: { label: 'Resolved', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  closed: { label: 'Closed', badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-500' },
}

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; tone: string }> = {
  urgent: { label: 'Urgent', tone: 'bg-red-500 text-white' },
  high: { label: 'High', tone: 'bg-orange-500 text-white' },
  medium: { label: 'Medium', tone: 'bg-blue-100 text-blue-800' },
  low: { label: 'Low', tone: 'bg-gray-100 text-gray-700' },
}

export function ExecutiveTicketsClient({ initialTickets, stats }: Props) {
  const [tickets, setTickets] = useState(initialTickets)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [replyText, setReplyText] = useState('')
  const [resolutionText, setResolutionText] = useState('')
  const [newStatus, setNewStatus] = useState<TicketStatus>('awaiting_response')
  const [isReplying, startReply] = useTransition()
  const [isUpdatingStatus, startStatus] = useTransition()

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const match =
        t.ticketCode.toLowerCase().includes(q) ||
        t.requesterName.toLowerCase().includes(q) ||
        (t.requesterEmail && t.requesterEmail.toLowerCase().includes(q)) ||
        t.subject.toLowerCase().includes(q) ||
        (t.relatedBookingId && t.relatedBookingId.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  })

  const handleStatusChange = (status: TicketStatus) => {
    if (!selectedTicket) return
    startStatus(async () => {
      const res = await updateTicketStatus(selectedTicket.id, status, resolutionText || undefined)
      if (res.success) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicket.id
              ? { ...t, status, resolutionNotes: resolutionText || t.resolutionNotes, updatedAt: new Date().toISOString() }
              : t
          )
        )
        setSelectedTicket((prev) =>
          prev ? { ...prev, status, resolutionNotes: resolutionText || prev.resolutionNotes, updatedAt: new Date().toISOString() } : null
        )
        setResolutionText('')
      }
    })
  }

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket || !replyText.trim()) return

    startReply(async () => {
      const res = await replyToTicket(selectedTicket.id, replyText, newStatus)
      if (res.success) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicket.id
              ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
              : t
          )
        )
        setSelectedTicket((prev) =>
          prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null
        )
        setReplyText('')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-primary-container/20 border-primary shadow-sm'
              : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
          }`}
        >
          <div className="text-xs font-semibold text-indigo-gray-600">Total Inbox</div>
          <div className="text-2xl font-bold text-on-surface mt-1">{stats.total}</div>
        </button>

        <button
          onClick={() => setStatusFilter('open')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'open'
              ? 'bg-red-50 border-red-500 shadow-sm'
              : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
          }`}
        >
          <div className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Open
          </div>
          <div className="text-2xl font-bold text-red-800 mt-1">{stats.open}</div>
        </button>

        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'in_progress'
              ? 'bg-amber-50 border-amber-500 shadow-sm'
              : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
          }`}
        >
          <div className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> In Progress
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{stats.inProgress}</div>
        </button>

        <button
          onClick={() => setStatusFilter('awaiting_response')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'awaiting_response'
              ? 'bg-blue-50 border-blue-500 shadow-sm'
              : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
          }`}
        >
          <div className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Awaiting User
          </div>
          <div className="text-2xl font-bold text-blue-800 mt-1">{stats.awaiting}</div>
        </button>

        <button
          onClick={() => setStatusFilter('resolved')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'resolved'
              ? 'bg-emerald-50 border-emerald-500 shadow-sm'
              : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Resolved
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{stats.resolved}</div>
        </button>

        <button
          onClick={() => setStatusFilter('closed')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'closed'
              ? 'bg-gray-100 border-gray-500 shadow-sm'
              : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
          }`}
        >
          <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-500" /> Closed
          </div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{stats.closed}</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by ID, name, email, booking reference..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-container-low rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 text-on-surface"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface font-medium focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Ticket Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List View (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
              <LifeBuoy className="w-10 h-10 text-outline mx-auto mb-3" />
              <h3 className="font-bold text-on-surface text-base">No support tickets found</h3>
              <p className="text-sm text-on-surface-variant mt-1">Adjust your filters or search term to see requests.</p>
            </div>
          ) : (
            filteredTickets.map((t) => {
              const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
              const priorityCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium
              const isSelected = selectedTicket?.id === t.id

              return (
                <article
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-4 md:p-5 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-surface-container-lowest border-vibrant-blue ring-2 ring-vibrant-blue/20 shadow-md'
                      : 'bg-surface-container-lowest border-outline-variant/30 hover:border-outline-variant hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary-fixed/50">
                          {t.ticketCode}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${priorityCfg.tone}`}>
                          {priorityCfg.label}
                        </span>
                        <span className="text-xs text-indigo-gray-500 capitalize">
                          {t.requesterRole} · {t.category}
                        </span>
                      </div>
                      <h4 className="font-title-md text-[15px] font-bold text-on-surface truncate">{t.subject}</h4>
                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">{t.description}</p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${statusCfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                      <span className="text-[11px] text-outline">{timeAgo(t.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-indigo-gray-800">{t.requesterName}</span>
                      {t.requesterEmail && <span className="text-outline truncate max-w-[160px]">{t.requesterEmail}</span>}
                    </div>
                    {t.relatedBookingId && (
                      <span className="font-mono text-[11px] text-vibrant-blue bg-blue-50 px-2 py-0.5 rounded">
                        Booking: #{t.relatedBookingId}
                      </span>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </div>

        {/* Selected Ticket Drawer / Response Box (5 cols) */}
        <div className="lg:col-span-5">
          {selectedTicket ? (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-md p-5 md:p-6 flex flex-col gap-5 sticky top-24">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant/20 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-primary">{selectedTicket.ticketCode}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${PRIORITY_CONFIG[selectedTicket.priority].tone}`}>
                      {PRIORITY_CONFIG[selectedTicket.priority].label}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-on-surface">{selectedTicket.subject}</h3>
                  <div className="text-xs text-on-surface-variant mt-1">
                    Submitted by <strong className="text-indigo-gray-900">{selectedTicket.requesterName}</strong> ({selectedTicket.requesterRole})
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Requester Contact Info & Linked Records */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-surface-container-low/50 p-3 rounded-xl border border-outline-variant/20">
                <div>
                  <span className="text-outline block text-[11px]">Email:</span>
                  <span className="font-medium text-on-surface truncate block">{selectedTicket.requesterEmail || 'None'}</span>
                </div>
                <div>
                  <span className="text-outline block text-[11px]">Phone:</span>
                  <span className="font-medium text-on-surface">{selectedTicket.requesterPhone || 'None'}</span>
                </div>
                {selectedTicket.relatedBookingId && (
                  <div className="col-span-2 pt-1 border-t border-outline-variant/20 mt-1">
                    <span className="text-outline block text-[11px]">Linked Booking Reference:</span>
                    <span className="font-mono font-bold text-vibrant-blue">#{selectedTicket.relatedBookingId}</span>
                  </div>
                )}
                {selectedTicket.relatedPaymentId && (
                  <div className="col-span-2">
                    <span className="text-outline block text-[11px]">Linked Payment Ref:</span>
                    <span className="font-mono font-bold text-on-surface">{selectedTicket.relatedPaymentId}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Issue Description</span>
                <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
                <span className="text-xs font-bold text-on-surface-variant">Update Status</span>
                <div className="flex flex-wrap gap-1.5">
                  {(['open', 'in_progress', 'awaiting_response', 'resolved', 'closed'] as TicketStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={isUpdatingStatus || selectedTicket.status === st}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        selectedTicket.status === st
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-surface-container hover:bg-surface-variant text-on-surface-variant disabled:opacity-50'
                      }`}
                    >
                      {STATUS_CONFIG[st].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Executive Reply Form */}
              <form onSubmit={handleSendReply} className="flex flex-col gap-2.5 pt-2 border-t border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-vibrant-blue" /> Reply to Requester
                  </span>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TicketStatus)}
                    className="text-[11px] bg-surface-container-low rounded px-2 py-1 border border-outline-variant/30"
                  >
                    <option value="awaiting_response">Set to Awaiting User</option>
                    <option value="in_progress">Set to In Progress</option>
                    <option value="resolved">Set to Resolved</option>
                    <option value="closed">Set to Closed</option>
                  </select>
                </div>

                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type an official executive response. An automated email &amp; SMS notification will be dispatched to the requester..."
                  required
                  className="w-full text-xs p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 resize-none text-on-surface"
                />

                <button
                  type="submit"
                  disabled={isReplying || !replyText.trim()}
                  className="py-2.5 px-4 rounded-xl bg-vibrant-blue hover:bg-primary text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {isReplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Dispatch Reply &amp; Notify User
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
              <Ticket className="w-8 h-8 text-outline" />
              <p className="text-sm font-semibold">Select a ticket from the left</p>
              <p className="text-xs text-outline">View full description, contact details, reply to user, and manage statuses.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
