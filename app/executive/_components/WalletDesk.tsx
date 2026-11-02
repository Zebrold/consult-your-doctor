'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { markPayoutPaid, recordWalletAdjustment, rejectPayout } from '@/app/actions/wallet'

const input = 'h-10 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30'
const primary = 'h-10 px-4 rounded-xl bg-vibrant-blue text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-60'
const quiet = 'h-10 px-4 rounded-xl bg-surface-container text-indigo-gray-900 text-sm font-bold flex items-center gap-2 disabled:opacity-60'

/** Pay a waiting withdrawal (with the transfer's reference) or turn it down (with the reason). */
export function PayoutReview({ payoutId }: { payoutId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [mode, setMode] = useState<'pay' | 'reject'>('pay')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    start(async () => {
      const res = mode === 'pay' ? await markPayoutPaid(payoutId, value) : await rejectPayout(payoutId, value)
      if (!res.ok) return setError(res.error)
      setError(null)
      setValue('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === 'pay' ? 'Transfer reference (UTR)' : 'Why it is not paid'}
          aria-label={mode === 'pay' ? 'Transfer reference' : 'Reason'}
          className={`${input} flex-1 min-w-[180px]`}
        />
        <button type="submit" disabled={pending || !value.trim()} className={mode === 'pay' ? primary : quiet}>
          {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
          {mode === 'pay' ? 'Mark paid' : 'Reject'}
        </button>
        <button type="button" onClick={() => setMode(mode === 'pay' ? 'reject' : 'pay')} className="text-sm font-bold text-vibrant-blue">
          {mode === 'pay' ? 'Reject instead' : 'Pay instead'}
        </button>
      </div>
      {error && <p role="alert" className="text-sm font-bold text-error">{error}</p>}
    </form>
  )
}

/** Record what a hospital paid in to settle what it owes, or a correction. */
export function AdjustmentForm({ hospitals }: { hospitals: { id: string; name: string }[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    start(async () => {
      const res = await recordWalletAdjustment({
        hospitalId: String(data.get('hospitalId') || ''),
        amount: Number(data.get('amount')),
        note: String(data.get('note') || ''),
      })
      setNote(res.ok ? { text: 'Recorded.', ok: true } : { text: res.error, ok: false })
      if (res.ok) {
        form.reset()
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_140px_minmax(0,1.6fr)_auto] gap-2 items-start">
      <select name="hospitalId" required className={input} aria-label="Hospital" defaultValue="">
        <option value="" disabled>Hospital</option>
        {hospitals.map((h) => (
          <option key={h.id} value={h.id}>{h.name}</option>
        ))}
      </select>
      <input name="amount" required inputMode="decimal" placeholder="₹ (+ in, − out)" aria-label="Amount" className={input} />
      <input name="note" required placeholder="What it is, e.g. NEFT ref from the hospital" aria-label="Note" className={input} />
      <button type="submit" disabled={pending} className={primary}>
        {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Record
      </button>
      {note && <p role={note.ok ? 'status' : 'alert'} className={`md:col-span-4 text-sm font-bold ${note.ok ? 'text-secondary' : 'text-error'}`}>{note.text}</p>}
    </form>
  )
}
