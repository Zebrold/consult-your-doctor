'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { saveBadgePricesAction } from '@/app/actions/badges'
import { formatINR } from '@/components/patient/format'
import { btnOutline, btnPrimary } from '@/components/portal/workspace-ui'
import { MAX_BADGE_PRICE, validBadgePrice, type BadgePrices } from '@/lib/badges'
import { Line } from './ui'

const ROWS: { subject: 'doctor' | 'hospital'; plan: 'monthly' | 'yearly'; label: string }[] = [
  { subject: 'doctor', plan: 'monthly', label: 'Doctor, monthly' },
  { subject: 'doctor', plan: 'yearly', label: 'Doctor, yearly' },
  { subject: 'hospital', plan: 'monthly', label: 'Hospital, monthly' },
  { subject: 'hospital', plan: 'yearly', label: 'Hospital, yearly' },
]

/** The Prices card on Verified badges: the four live prices, and a form to change them. */
export function BadgePriceEditor({ prices }: { prices: BadgePrices }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const open = () => {
    setDraft(Object.fromEntries(ROWS.map((r) => [`${r.subject}.${r.plan}`, String(prices[r.subject][r.plan])])))
    setError(null)
    setSaved(false)
    setEditing(true)
  }

  const save = () => {
    const value = (r: (typeof ROWS)[number]) => {
      const text = (draft[`${r.subject}.${r.plan}`] ?? '').trim()
      return /^\d+$/.test(text) ? Number(text) : NaN
    }
    for (const r of ROWS) {
      if (!validBadgePrice(value(r))) {
        setError(`${r.label} must be a whole number of rupees from ₹1 to ₹${MAX_BADGE_PRICE.toLocaleString('en-IN')}.`)
        return
      }
    }
    const get = (subject: 'doctor' | 'hospital', plan: 'monthly' | 'yearly') => value(ROWS.find((r) => r.subject === subject && r.plan === plan)!)
    start(async () => {
      setError(null)
      const res = await saveBadgePricesAction({
        doctor: { monthly: get('doctor', 'monthly'), yearly: get('doctor', 'yearly') },
        hospital: { monthly: get('hospital', 'monthly'), yearly: get('hospital', 'yearly') },
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setEditing(false)
      setSaved(true)
      router.refresh()
    })
  }

  if (!editing) {
    return (
      <>
        <ul>
          {ROWS.map((r) => (
            <li key={`${r.subject}.${r.plan}`}>
              <Line label={<span className="font-bold">{r.label}</span>} right={<strong className="tabular-nums">{formatINR(prices[r.subject][r.plan])}</strong>} />
            </li>
          ))}
        </ul>
        {saved && <p className="mt-3 text-[12.5px] font-bold text-[#067647]">Prices saved. New badge purchases use them; requests already waiting keep their price.</p>}
        <button type="button" onClick={open} className={`${btnOutline} mt-3 w-full`}>
          Change prices
        </button>
      </>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="flex flex-col gap-3"
    >
      {ROWS.map((r) => {
        const key = `${r.subject}.${r.plan}`
        return (
          <label key={key} className="flex items-center justify-between gap-3 text-[13px] font-bold">
            {r.label}
            <span className="relative">
              <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B667A]">₹</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={draft[key] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value.replace(/[^\d]/g, '').slice(0, 6) }))}
                disabled={pending}
                aria-label={`${r.label} price in rupees`}
                className="w-[110px] h-[38px] pl-7 pr-3 rounded-[10px] border border-[#D6DDE8] bg-white text-[14px] font-extrabold tabular-nums text-right outline-none focus:border-[#2A4DD0]"
              />
            </span>
          </label>
        )
      })}
      {error && <p className="text-[12.5px] font-bold text-[#B42318]">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={`${btnPrimary} flex-1`}>
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save prices
        </button>
        <button type="button" disabled={pending} onClick={() => setEditing(false)} className={btnOutline}>
          Cancel
        </button>
      </div>
      <p className="text-[12px] text-[#5B667A]">New badge purchases use these prices. Requests already waiting keep the price they were made at.</p>
    </form>
  )
}
