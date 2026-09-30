import type { Metadata } from 'next'
import { Activity, AlertTriangle, CalendarX, PieChart, UserRound, Users } from 'lucide-react'
import {
  APPOINTMENT_STATUS_LABELS,
  LAB_STATUS_LABELS,
  buildAttentionItems,
  currentTime,
  loadAppointments,
  loadLabBookings,
  loadNetworkCounts,
  requireExecutive,
  timeAgo,
} from '../_lib/ops'
import { BarList, MetricCard, PageHeader, Panel } from '../_components/ui'
import { PatientCareQueue } from '../_components/PatientCareQueue'
import { PatientDirectory, type DirectoryRow } from '../_components/PatientDirectory'

export const metadata: Metadata = { title: 'Patient Care' }

export default async function ExecutivePatientsPage() {
  const { admin } = await requireExecutive()
  const [appointments, labBookings, network] = await Promise.all([loadAppointments(admin), loadLabBookings(admin), loadNetworkCounts(admin)])
  const now = currentTime()
  const monthAgo = now - 30 * 86_400_000

  const queue = buildAttentionItems({ appointments, labBookings, applications: [] }, now)
  const urgent = queue.filter((i) => i.severity === 'high').length

  // Outcomes of consultations booked in the last 30 days (excluding ones still awaiting payment).
  const recent = appointments.filter((a) => new Date(a.createdAt).getTime() >= monthAgo && a.status !== 'pending_payment')
  const cancelled = recent.filter((a) => a.status === 'cancelled').length
  const attended = recent.filter((a) => a.status === 'visited' || a.status === 'completed').length
  const attendedPct = recent.length ? Math.round((attended / recent.length) * 100) : 0

  const breakdown = [
    { label: 'Appointment not checked in', value: queue.filter((i) => i.status === 'Not checked in').length },
    { label: 'Consultation unpaid', value: queue.filter((i) => i.category === 'consultations' && i.status === 'Awaiting payment').length },
    { label: 'Lab visit overdue', value: queue.filter((i) => i.status === 'Visit overdue').length },
    { label: 'Lab test unpaid', value: queue.filter((i) => i.category === 'diagnostics' && i.status === 'Awaiting payment').length },
    { label: 'Lab report pending', value: queue.filter((i) => i.status === 'Report pending').length },
  ].map((r) => ({ ...r, display: `${r.value} case${r.value === 1 ? '' : 's'}` }))

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
    <>
      <PageHeader
        eyebrow="Patient Care"
        title="Patient Care & Follow-up"
        description="Patients whose bookings have stalled (unpaid, missed or overdue), with their contact details so someone can follow up, plus a directory of everyone who has booked."
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <MetricCard label="Registered patients" value={network.patients.toLocaleString('en-IN')} icon={Users} tone="primary" footer={<span>{patients.length} have booked care</span>} />
        <MetricCard label="Urgent follow-ups" value={urgent} icon={AlertTriangle} tone="coral" footer={<span>Missed appointments &amp; overdue lab visits</span>} />
        <MetricCard label="Open follow-ups" value={queue.length} icon={Activity} tone="blue" footer={<span>Across consultations &amp; labs</span>} />
        <MetricCard label="Cancelled (30 days)" value={cancelled} icon={CalendarX} tone="neutral" footer={<span>Of {recent.length} consultations booked</span>} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <div className="lg:col-span-8">
          <PatientCareQueue items={queue} />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-stack-md">
          <Panel title="Consultation Outcomes" icon={PieChart} description="Consultations booked in the last 30 days, excluding unpaid ones.">
            <div className="flex items-center gap-5 bg-surface-container-low/60 p-4 rounded-xl">
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
                  <path className="text-surface-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path className="text-fresh-teal" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${attendedPct}, 100`} strokeLinecap="round" strokeWidth="3.5" />
                </svg>
                <span className="absolute font-title-md text-lg font-bold text-indigo-gray-900">{attendedPct}%</span>
              </div>
              <div>
                <p className="font-label-sm text-label-sm font-semibold text-indigo-gray-900">Attended</p>
                <p className="font-label-sm text-[11px] text-indigo-gray-600 leading-snug">
                  {attended} of {recent.length} consultations were checked in or completed. {cancelled} cancelled.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Follow-up Breakdown" icon={UserRound} description="Open cases by reason.">
            <BarList rows={breakdown} tone="coral" />
          </Panel>
        </div>
      </div>

      <Panel title="Patient Directory" icon={Users} description="Everyone who has booked a consultation or lab test, most recent first.">
        <PatientDirectory patients={patients} />
      </Panel>
    </>
  )
}
