import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BedDouble, Building2, Stethoscope } from 'lucide-react'
import { istDateKey } from '@/components/patient/format'
import { badgeState, liveBadgeIds, loadBadges } from '@/lib/badges'
import { loadHospitalBeds, summarizeBeds, wardSummaries } from '@/lib/beds'
import { branchPeople } from '@/lib/branches'
import { doctorPauses } from '@/lib/doctor-pause'
import { monthSoFar } from '@/lib/report-stats'
import { loadHospitalWallet } from '@/lib/wallet'
import { loadHospitalDoctors } from '@/app/hospital/_lib/hospital'
import { PAID_APPOINTMENT_STATUSES, currentTime, formatDate, formatINR, requireExecutivePage } from '../../_lib/ops'
import { canOpen } from '../../_lib/access'
import { BarList, Card, Chip, EmptyState, ExePage, Line, Stat, Stats, Status, Verified, btnSmall, plural } from '../../_components/ui'

export const metadata: Metadata = { title: 'Hospital' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type HospitalRecord = {
  id: string
  name: string
  city: string | null
  address: string | null
  status: string | null
  hospital_code: string | null
  created_at: string | null
  contact_email: string | null
  phone: string | null
  emergency_phone: string | null
}

/**
 * One hospital for the operations team: its profile, doctors, beds, this month's bookings, badge and branches, and its
 * wallet when the team may open Wallets. Everything here is read from the database; nothing is filled in.
 */
export default async function ExecutiveHospitalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { admin, profile, access } = await requireExecutivePage('hospitals')
  if (!UUID.test(id)) notFound()

  const { data: row } = await admin.from('hospitals').select('*').eq('id', id).maybeSingle()
  if (!row) notFound()
  const h = row as HospitalRecord

  const now = currentTime()
  const monthStart = new Date(`${monthSoFar(istDateKey(now)).month}-01T00:00:00+05:30`).toISOString()
  const canSeeWallet = canOpen(access, 'wallets')
  const thisMonth = () => admin.from('appointments').select('id', { count: 'exact', head: true }).eq('hospital_id', id).neq('status', 'cancelled').gte('created_at', monthStart)

  const [doctors, bedsRes, bookedRes, paidRes, badgeRes, people, wallet] = await Promise.all([
    loadHospitalDoctors(admin, id),
    loadHospitalBeds(admin, id),
    thisMonth(),
    thisMonth().in('status', PAID_APPOINTMENT_STATUSES),
    loadBadges(admin, { hospitalId: id }),
    branchPeople(admin, [id]),
    canSeeWallet ? loadHospitalWallet(admin, id, 1) : Promise.resolve(null),
  ])

  const [pauses, live] = await Promise.all([doctorPauses(admin, doctors.map((d) => d.id)), liveBadgeIds(admin)])
  const verifiedDoctors = new Set(live.doctors)

  // Beds are real only when they come from the database (the local fallback store isn't).
  const bedsKnown = bedsRes.ready && bedsRes.persistedInDb !== false
  const beds = bedsKnown ? bedsRes.data : []
  const bedSummary = summarizeBeds(beds)
  const wards = wardSummaries(beds)

  const badge = badgeRes.ready ? badgeState(badgeRes.badges, now) : null

  // Other hospitals the admins here also reach (branches), with their names.
  const staffLogins = people.filter((p) => p.signedInTo === id)
  const otherIds = new Set<string>()
  for (const p of people) if (p.signedInTo && p.signedInTo !== id) otherIds.add(p.signedInTo)
  if (people.length) {
    const { data: links } = await admin.from('hospital_admin_access').select('profile_id, hospital_id').in('profile_id', people.map((p) => p.id)).limit(2000)
    for (const l of (links ?? []) as { hospital_id: string }[]) if (l.hospital_id !== id) otherIds.add(l.hospital_id)
  }
  const { data: branchRows } = otherIds.size ? await admin.from('hospitals').select('id, name, city').in('id', [...otherIds]).order('name') : { data: [] }
  const branches = (branchRows ?? []) as { id: string; name: string; city: string | null }[]

  const booked = bookedRes.error ? null : (bookedRes.count ?? 0)
  const paid = paidRes.error ? null : (paidRes.count ?? 0)
  const listed = h.status === 'active'

  return (
    <ExePage
      name={profile.fullName}
      title={h.name}
      subtitle={[h.hospital_code, h.city].filter(Boolean).join(' · ') || 'Hospital'}
      actions={
        <Link href="/executive/hospitals" className={btnSmall}>
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden /> Hospitals
        </Link>
      }
    >
      <Stats>
        <Stat label="Doctors" value={doctors.length} note={doctors.length ? (pauses.ready ? `${doctors.filter((d) => pauses.byId.get(d.id)?.paused).length} paused` : 'At this hospital') : 'None added yet'} />
        <Stat label="Beds occupied" value={bedsKnown ? `${bedSummary.occupied}/${bedSummary.total}` : '—'} note={bedsKnown ? (bedSummary.total ? `${bedSummary.occupancy}% occupancy` : 'No beds listed') : 'Beds not set up yet'} tone="blue" />
        <Stat label="Bookings this month" value={booked ?? '—'} note={paid == null ? undefined : `${paid} paid`} />
        <Stat
          label="Wallet balance"
          value={!canSeeWallet ? '—' : wallet?.ready ? formatINR(wallet.balance) : '—'}
          note={!canSeeWallet ? 'Finance team only' : wallet?.ready ? (wallet.waiting ? `${formatINR(wallet.waiting)} withdrawal waiting` : 'Their share of bookings') : 'Wallets not set up yet'}
          tone={canSeeWallet && wallet?.ready && wallet.balance < 0 ? 'high' : 'blue'}
        />
      </Stats>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 lg:gap-5 items-start">
        <Card title="Profile" sub="As the hospital listed it">
          <Line label="Booking" right={listed ? <Status label="Live" color="#2A4DD0" /> : <Status label="Not listed" color="#5B667A" />} />
          <Line label="Hospital ID" right={<span className="font-mono text-[12.5px]">{h.hospital_code ?? '—'}</span>} />
          <Line label="Address" sub={[h.address, h.city].filter(Boolean).join(', ') || '—'} />
          <Line label="Phone" right={h.phone ?? '—'} />
          {h.emergency_phone && <Line label="Emergency phone" right={h.emergency_phone} />}
          <Line label="Contact email" right={<span className="break-all">{h.contact_email ?? '—'}</span>} />
          <Line label="Joined" right={formatDate(h.created_at)} />
          <Line
            label="Staff login"
            right={staffLogins.length ? <span className="font-mono text-[12.5px]">{staffLogins.map((p) => p.staffId ?? '—').join(', ')}</span> : <span className="text-[#B54708] font-extrabold">No login yet</span>}
          />
        </Card>

        <Card title="Verified badge" sub="Paid and approved by the team">
          {!badge ? (
            <p className="text-[13px] text-[#5B667A]">Badges aren’t set up yet.</p>
          ) : badge.live ? (
            <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#2A4DD0]">
              <Verified size={20} /> Verified until {formatDate(badge.live.endsAt)}
            </div>
          ) : badge.inReview ? (
            <Chip tone="amber">In review</Chip>
          ) : badge.awaiting ? (
            <Chip tone="neutral">Waiting for payment</Chip>
          ) : (
            <p className="text-[13px] text-[#5B667A]">No badge.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 lg:gap-5 items-start">
        <Card title="Doctors" sub={plural(doctors.length, 'doctor') + ' at this hospital'}>
          {doctors.length === 0 ? (
            <EmptyState icon={Stethoscope}>No doctors added yet.</EmptyState>
          ) : (
            doctors.map((d) => (
              <Line
                key={d.id}
                label={
                  <span className="inline-flex items-center gap-1.5">
                    {d.name}
                    {verifiedDoctors.has(d.id) && <Verified size={16} />}
                  </span>
                }
                sub={d.department}
                right={
                  <span className="inline-flex items-center gap-2">
                    {pauses.byId.get(d.id)?.paused && <Chip tone="amber">Paused</Chip>}
                    <span className="font-extrabold tabular-nums">{d.fee != null ? formatINR(d.fee) : '—'}</span>
                  </span>
                }
              />
            ))
          )}
        </Card>

        <div className="flex flex-col gap-3.5 lg:gap-5">
          <Card title="Beds by ward" sub={bedsKnown ? `${bedSummary.total} beds, ${bedSummary.occupied} occupied` : undefined}>
            {!bedsKnown || wards.length === 0 ? (
              <EmptyState icon={BedDouble}>{bedsKnown ? 'No beds listed.' : 'Beds aren’t set up yet.'}</EmptyState>
            ) : (
              <BarList rows={wards.map((w) => ({ label: w.ward, value: w.occupied, display: `${w.occupied} of ${w.total} occupied` }))} />
            )}
          </Card>

          <Card title="Branches" sub="Other hospitals the same staff logins reach">
            {branches.length === 0 ? (
              <EmptyState icon={Building2}>No branches. This hospital has its own login.</EmptyState>
            ) : (
              branches.map((b) => (
                <Line key={b.id} label={b.name} sub={b.city ?? undefined} right={<Link href={`/executive/hospitals/${b.id}`} className={btnSmall}>Open</Link>} />
              ))
            )}
          </Card>
        </div>
      </div>
    </ExePage>
  )
}
