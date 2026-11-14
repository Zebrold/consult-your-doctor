import type { Metadata } from 'next'
import { CalendarOff, CircleCheck } from 'lucide-react'
import { doctorName, formatSlot, istDateKey } from '@/components/patient/format'
import { LEAVE_REASONS, LEAVE_STATUS, leaveDates, leaveWindow, loadLeaves, type Leave } from '@/lib/leave'
import { currentTime, requireExecutivePage } from '../_lib/ops'
import { CallLink, Card, EmptyState, ExePage, Stat, Stats, Status, Table, plural, td, th } from '../_components/ui'

export const metadata: Metadata = { title: 'Doctor leave' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

/**
 * Doctor leave after DeskExeLeave: leave doctors asked for across the network, and the patients still booked on those
 * days. Hospitals approve leave and move bookings (app/actions/leave.ts); the team calls anyone left without a slot.
 */
export default async function ExecutiveLeavePage() {
  const { admin, profile } = await requireExecutivePage('leave')
  const now = currentTime()
  const today = istDateKey(now)
  const in30 = istDateKey(now + 30 * DAY)
  const { ready, leaves } = await loadLeaves(admin, {})

  if (!ready) {
    return (
      <ExePage name={profile.fullName} title="Doctor leave" subtitle="Leave doctors ask for, and the patients it affects">
        <Card title="Doctor leave isn’t switched on yet">
          <EmptyState icon={CalendarOff}>Run supabase/migrations/20261114_grow_and_manage.sql to start doctor leave.</EmptyState>
        </Card>
      </ExePage>
    )
  }

  const open = leaves.filter((l) => (l.status === 'pending' || l.status === 'approved') && l.endsOn >= today)
  const past = leaves.filter((l) => !open.includes(l) && l.status !== 'cancelled').sort((a, b) => b.startsOn.localeCompare(a.startsOn)).slice(0, 10)
  const doctorIds = [...new Set([...open, ...past].map((l) => l.doctorId))]
  const { data: doctorRows } = doctorIds.length
    ? await admin.from('doctors').select('id, specialty, profiles!doctors_profile_id_fkey ( full_name ), hospitals ( name, city )').in('id', doctorIds)
    : { data: [] }
  type D = { id: string; specialty: string | null; profiles: Joined<{ full_name: string | null }>; hospitals: Joined<{ name: string | null; city: string | null }> }
  const doc = new Map(((doctorRows ?? []) as unknown as D[]).map((d) => [d.id, d]))
  const nameOf = (l: Leave) => doctorName(one(doc.get(l.doctorId)?.profiles)?.full_name ?? 'Doctor')
  const hospitalOf = (l: Leave) => {
    const h = one(doc.get(l.doctorId)?.hospitals)
    return [h?.name, h?.city].filter(Boolean).join(', ') || '—'
  }

  // Bookings still confirmed on the leave days: the patients who need a new slot.
  const booked = new Map<string, { id: string; patient: string; phone: string | null; start: string }[]>()
  await Promise.all(
    open.map(async (l) => {
      const span = leaveWindow(l)
      const { data } = await admin
        .from('appointments')
        .select('id, patient:profiles!appointments_patient_id_fkey ( full_name, phone_number ), schedules!inner ( start_time )')
        .eq('doctor_id', l.doctorId)
        .eq('status', 'confirmed')
        .gte('schedules.start_time', span.from)
        .lt('schedules.start_time', span.to)
        .limit(500)
      type Row = { id: string; patient: Joined<{ full_name: string | null; phone_number: string | null }>; schedules: Joined<{ start_time: string }> }
      booked.set(
        l.id,
        ((data ?? []) as unknown as Row[])
          .map((r) => ({ id: r.id, patient: one(r.patient)?.full_name || 'Patient', phone: one(r.patient)?.phone_number ?? null, start: one(r.schedules)?.start_time ?? '' }))
          .sort((a, b) => a.start.localeCompare(b.start)),
      )
    }),
  )

  const onLeaveToday = open.filter((l) => l.status === 'approved' && l.startsOn <= today)
  const upcoming = open.filter((l) => l.startsOn > today && l.startsOn <= in30)
  const pending = open.filter((l) => l.status === 'pending')
  const toRebook = open
    .filter((l) => l.status === 'approved')
    .flatMap((l) => (booked.get(l.id) ?? []).map((b) => ({ ...b, doctor: nameOf(l) })))
    .sort((a, b) => a.start.localeCompare(b.start))

  const row = (l: Leave, live: boolean) => {
    const n = booked.get(l.id)?.length ?? 0
    return (
      <tr key={l.id}>
        <td className={td}>
          <span className="block font-extrabold">{nameOf(l)}</span>
          <span className="block text-[12px] text-[#5B667A]">{doc.get(l.doctorId)?.specialty ?? ''}</span>
        </td>
        <td className={`${td} max-w-[220px] truncate`}>{hospitalOf(l)}</td>
        <td className={`${td} whitespace-nowrap font-bold`}>{leaveDates(l, today)}</td>
        <td className={td}>{LEAVE_REASONS[l.reason]}</td>
        <td className={`${td} whitespace-nowrap`}>
          {!live ? (
            <span className="text-[#98A2B3]">—</span>
          ) : n === 0 ? (
            <span className="text-[#5B667A]">No bookings</span>
          ) : l.status === 'approved' ? (
            <Status label={`${plural(n, 'patient')} to move`} color="#B54708" />
          ) : (
            <span>{plural(n, 'patient')} booked</span>
          )}
        </td>
        <td className={td}>
          <Status label={l.status === 'pending' ? 'Waiting for hospital' : LEAVE_STATUS[l.status].label} color={LEAVE_STATUS[l.status].color} />
        </td>
      </tr>
    )
  }

  return (
    <ExePage name={profile.fullName} title="Doctor leave" subtitle="Leave doctors ask for, the patients it affects, and who still needs a new slot">
      <Stats>
        <Stat label="On leave today" value={onLeaveToday.length} note={onLeaveToday.length ? onLeaveToday.map(nameOf).join(', ') : 'Nobody'} />
        <Stat label="Upcoming leave" value={upcoming.length} note="Next 30 days" />
        <Stat label="Patients to rebook" value={toRebook.length} note="Need a call" tone={toRebook.length ? 'warn' : undefined} />
        <Stat label="Waiting for hospital" value={pending.length} note="Leave not yet approved" />
      </Stats>

      <Card title="Leave requests" sub="Hospitals approve leave and move booked patients; we make sure nobody is left without a slot">
        {open.length === 0 ? (
          <EmptyState icon={CalendarOff}>No leave coming up.</EmptyState>
        ) : (
          <Table min={860}>
            <thead>
              <tr>
                <th className={th}>Doctor</th>
                <th className={th}>Hospital</th>
                <th className={th}>Dates</th>
                <th className={th}>Reason</th>
                <th className={th}>Patients</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>{open.map((l) => row(l, true))}</tbody>
          </Table>
        )}
      </Card>

      <Card title="Patients still to rebook" sub="Still booked with a doctor whose leave is approved">
        {toRebook.length === 0 ? (
          <EmptyState icon={CircleCheck}>Every patient has been moved.</EmptyState>
        ) : (
          <ul>
            {toRebook.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
                <span className="min-w-0">
                  <span className="block text-[14px] font-extrabold">{p.patient}</span>
                  <span className="block text-[12.5px] text-[#5B667A]">
                    {p.doctor} · was {p.start ? formatSlot(p.start, now) : '—'}
                    {p.phone ? ` · ${p.phone}` : ''}
                  </span>
                </span>
                {p.phone ? <CallLink phone={p.phone} /> : <span className="text-[12px] text-[#5B667A]">No phone on file</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {past.length > 0 && (
        <Card title="Earlier leave" sub="The last ten, newest first">
          <Table min={860}>
            <thead>
              <tr>
                <th className={th}>Doctor</th>
                <th className={th}>Hospital</th>
                <th className={th}>Dates</th>
                <th className={th}>Reason</th>
                <th className={th}>Patients</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>{past.map((l) => row(l, false))}</tbody>
          </Table>
        </Card>
      )}
    </ExePage>
  )
}
