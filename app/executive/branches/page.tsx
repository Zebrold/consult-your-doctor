import type { Metadata } from 'next'
import { Building } from 'lucide-react'
import { currentTime, loadPartnerApplications, requireExecutivePage, timeAgo } from '../_lib/ops'
import { Card, EmptyState, ExePage, Stat, Stats, Table, plural, td, th } from '../_components/ui'
import { PartnerQueue } from '../_components/PartnerQueue'
import { PracticeReview } from '../_components/PracticeReview'
import { doctorName, formatShortDate } from '@/components/patient/format'
import { PRACTICE_STATUS, loadPractices } from '@/lib/practices'

export const metadata: Metadata = { title: 'Branches & practices' }
export const dynamic = 'force-dynamic'

type HospitalRow = { id: string; name: string; city: string | null; status: string | null }

/**
 * Branches after DeskExeBranches: branches hospitals asked for from Accounts & branches (approving creates the branch
 * and gives the admin who asked access to it), and hospital groups, the branches that share admins
 * (hospital_admin_access, supabase/migrations/20261114_grow_and_manage.sql).
 */
export default async function ExecutiveBranchesPage() {
  const { admin, profile } = await requireExecutivePage('branches')
  const now = currentTime()
  const [applications, { data: hospitalRows }, access, { data: adminRows }, { data: doctorRows }] = await Promise.all([
    loadPartnerApplications(admin, 'hospital', { withDocuments: true }),
    admin.from('hospitals').select('id, name, city, status').order('name'),
    admin.from('hospital_admin_access').select('profile_id, hospital_id').limit(10000),
    admin.from('profiles').select('id, hospital_id').eq('role', 'hospital_admin').limit(10000),
    admin.from('doctors').select('hospital_id').limit(20000),
  ])

  const requests = applications.filter((a) => a.status === 'pending' && a.details.branchOf).reverse()
  const labels = Object.fromEntries(requests.map((a) => [a.id, timeAgo(a.createdAt, now)]))

  const hospitals = new Map(((hospitalRows ?? []) as HospitalRow[]).map((h) => [h.id, h]))
  const doctors = new Map<string, number>()
  for (const d of (doctorRows ?? []) as { hospital_id: string | null }[]) if (d.hospital_id) doctors.set(d.hospital_id, (doctors.get(d.hospital_id) ?? 0) + 1)

  // Hospitals an admin can reach: the one they're signed in to and every branch they were given.
  const reach = new Map<string, Set<string>>()
  for (const p of (adminRows ?? []) as { id: string; hospital_id: string | null }[]) if (p.hospital_id) reach.set(p.id, new Set([p.hospital_id]))
  for (const r of (access.error ? [] : (access.data ?? [])) as { profile_id: string; hospital_id: string }[]) reach.set(r.profile_id, new Set([...(reach.get(r.profile_id) ?? []), r.hospital_id]))

  // Groups: hospitals joined by a shared admin (union-find).
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    const p = parent.get(x) ?? x
    if (p === x) return x
    const root = find(p)
    parent.set(x, root)
    return root
  }
  for (const ids of reach.values()) {
    const [first, ...rest] = [...ids].filter((id) => hospitals.has(id))
    if (!first) continue
    for (const id of rest) parent.set(find(id), find(first))
  }
  const groupsById = new Map<string, string[]>()
  for (const id of hospitals.keys()) groupsById.set(find(id), [...(groupsById.get(find(id)) ?? []), id])
  const admins = (ids: string[]) => [...reach.values()].filter((set) => ids.some((id) => set.has(id))).length
  const groups = [...groupsById.values()]
    .filter((ids) => ids.length > 1)
    .map((ids) => {
      const list = ids.map((id) => hospitals.get(id)!).sort((a, b) => a.name.localeCompare(b.name))
      return { ids, list, doctors: ids.reduce((s, id) => s + (doctors.get(id) ?? 0), 0), admins: admins(ids) }
    })
    .sort((a, b) => b.ids.length - a.ids.length)
  const branchCount = groups.reduce((s, g) => s + g.ids.length, 0)
  const multiAdmins = [...reach.values()].filter((s) => s.size > 1).length

  // Doctors practising at more than one hospital (lib/practices.ts): links the doctor accepted wait for our check.
  const { ready: practicesReady, practices } = await loadPractices(admin)
  const toReview = practices.filter((p) => p.status === 'accepted').reverse()
  const confirmed = practices.filter((p) => p.status === 'confirmed')
  const linkDoctorIds = [...new Set(practices.map((p) => p.doctorId))]
  const { data: linkDoctors } = linkDoctorIds.length
    ? await admin.from('doctors').select('*, profiles!doctors_profile_id_fkey ( full_name )').in('id', linkDoctorIds)
    : { data: [] }
  type LD = { id: string; specialty: string | null; registration_number?: string | null; hospital_id: string | null; profiles: { full_name: string | null } | { full_name: string | null }[] | null }
  const docOf = new Map(((linkDoctors ?? []) as LD[]).map((d) => [d.id, d]))
  const docName = (id: string) => {
    const p = docOf.get(id)?.profiles
    return doctorName((Array.isArray(p) ? p[0] : p)?.full_name ?? 'Doctor')
  }
  const hospitalName = (id: string | null | undefined) => (id ? hospitals.get(id)?.name ?? 'Hospital' : 'No hospital')

  return (
    <ExePage name={profile.fullName} title="Branches & practices" subtitle="Hospital branch requests and doctors joining more than one hospital">
      <Stats>
        <Stat label="Hospital groups" value={groups.length} note={`${plural(branchCount, 'branch', 'branches')} in total · ${multiAdmins} shared ${multiAdmins === 1 ? 'admin' : 'admins'}`} />
        <Stat label="Branch requests" value={requests.length} note="Waiting for review" tone={requests.length ? 'warn' : undefined} />
        <Stat label="Doctors at 2+ hospitals" value={new Set(confirmed.map((p) => p.doctorId)).size} note="Visiting consultants" />
        <Stat label="Practice links to confirm" value={toReview.length} note="Accepted by the doctor" tone={toReview.length ? 'warn' : undefined} />
      </Stats>

      <Card title="Branch requests" sub="Approving creates the branch listing and its staff login, and gives the admin who asked access to it">
        <PartnerQueue applications={requests} submittedLabels={labels} />
      </Card>

      <Card title="Hospital groups" sub="Branches that share an admin login">
        {access.error ? (
          <EmptyState icon={Building}>Run supabase/migrations/20261114_grow_and_manage.sql to start hospital branches.</EmptyState>
        ) : groups.length === 0 ? (
          <EmptyState icon={Building}>No hospital has more than one branch yet.</EmptyState>
        ) : (
          <Table min={640}>
            <thead>
              <tr>
                <th className={th}>Group</th>
                <th className={`${th} text-right`}>Branches</th>
                <th className={`${th} text-right`}>Doctors</th>
                <th className={`${th} text-right`}>Admins</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.ids.join()}>
                  <td className={td}>
                    <span className="block font-extrabold">{g.list[0].name}</span>
                    <span className="block text-[12px] text-[#5B667A]">{g.list.map((h) => [h.name === g.list[0].name ? null : h.name, h.city].filter(Boolean).join(', ') || h.name).join(' · ')}</span>
                  </td>
                  <td className={`${td} text-right tabular-nums font-bold`}>{g.ids.length}</td>
                  <td className={`${td} text-right tabular-nums`}>{g.doctors}</td>
                  <td className={`${td} text-right tabular-nums`}>{g.admins}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title="Doctor practice links" sub="Doctors who accepted an invitation from another hospital. Approving lets that hospital publish their slots at its address.">
        {!practicesReady ? (
          <EmptyState icon={Building}>Starts once supabase/migrations/20261115_executive_workspace.sql has run.</EmptyState>
        ) : toReview.length === 0 ? (
          <EmptyState icon={Building}>No practice links waiting.</EmptyState>
        ) : (
          <ul>
            {toReview.map((p) => {
              const d = docOf.get(p.doctorId)
              return (
                <li key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3.5 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-extrabold">{docName(p.doctorId)}</span>
                    <span className="block text-[12.5px] text-[#5B667A]">
                      {[d?.specialty, d?.registration_number ? `Reg. ${d.registration_number}` : 'No registration number', `from ${hospitalName(d?.hospital_id)}`].filter(Boolean).join(' · ')}
                    </span>
                    <span className="block text-[12.5px] text-[#5B667A]">
                      To consult at <strong className="text-[#0B1B3F]">{hospitalName(p.hospitalId)}</strong> · invited {formatShortDate(p.createdAt)}
                      {p.respondedAt ? ` · accepted ${formatShortDate(p.respondedAt)}` : ''}
                      {p.note ? ` · “${p.note}”` : ''}
                    </span>
                  </span>
                  <PracticeReview practiceId={p.id} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {confirmed.length > 0 && (
        <Card title="Visiting consultants" sub="Confirmed links; each visiting hospital publishes the doctor’s slots there">
          <Table min={620}>
            <thead>
              <tr>
                <th className={th}>Doctor</th>
                <th className={th}>Own hospital</th>
                <th className={th}>Also consults at</th>
                <th className={th}>Since</th>
              </tr>
            </thead>
            <tbody>
              {confirmed.map((p) => (
                <tr key={p.id}>
                  <td className={`${td} font-extrabold`}>{docName(p.doctorId)}</td>
                  <td className={td}>{hospitalName(docOf.get(p.doctorId)?.hospital_id)}</td>
                  <td className={td}>{hospitalName(p.hospitalId)}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    <span style={{ color: PRACTICE_STATUS.confirmed.color }} className="font-bold">
                      {p.reviewedAt ? formatShortDate(p.reviewedAt) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </ExePage>
  )
}
