'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2, Search, Send, StickyNote, Ticket } from 'lucide-react'
import { addInternalNote, assignTicket, getTicketMessages, replyToTicket, setTicketTeam, updateTicketStatus, type SupportTicket, type TicketMessage, type TicketPriority, type TicketStatus } from '@/app/actions/tickets'
import { timeAgo } from '@/components/patient/format'
import { repliesFor, replyDeadline, span } from '@/lib/support-desk'
import { TEAMS, TEAM_LABEL, isTeam, type Team } from '../_lib/access'
import { CallLink, EmptyState, Stat, Stats, Status, btnOutline, btnPrimary, card, segGroup, segTab } from '../_components/ui'
import { PartnerPipeline, type Enquiry } from '../_components/PartnerPipeline'

type TicketStats = { total: number; open: number; inProgress: number; awaiting: number; resolved: number; closed: number }

interface Props {
  initialTickets: SupportTicket[]
  stats: TicketStats
  /** The signed-in executive, for "Take it" and "Mine". */
  me: string
  myTeam: Team
  /** Executives by id, for "Assigned to". */
  team: Record<string, string>
  todayKey: string
  /** When each ticket got its first reply from the team. */
  firstReplies: Record<string, string>
  /** The team each ticket was handed to; `teamsReady` is false before the migration. */
  ticketTeams: Record<string, string>
  teamsReady: boolean
  enquiries: Enquiry[]
  enquiriesReady: boolean
  initialTab?: 'tickets' | 'interest'
}

const STATUS: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: '#B42318' },
  in_progress: { label: 'In progress', color: '#B54708' },
  awaiting_response: { label: 'Waiting for them', color: '#2A4DD0' },
  resolved: { label: 'Resolved', color: '#067647' },
  closed: { label: 'Closed', color: '#5B667A' },
}
const PRIORITY: Record<TicketPriority, string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' }
const ACTIVE: TicketStatus[] = ['open', 'in_progress', 'awaiting_response']
const ROLE: Record<string, string> = { patient: 'Patient', hospital_admin: 'Hospital', hospital: 'Hospital', doctor: 'Doctor', diagnostic_admin: 'Lab', guest: 'Visitor', visitor: 'Visitor' }
const roleLabel = (r: string) => ROLE[r] ?? r.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
const capital = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

type View = 'open' | 'mine' | 'myteam' | 'unassigned' | 'overdue' | 'patient' | 'hospital' | 'doctor' | 'waiting' | 'done'
const isRole = (t: SupportTicket, role: 'patient' | 'hospital' | 'doctor') => (role === 'hospital' ? t.requesterRole === 'hospital_admin' || t.requesterRole === 'hospital' : t.requesterRole === role)
const istKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

