import type { Metadata } from 'next'
import { doctorName, formatShortDate, istDateKey } from '@/components/patient/format'
import { liveBadgeIds } from '@/lib/badges'
import { currentTime, loadApplications, loadAppointments, loadDoctors, requireExecutivePage, timeAgo } from '../_lib/ops'
import { BarList, Card, ExePage, Initials, MoreLink, Note, Stat, Stats, Status, plural } from '../_components/ui'
import { CredentialQueue } from '../_components/CredentialQueue'
import { DoctorRoster, type RosterRow } from '../_components/DoctorRoster'
import { AddDoctorButton, type HospitalOption } from '../_components/NetworkForms'

export const metadata: Metadata = { title: 'Doctors' }

type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

/** Doctors after DeskExeDoctors: doctor applications to approve, who joined lately, and the roster with today's bookings. */
export default async function ExecutiveDoctorsPage() {
  const { admin, profile } = await requireExecutivePage('doctors')
  const now = currentTime()
  const nowIso = new Date(now).toISOString()

  const [doctors, applications, appointments, slotsResult, { data: hospitalRows }, badges, recentRes, weekRes] = await Promise.all([
    loadDoctors(admin),
    loadApplications(admin, { withDocuments: true }),
    loadAppointments(admin),
    admin.from('schedules').select('doctor_id, start_time').eq('is_booked', false).gte('start_time', nowIso),
    admin.from('hospitals').select('id, name, city').order('name'),
    liveBadgeIds(admin),
    admin.from('doctors').select('id, specialty, created_at, profiles!doctors_profile_id_fkey ( full_name ), hospitals ( name )').order('created_at', { ascending: false }).limit(5),
    admin.from('doctors').select('id', { count: 'exact', head: true }).gte('created_at', new Date(now - 7 * 86_400_000).toISOString()),
  ])
  const hospitals = (hospitalRows ?? []) as HospitalOption[]
  const todayKey = istDateKey(now)
  const monthAgo = now - 30 * 86_400_000

  const openSlots = new Map<string, number>()
  const openToday = new Set<string>()
  for (const s of (slotsResult.data ?? []) as { doctor_id: string; start_time: string }[]) {
    openSlots.set(s.doctor_id, (openSlots.get(s.doctor_id) ?? 0) + 1)
    if (istDateKey(s.start_time) === todayKey) openToday.add(s.doctor_id)
  }

  const todayByDoctor = new Map<string, number>()
  const demand = new Map<string, number>()
  for (const apt of appointments) {
    if (!apt.doctor || apt.status === 'cancelled') continue
    if (apt.startTime && istDateKey(apt.startTime) === todayKey) todayByDoctor.set(apt.doctor.id, (todayByDoctor.get(apt.doctor.id) ?? 0) + 1)
    if (Date.parse(apt.createdAt) >= monthAgo) demand.set(apt.doctor.specialty, (demand.get(apt.doctor.specialty) ?? 0) + 1)
  }

  const verified = new Set(badges.doctors)
  const roster: RosterRow[] = doctors
    .map((d) => ({ ...d, todayCount: todayByDoctor.get(d.id) ?? 0, openSlots: openSlots.get(d.id) ?? 0, verified: verified.has(d.id) }))
    .sort((a, b) => b.todayCount - a.todayCount || a.name.localeCompare(b.name))

  const specialties = Array.from(new Set(doctors.map((d) => d.specialty))).sort()
  const pending = applications.filter((a) => a.status === 'pending').sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  const decided = applications.filter((a) => a.status !== 'pending').slice(0, 5)
  const withHospital = doctors.filter((d) => d.hospital).length
  const demandRows = Array.from(demand.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value, display: plural(value, 'booking') }))
  const submittedLabels = Object.fromEntries(pending.map((a) => [a.id, timeAgo(a.createdAt, now)]))

  type RecentRow = { id: string; specialty: string | null; created_at: string | null; profiles: Joined<{ full_name: string | null }>; hospitals: Joined<{ name: string | null }> }
  const recent = ((recentRes.data ?? []) as unknown as RecentRow[]).filter((r) => r.created_at)

  return (
    <ExePage name={profile.fullName} title="Doctors" subtitle="Every doctor on the network, and the ones who signed up on their own waiting for approval" actions={<AddDoctorButton hospitals={hospitals} />}>
      <Stats>
        <Stat label="Doctors on network" value={doctors.length.toLocaleString('en-IN')} note={`${withHospital} at a hospital · ${plural(specialties.length, 'specialty', 'specialties')}`} />
        <Stat label="Doctor applications" value={pending.length} note={pending.length ? `Oldest waiting ${timeAgo(pending[0].createdAt, now)}` : 'Queue is clear'} tone={pending.length ? 'warn' : undefined} />
        <Stat label="Joined this week" value={weekRes.count ?? 0} note="New doctor accounts, last 7 days" />
        <Stat label="Bookable today" value={openToday.size} note="With open slots today" tone="blue" />
      </Stats>

      <Note>Doctors a hospital adds from its own workspace go live straight away; the hospital creates their login. Doctors who sign up on their own come to this queue.</Note>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3.5 lg:gap-5 items-start">
        <Card id="applications" title="Doctor applications" sub="Check the registration with the medical council before approving" right={pending.length ? <Status label={`${pending.length} to review`} color="#B54708" /> : undefined}>
          <CredentialQueue applications={pending} submittedLabels={submittedLabels} />
        </Card>

        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <Card title="Recently joined" sub="The newest doctor accounts">
            {recent.length === 0 ? (
              <p className="text-[13px] text-[#5B667A]">No doctors yet.</p>
            ) : (
              <ul>
                {recent.map((r) => {
                  const name = one(r.profiles)?.full_name ?? 'Doctor'
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-2.5 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
                      <Initials name={name} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] font-extrabold truncate">{doctorName(name)}</span>
                        <span className="block text-[12px] text-[#5B667A] truncate">{[r.specialty, one(r.hospitals)?.name].filter(Boolean).join(' · ') || '—'}</span>
                      </span>
                      <span className="shrink-0 text-[12px] text-[#5B667A]">{formatShortDate(r.created_at!)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {decided.length > 0 && (
            <Card title="Recent decisions">
              <ul>
                {decided.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-extrabold truncate">{a.name}</span>
                      <span className="block text-[12px] text-[#5B667A] truncate">{[a.specialty, a.hospitalName, `applied ${formatShortDate(a.createdAt)}`].filter(Boolean).join(' · ')}</span>
                    </span>
                    <Status label={a.status === 'approved' ? 'Approved' : 'Rejected'} color={a.status === 'approved' ? '#2A4DD0' : '#B42318'} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Demand by specialty" sub="Consultations booked in the last 30 days">
            {demandRows.length === 0 ? <p className="text-[13px] text-[#5B667A]">No bookings in the last 30 days.</p> : <BarList rows={demandRows} />}
          </Card>
        </div>
      </div>

      <Card title="Doctor roster and availability" sub="Today’s bookings and open future slots" right={<MoreLink href="/executive/leave">Doctor leave</MoreLink>}>
        <DoctorRoster doctors={roster} specialties={specialties} />
      </Card>
    </ExePage>
  )
}
