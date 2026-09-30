import type { Metadata } from 'next'
import { BadgeCheck, BarChart3, ClipboardList, History, IndianRupee, Stethoscope, Users } from 'lucide-react'
import { currentTime, formatDate, loadApplications, loadAppointments, loadDoctors, requireExecutive, timeAgo } from '../_lib/ops'
import { BarList, Chip, MetricCard, PageHeader, Panel } from '../_components/ui'
import { CredentialQueue } from '../_components/CredentialQueue'
import { DoctorRoster, type RosterRow } from '../_components/DoctorRoster'

export const metadata: Metadata = { title: 'Doctor Network & Credentialing' }

export default async function ExecutiveDoctorsPage() {
  const { admin } = await requireExecutive()
  const now = currentTime()
  const nowIso = new Date(now).toISOString()

  const [doctors, applications, appointments, slotsResult] = await Promise.all([
    loadDoctors(admin),
    loadApplications(admin),
    loadAppointments(admin),
    admin.from('schedules').select('doctor_id').eq('is_booked', false).gte('start_time', nowIso),
  ])

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const tomorrow = today.getTime() + 86_400_000
  const monthAgo = now - 30 * 86_400_000

  const openSlots = new Map<string, number>()
  for (const s of (slotsResult.data ?? []) as { doctor_id: string }[]) {
    openSlots.set(s.doctor_id, (openSlots.get(s.doctor_id) ?? 0) + 1)
  }

  const todayByDoctor = new Map<string, number>()
  const demand = new Map<string, number>()
  for (const apt of appointments) {
    if (!apt.doctor || apt.status === 'cancelled') continue
    const start = apt.startTime ? new Date(apt.startTime).getTime() : null
    if (start && start >= today.getTime() && start < tomorrow) {
      todayByDoctor.set(apt.doctor.id, (todayByDoctor.get(apt.doctor.id) ?? 0) + 1)
    }
    if (new Date(apt.createdAt).getTime() >= monthAgo) {
      demand.set(apt.doctor.specialty, (demand.get(apt.doctor.specialty) ?? 0) + 1)
    }
  }

  const roster: RosterRow[] = doctors
    .map((d) => ({ ...d, todayCount: todayByDoctor.get(d.id) ?? 0, openSlots: openSlots.get(d.id) ?? 0 }))
    .sort((a, b) => b.todayCount - a.todayCount || a.name.localeCompare(b.name))

  const specialties = Array.from(new Set(doctors.map((d) => d.specialty))).sort()
  const pending = applications.filter((a) => a.status === 'pending').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const decided = applications.filter((a) => a.status !== 'pending').slice(0, 6)
  const oldestPending = pending[0]
  const withSlots = roster.filter((d) => d.openSlots > 0).length
  const avgFee = doctors.length ? doctors.reduce((s, d) => s + d.fee, 0) / doctors.length : 0
  const demandRows = Array.from(demand.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value, display: `${value} booking${value === 1 ? '' : 's'}` }))

  const submittedLabels = Object.fromEntries(pending.map((a) => [a.id, timeAgo(a.createdAt, now)]))

  return (
    <>
      <PageHeader
        eyebrow="Credentialing"
        title="Doctor Network & Credentialing"
        description="Review new doctor applications, create accounts for approved clinicians, and see who is available across the network."
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <MetricCard
          label="Doctors on network"
          value={doctors.length.toLocaleString('en-IN')}
          icon={Stethoscope}
          tone="blue"
          footer={<span>Across {specialties.length} specialties</span>}
        />
        <MetricCard
          label="Pending verification"
          value={pending.length}
          icon={ClipboardList}
          tone="coral"
          badge={pending.length > 0 ? <Chip tone="coral">Needs review</Chip> : undefined}
          footer={<span>{oldestPending ? `Oldest waiting ${timeAgo(oldestPending.createdAt, now)}` : 'Queue is clear'}</span>}
        />
        <MetricCard
          label="Bookable doctors"
          value={withSlots}
          icon={Users}
          tone="teal"
          progress={doctors.length ? (withSlots / doctors.length) * 100 : 0}
          footer={<span>Doctors with open future slots</span>}
        />
        <MetricCard
          label="Average consultation fee"
          value={`₹${Math.round(avgFee).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          tone="primary"
          footer={<span>Listed doctor fees</span>}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-stack-md items-start">
        <Panel
          id="applications"
          className="xl:col-span-7"
          title="Credential Verification Queue"
          icon={BadgeCheck}
          description="Approving creates the doctor's account and issues a Staff ID and one-time password."
          aside={<Chip tone={pending.length ? 'coral' : 'teal'} dot>{pending.length} pending</Chip>}
        >
          <CredentialQueue applications={pending} submittedLabels={submittedLabels} />
        </Panel>

        <div className="xl:col-span-5 flex flex-col gap-stack-md">
          <Panel title="Recent Decisions" icon={History} description="Applications that have already been approved or rejected.">
            {decided.length === 0 ? (
              <p className="text-sm text-indigo-gray-600">No decisions yet.</p>
            ) : (
              <ul className="divide-y divide-surface-container">
                {decided.map((a) => (
                  <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-label-sm text-label-sm text-on-surface font-semibold truncate">{a.name}</p>
                      <p className="font-label-sm text-[11px] text-indigo-gray-600 truncate">
                        {[a.specialty, a.hospitalName].filter(Boolean).join(' · ')} · applied {formatDate(a.createdAt)}
                      </p>
                    </div>
                    <Chip tone={a.status === 'approved' ? 'teal' : 'coral'}>{a.status === 'approved' ? 'Approved' : 'Rejected'}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Demand by Specialty" icon={BarChart3} description="Consultations booked in the last 30 days.">
            {demandRows.length === 0 ? <p className="text-sm text-indigo-gray-600">No bookings in the last 30 days.</p> : <BarList rows={demandRows} />}
          </Panel>
        </div>
      </div>

      <Panel
        title="Doctor Roster & Availability"
        icon={Users}
        description="Every doctor on the network with today's bookings and open future slots."
      >
        <DoctorRoster doctors={roster} specialties={specialties} />
      </Panel>
    </>
  )
}
