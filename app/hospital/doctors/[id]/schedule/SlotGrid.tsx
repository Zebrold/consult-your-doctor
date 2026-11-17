'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, X } from 'lucide-react'
import { deleteDoctorSlot } from '@/app/actions/hospital'
import { formatTime } from '@/components/patient/format'

export type DaySlot = { id: string; start: string; booked: boolean }

/**
 * The day's published slots. Open slots still ahead can be removed one by one (the × on each) or all at once; booked
 * and past ones stay. What happened is said under the list, including when nothing could be removed.
 */
export function SlotGrid({ doctorId, date, slots, now }: { doctorId: string; date: string; slots: DaySlot[]; now: number }) {
  const router = useRouter()
  const [, start] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const removable = slots.filter((s) => !s.booked && Date.parse(s.start) > now)

  const remove = (scheduleId: string | null) => {
    const form = new FormData()
    form.set('doctorId', doctorId)
    if (scheduleId) form.set('scheduleId', scheduleId)
    else form.set('date', date)
    setBusy(scheduleId ?? 'all')
    setMessage(null)
    start(async () => {
      const res = await deleteDoctorSlot(form)
      setBusy(null)
      setConfirmAll(false)
      if ('error' in res) return setMessage({ ok: false, text: res.error })
      setMessage({ ok: true, text: res.removed === 1 ? 'Slot removed. Patients can no longer book it.' : `${res.removed} open slots removed. Patients can no longer book them.` })
      router.refresh()
    })
  }

  return (
    <>
      <ul className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2 lg:gap-2.5 mt-1">
        {slots.map((s) => {
          const past = Date.parse(s.start) <= now
          const canRemove = !s.booked && !past
          return (
            <li
              key={s.id}
              className={`relative h-[58px] rounded-xl flex flex-col items-center justify-center ${
                s.booked ? 'bg-[#2A4DD0] text-white' : past ? 'bg-[#F4F6FA] text-[#8A94A6]' : 'bg-white text-[#067647] shadow-[inset_0_0_0_1.5px_#ABEFC6]'
              } ${busy === s.id || busy === 'all' ? (canRemove ? 'opacity-50' : '') : ''}`}
            >
              <span className="text-[13.5px] font-extrabold">{formatTime(s.start)}</span>
              <span className="text-[11px] font-bold opacity-85">{s.booked ? 'Booked' : past ? 'Past' : 'Open'}</span>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  disabled={!!busy}
                  title={`Remove the ${formatTime(s.start)} slot`}
                  aria-label={`Remove the ${formatTime(s.start)} slot`}
                  className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-white text-[#B42318] shadow-[0_0_0_1.5px_#FECDCA,0_2px_6px_rgba(11,27,63,0.12)] flex items-center justify-center hover:bg-[#FEF3F2] disabled:opacity-60 transition-colors"
                >
                  {busy === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-4 h-4" strokeWidth={2.6} />}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`mt-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-bold ${message.ok ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#FEF3F2] text-[#B42318]'}`}>
          {message.text}
        </p>
      )}

      {removable.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {confirmAll ? (
            <>
              <span className="text-[13px] font-bold text-[#27324A]">
                Remove all {removable.length} open {removable.length === 1 ? 'slot' : 'slots'} on this day?
              </span>
              <button
                type="button"
                onClick={() => remove(null)}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] bg-[#B42318] hover:bg-[#9A1C13] text-white text-[13px] font-extrabold disabled:opacity-60"
              >
                {busy === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Yes, remove
              </button>
              <button type="button" onClick={() => setConfirmAll(false)} disabled={!!busy} className="h-9 px-3 rounded-[10px] text-[13px] font-extrabold text-[#5B667A] hover:bg-[#F4F6FA]">
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMessage(null)
                setConfirmAll(true)
              }}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] border border-[#FECDCA] bg-white text-[#B42318] text-[13px] font-extrabold hover:bg-[#FEF3F2] disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" /> Remove all open slots on this day
            </button>
          )}
        </div>
      )}
    </>
  )
}
