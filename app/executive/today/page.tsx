import type { Metadata } from 'next'
import { CalendarCheck, CalendarClock, ClipboardList, Hourglass, Phone, UserCheck } from 'lucide-react'
import { CheckInModal } from '@/components/CheckInModal'
import { ExecutiveStatusSelect } from '@/components/ExecutiveStatusSelect'
import { currentTime, formatDateTime, initials, loadAppointments, requireExecutive } from '../_lib/ops'
import { EmptyState, MetricCard, PageHeader, Panel } from '../_components/ui'

export const metadata: Metadata = { title: "Today's Check-ins" }

export default async function ExecutiveTodayAppointments() {
  const { user, profile, admin } = await requireExecutive()
  const now = currentTime()

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Check-ins stay scoped to the executive's own branch.
  const { data: todays } = profile.hospitalId
    ? await admin
        .from('appointments')
        .select(`
          id,
          status,
          created_at,
          patient:profiles!appointments_patient_id_fkey ( full_name, phone_number ),
          doctor:doctors (
            specialty,
            profiles!doctors_profile_id_fkey ( full_name ),
            departments ( name )
          ),
          schedule:schedules!inner ( start_time, end_time )
        `)
        .eq('hospital_id', profile.hospitalId)
        .gte('schedule.start_time', today.toISOString())
        .lt('schedule.start_time', tomorrow.toISOString())
        .order('schedule(start_time)', { ascending: true })
    : { data: [] }

  type TodayRow = {
    id: string
    status: string
    created_at: string
    patient: { full_name: string | null; phone_number: string | null } | null
    doctor: { specialty: string | null; profiles: { full_name: string | null } | null; departments: { name: string } | null } | null
    schedule: { start_time: string; end_time: string }
  }
  const appointments = (todays ?? []) as unknown as TodayRow[]
  const checkedIn = appointments.filter((a) => a.status === 'visited' || a.status === 'completed').length
  const waiting = appointments.filter((a) => a.status === 'confirmed').length

  const assigned = (await loadAppointments(admin)).filter((a) => a.executiveId === user.id)

  const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

  return (
    <>
      <PageHeader
        eyebrow={profile.hospitalName ?? 'No branch assigned'}
        title="Today's Check-ins"
        description="Verify each patient's booking ID when they arrive and check them in for today's appointments at your branch."
      />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
        <MetricCard label="Scheduled today" value={appointments.length} icon={CalendarClock} tone="blue" footer={<span>At your branch</span>} />
        <MetricCard
          label="Checked in"
          value={checkedIn}
          icon={UserCheck}
          tone="teal"
          progress={appointments.length ? (checkedIn / appointments.length) * 100 : 0}
          footer={<span>Arrived or completed</span>}
        />
        <MetricCard label="Waiting to arrive" value={waiting} icon={Hourglass} tone="coral" footer={<span>Confirmed, not yet checked in</span>} />
      </section>

      <Panel title="Today's Appointments" icon={CalendarCheck} description="Open a row to verify the patient's booking ID and check them in.">
        {!profile.hospitalId ? (
          <EmptyState icon={CalendarClock}>Your account is not linked to a hospital branch, so there are no check-ins to show.</EmptyState>
        ) : appointments.length === 0 ? (
          <EmptyState icon={CalendarClock}>No appointments scheduled for today.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-indigo-gray-600 font-label-sm text-label-sm">
                  <th className="py-3.5 px-5 rounded-l-xl font-semibold">Patient</th>
                  <th className="py-3.5 px-4 font-semibold">Schedule</th>
                  <th className="py-3.5 px-4 font-semibold">Doctor &amp; Department</th>
                  <th className="py-3.5 px-4 font-semibold">Booked on</th>
                  <th className="py-3.5 px-5 rounded-r-xl text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {appointments.map((apt) => {
                  const { patient, doctor, schedule } = apt
                  const doctorName = doctor?.profiles?.full_name || 'Unknown Doctor'
                  const department = doctor?.departments?.name || 'Unknown'
                  return (
                    <tr key={apt.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-full bg-surface-container text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {initials(patient?.full_name)}
                          </span>
                          <div>
                            <div className="font-label-sm text-label-sm font-bold text-on-surface">{patient?.full_name || 'Unknown Patient'}</div>
                            <div className="text-[11px] text-indigo-gray-600 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" /> {patient?.phone_number || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-vibrant-blue/10 text-vibrant-blue font-label-sm text-label-sm font-semibold whitespace-nowrap">
                          {time(schedule.start_time)} – {time(schedule.end_time)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-label-sm text-label-sm font-bold text-on-surface">Dr. {doctorName}</div>
                        <div className="text-[11px] text-indigo-gray-600">{department} • {doctor?.specialty}</div>
                      </td>
                      <td className="py-4 px-4 text-sm text-indigo-gray-600">
                        {new Date(apt.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <CheckInModal
                          appointmentId={apt.id}
                          currentStatus={apt.status}
                          patientName={patient?.full_name || 'Unknown Patient'}
                          doctorName={doctorName}
                          departmentName={department}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="My Assigned Appointments" icon={ClipboardList} description="Appointments assigned to you. Update their status as patients move through their visit.">
        {assigned.length === 0 ? (
          <EmptyState icon={ClipboardList}>No appointments are assigned to you yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-surface-container">
            {assigned.map((apt) => (
              <li key={apt.id} className="py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-title-md text-base font-bold text-on-surface">{apt.patient?.name ?? 'Unknown patient'}</span>
                    <ExecutiveStatusSelect appointmentId={apt.id} currentStatus={apt.status} />
                  </div>
                  <p className="text-sm text-indigo-gray-600">{apt.patient?.phone ?? 'No phone on file'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-label-sm text-label-sm font-bold text-on-surface">{apt.doctor ? `Dr. ${apt.doctor.name}` : 'Unknown doctor'}</p>
                  <p className="text-[11px] text-indigo-gray-600">{apt.doctor?.specialty}</p>
                </div>
                <div className="flex-1 font-label-sm text-label-sm text-indigo-gray-900">{formatDateTime(apt.startTime)}</div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
