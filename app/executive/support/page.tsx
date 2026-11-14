import type { Metadata } from 'next'
import { istDateKey } from '@/components/patient/format'
import { getExecutiveTickets } from '@/app/actions/tickets'
import { currentTime, requireExecutivePage, timeAgo } from '../_lib/ops'
import { ExePage } from '../_components/ui'
import type { Enquiry } from '../_components/PartnerPipeline'
import { ExecutiveTicketsClient } from './ExecutiveTicketsClient'

export const metadata: Metadata = { title: 'Support' }

type EnquiryRow = {
  id: string
  kind: 'hospital' | 'diagnostic_center'
  organization_name: string
  city: string
  beds: number | null
  contact_name: string
  contact_role: string | null
  phone: string
  email: string | null
  message: string | null
  stage: Enquiry['stage']
  notes: string | null
  last_called_at: string | null
  created_at: string
}

/**
 * Support after DeskExeSupport: every ticket from patients, hospitals and doctors with its reply deadline, thread,
 * internal notes and team; and Hospital interest (DeskExeSupportLeads), the enquiries to call and help apply.
 */
export default async function ExecutiveSupportPage(props: { searchParams?: Promise<{ tab?: string }> }) {
  const { admin, user, profile, access } = await requireExecutivePage('support')
  const now = currentTime()
  const [{ tickets, stats }, { data: executives }, teamsRes, enquiriesRes] = await Promise.all([
    getExecutiveTickets(),
    admin.from('profiles').select('id, full_name').eq('role', 'executive').limit(500),
    admin.from('tickets').select('id, team').not('team', 'is', null).limit(5000),
    admin.from('partner_enquiries').select('id, kind, organization_name, city, beds, contact_name, contact_role, phone, email, message, stage, notes, last_called_at, created_at').order('created_at', { ascending: false }).limit(300),
  ])
  const team = Object.fromEntries(((executives ?? []) as { id: string; full_name: string | null }[]).map((e) => [e.id, e.full_name || 'Executive']))

  // The first real reply on each ticket (status changes and internal notes don't count), for the reply deadlines.
  const firstReplies: Record<string, string> = {}
  const ids = tickets.map((t) => t.id)
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin
      .from('ticket_messages')
      .select('ticket_id, message, created_at')
      .in('ticket_id', ids.slice(i, i + 200))
      .eq('sender_role', 'executive')
      .order('created_at', { ascending: true })
      .limit(5000)
    for (const m of (data ?? []) as { ticket_id: string; message: string; created_at: string }[]) {
      if (m.message.startsWith('Status ') || firstReplies[m.ticket_id]) continue
      firstReplies[m.ticket_id] = m.created_at
    }
  }

  const ticketTeams = Object.fromEntries(((teamsRes.error ? [] : teamsRes.data) ?? []).map((r) => [(r as { id: string }).id, (r as { team: string }).team]))
  const enquiries: Enquiry[] = ((enquiriesRes.error ? [] : enquiriesRes.data) as EnquiryRow[] | null ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    name: e.organization_name,
    city: e.city,
    beds: e.beds,
    contact: e.contact_name,
    role: e.contact_role,
    phone: e.phone,
    email: e.email,
    message: e.message,
    stage: e.stage,
    notes: e.notes,
    when: timeAgo(e.created_at, now),
    lastCalled: e.last_called_at ? timeAgo(e.last_called_at, now) : null,
  }))
  const tab = (await props.searchParams)?.tab === 'interest' ? 'interest' : 'tickets'

  return (
    <ExePage name={profile.fullName} title="Support" subtitle="Solve every ticket from patients, hospitals and doctors, and help interested hospitals join">
      <ExecutiveTicketsClient
        initialTickets={tickets}
        stats={stats}
        me={user.id}
        myTeam={access.team}
        team={team}
        todayKey={istDateKey(now)}
        firstReplies={firstReplies}
        ticketTeams={ticketTeams}
        teamsReady={!teamsRes.error}
        enquiries={enquiries}
        enquiriesReady={!enquiriesRes.error}
        initialTab={tab}
      />
    </ExePage>
  )
}
