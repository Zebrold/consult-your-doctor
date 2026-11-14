'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Phone } from 'lucide-react'
import { moveBooking, reviewLeave } from '@/app/actions/leave'
import { input } from '@/components/portal/form-ui'
import { LEAVE_STATUS, type LeaveStatus } from '@/lib/leave'
import { Panel, PanelHead, btnOutline, btnPrimary, btnSmallBlue } from './hos-ui'

export type DeskLeave = {
  id: string
  doctor: string
  department: string
  dates: string
  days: number
  reason: string
  preference: string
  note: string | null
  status: LeaveStatus
  slotsClosed: number
  bookings: { id: string; code: string; patient: string; phone: string | null; when: string }[]
  moveTo: { id: string; label: string; group: string }[]
  declineReason: string | null
}

const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

function StatusText({ status }: { status: LeaveStatus }) {
  const s = LEAVE_STATUS[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold whitespace-nowrap" style={{ color: s.color }}>
      <span className="w-[7px] h-[7px] rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

function Booking({ b, moveTo }: { b: DeskLeave['bookings'][number]; moveTo: DeskLeave['moveTo'] }) {
  const router = useRouter()
  const [slot, setSlot] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const groups = [...new Set(moveTo.map((m) => m.group))]
  return (
    <li className="py-3 border-t border-[#EEF2F7]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex-1 min-w-[160px]">
          <span className="block text-[14px] font-extrabold">{b.patient}</span>
          <span className="block text-[12.5px] text-[#5B667A]">
            {b.when} · Booking {b.code}
          </span>
        </span>
        {b.phone && (
          <a href={tel(b.phone)} className={btnSmallBlue}>
            <Phone className="w-3.5 h-3.5" />
            Call
          </a>
        )}
      </div>
      <div className="flex flex-col lg:flex-row gap-2 mt-2.5">
        <select value={slot} onChange={(e) => setSlot(e.target.value)} aria-label={`New slot for ${b.patient}`} className={`${input} !h-10 lg:flex-1 text-[13.5px]`}>
          <option value="">{moveTo.length ? 'Pick a new slot…' : 'No open slots to move to'}</option>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {moveTo
                .filter((m) => m.group === g)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          disabled={!slot || pending}
          onClick={() =>
            start(async () => {
              setError(null)
              const res = await moveBooking(b.id, slot)
              if (!res.ok) setError(res.error)
              else router.refresh()
            })
          }
          className={`${btnPrimary} !h-10`}
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Move booking
        </button>
      </div>
      {error && <p className="mt-1.5 text-[12.5px] font-bold text-[#B42318]">{error}</p>}
    </li>
  )
}

function Request({ l }: { l: DeskLeave }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [declining, setDeclining] = useState(false)
  const [why, setWhy] = useState('')
  const [error, setError] = useState<string | null>(null)
  const answer = (approve: boolean) =>
    start(async () => {
      setError(null)
      const res = await reviewLeave(l.id, approve, why)
      if (!res.ok) setError(res.error)
      else router.refresh()
    })

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-extrabold">{l.doctor}</p>
          <p className="text-[13px] text-[#5B667A]">
            {[l.department, `${l.dates} · ${l.days} ${l.days === 1 ? 'day' : 'days'}`, l.reason].filter(Boolean).join(' · ')}
          </p>
        </div>
        <StatusText status={l.status} />
      </div>
      <p className="mt-2 text-[13px] text-[#27324A]">
        <span className="text-[#5B667A]">Booked patients:</span> {l.preference}
      </p>
      {l.note && <p className="mt-1.5 p-3 rounded-xl bg-[#F7F9FC] text-[13px] text-[#27324A]">“{l.note}”</p>}

      {l.status === 'pending' && (
        <>
          <p className="mt-3 text-[13px] text-[#5B667A]">
            {l.bookings.length
              ? `${l.bookings.length} ${l.bookings.length === 1 ? 'patient is' : 'patients are'} booked on those days. Approving closes the doctor’s open slots then and tells these patients you’ll move their visit.`
              : 'No patients are booked on those days. Approving closes the doctor’s open slots then.'}
          </p>
          {declining ? (
            <div className="flex flex-col lg:flex-row gap-2 mt-3">
              <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={300} placeholder="Why it can’t be approved" aria-label="Reason for declining" className={`${input} !h-10 lg:flex-1`} />
              <button type="button" disabled={pending} onClick={() => answer(false)} className={`${btnOutline} lg:border !h-10`}>
                Decline
              </button>
              <button type="button" onClick={() => setDeclining(false)} className="h-10 px-2 text-[13px] font-extrabold text-[#5B667A]">
                Back
              </button>
            </div>
          ) : (
            <div className="flex gap-2 mt-3">
              <button type="button" disabled={pending} onClick={() => answer(true)} className={btnPrimary}>
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                Approve leave
              </button>
              <button type="button" disabled={pending} onClick={() => setDeclining(true)} className={`${btnOutline} lg:border`}>
                Decline
              </button>
            </div>
          )}
          {error && <p className="mt-2 text-[12.5px] font-bold text-[#B42318]">{error}</p>}
        </>
      )}

      {l.status === 'approved' && (
        <>
          <p className="mt-3 text-[13px] text-[#5B667A]">
            {l.slotsClosed} open {l.slotsClosed === 1 ? 'slot' : 'slots'} closed.{' '}
            {l.bookings.length ? 'These patients were told you’ll move their visit. Call them, then move each booking; they get the new time by message.' : 'Every booking on those days has been moved.'}
          </p>
          {l.bookings.length > 0 && (
            <ul className="mt-1">
              {l.bookings.map((b) => (
                <Booking key={b.id} b={b} moveTo={l.moveTo} />
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  )
}

export function LeaveDesk({ open, past }: { open: DeskLeave[]; past: DeskLeave[] }) {
  return (
    <div className="flex flex-col gap-3.5 lg:gap-5 lg:max-w-[920px]">
      {open.length === 0 ? (
        <Panel>
          <p className="text-[14px] font-extrabold">No leave to look at</p>
          <p className="mt-1 text-[13.5px] text-[#5B667A]">When a doctor asks for leave from their portal, it shows here for you to approve.</p>
        </Panel>
      ) : (
        open.map((l) => <Request key={l.id} l={l} />)
      )}
      {past.length > 0 && (
        <Panel>
          <PanelHead title="Earlier requests" />
          <ul>
            {past.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 border-t border-[#EEF2F7] text-[13.5px]">
                <span className="min-w-0">
                  <span className="font-extrabold">{l.doctor}</span> <span className="text-[#5B667A]">· {l.dates} · {l.reason}</span>
                  {l.declineReason && <span className="block text-[12.5px] text-[#5B667A]">Declined: {l.declineReason}</span>}
                </span>
                <StatusText status={l.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
