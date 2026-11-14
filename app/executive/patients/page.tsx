import type { Metadata } from 'next'
import { APPOINTMENT_STATUS_LABELS, LAB_STATUS_LABELS, buildAttentionItems, currentTime, loadAppointments, loadLabBookings, loadNetworkCounts, requireExecutivePage, timeAgo } from '../_lib/ops'
import { Card, ExePage, Line, Stat, Stats, count, plural } from '../_components/ui'
import { PatientCareQueue } from '../_components/PatientCareQueue'
import { PatientDirectory, type DirectoryRow } from '../_components/PatientDirectory'

export const metadata: Metadata = { title: 'Patients' }

/** Patients after DeskExePatients: stalled bookings to follow up, consultation outcomes, and everyone who has booked. */
export default async function ExecutivePatientsPage() {
  const { admin, profile } = await requireExecutivePage('patients')
  const [appointments, labBookings, network] = await Promise.all([loadAppointments(admin), loadLabBookings(admin), loadNetworkCounts(admin)])
  const now = currentTime()
  const monthAgo = now - 30 * 86_400_000

  const queue = buildAttentionItems({ appointments, labBookings, applications: [] }, now)
  const urgent = queue.filter((i) => i.severity === 'high').length

  // Outcomes of consultations booked in the last 30 days (excluding ones still awaiting payment).
  const recent = appointments.filter((a) => Date.parse(a.createdAt) >= monthAgo && a.status !== 'pending_payment')
  const cancelled = recent.filter((a) => a.status === 'cancelled').length
  const attended = recent.filter((a) => a.status === 'visited' || a.status === 'completed').length
  const missed = recent.filter((a) => a.status === 'confirmed' && a.startTime && Date.parse(a.startTime) < now).length
  const pct = (n: number) => (recent.length ? `${Math.round((n / recent.length) * 100)}%` : '—')

  const breakdown = [
    { label: 'Appointment not checked in', value: queue.filter((i) => i.status === 'Not checked in').length },
    { label: 'Consultation unpaid', value: queue.filter((i) => i.category === 'consultations' && i.status === 'Awaiting payment').length },
    { label: 'Lab visit overdue', value: queue.filter((i) => i.status === 'Visit overdue').length },
    { label: 'Lab test unpaid', value: queue.filter((i) => i.category === 'diagnostics' && i.status === 'Awaiting payment').length },
    { label: 'Lab report pending', value: queue.filter((i) => i.status === 'Report pending').length },
  ]

  // One row per patient who has booked anything, most recently active first.
  const directory = new Map<string, DirectoryRow>()
  const touch = (key: string, name: string, phone: string | null, at: string, status: string, kind: 'consultation' | 'lab') => {
    const row = directory.get(key) ?? { id: key, name, phone, consultations: 0, labTests: 0, lastActivity: at, lastActivityLabel: '', lastStatus: status }
    if (kind === 'consultation') row.consultations++
    else row.labTests++
    if (new Date(at) >= new Date(row.lastActivity)) {
      row.lastActivity = at
      row.lastStatus = status
    }
    directory.set(key, row)
  }
  for (const a of appointments) {
    if (a.patient) touch(a.patient.id, a.patient.name, a.patient.phone, a.createdAt, APPOINTMENT_STATUS_LABELS[a.status] ?? a.status, 'consultation')
  }
  for (const b of labBookings) {
    if (b.patient) touch(b.patient.id, b.patient.name, b.patient.phone, b.createdAt, LAB_STATUS_LABELS[b.status] ?? b.status, 'lab')
  }
  const patients = Array.from(directory.values())
    .map((p) => ({ ...p, lastActivityLabel: timeAgo(p.lastActivity, now) }))
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())

  return (
    <ExePage name={profile.fullName} title="Patients" subtitle="Patients whose bookings have stalled, with contact details so someone can follow up">
      <Stats>
        <Stat label="Registered patients" value={count(network.patients)} note={`${count(patients.length)} have booked care`} />
        <Stat label="Urgent follow-ups" value={urgent} note="Missed visits and overdue reports" tone={urgent ? 'high' : undefined} />
        <Stat label="Open follow-ups" value={queue.length} note="Consultations and labs" />
        <Stat label="Cancelled (30 days)" value={count(cancelled)} note={`Of ${plural(recent.length, 'consultation')}`} />
      </Stats>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] gap-3.5 lg:gap-5 items-start">
        <PatientCareQueue items={queue} />

        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <Card title="Consultation outcomes" sub="Last 30 days, excluding unpaid">
            <ul>
              <li>
                <Line label={<span className="font-bold">Consultations booked</span>} right={<strong className="tabular-nums">{count(recent.length)}</strong>} />
              </li>
              <li>
                <Line label={<span className="font-bold">Checked in or completed</span>} right={<strong className="tabular-nums">{count(attended)} · {pct(attended)}</strong>} />
              </li>
              <li>
                <Line label={<span className="font-bold">Missed</span>} right={<strong className="tabular-nums text-[#B54708]">{count(missed)} · {pct(missed)}</strong>} />
              </li>
              <li>
                <Line label={<span className="font-bold">Cancelled</span>} right={<strong className="tabular-nums">{count(cancelled)} · {pct(cancelled)}</strong>} />
              </li>
            </ul>
          </Card>

          <Card title="Follow-up breakdown" sub="Open cases by reason">
            <ul>
              {breakdown.map((r) => (
                <li key={r.label}>
                  <Line label={<span className="font-bold">{r.label}</span>} right={<strong className="tabular-nums">{plural(r.value, 'case')}</strong>} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card title="Patient directory" sub="Everyone who has booked a consultation or lab test, most recent first">
        <PatientDirectory patients={patients} />
      </Card>
    </ExePage>
  )
}
