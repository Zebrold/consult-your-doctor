'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { cancelLeave, requestLeave } from '@/app/actions/leave'
import { Field, FormError, RadioCard, choicePill, input, textarea } from '@/components/portal/form-ui'
import { BOOKED_CHOICES, LEAVE_REASONS, LEAVE_STATUS, type BookedPatients, type LeaveReason, type LeaveStatus } from '@/lib/leave'
import { Panel, PanelHead, Row, btnOutline, btnPrimary } from './doc-ui'

export type LeaveRow = { id: string; dates: string; reason: string; booked: number; status: LeaveStatus; declineReason: string | null }

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function Calendar({ month, today, approved, pending, working }: { month: string; today: string; approved: string[]; pending: string[]; working: string[] }) {
  const first = new Date(`${month}-01T12:00:00Z`)
  const offset = (first.getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const keys = Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
  const a = new Set(approved)
  const p = new Set(pending)
  const w = new Set(working)
  return (
    <>
      <div className="grid grid-cols-7 gap-1">
        {WEEK.map((d, i) => (
          <span key={i} className="text-center text-[11px] font-extrabold text-[#5B667A]">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`x${i}`} />
        ))}
        {keys.map((k) => {
          const cls = a.has(k)
            ? 'bg-[#2A4DD0] text-white'
            : p.has(k)
              ? 'bg-[#EEF3FF] text-[#2A4DD0] shadow-[inset_0_0_0_1.5px_#2A4DD0]'
              : k === today
                ? 'shadow-[inset_0_0_0_1.5px_#0B1B3F] text-[#0B1B3F]'
                : w.has(k)
                  ? 'text-[#27324A]'
                  : 'text-[#A3AEC2]'
          return (
            <span key={k} className={`h-9 rounded-[9px] flex items-center justify-center text-[13px] font-bold ${cls}`}>
              {Number(k.slice(8))}
            </span>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3.5 mt-3.5 text-[12px] font-bold text-[#5B667A]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-[#2A4DD0]" />
          Leave
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-[#EEF3FF] shadow-[inset_0_0_0_1.5px_#2A4DD0]" />
          Waiting for approval
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] shadow-[inset_0_0_0_1.5px_#0B1B3F]" />
          Today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[#A3AEC2]">12</span>
          No slots
        </span>
      </div>
    </>
  )
}

/** The DeskDocLeave page body: the request form and your requests on the left; the month and its numbers on the right. */
export function DoctorLeave({
  ready,
  hospital,
  today,
  leaves,
  calendar,
  summary,
}: {
  ready: boolean
  hospital: string | null
  today: string
  leaves: LeaveRow[]
  calendar: { month: string; approved: string[]; pending: string[]; working: string[] }
  summary: { working: number; leaveDays: number; slotsClosed: number }
}) {
  const router = useRouter()
  const [reason, setReason] = useState<LeaveReason>('personal')
  const [move, setMove] = useState<BookedPatients>('same_doctor')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [pending, start] = useTransition()
  const monthName = new Date(`${calendar.month}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const send = (form: FormData) =>
    start(async () => {
      setError(null)
      form.set('reason', reason)
      form.set('bookedPatients', move)
      const res = await requestLeave(form)
      if (!res.ok) setError(res.error)
      else {
        setSent(true)
        router.refresh()
      }
    })

  return (
    <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
      <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
        <Panel>
          <PanelHead title="Request leave" sub="Your hospital approves it, then your open slots on those days close" />
          {!hospital ? (
            <p className="text-[13.5px] text-[#5B667A]">You aren’t linked to a hospital yet, so there are no slots to close.</p>
          ) : sent ? (
            <div className="p-4 lg:p-[18px] rounded-[14px] bg-[#F5F8FF] shadow-[inset_0_0_0_1px_#DCE5FF]">
              <span className="flex items-center gap-2 text-[15.5px] font-extrabold text-[#2A4DD0]">
                <CheckCircle2 className="w-5 h-5" />
                Sent to {hospital}
              </span>
              <span className="block mt-1 text-[13px] leading-[1.5] text-[#27324A]">
                Their admin approves it from their portal. Your slots stay open until then; once it’s approved they close, and booked patients are told the hospital will move them.
              </span>
              <button type="button" onClick={() => setSent(false)} className={`${btnOutline} lg:border mt-3.5`}>
                Request another leave
              </button>
            </div>
          ) : (
            <form action={send} className="grid gap-[18px]">
              <div>
                <span className="block mb-[7px] text-[13px] font-extrabold text-[#27324A]">Where</span>
                <span className={`${choicePill(true)} inline-flex items-center`}>{hospital}</span>
              </div>
              <div className="grid gap-3.5 grid-cols-2">
                <Field label="From">
                  <input name="startsOn" type="date" required min={today} className={input} />
                </Field>
                <Field label="To">
                  <input name="endsOn" type="date" required min={today} className={input} />
                </Field>
              </div>
              <div>
                <span className="block mb-[7px] text-[13px] font-extrabold text-[#27324A]">Reason</span>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(LEAVE_REASONS) as LeaveReason[]).map((r) => (
                    <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)} className={choicePill(reason === r)}>
                      {LEAVE_REASONS[r]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="block mb-[7px] text-[13px] font-extrabold text-[#27324A]">Patients already booked</span>
                <div role="radiogroup" aria-label="Patients already booked" className="grid gap-2.5">
                  {(Object.keys(BOOKED_CHOICES) as BookedPatients[]).map((k) => (
                    <RadioCard key={k} on={move === k} onPick={() => setMove(k)} title={BOOKED_CHOICES[k].label} detail={BOOKED_CHOICES[k].detail} />
                  ))}
                </div>
              </div>
              <Field label="Note for the hospital">
                <textarea name="note" rows={3} maxLength={500} className={textarea} />
              </Field>
              <FormError>{error}</FormError>
              <div className="flex flex-col-reverse lg:flex-row lg:items-center justify-between gap-3 lg:gap-4">
                <span className="text-[12.5px] text-[#5B667A]">Booked patients are told by SMS, WhatsApp or email once the hospital approves.</span>
                <button type="submit" disabled={!ready || pending} className={`${btnPrimary} shrink-0`}>
                  {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send for approval
                </button>
              </div>
            </form>
          )}
        </Panel>

        <Panel>
          <PanelHead title="Your leave" sub="Requested and upcoming" />
          {leaves.length === 0 ? (
            <p className="py-3 text-[13px] text-[#5B667A] border-t border-[#EEF2F7]">No leave yet.</p>
          ) : (
            <>
              <div className="hidden lg:grid grid-cols-[170px_minmax(0,1fr)_130px_120px_110px] gap-4 px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">
                <span>Dates</span>
                <span>Hospital</span>
                <span>Reason</span>
                <span>Patients</span>
                <span>Status</span>
              </div>
              <ul>
                {leaves.map((l) => {
                  const s = LEAVE_STATUS[l.status]
                  return (
                    <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[170px_minmax(0,1fr)_130px_120px_110px] gap-x-4 gap-y-0.5 items-center py-[13px] border-t lg:border-t-0 lg:border-b border-[#EEF2F7] text-[13.5px]">
                      <span className="font-extrabold">{l.dates}</span>
                      <span className="hidden lg:block truncate">{hospital}</span>
                      <span className="hidden lg:block">{l.reason}</span>
                      <span className="hidden lg:block">{l.booked ? `${l.booked} to move` : '—'}</span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold justify-self-end lg:justify-self-start" style={{ color: s.color }}>
                        <span className="w-[7px] h-[7px] rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                      <span className="lg:hidden col-span-2 text-[12.5px] text-[#5B667A]">
                        {l.reason}
                        {l.booked ? ` · ${l.booked} booked ${l.booked === 1 ? 'patient' : 'patients'} to move` : ''}
                      </span>
                      {l.declineReason && <span className="col-span-2 lg:col-span-5 text-[12.5px] text-[#B42318]">Declined: {l.declineReason}</span>}
                      {l.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() =>
                            start(async () => {
                              const res = await cancelLeave(l.id)
                              if (!res.ok) setError(res.error)
                              router.refresh()
                            })
                          }
                          className="col-span-2 lg:col-span-5 justify-self-start text-[12.5px] font-extrabold text-[#5B667A] hover:underline"
                        >
                          Withdraw request
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Panel>
      </div>

      <div className="flex flex-col gap-3.5 lg:gap-4">
        <Panel>
          <PanelHead title={monthName} />
          <Calendar month={calendar.month} today={today} approved={calendar.approved} pending={calendar.pending} working={calendar.working} />
        </Panel>
        <Panel>
          <PanelHead title="This month" />
          <Row label="Days with slots">{summary.working}</Row>
          <Row label="Leave days">{summary.leaveDays}</Row>
          <Row label="Slots closed for leave">{summary.slotsClosed}</Row>
        </Panel>
      </div>
    </div>
  )
}
