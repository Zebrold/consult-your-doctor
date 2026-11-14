'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { approveBadge, rejectBadge } from '@/app/actions/badges'
import { btnOutline, btnPrimary } from '@/components/portal/workspace-ui'

/** Approve or reject one paid badge. Rejecting asks why, which the doctor or hospital sees. */
export function BadgeReview({ badgeId }: { badgeId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Something went wrong.')
      else router.refresh()
    })

  return (
    <div className="flex flex-col gap-2 sm:self-end sm:w-[360px]">
      {rejecting ? (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            aria-label="Why it is rejected"
            placeholder="Why (shown to them), e.g. registration not found with the council"
            className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#D6DDE8] bg-white text-[13px] outline-none focus:border-[#2A4DD0]"
          />
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={() => run(() => rejectBadge(badgeId, note))} className="flex-1 inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] bg-[#B42318] text-white text-[13.5px] font-extrabold disabled:opacity-60">
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              Reject (refund in Razorpay)
            </button>
            <button type="button" onClick={() => setRejecting(false)} className="h-[42px] px-3 text-[13.5px] font-extrabold text-[#5B667A]">
              Back
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-2 lg:justify-end">
          <button type="button" disabled={pending} onClick={() => setRejecting(true)} className={`${btnOutline} !text-[#B42318]`}>
            Reject and refund
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => approveBadge(badgeId))} className={btnPrimary}>
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            Verify and activate
          </button>
        </div>
      )}
      {error && <p className="text-[13px] font-bold text-[#B42318]">{error}</p>}
    </div>
  )
}
