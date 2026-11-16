import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { formatShortDate } from '@/components/patient/format'
import { liveBadgeIds } from '@/lib/badges'
import { currentTime, groupHospitals, loadPartnerApplications, requireExecutivePage, timeAgo } from '../_lib/ops'
import { Card, EmptyState, ExePage, MoreLink, Note, Stat, Stats, Status, Table, Verified, btnSmall, plural, td, th } from '../_components/ui'
import { AddHospitalButton, AddLoginButton } from '../_components/NetworkForms'
import { PartnerQueue } from '../_components/PartnerQueue'

export const metadata: Metadata = { title: 'Hospitals' }

type HospitalRow = {
  id: string
  name: string
  city: string | null
  address: string | null
  status: string | null
  hospital_code: string | null
  created_at: string | null
}

/** Hospitals after DeskExeHospitals: applications to review, and every hospital with its doctors, login and badge. */
export default async function ExecutiveHospitalsPage() {
  const { admin, profile } = await requireExecutivePage('hospitals')

  const [{ data: hospitalRows }, { data: doctorRows }, { data: loginRows }, applications, badges, bedsRes, accessRes, { data: adminRows }] = await Promise.all([
    admin.from('hospitals').select('id, name, city, address, status, hospital_code, created_at').order('name'),
    admin.from('doctors').select('hospital_id'),
    admin.from('profiles').select('hospital_id, staff_id').eq('role', 'hospital_admin'),
    loadPartnerApplications(admin, 'hospital', { withDocuments: true }),
    liveBadgeIds(admin),
    admin.from('hospital_beds').select('hospital_id').limit(50000),
    admin.from('hospital_admin_access').select('profile_id, hospital_id').limit(10000),
    admin.from('profiles').select('id, hospital_id').eq('role', 'hospital_admin').limit(10000),
  ])
  const now = currentTime()
  // Oldest first, so the longest wait is reviewed first.
  const pendingApplications = applications.filter((a) => a.status === 'pending').reverse()
  const appliedLabels = Object.fromEntries(pendingApplications.map((a) => [a.id, timeAgo(a.createdAt, now)]))

  const doctorCount = new Map<string, number>()
  for (const d of (doctorRows ?? []) as { hospital_id: string | null }[]) {
    if (d.hospital_id) doctorCount.set(d.hospital_id, (doctorCount.get(d.hospital_id) ?? 0) + 1)
  }
  const logins = new Map<string, string[]>()
  for (const p of (loginRows ?? []) as { hospital_id: string | null; staff_id: string | null }[]) {
    if (p.hospital_id) logins.set(p.hospital_id, [...(logins.get(p.hospital_id) ?? []), p.staff_id ?? '—'])
  }
  const verified = new Set(badges.hospitals)

  const hospitals = (hospitalRows ?? []) as HospitalRow[]
  // Beds per hospital and branches per group; each shows "—" when its table can't be read (migrations 20261009, 20261114).
  const bedCount = new Map<string, number>()
  for (const b of (bedsRes.error ? [] : (bedsRes.data ?? [])) as { hospital_id: string }[]) bedCount.set(b.hospital_id, (bedCount.get(b.hospital_id) ?? 0) + 1)
  const { groupOf } = groupHospitals(
    hospitals.map((h) => h.id),
    (adminRows ?? []) as { id: string; hospital_id: string | null }[],
    (accessRes.error ? [] : (accessRes.data ?? [])) as { profile_id: string; hospital_id: string }[],
  )
  const live = hospitals.filter((h) => h.status === 'active').length
  const cities = new Set(hospitals.map((h) => h.city).filter(Boolean))
  const totalDoctors = Array.from(doctorCount.values()).reduce((a, b) => a + b, 0)
  const oldest = pendingApplications[0]

  return (
    <ExePage name={profile.fullName} title="Hospitals" subtitle="Review hospital applications, create their login, and see which hospitals are live" actions={<AddHospitalButton />}>
      <Stats>
        <Stat label="Hospitals" value={hospitals.length} note={`In ${plural(cities.size, 'city', 'cities')}`} />
        <Stat label="Live for booking" value={live} note={`${hospitals.length - live} not listed`} tone="blue" />
        <Stat label="Applications to review" value={pendingApplications.length} note={oldest ? `Oldest from ${formatShortDate(oldest.createdAt)}` : 'None waiting'} tone={pendingApplications.length ? 'warn' : undefined} />
        <Stat label="Doctors" value={totalDoctors} note="Across all hospitals" />
      </Stats>

      <Card id="applications" title="Hospital applications" sub="New hospitals and branches that asked to join. Approving adds the hospital and its staff login, and emails the applicant their staff ID.">
        <PartnerQueue applications={pendingApplications} submittedLabels={appliedLabels} />
        {pendingApplications.length > 0 && (
          <div className="mt-4">
            <Note>Doctors that a hospital adds afterwards go live without a second approval.</Note>
          </div>
        )}
      </Card>

      <Card title="All hospitals" sub="Each hospital’s staff manage their own listing, doctors, slots and payments" right={<MoreLink href="/executive/branches">Branches &amp; practices</MoreLink>}>
        {hospitals.length === 0 ? (
          <EmptyState icon={Building2}>No hospitals yet. Add the first one to start taking bookings.</EmptyState>
        ) : (
          <Table min={1080}>
            <thead>
              <tr>
                <th className={th}>Hospital</th>
                <th className={th}>Hospital ID</th>
                <th className={th}>Branches</th>
                <th className={th}>Doctors</th>
                <th className={th}>Beds</th>
                <th className={th}>Booking</th>
                <th className={th}>Badge</th>
                <th className={th}>Staff login</th>
                <th className={th}>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((h) => {
                const staff = logins.get(h.id)
                return (
                  <tr key={h.id}>
                    <td className={td}>
                      <span className="block font-extrabold">{h.name}</span>
                      <span className="block text-[12px] text-[#5B667A] truncate max-w-[320px]">{[h.address, h.city].filter(Boolean).join(', ') || '—'}</span>
                    </td>
                    <td className={`${td} font-mono text-[12.5px]`}>{h.hospital_code ?? '—'}</td>
                    <td className={`${td} whitespace-nowrap`}>{accessRes.error ? '—' : plural(groupOf(h.id).length, 'branch', 'branches')}</td>
                    <td className={`${td} tabular-nums font-bold`}>{doctorCount.get(h.id) ?? 0}</td>
                    <td className={`${td} tabular-nums`}>{bedsRes.error ? '—' : (bedCount.get(h.id) ?? 0)}</td>
                    <td className={td}>
                      {!staff?.length ? <Status label="No login yet" color="#B54708" /> : h.status === 'active' ? <Status label="Live" color="#2A4DD0" /> : <Status label="Not listed" color="#5B667A" />}
                    </td>
                    <td className={td}>
                      {verified.has(h.id) ? (
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#2A4DD0]">
                          <Verified size={17} /> Verified
                        </span>
                      ) : (
                        <span className="text-[#98A2B3]">—</span>
                      )}
                    </td>
                    <td className={td}>{staff?.length ? <span className="font-mono text-[12.5px]">{staff.join(', ')}</span> : <AddLoginButton kind="hospital" id={h.id} name={h.name} />}</td>
                    <td className={`${td} text-right`}>
                      <Link href={`/executive/hospitals/${h.id}`} className={btnSmall} aria-label={`Open ${h.name}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </ExePage>
  )
}
