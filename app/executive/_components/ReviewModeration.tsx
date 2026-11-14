'use client'

import { useState, useTransition } from 'react'
import { MessageSquareText } from 'lucide-react'
import { setReviewPublished } from '@/app/actions/review-moderation'
import { EmptyState, Status, btnOutline, btnSmall, segGroup, segTab } from './ui'

export type ModReview = {
  id: string
  kind: 'doctor' | 'hospital'
  rating: number
  comment: string | null
  patient: string
  about: string
  aboutSub: string | null
  when: string
  published: boolean
  /** Why it needs a look: a low rating, a phone number or an email address in it. */
  flags: string[]
}

const tabs = [
  { id: 'check', label: 'To check' },
  { id: 'all', label: 'All recent' },
  { id: 'hidden', label: 'Hidden' },
] as const
type Tab = (typeof tabs)[number]['id']
const matches = (r: ModReview, t: Tab) => (t === 'check' ? r.published && r.flags.length > 0 : t === 'hidden' ? !r.published : true)

function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="text-[14px] tracking-[1px] whitespace-nowrap">
      <span className="text-[#F59E0B]">{'★'.repeat(rating)}</span>
      <span className="text-[#D6DDE8]">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  )
}

/** Review moderation after DeskExeReviews: reviews flagged for a look, with Publish and Hide. */
export function ReviewModeration({ reviews }: { reviews: ModReview[] }) {
  const [list, setList] = useState(reviews)
  const [tab, setTab] = useState<Tab>('check')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<{ id: string; text: string } | null>(null)
  const [, start] = useTransition()
  const [limit, setLimit] = useState(15)

  const shown = list.filter((r) => matches(r, tab))
  const set = (r: ModReview, published: boolean) => {
    setBusy(r.id)
    setError(null)
    start(async () => {
      const res = await setReviewPublished(r.kind, r.id, published)
      setBusy(null)
      if (!res.ok) return setError({ id: r.id, text: res.error })
      setList((prev) => prev.map((x) => (x.id === r.id ? { ...x, published, flags: published ? [] : x.flags } : x)))
    })
  }

  return (
    <div>
      <div className="mb-3.5 -mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto no-scrollbar">
        <div role="tablist" aria-label="Filter" className={segGroup}>
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={segTab(tab === t.id)}>
              {t.label} ({list.filter((r) => matches(r, t.id)).length})
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={MessageSquareText}>{tab === 'check' ? 'Nothing needs a look right now.' : 'No reviews here.'}</EmptyState>
      ) : (
        <ul>
          {shown.slice(0, limit).map((r) => (
            <li key={`${r.kind}-${r.id}`} className="py-4 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <span className="min-w-0">
                  <span className="block text-[14px] font-extrabold">{r.patient}</span>
                  <span className="block text-[12.5px] text-[#5B667A]">
                    About {r.about}
                    {r.aboutSub ? ` · ${r.aboutSub}` : ''} · {r.when}
                  </span>
                </span>
                <Stars rating={r.rating} />
              </div>
              {r.comment?.trim() ? <p className="mt-2 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">{r.comment}</p> : <p className="mt-2 text-[13px] text-[#98A2B3]">No written comment.</p>}
              {r.flags.length > 0 && r.published && <p className="mt-1.5 text-[12.5px] font-extrabold text-[#B54708]">Flagged: {r.flags.join(', ')}</p>}
              <div className="flex flex-wrap items-center justify-end gap-2 mt-2.5">
                {r.published ? (
                  <>
                    <Status label="Published" color="#2A4DD0" className="mr-auto" />
                    <button type="button" disabled={busy === r.id} onClick={() => set(r, false)} className={`${btnOutline} !h-[34px] !px-3 !text-[12.5px] !text-[#B42318]`}>
                      Hide
                    </button>
                  </>
                ) : (
                  <>
                    <Status label="Hidden from public pages" color="#98A2B3" className="mr-auto" />
                    <button type="button" disabled={busy === r.id} onClick={() => set(r, true)} className={btnSmall}>
                      Publish again
                    </button>
                  </>
                )}
              </div>
              {error?.id === r.id && (
                <p role="alert" className="mt-2 text-[13px] font-bold text-[#B42318]">
                  {error.text}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {shown.length > limit && (
        <div className="pt-3.5 text-center">
          <button type="button" onClick={() => setLimit((l) => l + 15)} className="text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
            Show more ({shown.length - limit} left)
          </button>
        </div>
      )}
    </div>
  )
}
