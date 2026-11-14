'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { reviewPractice } from '@/app/actions/practices'
import { btnOutline, btnPrimary } from './ui'

/** Confirm or turn down a practice link the doctor accepted. Confirming lets the hospital publish the doctor's slots. */
export function PracticeReview({ practiceId }: { practiceId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const run = (confirm: boolean) =>
    start(async () => {
      setError(null)
      const res = await reviewPractice(practiceId, confirm, note)
      if (!res.ok) setError(res.error)
      else router.refresh()
    })

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      {rejecting ? (
        <div className="flex flex-wrap gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Why (optional)" aria-label="Why" className="h-[42px] w-56 px-3 rounded-[11px] border border-[#D6DDE8] bg-white text-[13.5px] outline-none focus:border-[#2A4DD0]" />
          <button type="button" disabled={pending} onClick={() => run(false)} className={`${btnOutline} !text-[#B42318]`}>
            Reject
          </button>
          <button type="button" onClick={() => setRejecting(false)} className="h-[42px] px-2 text-[13px] font-extrabold text-[#5B667A]">
            Back
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={() => setRejecting(true)} className={`${btnOutline} !text-[#B42318]`}>
            Reject
          </button>
          <button type="button" disabled={pending} onClick={() => run(true)} className={btnPrimary}>
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            Approve
          </button>
        </div>
      )}
      {error && <p className="text-[13px] font-bold text-[#B42318]">{error}</p>}
    </div>
  )
}
