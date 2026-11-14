import type { Metadata } from 'next'
import { Users } from 'lucide-react'
import { IST, istDateKey } from '@/components/patient/format'
import { currentTime, requireExecutivePage } from '../_lib/ops'
import { PAGES, TEAM_LABEL, isPageKey, isTeam, type PageKey, type Team } from '../_lib/access'
import { Card, EmptyState, ExePage, Initials, Note, Stat, Stats, Status, Table, td, th } from '../_components/ui'
import { AccessMatrix, CreateLoginForm, MemberActions, SidebarPreview } from '../_components/StaffAccess'

export const metadata: Metadata = { title: 'Staff & access' }
export const dynamic = 'force-dynamic'

type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

/**
 * Staff & access after DeskExeStaff: the team, the pages each team may open, new executive logins and the access log.
 * Only Management opens this page (requireExecutivePage('staff')).
 */
export default async function ExecutiveStaffPage() {
  const { admin, profile, user, access } = await requireExecutivePage('staff')
  const now = currentTime()
  const [{ data }, teamsRes, gridRes, logRes] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, staff_id, hospital:hospitals ( name )').eq('role', 'executive').order('full_name').limit(200),
    admin.from('profiles').select('id, executive_team').eq('role', 'executive').limit(200),
    admin.from('executive_page_access').select('team, page').limit(500),
    admin.from('executive_access_log').select('id, actor_name, action, created_at').order('created_at', { ascending: false }).limit(20),
  ])
  type Row = { id: string; full_name: string | null; email: string | null; staff_id: string | null; hospital: Joined<{ name: string | null }> }
  const rows = (data ?? []) as unknown as Row[]
  const teamOf = new Map(((teamsRes.error ? [] : teamsRes.data) ?? []).map((r) => [(r as { id: string }).id, (r as { executive_team: string | null }).executive_team]))
  const team = (id: string): Team => {
    const t = teamOf.get(id)
    return isTeam(t) ? t : 'management'
  }
  const grid = { operations: [] as PageKey[], finance: [] as PageKey[], support: [] as PageKey[] }
  for (const r of (gridRes.error ? [] : (gridRes.data ?? [])) as { team: string; page: string }[]) {
    if ((r.team === 'operations' || r.team === 'finance' || r.team === 'support') && isPageKey(r.page)) grid[r.team].push(r.page)
  }

  // Sign-ins and removals from the auth service, one lookup per member (a small team).
  const auth = new Map<string, { last: string | null; removed: boolean }>()
  await Promise.all(
    rows.map(async (r) => {
      const { data: u } = await admin.auth.admin.getUserById(r.id)
      auth.set(r.id, { last: u?.user?.last_sign_in_at ?? null, removed: !!u?.user?.banned_until && Date.parse(u.user.banned_until) > now })
    }),
  )
  const today = istDateKey(now)
  const active = rows.filter((r) => !auth.get(r.id)?.removed)
  const signedInToday = active.filter((r) => {
    const at = auth.get(r.id)?.last
    return at && istDateKey(at) === today
  }).length
  const invited = active.filter((r) => !auth.get(r.id)?.last)
  const managers = active.filter((r) => team(r.id) === 'management').length
  const teamsUsed = new Set(active.map((r) => team(r.id))).size
  const when = (iso: string | null | undefined) => {
    if (!iso) return null
    const t = new Date(iso).toLocaleTimeString('en-US', { timeZone: IST, hour: 'numeric', minute: '2-digit' })
    const key = istDateKey(iso)
    if (key === today) return `Today, ${t}`
    if (key === istDateKey(now - 86_400_000)) return `Yesterday, ${t}`
    return `${new Date(iso).toLocaleDateString('en-GB', { timeZone: IST, day: 'numeric', month: 'short' })}, ${t}`
  }
  const ready = access.ready && !gridRes.error

  return (
    <ExePage name={profile.fullName} title="Staff & access" subtitle="Your team, and the pages each team is allowed to open">
      <Stats>
        <Stat label="Team members" value={active.length} note={`${teamsUsed} ${teamsUsed === 1 ? 'team' : 'teams'}`} />
        <Stat label="Management" value={managers} note="Can change access" tone="blue" />
        <Stat label="Invites pending" value={invited.length} note="Haven’t signed in yet" tone={invited.length ? 'warn' : undefined} />
        <Stat label="Signed in today" value={signedInToday} note="From the login service" />
      </Stats>

      {!ready && <Note tone="amber">Team access isn’t switched on yet, so everyone is treated as Management. Run supabase/migrations/20261115_executive_workspace.sql to start it.</Note>}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3.5 lg:gap-5 items-start">
        <Card title="Page access by team" sub="Tick a box to let a team open that page">
          <AccessMatrix grid={grid} canEdit={ready} />
          <div className="mt-4">
            <Note>Only Management can change access. Management always sees every page, and only Management can open Staff &amp; access. Changes apply at the member’s next page load.</Note>
          </div>
        </Card>

        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <Card title="Preview a team’s sidebar">
            <SidebarPreview grid={grid} />
          </Card>
          <Card title="Create a staff login" right={<Status label="Management only" color="#2A4DD0" />}>
            {ready ? <CreateLoginForm /> : <p className="text-[13px] text-[#5B667A]">Available once the migration has run.</p>}
          </Card>
        </div>
      </div>

      <Card title="Members" sub="Everyone with an executive login">
        {rows.length === 0 ? (
          <EmptyState icon={Users}>No executives yet.</EmptyState>
        ) : (
          <Table min={860}>
            <thead>
              <tr>
                <th className={th}>Member</th>
                <th className={th}>Team</th>
                <th className={th}>Last sign-in</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>
                  <span className="sr-only">Change</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const a = auth.get(r.id)
                return (
                  <tr key={r.id}>
                    <td className={td}>
                      <span className="flex items-center gap-3 min-w-0">
                        <Initials name={r.full_name} />
                        <span className="min-w-0">
                          <span className="block font-extrabold truncate">
                            {r.full_name || 'Executive'}
                            {r.id === user.id && <span className="font-bold text-[#5B667A]"> (you)</span>}
                          </span>
                          <span className="block text-[12px] text-[#5B667A] truncate">{[r.email, r.staff_id, one(r.hospital)?.name].filter(Boolean).join(' · ') || '—'}</span>
                        </span>
                      </span>
                    </td>
                    <td className={`${td} font-bold`}>{TEAM_LABEL[team(r.id)]}</td>
                    <td className={`${td} whitespace-nowrap`}>{when(a?.last) ?? <span className="text-[#98A2B3]">Never</span>}</td>
                    <td className={td}>{a?.removed ? <Status label="Removed" color="#98A2B3" /> : a?.last ? <Status label="Active" color="#2A4DD0" /> : <Status label="Invited" color="#B54708" />}</td>
                    <td className={`${td} text-right`}>{ready && <MemberActions id={r.id} team={team(r.id)} removed={!!a?.removed} invited={!a?.last} isMe={r.id === user.id} />}</td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title="Access log" sub="Changes to teams, access and logins">
        {logRes.error || !(logRes.data ?? []).length ? (
          <p className="text-[13px] text-[#5B667A]">{logRes.error ? 'Starts once the migration has run.' : 'Nothing changed yet.'}</p>
        ) : (
          <ul>
            {((logRes.data ?? []) as { id: string; actor_name: string; action: string; created_at: string }[]).map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 py-2.5 border-t border-[#EEF2F7] first:border-t-0 first:pt-0 text-[13.5px]">
                <span>
                  <strong>{l.actor_name}</strong> {l.action}
                </span>
                <span className="shrink-0 text-[12px] text-[#5B667A]">{when(l.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-[12px] text-[#5B667A]">{PAGES.length} pages can be given to a team; Command, Settings and Policies are open to everyone.</p>
    </ExePage>
  )
}
