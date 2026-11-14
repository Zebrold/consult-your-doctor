'use client'

import { useState } from 'react'
import { card, segGroup, segTab } from './workspace-ui'

// The staff Reviews page after the DeskHosReviews export: the latest reviews with filter tabs on the left; the rating,
// its spread and (for a hospital) each doctor's rating on the right. Phones show the rating first, then the list.
// Patients can't be replied to here: reviews have no reply field yet.

export type BoardReview = {
  id: string
  rating: number
  comment: string | null
  patientName: string
  /** "Saw Dr. Vaibhav Mishra", "Rated the hospital" */
  about: string
  /** "2 days ago", worked out on the server. */
  when: string
  /** Which filter it falls under: a doctor's id, or "hospital". */
  key: string
}

export type BoardSummary = { count: number; average: number | null; distribution: Record<1 | 2 | 3 | 4 | 5, number> }
export type BoardDoctor = { key: string; name: string; short: string; average: number | null; count: number }

const PAGE = 20

export function Stars({ rating, className = 'text-[15px] tracking-[1px]' }: { rating: number; className?: string }) {
  const n = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className={`text-[#E8A317] shrink-0 leading-none ${className}`}>
      {'★★★★★'.slice(0, n)}
      <span className="text-[#D6DDE8]">{'★★★★★'.slice(0, 5 - n)}</span>
    </span>
  )
}

const avatar = (name: string) =>
  name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter((p) => /[A-Za-z]/.test(p[0] ?? ''))
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'P'

function Initial({ name, size }: { name: string; size: 'sm' | 'md' }) {
  return (
    <span aria-hidden className={`${size === 'md' ? 'w-9 h-9' : 'w-[34px] h-[34px]'} shrink-0 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[12px] font-extrabold`}>
      {avatar(name)}
    </span>
  )
}

