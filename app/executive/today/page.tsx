import type { Metadata } from 'next'
import { ClipboardList } from 'lucide-react'
import { ExecutiveStatusSelect } from '@/components/ExecutiveStatusSelect'
import { IST, doctorName, formatTime, istDateKey } from '@/components/patient/format'
import { LAB_STATUS_LABELS, currentTime, formatDateTime, loadAppointments, loadLabBookings, requireExecutivePage } from '../_lib/ops'
import { Card, EmptyState, ExePage, Meter, Stat, Stats } from '../_components/ui'
import { CheckinBoard, type CheckinRow } from '../_components/CheckinBoard'

export const metadata: Metadata = { title: 'Check-ins' }

const LATE_MS = 15 * 60_000

/**
 * Check-ins after DeskExeCheckins: every appointment and lab visit today across the network. Executives check in
 * patients at their own branch (verifyAndCheckInPatient checks the branch); the rest is for following up.
 */
export default async function ExecutiveCheckinsPage() {
  const { user, profile, admin } = await requireExecutivePage('today')
  const now = currentTime()
  const todayKey = istDateKey(now)
  const [appointments, labBookings] = await Promise.all([loadAppointments(admin), loadLabBookings(admin)])

  const consults = appointments.filter((a) => a.startTime && istDateKey(a.startTime) === todayKey && a.status !== 'cancelled' && a.status !== 'pending_payment')
  const labs = labBookings.filter((b) => b.preferredDate && istDateKey(b.preferredDate) === todayKey && b.status !== 'cancelled' && b.status !== 'pending_payment')

  const rows: CheckinRow[] = [
    ...consults.map((a): CheckinRow => {
      const start = Date.parse(a.startTime!)
      const checked = a.status === 'visited' || a.status === 'completed'
      const state = checked ? 'in' : a.status !== 'confirmed' ? 'other' : start < now - LATE_MS ? 'late' : 'expected'
      const bare = (a.doctor?.name ?? 'Doctor').replace(/^(?:dr(?:\.\s*|\s+))+/i, '')
      return {
        id: a.id,
        kind: 'consultation',
        time: formatTime(a.startTime!),
        sort: start,
        patient: a.patient?.name ?? 'Patient',
        phone: a.patient?.phone ?? null,
        what: a.doctor ? `${doctorName(a.doctor.name)} · ${a.doctor.specialty}` : 'Doctor',
        where: [a.hospital?.name, a.hospital?.city].filter(Boolean).join(', ') || '—',
        status: a.status,
        state,
        checkIn: profile.hospitalId && a.hospitalId === profile.hospitalId && a.status === 'confirmed' ? { doctorName: bare, department: a.doctor?.specialty ?? 'General' } : undefined,
      }
    }),
    ...labs.map(
      (b): CheckinRow => ({
        id: b.id,
        kind: 'lab',
        time: 'Any time',
        sort: Number.MAX_SAFE_INTEGER,
        patient: b.patient?.name ?? 'Patient',
        phone: b.patient?.phone ?? null,
        what: b.testName,
        where: b.center?.name ?? 'Lab',
        status: LAB_STATUS_LABELS[b.status] ?? b.status,
        state: b.status === 'visited' || b.status === 'report_sent' ? 'in' : b.status === 'confirmed' ? 'expected' : 'other',
      }),
    ),
  ].sort((a, b) => a.sort - b.sort)

  const checkedIn = rows.filter((r) => r.state === 'in').length
  const expected = rows.filter((r) => r.state === 'expected').length
  const late = rows.filter((r) => r.state === 'late').length

  // Consultations checked in so far, by hospital.
  const byHospital = new Map<string, { done: number; total: number }>()
  for (const a of consults) {
    const name = a.hospital?.name ?? 'Hospital'
    const h = byHospital.get(name) ?? { done: 0, total: 0 }
    h.total++
    if (a.status === 'visited' || a.status === 'completed') h.done++
    byHospital.set(name, h)
  }
  const hospitals = Array.from(byHospital.entries()).sort((a, b) => b[1].total - a[1].total)

  const assigned = appointments.filter((a) => a.executiveId === user.id && a.status !== 'completed' && a.status !== 'cancelled').slice(0, 20)
  const dateLine = new Date(now).toLocaleDateString('en-GB', { timeZone: IST, weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <ExePage name={profile.fullName} title="Check-ins" subtitle={`${dateLine} · every appointment and lab visit across the network`}>
      <Stats>
        <Stat label="Appointments today" value={rows.length} note={`${consults.length} consultations · ${labs.length} lab`} />
        <Stat label="Checked in" value={checkedIn} note={rows.length ? `${Math.round((checkedIn / rows.length) * 100)}% so far` : 'Nothing yet'} tone="blue" />
        <Stat label="Expected" value={expected} note="Later today" />
        <Stat label="Running late" value={late} note="More than 15 min past slot" tone={late ? 'warn' : undefined} />
      </Stats>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-3.5 lg:gap-5 items-start">
        <Card
          title="Today’s schedule"
          sub={profile.hospitalId ? `You can check in patients at ${profile.hospitalName ?? 'your branch'}. Ask for the booking ID when they arrive.` : 'Your account isn’t linked to a branch, so you can’t check patients in.'}
        >
          <CheckinBoard rows={rows} />
        </Card>

        <Card title="Checked in by hospital" sub="So far today">
          {hospitals.length === 0 ? (
            <p className="text-[13px] text-[#5B667A]">No consultations today.</p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {hospitals.map(([name, h]) => (
                <li key={name}>
                  <span className="flex items-center justify-between gap-3 mb-1.5 text-[13px]">
                    <span className="font-bold truncate">{name}</span>
                    <span className="shrink-0 font-extrabold tabular-nums">
                      {h.done} of {h.total}
                    </span>
                  </span>
                  <Meter pct={(h.done / h.total) * 100} label={`${h.done} of ${h.total} checked in`} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Assigned to you" sub="Appointments you handled. Update them as patients move through their visit.">
        {assigned.length === 0 ? (
          <EmptyState icon={ClipboardList}>Nothing assigned to you right now.</EmptyState>
        ) : (
          <ul>
            {assigned.map((apt) => (
              <li key={apt.id} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 py-3 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-extrabold">{apt.patient?.name ?? 'Patient'}</span>
                  <span className="block text-[12px] text-[#5B667A]">{apt.patient?.phone ?? 'No phone on file'}</span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13.5px] font-bold">{apt.doctor ? doctorName(apt.doctor.name) : 'Doctor'}</span>
                  <span className="block text-[12px] text-[#5B667A]">{apt.doctor?.specialty}</span>
                </span>
                <span className="flex-1 text-[13px]">{formatDateTime(apt.startTime)}</span>
                <ExecutiveStatusSelect appointmentId={apt.id} currentStatus={apt.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </ExePage>
  )
}
