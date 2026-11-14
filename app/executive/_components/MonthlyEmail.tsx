'use client'

import { useState, useTransition } from 'react'
import { CalendarClock, Loader2 } from 'lucide-react'
import { setMonthlyReport } from '@/app/actions/report-subscriptions'
import { btnOutline, btnPrimary } from './ui'

/** "Schedule a monthly email": last month's report and spreadsheets, on the 1st, to this executive. */
export function MonthlyEmail({ current, suggested }: { current: string | null; suggested: string }) {
  const [email, setEmail] = useState(current)
  const [asking, setAsking] = useState(false)
  const [value, setValue] = useState(suggested)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const save = (on: boolean) =>
    start(async () => {
      setError(null)
      const res = await setMonthlyReport(on, value)
      if (!res.ok) return setError(res.error)
      setEmail(res.email)
      setAsking(false)
    })

  if (email) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-[#27324A]">
        <CalendarClock className="w-4 h-4 text-[#2A4DD0]" /> Monthly email on the 1st to {email}
        <button type="button" disabled={pending} onClick={() => save(false)} className="font-extrabold text-[#B42318] hover:underline underline-offset-4">
          Stop
        </button>
        {error && <span className="w-full text-[12.5px] text-[#B42318]">{error}</span>}
      </span>
    )
  }
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={btnOutline}>
        <CalendarClock className="w-4 h-4" /> Schedule a monthly email
      </button>
    )
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save(true)
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="email" required value={value} onChange={(e) => setValue(e.target.value)} aria-label="Send it to" placeholder="you@company.com" className="h-[42px] w-60 px-3.5 rounded-[11px] border border-[#D6DDE8] bg-white text-[14px] outline-none focus:border-[#2A4DD0]" />
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Send it monthly
      </button>
      <button type="button" onClick={() => setAsking(false)} className="h-[42px] px-2 text-[13px] font-extrabold text-[#5B667A]">
        Cancel
      </button>
      {error && <span className="w-full text-[12.5px] font-bold text-[#B42318]">{error}</span>}
    </form>
  )
}
