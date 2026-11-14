'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { markPayoutPaid, recordWalletAdjustment, rejectPayout } from '@/app/actions/wallet'
import { btnPrimary } from '@/components/portal/workspace-ui'

const input = 'h-[38px] w-full min-w-0 px-3.5 rounded-[10px] border border-[#D6DDE8] bg-white text-[13px] outline-none focus:border-[#2A4DD0] focus:shadow-[0_0_0_3px_rgba(42,77,208,0.12)]'
const small = `${btnPrimary} !h-9 !px-3.5 !shadow-none`

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
    <form onSubmit={submit} className="contents">
      <span className="min-w-0">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === 'pay' ? 'Transfer reference' : 'Why it is not paid'}
          aria-label={mode === 'pay' ? 'Transfer reference' : 'Reason'}
          className={input}
        />
        <button type="button" onClick={() => setMode(mode === 'pay' ? 'reject' : 'pay')} className="mt-1 text-[12px] font-bold text-[#5B667A] hover:text-[#2A4DD0]">
          {mode === 'pay' ? 'Reject instead' : 'Pay instead'}
        </button>
        {error && (
          <span role="alert" className="block text-[12px] font-bold text-[#B42318]">
            {error}
          </span>
        )}
      </span>
      <span className="lg:text-right self-start">
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className={mode === 'pay' ? small : 'inline-flex items-center gap-2 h-9 px-3.5 rounded-[11px] border border-[#FDA29B] bg-white text-[#B42318] text-[13.5px] font-extrabold disabled:opacity-60'}
        >
          {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
          {mode === 'pay' ? 'Mark as paid' : 'Reject'}
        </button>
      </span>
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

  const label = 'block mb-1 text-[12px] font-extrabold text-[#27324A]'
  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_160px_minmax(0,1.6fr)_auto] gap-2.5 items-end">
      <label className="min-w-0">
        <span className={label}>Hospital</span>
        <select name="hospitalId" required className={`${input} !h-[42px] font-bold`} defaultValue="">
          <option value="" disabled>
            Choose a hospital
          </option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0">
        <span className={label}>Amount (+ in, − out)</span>
        <input name="amount" required inputMode="decimal" placeholder="₹" className={`${input} !h-[42px]`} />
      </label>
      <label className="min-w-0">
        <span className={label}>What it is</span>
        <input name="note" required placeholder="e.g. NEFT reference from the hospital" className={`${input} !h-[42px]`} />
      </label>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Record
      </button>
      {note && (
        <p role={note.ok ? 'status' : 'alert'} className={`md:col-span-4 text-[13px] font-bold ${note.ok ? 'text-[#067647]' : 'text-[#B42318]'}`}>
          {note.text}
        </p>
      )}
    </form>
  )
}
