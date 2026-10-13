'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CheckCircle2, LoaderCircle, Star, Stethoscope, X } from 'lucide-react'
import { submitAppointmentFeedback } from '@/app/actions/reviews'

export type ExistingReview = {
  rating: number
  comment: string | null
  hospitalRating?: number | null
  hospitalComment?: string | null
}

export type HospitalRef = {
  id?: string
  name: string
  city?: string | null
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

/**
 * Patient feedback modal after appointment for both Doctor and Hospital.
 * Reflected directly on doctor/hospital profiles and on the home page.
 */
export function ReviewButton({
  appointmentId,
  doctorName,
  hospital,
  existing,
  className,
}: {
  appointmentId: string
  doctorName: string
  hospital?: HospitalRef | null
  existing?: ExistingReview | null
  className?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Doctor rating & feedback
  const [docRating, setDocRating] = useState(existing?.rating ?? 0)
  const [docHover, setDocHover] = useState(0)
  const [docComment, setDocComment] = useState(existing?.comment ?? '')

  // Hospital rating & feedback
  const [hospRating, setHospRating] = useState(existing?.hospitalRating ?? 0)
  const [hospHover, setHospHover] = useState(0)
  const [hospComment, setHospComment] = useState(existing?.hospitalComment ?? '')

  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  const activeDocRating = docHover || docRating
  const activeHospRating = hospHover || hospRating

  const save = () =>
    start(async () => {
      if (!docRating) {
        return setError('Please provide a rating for the doctor (1 to 5 stars).')
      }
      setError(null)
      const res = await submitAppointmentFeedback({
        appointmentId,
        doctorRating: docRating,
        doctorComment: docComment.trim(),
        hospitalRating: hospRating > 0 ? hospRating : null,
        hospitalComment: hospComment.trim() ? hospComment.trim() : null,
        hospitalId: hospital?.id,
      })

      if (!res.ok) {
        return setError(res.error)
      }

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
        className={
          className ??
          'px-4 py-1.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 font-label-sm text-label-sm font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm active:scale-95'
        }
      >
        <Star className={`w-4 h-4 ${existing ? 'fill-amber-600 text-amber-600' : 'text-amber-700'}`} />
        {existing ? `Your feedback: ${existing.rating}★` : 'Rate visit & hospital'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Feedback for ${doctorName}`}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-indigo-gray-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-h-[92dvh] overflow-y-auto overscroll-contain sm:max-w-lg bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-7 flex flex-col gap-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant/30 pb-3">
              <div>
                <h3 className="font-title-md text-lg md:text-xl font-bold text-indigo-gray-900">
                  {done ? 'Feedback Received!' : 'Rate Doctor & Hospital Experience'}
                </h3>
                <p className="text-xs md:text-sm text-indigo-gray-600 mt-0.5">
                  {done
                    ? 'Your verified review is live and appears on the home page and profile.'
                    : 'Helps fellow patients choose verified doctors and quality healthcare.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            {!done ? (
              <div className="flex flex-col gap-5">
                {/* 1. Doctor Rating Section */}
                <div className="bg-surface-container-low/70 rounded-2xl p-4 border border-outline-variant/30 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold shrink-0">
                      <Stethoscope className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-title-md text-sm font-bold text-indigo-gray-900 truncate">
                        Doctor Care: {doctorName}
                      </h4>
                      <p className="text-[11px] text-indigo-gray-600">Rate consultation, listening, and advice</p>
                    </div>
                  </div>

                  {/* Doctor Stars */}
                  <div className="flex flex-col items-center gap-1 py-1">
                    <div className="flex gap-1.5" role="radiogroup" aria-label="Doctor Rating" onMouseLeave={() => setDocHover(0)}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={docRating === n}
                          aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                          onMouseEnter={() => setDocHover(n)}
                          onClick={() => setDocRating(n)}
                          className="p-1 transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              n <= activeDocRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-indigo-gray-700 h-4">{LABELS[activeDocRating]}</span>
                  </div>

                  {/* Doctor Comment */}
                  <textarea
                    value={docComment}
                    onChange={(e) => setDocComment(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    placeholder="How was the doctor's explanation, empathy, and diagnosis? (optional)"
                    className="w-full rounded-xl bg-surface-container-lowest p-3 text-xs md:text-sm text-on-surface placeholder:text-outline border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 resize-none shadow-sm"
                  />
                </div>

                {/* 2. Hospital / Facility Rating Section */}
                <div className="bg-surface-container-low/70 rounded-2xl p-4 border border-outline-variant/30 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-title-md text-sm font-bold text-indigo-gray-900 truncate">
                        Hospital / Facility: {hospital?.name || 'Clinic & Facilities'}
                        {hospital?.city ? ` (${hospital.city})` : ''}
                      </h4>
                      <p className="text-[11px] text-indigo-gray-600">Rate cleanliness, staff, and wait time</p>
                    </div>
                  </div>

                  {/* Hospital Stars */}
                  <div className="flex flex-col items-center gap-1 py-1">
                    <div className="flex gap-1.5" role="radiogroup" aria-label="Hospital Rating" onMouseLeave={() => setHospHover(0)}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={hospRating === n}
                          aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                          onMouseEnter={() => setHospHover(n)}
                          onClick={() => setHospRating(n)}
                          className="p-1 transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              n <= activeHospRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-indigo-gray-700 h-4">{LABELS[activeHospRating]}</span>
                  </div>

                  {/* Hospital Comment */}
                  <textarea
                    value={hospComment}
                    onChange={(e) => setHospComment(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    placeholder="How was the hospital cleanliness, reception staff, and wait time? (optional)"
                    className="w-full rounded-xl bg-surface-container-lowest p-3 text-xs md:text-sm text-on-surface placeholder:text-outline border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 resize-none shadow-sm"
                  />
                </div>

                {error && (
                  <p role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold">
                    {error}
                  </p>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-5 py-2.5 rounded-full text-xs font-bold text-indigo-gray-600 hover:bg-surface-container transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={pending || !docRating}
                    className="px-6 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-60"
                  >
                    {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
                    {existing ? 'Update Feedback' : 'Submit Feedback'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <span className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </span>
                <div>
                  <h4 className="font-title-md text-base font-bold text-on-surface">Thank You For Your Review!</h4>
                  <p className="text-xs text-on-surface-variant max-w-sm mt-1">
                    Your feedback for {doctorName}{hospital?.name ? ` and ${hospital.name}` : ''} has been submitted and is featured on our home page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-6 py-2 rounded-full bg-vibrant-blue text-white text-xs font-bold shadow-sm"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