/** Support after DeskExeSupport: views, the tickets, the open ticket's thread; and Hospital interest (DeskExeSupportLeads). */
export function ExecutiveTicketsClient(props: Props) {
  const { initialTickets, stats, me, myTeam, team, todayKey, firstReplies, ticketTeams, teamsReady, enquiries, enquiriesReady } = props
  const [tab, setTab] = useState<'tickets' | 'interest'>(props.initialTab ?? 'tickets')
  const [now] = useState(() => Date.now())
  const [tickets, setTickets] = useState(initialTickets)
  const [teams, setTeams] = useState(ticketTeams)
  const [view, setView] = useState<View>('open')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(initialTickets.find((t) => ACTIVE.includes(t.status))?.id ?? null)
  // The open ticket's thread, kept with the ticket it belongs to so a stale one never shows.
  const [thread, setThread] = useState<{ id: string; rows: TicketMessage[] } | null>(null)
  const [mode, setMode] = useState<'reply' | 'note'>('reply')
  const [replyText, setReplyText] = useState('')
  const [newStatus, setNewStatus] = useState<TicketStatus>('awaiting_response')
  const [error, setError] = useState<string | null>(null)
  const [isReplying, startReply] = useTransition()
  const [isUpdating, startUpdate] = useTransition()

  const selected = tickets.find((t) => t.id === selectedId) ?? null
  const messages = thread && thread.id === selectedId ? thread.rows : null

  useEffect(() => {
    if (!selectedId) return
    let live = true
    getTicketMessages(selectedId).then((rows) => {
      if (live) setThread({ id: selectedId, rows })
    })
    return () => {
      live = false
    }
  }, [selectedId])

  const deadline = (t: SupportTicket) => replyDeadline(t, firstReplies[t.id] ?? null, now)
  const active = tickets.filter((t) => ACTIVE.includes(t.status))
  const overdue = active.filter((t) => deadline(t).late)
  const views: { id: View; label: string; list: SupportTicket[] }[] = [
    { id: 'open', label: 'All open', list: active },
    { id: 'mine', label: 'Mine', list: active.filter((t) => t.assignedTo === me) },
    ...(teamsReady && myTeam !== 'management' ? [{ id: 'myteam' as View, label: `${TEAM_LABEL[myTeam]} team`, list: active.filter((t) => teams[t.id] === myTeam) }] : []),
    { id: 'unassigned', label: 'Unassigned', list: active.filter((t) => !t.assignedTo) },
    { id: 'overdue', label: 'Overdue', list: overdue },
    { id: 'patient', label: 'Patients', list: active.filter((t) => isRole(t, 'patient')) },
    { id: 'hospital', label: 'Hospitals', list: active.filter((t) => isRole(t, 'hospital')) },
    { id: 'doctor', label: 'Doctors', list: active.filter((t) => isRole(t, 'doctor')) },
    { id: 'waiting', label: 'Waiting for them', list: tickets.filter((t) => t.status === 'awaiting_response') },
    { id: 'done', label: 'Resolved & closed', list: tickets.filter((t) => t.status === 'resolved' || t.status === 'closed') },
  ]
  const current = views.find((v) => v.id === view) ?? views[0]
  const q = search.trim().toLowerCase()
  const list = current.list.filter(
    (t) =>
      !q ||
      t.ticketCode.toLowerCase().includes(q) ||
      t.requesterName.toLowerCase().includes(q) ||
      (t.requesterEmail ?? '').toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.relatedBookingId ?? '').toLowerCase().includes(q),
  )

  const patch = (id: string, change: Partial<SupportTicket>) => setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...change, updatedAt: new Date().toISOString() } : t)))
  const reload = (id: string) => getTicketMessages(id).then((rows) => setThread({ id, rows }))

  const setStatus = (status: TicketStatus) => {
    if (!selected) return
    setError(null)
    startUpdate(async () => {
      const res = await updateTicketStatus(selected.id, status)
      if (!res.success) return setError(res.error ?? 'Could not change the status.')
      patch(selected.id, { status })
      reload(selected.id)
    })
  }

  const takeIt = () => {
    if (!selected) return
    setError(null)
    startUpdate(async () => {
      const res = await assignTicket(selected.id, me)
      if (!res.success) return setError('Could not take the ticket.')
      patch(selected.id, { assignedTo: me })
    })
  }

  const moveTo = (value: string) => {
    if (!selected) return
    setError(null)
    const next = isTeam(value) ? value : null
    startUpdate(async () => {
      const res = await setTicketTeam(selected.id, next)
      if (!res.success) return setError(res.error ?? 'Could not move the ticket.')
      setTeams((m) => {
        const copy = { ...m }
        if (next) copy[selected.id] = next
        else delete copy[selected.id]
        return copy
      })
      reload(selected.id)
    })
  }

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !replyText.trim()) return
    setError(null)
    startReply(async () => {
      if (mode === 'note') {
        const res = await addInternalNote(selected.id, replyText)
        if (!res.success) return setError(res.error ?? 'Could not save the note.')
      } else {
        const res = await replyToTicket(selected.id, replyText, newStatus)
        if (!res.success) return setError(res.error ?? 'Could not send the reply.')
        patch(selected.id, { status: newStatus })
      }
      setReplyText('')
      reload(selected.id)
    })
  }

  const openCount = stats.open + stats.inProgress + stats.awaiting
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const byRole = (['patient', 'hospital', 'doctor'] as const).map((r) => [r, active.filter((t) => isRole(t, r)).length] as const).filter(([, n]) => n > 0)
  const resolvedToday = tickets.filter((t) => (t.status === 'resolved' || t.status === 'closed') && istKey(t.updatedAt) === todayKey).length
  const monthAgo = now - 30 * 86_400_000
  const replyTimes = tickets.filter((t) => firstReplies[t.id] && Date.parse(t.createdAt) >= monthAgo).map((t) => Date.parse(firstReplies[t.id]) - Date.parse(t.createdAt))
  const avgReply = replyTimes.length ? replyTimes.reduce((s, x) => s + x, 0) / replyTimes.length : null
  const newEnquiries = enquiries.filter((e) => e.stage === 'new' || e.stage === 'called' || e.stage === 'interested').length

  return (
    <div className="flex flex-col gap-3.5 lg:gap-5">
      <Stats cols={5}>
        <Stat
          label="Open tickets"
          value={openCount}
          note={byRole.length ? byRole.map(([r, n]) => (r === 'patient' ? plural(n, 'patient', 'patients') : r === 'hospital' ? plural(n, 'hospital', 'hospitals') : plural(n, 'doctor', 'doctors'))).join(' · ') : 'Nothing open'}
        />
        <Stat label="Overdue" value={overdue.length} note="Past the reply time" tone={overdue.length ? 'high' : undefined} />
        <Stat label="Unassigned" value={active.filter((t) => !t.assignedTo).length} note="Need an owner" tone={active.some((t) => !t.assignedTo) ? 'warn' : undefined} />
        <Stat label="Resolved today" value={resolvedToday} note={avgReply != null ? `First reply in ${span(avgReply)} on average` : 'No replies in 30 days'} tone="ok" />
        <Stat label="Hospital interest" value={newEnquiries} note="To call and help apply" tone="blue" />
      </Stats>

      <div className="overflow-x-auto no-scrollbar">
        <div role="tablist" aria-label="Support" className={segGroup}>
          <button type="button" role="tab" aria-selected={tab === 'tickets'} onClick={() => setTab('tickets')} className={segTab(tab === 'tickets')}>
            Tickets ({openCount})
          </button>
          <button type="button" role="tab" aria-selected={tab === 'interest'} onClick={() => setTab('interest')} className={segTab(tab === 'interest')}>
            Hospital interest ({newEnquiries})
          </button>
        </div>
      </div>

      {tab === 'interest' ? (
        <PartnerPipeline enquiries={enquiries} ready={enquiriesReady} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,0.9fr)_minmax(0,1.4fr)] gap-3.5 lg:gap-5 items-start">
          {/* Views: a scrolling row of tabs on phones, a list on desktops. */}
          <section className={`${card} lg:px-2.5 lg:py-3.5 p-1 overflow-x-auto no-scrollbar`}>
            <span className="hidden lg:block px-3 pt-1 pb-2 text-[11px] font-extrabold tracking-[0.1em] text-[#5B667A]">VIEWS</span>
            <div className="flex lg:flex-col gap-1 lg:gap-0">
              {views.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  aria-pressed={view === v.id}
                  className={`shrink-0 flex items-center gap-3 w-auto lg:w-full h-[38px] px-3 rounded-[10px] text-[13.5px] font-bold text-left whitespace-nowrap ${view === v.id ? 'bg-[#EEF3FF] text-[#2A4DD0]' : 'text-[#27324A] hover:bg-[#F7F9FC]'}`}
                >
                  <span className="lg:flex-1">{v.label}</span>
                  <span className={`text-[12px] font-extrabold ${v.id === 'overdue' && v.list.length ? 'text-[#B42318]' : 'text-[#5B667A]'}`}>{v.list.length}</span>
                </button>
              ))}
            </div>
          </section>

          <section className={`${card} p-4 lg:p-[22px] min-w-0`}>
            <h2 className="text-[16px] font-extrabold">Tickets</h2>
            <p className="mt-[3px] mb-3.5 text-[13px] text-[#5B667A]">
              {list.length} in {current.label.toLowerCase()}
            </p>
            <label className="flex items-center gap-2 h-10 px-3 mb-3 rounded-[10px] bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0]">
              <Search className="w-4 h-4 text-[#5B667A] shrink-0" />
              <input type="search" aria-label="Search tickets" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ticket or booking ID" className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[13px]" />
            </label>
            {list.length === 0 ? (
              <p className="py-6 text-center text-[13.5px] text-[#5B667A]">No tickets here.</p>
            ) : (
              <div className="grid gap-2 max-h-[720px] overflow-y-auto overscroll-contain -mx-1 px-1">
                {list.map((t) => {
                  const on = t.id === selectedId
                  const d = deadline(t)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={`block w-full text-left px-3.5 py-3 rounded-xl ${on ? 'border-[1.5px] border-[#2A4DD0] bg-[#F5F8FF]' : 'border border-[#E6EAF0] bg-white hover:bg-[#F9FAFC]'}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center h-[22px] px-2 rounded-md bg-[#F1F4F9] text-[#27324A] text-[11px] font-extrabold truncate">
                          {roleLabel(t.requesterRole)} · {capital(t.category)}
                        </span>
                        <span className="shrink-0 text-[11.5px] text-[#5B667A]">{timeAgo(t.createdAt)}</span>
                      </span>
                      <span className="block mt-1.5 text-[14px] font-extrabold leading-snug">{t.subject}</span>
                      <span className="block mt-0.5 text-[12px] text-[#5B667A] truncate">
                        {t.ticketCode} · {t.requesterName} · {PRIORITY[t.priority]}
                        {isTeam(teams[t.id]) ? ` · ${TEAM_LABEL[teams[t.id] as Team]}` : ''}
                      </span>
                      <span className="flex justify-between gap-2 mt-2 text-[12px] font-extrabold">
                        <span className={`truncate ${d.late ? 'text-[#B42318]' : 'text-[#5B667A]'}`}>{d.label}</span>
                        <Status label={STATUS[t.status].label} color={STATUS[t.status].color} className="!text-[12px]" />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className={`${card} p-4 lg:p-[22px] min-w-0`}>
            {!selected ? (
              <EmptyState icon={Ticket}>Pick a ticket to read it and reply.</EmptyState>
            ) : (
              <TicketDetail
                t={selected}
                deadlineLabel={deadline(selected)}
                me={me}
                team={team}
                ticketTeam={teams[selected.id] ?? ''}
                teamsReady={teamsReady}
                messages={messages}
                busy={isUpdating}
                onTake={takeIt}
                onMove={moveTo}
                onStatus={setStatus}
                composer={
                  <form onSubmit={send} className="mt-4 pt-4 border-t border-[#EEF2F7]">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className={segGroup}>
                        <button type="button" onClick={() => setMode('reply')} aria-pressed={mode === 'reply'} className={segTab(mode === 'reply')}>
                          Reply
                        </button>
                        <button type="button" onClick={() => setMode('note')} aria-pressed={mode === 'note'} className={segTab(mode === 'note')}>
                          Internal note
                        </button>
                      </div>
                      {mode === 'reply' && (
                        <select
                          aria-label="Suggested reply"
                          value=""
                          onChange={(e) => e.target.value && setReplyText(e.target.value)}
                          className="h-[38px] max-w-full px-2.5 rounded-[10px] border border-[#D6DDE8] bg-white text-[13px] font-bold outline-none focus:border-[#2A4DD0]"
                        >
                          <option value="">Suggested reply…</option>
                          {repliesFor(selected.category).map((r) => (
                            <option key={r.label} value={r.text}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <label htmlFor="ticket-reply" className="sr-only">
                      {mode === 'note' ? 'Internal note' : 'Reply'}
                    </label>
                    <textarea
                      id="ticket-reply"
                      rows={4}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        mode === 'note'
                          ? 'A note for the team. The requester never sees it.'
                          : selected.requesterEmail
                            ? `Reply to ${selected.requesterName}. They get it by email.`
                            : `Reply to ${selected.requesterName}. No email on file, so call them too.`
                      }
                      className={`w-full px-3.5 py-3 rounded-xl border text-[13.5px] resize-y outline-none focus:shadow-[0_0_0_3px_rgba(42,77,208,0.12)] ${mode === 'note' ? 'border-[#FEDF89] bg-[#FFFCF5] focus:border-[#B54708]' : 'border-[#D6DDE8] bg-white focus:border-[#2A4DD0]'}`}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2.5 mt-2.5">
                      {mode === 'reply' ? (
                        <label className="flex items-center gap-2 text-[13px] font-bold text-[#27324A]">
                          Then
                          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as TicketStatus)} className="h-[38px] px-2.5 rounded-[10px] border border-[#D6DDE8] bg-white text-[13px] font-bold outline-none focus:border-[#2A4DD0]">
                            <option value="awaiting_response">wait for them</option>
                            <option value="in_progress">keep it in progress</option>
                            <option value="resolved">mark resolved</option>
                            <option value="closed">close it</option>
                          </select>
                        </label>
                      ) : (
                        <span className="text-[12.5px] font-bold text-[#B54708]">Only your team sees internal notes.</span>
                      )}
                      <button type="submit" disabled={isReplying || !replyText.trim()} className={btnPrimary}>
                        {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'note' ? <StickyNote className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                        {mode === 'note' ? 'Save note' : 'Send'}
                      </button>
                    </div>
                    {error && (
                      <p role="alert" className="mt-3 text-[13px] font-bold text-[#B42318]">
                        {error}
                      </p>
                    )}
                  </form>
                }
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function TicketDetail({
  t,
  deadlineLabel,
  me,
  team,
  ticketTeam,
  teamsReady,
  messages,
  busy,
  onTake,
  onMove,
  onStatus,
  composer,
}: {
  t: SupportTicket
  deadlineLabel: { label: string; late: boolean }
  me: string
  team: Record<string, string>
  ticketTeam: string
  teamsReady: boolean
  messages: TicketMessage[] | null
  busy: boolean
  onTake: () => void
  onMove: (team: string) => void
  onStatus: (s: TicketStatus) => void
  composer: React.ReactNode
}) {
  return (
    <>
      <div className="flex flex-wrap justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[12px] font-extrabold text-[#5B667A]">
            {t.ticketCode} · {roleLabel(t.requesterRole)} · {capital(t.category)}
          </span>
          <span className="block mt-1 text-[19px] font-extrabold tracking-[-0.01em] leading-snug">{t.subject}</span>
          <span className={`block mt-1 text-[12.5px] font-extrabold ${deadlineLabel.late ? 'text-[#B42318]' : 'text-[#5B667A]'}`}>
            {deadlineLabel.label} · raised {timeAgo(t.createdAt)}
          </span>
        </span>
        <span className="shrink-0 self-start inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0]">
          <Status label={STATUS[t.status].label} color={STATUS[t.status].color} />
        </span>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-[18px] gap-y-3.5 mt-4 px-4 py-3.5 rounded-xl bg-[#F7F9FC] text-[13.5px]">
        <Fact label="Requester">{t.requesterName}</Fact>
        <Fact label="Contact">{[t.requesterPhone, t.requesterEmail].filter(Boolean).join(' · ') || '—'}</Fact>
        <Fact label="Priority">{PRIORITY[t.priority]}</Fact>
        <Fact label="Reference">{[t.relatedBookingId && `Booking #${t.relatedBookingId}`, t.relatedPaymentId && `Payment ${t.relatedPaymentId}`].filter(Boolean).join(' · ') || '—'}</Fact>
        <Fact label="Assigned to">
          {t.assignedTo ? (
            t.assignedTo === me ? 'You' : team[t.assignedTo] ?? 'A teammate'
          ) : (
            <button type="button" onClick={onTake} disabled={busy} className="font-extrabold text-[#2A4DD0] hover:underline underline-offset-4 disabled:opacity-60">
              Take it
            </button>
          )}
        </Fact>
        <Fact label="Team">
          {teamsReady ? (
            <select aria-label="Move to team" value={ticketTeam} disabled={busy} onChange={(e) => onMove(e.target.value)} className="h-8 -ml-1 px-1 max-w-full rounded-lg bg-transparent font-bold outline-none focus:shadow-[0_0_0_1.5px_#2A4DD0]">
              <option value="">Not handed over</option>
              {TEAMS.map((x) => (
                <option key={x.id} value={x.id}>
                  {ticketTeam === x.id ? x.label : `Move to ${x.label}`}
                </option>
              ))}
            </select>
          ) : (
            '—'
          )}
        </Fact>
      </dl>
      {t.requesterPhone && (
        <div className="mt-3">
          <CallLink phone={t.requesterPhone} label={`Call ${t.requesterPhone}`} />
        </div>
      )}

      <h3 className="mt-5 mb-2 text-[12px] font-extrabold tracking-[0.06em] uppercase text-[#5B667A]">Conversation</h3>
      <ul className="flex flex-col gap-2.5">
        <Bubble who={t.requesterName} when={timeAgo(t.createdAt)} text={t.description} />
        {messages === null ? (
          <li className="py-3 text-center text-[13px] text-[#5B667A]">
            <Loader2 className="inline w-4 h-4 animate-spin" /> Loading the thread…
          </li>
        ) : (
          messages.map((m) =>
            m.senderRole === 'internal' ? (
              <Bubble key={m.id} who={`Internal note · ${m.senderName}`} when={timeAgo(m.createdAt)} text={m.message} kind="note" />
            ) : m.senderRole === 'executive' && !m.message.startsWith('Status ') ? (
              <Bubble key={m.id} who={`${m.senderName} · Support`} when={timeAgo(m.createdAt)} text={m.message} kind="ours" />
            ) : m.senderRole === 'executive' ? (
              <li key={m.id} className="text-center text-[12px] font-bold text-[#5B667A]">
                {m.senderName}: {m.message} · {timeAgo(m.createdAt)}
              </li>
            ) : (
              <Bubble key={m.id} who={m.senderName} when={timeAgo(m.createdAt)} text={m.message} />
            ),
          )
        )}
      </ul>

      {composer}

      <div className="mt-4 pt-4 border-t border-[#EEF2F7]">
        <span className="block mb-2 text-[12px] font-extrabold tracking-[0.06em] uppercase text-[#5B667A]">Change the status without replying</span>
        <div className="overflow-x-auto no-scrollbar">
          <div className={segGroup}>
            {(['open', 'in_progress', 'awaiting_response', 'resolved', 'closed'] as TicketStatus[]).map((st) => (
              <button key={st} type="button" disabled={busy || t.status === st} onClick={() => onStatus(st)} className={`${segTab(t.status === st)} disabled:cursor-default`}>
                {STATUS[st].label}
              </button>
            ))}
          </div>
        </div>
        {t.status === 'closed' && (
          <button type="button" onClick={() => onStatus('open')} disabled={busy} className={`${btnOutline} mt-3`}>
            Reopen
          </button>
        )}
      </div>
    </>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">{label}</dt>
      <dd className="mt-[3px] font-bold break-words">{children}</dd>
    </div>
  )
}

function Bubble({ who, when, text, kind = 'theirs' }: { who: string; when: string; text: string; kind?: 'theirs' | 'ours' | 'note' }) {
  const look = kind === 'ours' ? 'self-end bg-[#EEF3FF]' : kind === 'note' ? 'self-stretch bg-[#FFFAEB] shadow-[inset_0_0_0_1px_#FEDF89]' : 'self-start bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0]'
  return (
    <li className={`max-w-[92%] px-3.5 py-2.5 rounded-xl ${look}`}>
      <span className={`flex items-center justify-between gap-3 text-[12px] font-extrabold ${kind === 'note' ? 'text-[#B54708]' : 'text-[#5B667A]'}`}>
        <span className="truncate">{who}</span>
        <span className="shrink-0 font-bold">{when}</span>
      </span>
      <span className="block mt-1 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">{text}</span>
    </li>
  )
}
