'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Star, X } from 'lucide-react'
import { submitDoctorReview } from '@/app/actions/reviews'

export type ExistingReview = { rating: number; comment: string | null }

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

/** "Rate your visit" for a finished consultation. The review shows on the doctor's profile and the home page. */
export function ReviewButton({ appointmentId, doctorName, existing, className }: { appointmentId: string; doctorName: string; existing?: ExistingReview | null; className?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()
  const shown = hover || rating

  const save = () =>
    start(async () => {
      if (!rating) return setError('Choose a rating from 1 to 5 stars.')
      const res = await submitDoctorReview({ appointmentId, rating, comment })
      if (!res.ok) return setError(res.error)
      setError(null)
      setDone(true)
      router.refresh()
    })

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDone(false)
          setOpen(true)
        }}
        className={className ?? 'px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 font-label-sm text-label-sm font-semibold hover:bg-amber-200 transition-colors inline-flex items-center gap-1.5'}
      >
        <Star className={`w-4 h-4 ${existing ? 'fill-current' : ''}`} />
        {existing ? `Your review: ${existing.rating}★` : 'Rate your visit'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Review ${doctorName}`}>
          <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">{done ? 'Thank you!' : `How was your visit with ${doctorName}?`}</h3>
                <p className="text-sm text-indigo-gray-600">
                  {done ? 'Your review is live on the doctor’s profile.' : 'Your review is shown with your first name and initial only.'}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!done && (
              <>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex gap-1.5" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                        onMouseEnter={() => setHover(n)}
                        onClick={() => setRating(n)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star className={`w-9 h-9 ${n <= shown ? 'text-amber-500 fill-amber-500' : 'text-outline-variant'}`} />
                      </button>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-on-surface h-5">{LABELS[shown]}</span>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600">Tell others about your visit (optional)</span>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Was the doctor clear and caring? How was the wait?"
                    className="w-full rounded-lg bg-surface-container-low p-3 text-[15px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 resize-none"
                  />
                  <span className="text-[11px] text-indigo-gray-600 self-end">{comment.length}/1000</span>
                </label>
                {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-full text-sm font-semibold text-indigo-gray-600 hover:bg-surface-container">
                    Cancel
                  </button>
                  <button type="button" onClick={save} disabled={pending || !rating} className="px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                    {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
                    {existing ? 'Update Review' : 'Post Review'}
                  </button>
                </div>
              </>
            )}
            {done && (
              <button type="button" onClick={() => setOpen(false)} className="self-end px-5 py-2.5 rounded-full bg-vibrant-blue text-on-primary text-sm font-bold">
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