export function ReviewsBoard({
  reviews,
  summary,
  doctors,
  tabs,
  subjectLabel,
}: {
  reviews: BoardReview[]
  summary: BoardSummary
  /** Each doctor's rating, for a hospital; clicking one shows only their reviews. */
  doctors?: BoardDoctor[]
  /** The filter tabs after "All" (a hospital's: the hospital itself and its most-reviewed doctors). */
  tabs?: { key: string; label: string }[]
  /** Under the big rating: "reviews from completed visits". */
  subjectLabel?: string
}) {
  const [filter, setFilter] = useState('all')
  const [shown, setShown] = useState(PAGE)
  const list = filter === 'all' ? reviews : reviews.filter((r) => r.key === filter)
  const pick = (key: string) => {
    setFilter(key)
    setShown(PAGE)
  }

  // The tabs, plus the doctor picked from "By doctor" when they aren't one of them.
  const allTabs = [{ key: 'all', label: tabs?.length ? 'All' : 'All reviews' }, ...(tabs ?? [])]
  const extra = doctors?.find((d) => d.key === filter && !allTabs.some((t) => t.key === filter))
  if (extra) allTabs.push({ key: extra.key, label: extra.short })

  const max = Math.max(1, ...Object.values(summary.distribution))

  return (
    <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
      <section className={`${card} p-4 lg:p-[22px] order-2 lg:order-1 min-w-0`} aria-label="Latest reviews">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-1 lg:mb-3.5">
          <div className="min-w-0">
            <h2 className="text-[16px] font-extrabold lg:tracking-[-0.01em]">Latest reviews</h2>
            <p className="mt-0.5 lg:mt-[3px] text-[12.5px] lg:text-[13px] text-[#5B667A]">Only patients with a completed visit can leave a review</p>
          </div>
          {allTabs.length > 1 && (
            <div className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto no-scrollbar shrink-0">
              <div role="tablist" aria-label="Show reviews for" className={segGroup}>
                {allTabs.map((t) => (
                  <button key={t.key} type="button" role="tab" aria-selected={filter === t.key} onClick={() => pick(t.key)} className={segTab(filter === t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {list.length === 0 ? (
          <p className="py-6 text-[13.5px] text-[#5B667A] border-t border-[#EEF2F7]">
            {reviews.length === 0 ? 'No reviews yet. Patients are asked to rate their visit once it is completed.' : 'No reviews here yet.'}
          </p>
        ) : (
          <ul>
            {list.slice(0, shown).map((r) => (
              <li key={r.id} className="py-4 border-t border-[#EEF2F7]">
                <div className="flex items-center gap-3">
                  <Initial name={r.patientName} size="md" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-extrabold truncate">{r.patientName}</span>
                    <span className="block text-[12.5px] text-[#5B667A] truncate">
                      {r.about} · {r.when}
                    </span>
                  </span>
                  <Stars rating={r.rating} />
                </div>
                {r.comment?.trim() && <p className="mt-2.5 ml-12 text-[14px] leading-[1.6] text-[#27324A] whitespace-pre-line break-words">{r.comment.trim()}</p>}
              </li>
            ))}
          </ul>
        )}
        {list.length > shown && (
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="w-full mt-1 h-11 rounded-[11px] border border-[#D6DDE8] text-[13.5px] font-extrabold text-[#27324A] hover:bg-[#F4F6FA]">
            Show more reviews ({list.length - shown} more)
          </button>
        )}
      </section>

      <div className="flex flex-col gap-3.5 lg:gap-4 order-1 lg:order-2 min-w-0">
        <section className={`${card} p-4 lg:p-[22px]`} aria-label="Rating">
          <div className="flex items-center gap-[18px]">
            <span className="text-[40px] lg:text-[48px] font-extrabold tracking-[-0.03em] leading-none tabular-nums">{summary.average != null ? summary.average.toFixed(1) : '—'}</span>
            <span className="min-w-0">
              <Stars rating={summary.average ?? 0} className="block text-[18px] tracking-[2px]" />
              <span className="block mt-1 text-[13px] text-[#5B667A]">
                {summary.count.toLocaleString('en-IN')} {summary.count === 1 ? 'review' : 'reviews'} {subjectLabel ?? 'from completed visits'}
              </span>
            </span>
          </div>
          <div className="mt-3.5">
            {([5, 4, 3, 2, 1] as const).map((s) => (
              <div key={s} className="flex items-center gap-2.5 py-1 text-[12.5px] font-bold text-[#5B667A]">
                <span className="w-[18px]">{s}★</span>
                <span role="img" aria-label={`${summary.distribution[s]} ${s}-star`} className="flex-1 h-1.5 rounded-full bg-[#EEF2F7] overflow-hidden">
                  <span className="block h-full rounded-full bg-[#2A4DD0]" style={{ width: `${(summary.distribution[s] / max) * 100}%` }} />
                </span>
                <span className="w-9 text-right tabular-nums">{summary.distribution[s].toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </section>

        {doctors && doctors.length > 0 && (
          <section className={`${card} p-4 lg:p-[22px]`} aria-label="By doctor">
            <h2 className="mb-2 lg:mb-3.5 text-[16px] font-extrabold lg:tracking-[-0.01em]">By doctor</h2>
            <ul>
              {doctors.map((d) => {
                const on = filter === d.key
                return (
                  <li key={d.key} className="border-t border-[#EEF2F7] py-0.5">
                    <button
                      type="button"
                      onClick={() => pick(on ? 'all' : d.key)}
                      aria-pressed={on}
                      disabled={!d.count}
                      className={`w-full flex items-center gap-3 py-2 px-1.5 rounded-lg text-left transition-colors disabled:cursor-default ${on ? 'bg-[#F5F8FF]' : 'enabled:hover:bg-[#F7F9FC]'}`}
                    >
                      <Initial name={d.name} size="sm" />
                      <span className={`flex-1 min-w-0 text-[13.5px] font-extrabold truncate ${on ? 'text-[#2A4DD0]' : ''}`}>{d.name}</span>
                      <span className="text-[13px] font-extrabold whitespace-nowrap">
                        {d.average != null ? (
                          <>
                            {d.average.toFixed(1)} <span className="text-[#E8A317]">★</span>
                          </>
                        ) : (
                          <span className="text-[#98A2B3]">—</span>
                        )}
                      </span>
                      <span className="w-[70px] text-right text-[12px] text-[#5B667A] tabular-nums">{d.count ? d.count.toLocaleString('en-IN') : 'No reviews'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
