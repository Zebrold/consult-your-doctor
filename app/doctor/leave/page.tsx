import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { istDateKey } from '@/components/patient/format'
import { LEAVE_REASONS, leaveDates, leaveDays, leaveWindow, loadLeaves } from '@/lib/leave'
import { loadSlots, requireDoctor } from '../_lib/doctor'
import { DoctorLeave, type LeaveRow } from '../_components/DoctorLeave'
import { DeskHead, DocBackHeader, DocBody } from '../_components/doc-ui'

export const metadata: Metadata = { title: 'Leave & availability | Doctor Portal' }
export const dynamic = 'force-dynamic'

/**
 * Leave & availability, after the DeskDocLeave export: ask your hospital for leave (it approves, which closes your open
 * slots on those days and tells booked patients), see your requests, and this month at a glance.
 */
export default async function DoctorLeavePage() {
  const { admin, doctor } = await requireDoctor()
  const now = currentTime()
  const today = istDateKey(now)
  const month = today.slice(0, 7)
  const monthStart = new Date(`${month}-01T00:00:00+05:30`).toISOString()
  const nextMonth = new Date(Date.parse(`${month}-01T00:00:00+05:30`) + 32 * 86_400_000)
  const monthEnd = new Date(`${istDateKey(nextMonth).slice(0, 7)}-01T00:00:00+05:30`).toISOString()

  const [{ ready, leaves }, slots] = await Promise.all([loadLeaves(admin, { doctorIds: [doctor.id] }), loadSlots(admin, doctor.id, monthStart, monthEnd)])
  const shown = leaves.filter((l) => l.status !== 'cancelled' && (l.endsOn >= today || l.status === 'pending')).concat(leaves.filter((l) => l.endsOn < today && l.status === 'approved').slice(-3))

  // Patients still booked on each request's days.
  const booked = new Map<string, number>()
  for (const l of shown) {
    const span = leaveWindow(l)
    const { count } = await admin
      .from('appointments')
      .select('id, schedules!inner ( start_time )', { count: 'exact', head: true })
      .eq('doctor_id', doctor.id)
      .eq('status', 'confirmed')
      .gte('schedules.start_time', span.from)
      .lt('schedules.start_time', span.to)
    booked.set(l.id, count ?? 0)
  }

  const rows: LeaveRow[] = shown.map((l) => ({
    id: l.id,
    dates: leaveDates(l, today),
    reason: LEAVE_REASONS[l.reason],
    booked: booked.get(l.id) ?? 0,
    status: l.status,
    declineReason: l.declineReason,
  }))
  const inMonth = (d: string) => d.startsWith(month)
  const approvedDays = new Set(leaves.filter((l) => l.status === 'approved').flatMap(leaveDays))
  const pendingDays = new Set(leaves.filter((l) => l.status === 'pending').flatMap(leaveDays))
  const workingDays = new Set(slots.map((s) => istDateKey(s.start)))

  return (
    <>
      <DocBackHeader backHref="/doctor/profile" backLabel="Back to profile" title="Leave & availability">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">Plan time off and keep your hospital and patients informed</p>
      </DocBackHeader>
      <DocBody>
        <DeskHead title="Leave & availability" subtitle="Plan time off and keep your hospital and patients informed" />
        {!ready && <p className="mb-4 p-3.5 rounded-[14px] bg-[#FFF6E8] text-[13px] text-[#7A2E0E]">Leave requests are being set up. You can ask for leave here once that’s done.</p>}
        <DoctorLeave
          ready={ready && !!doctor.hospital}
          hospital={doctor.hospital?.name ?? null}
          today={today}
          leaves={rows}
          calendar={{
            month,
            approved: [...approvedDays].filter(inMonth),
            pending: [...pendingDays].filter(inMonth),
            working: [...workingDays],
          }}
          summary={{
            working: [...workingDays].filter((d) => !approvedDays.has(d)).length,
            leaveDays: [...approvedDays].filter(inMonth).length,
            slotsClosed: leaves.filter((l) => l.status === 'approved' && leaveDays(l).some(inMonth)).reduce((s, l) => s + l.slotsClosed, 0),
          }}
        />
      </DocBody>
    </>
  )
}
