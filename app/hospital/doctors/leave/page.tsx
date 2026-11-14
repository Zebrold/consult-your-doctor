import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { IST, doctorName, istDateKey } from '@/components/patient/format'
import { BOOKED_CHOICES, LEAVE_REASONS, leaveDates, leaveWindow, loadLeaves, type Leave } from '@/lib/leave'
import { loadHospitalDoctors, loadHospitalSlots, requireHospital } from '../../_lib/hospital'
import { LeaveDesk, type DeskLeave } from '../../_components/LeaveDesk'
import { DeskHead, HosBackHeader, HosBody } from '../../_components/hos-ui'

export const metadata: Metadata = { title: 'Leave requests | Hospital Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const time = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/**
 * Doctors' leave requests: approve (closes their open slots on those days and tells booked patients) or decline; then
 * move each booked patient to a new slot, with the same doctor after the leave or another doctor on the same day.
 */
export default async function HospitalLeavePage() {
  const { admin, hospital } = await requireHospital()
  const now = currentTime()
  const today = istDateKey(now)
  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const byId = new Map(doctors.map((d) => [d.id, d]))
  const { ready, leaves } = await loadLeaves(admin, { doctorIds: doctors.map((d) => d.id) })
  const open = leaves.filter((l) => l.status === 'pending' || (l.status === 'approved' && l.endsOn >= today))
  const past = leaves.filter((l) => !open.includes(l)).sort((a, b) => b.startsOn.localeCompare(a.startsOn)).slice(0, 10)

  // Confirmed bookings on the leave days, for every open request.
  const affected = new Map<string, { id: string; code: string; patient: string; phone: string | null; start: string }[]>()
  for (const l of open) {
    const span = leaveWindow(l)
    const { data } = await admin
      .from('appointments')
      .select('id, patient:profiles!appointments_patient_id_fkey ( full_name, phone_number ), schedules!inner ( start_time )')
      .eq('doctor_id', l.doctorId)
      .eq('status', 'confirmed')
      .gte('schedules.start_time', span.from)
      .lt('schedules.start_time', span.to)
      .limit(500)
    type Row = { id: string; patient: { full_name: string | null; phone_number: string | null } | { full_name: string | null; phone_number: string | null }[] | null; schedules: { start_time: string } | { start_time: string }[] }
    affected.set(
      l.id,
      ((data ?? []) as unknown as Row[])
        .map((r) => {
          const p = Array.isArray(r.patient) ? r.patient[0] : r.patient
          const s = Array.isArray(r.schedules) ? r.schedules[0] : r.schedules
          return { id: r.id, code: r.id.slice(0, 8).toUpperCase(), patient: p?.full_name || 'Patient', phone: p?.phone_number ?? null, start: s.start_time }
        })
        .sort((a, b) => a.start.localeCompare(b.start)),
    )
  }

  // Open slots to move patients to: the next two weeks after now (other doctors) and after each leave (same doctor).
  const lastEnd = open.reduce((m, l) => (l.endsOn > m ? l.endsOn : m), today)
  const slots = open.length ? await loadHospitalSlots(admin, doctors.map((d) => d.id), new Date(now).toISOString(), new Date(Date.parse(`${lastEnd}T00:00:00+05:30`) + 15 * DAY).toISOString(), hospital.id) : []
  const openSlots = slots.filter((s) => !s.booked && Date.parse(s.start) > now)

  const toDesk = (l: Leave): DeskLeave => {
    const d = byId.get(l.doctorId)
    const span = leaveWindow(l)
    const bookings = affected.get(l.id) ?? []
    // Same doctor after the leave, then other doctors in the same department first.
    const same = openSlots.filter((s) => s.doctorId === l.doctorId && s.start >= span.to).slice(0, 12)
    const others = openSlots
      .filter((s) => s.doctorId !== l.doctorId && !(s.start >= span.from && s.start < span.to && s.doctorId === l.doctorId))
      .sort((a, b) => Number(byId.get(b.doctorId)?.department === d?.department) - Number(byId.get(a.doctorId)?.department === d?.department) || a.start.localeCompare(b.start))
      .slice(0, 30)
    return {
      id: l.id,
      doctor: d ? doctorName(d.name) : 'Doctor',
      department: d?.department ?? '',
      dates: leaveDates(l, today),
      days: Math.round((Date.parse(l.endsOn) - Date.parse(l.startsOn)) / DAY) + 1,
      reason: LEAVE_REASONS[l.reason],
      preference: BOOKED_CHOICES[l.bookedPatients].label.replace('Offer my patients', 'Offer patients').replace('Let the hospital move them', 'Move them'),
      note: l.note,
      status: l.status,
      slotsClosed: l.slotsClosed,
      bookings: bookings.map((b) => ({ ...b, when: time(b.start) })),
      moveTo: [
        ...same.map((s) => ({ id: s.id, label: `${d ? doctorName(d.name) : 'Same doctor'} · ${time(s.start)}`, group: 'Same doctor, after the leave' })),
        ...others.map((s) => {
          const o = byId.get(s.doctorId)
          return { id: s.id, label: `${o ? doctorName(o.name) : 'Doctor'}${o?.department ? ` (${o.department})` : ''} · ${time(s.start)}`, group: 'Another doctor' }
        }),
      ],
      declineReason: l.declineReason,
    }
  }

  const subtitle = 'Approve doctors’ leave, then move the patients already booked on those days'
  return (
    <>
      <HosBackHeader backHref="/hospital/doctors" backLabel="Back to doctors" title="Leave requests">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle}</p>
      </HosBackHeader>
      <HosBody>
        <DeskHead title="Leave requests" subtitle={subtitle} />
        {!ready ? (
          <p className="p-3.5 rounded-[14px] bg-[#FFF6E8] text-[13px] text-[#7A2E0E]">Leave requests are being set up. Doctors can ask for leave here once that’s done.</p>
        ) : (
          <LeaveDesk open={open.map(toDesk)} past={past.map(toDesk)} />
        )}
      </HosBody>
    </>
  )
}
