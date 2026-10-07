'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { BookConsultationForm } from '@/components/BookConsultationForm'

type Kind = 'consultation' | 'diagnostics'

/**
 * The home page hero's two booking buttons. Each opens the booking form (city, hospital or lab, and the rest) in a
 * dialog. `initial` opens it straight away, for links such as /?booking=diagnostics.
 */
export function HomeHeroActions({ initial }: { initial?: Kind }) {
  const [open, setOpen] = useState<Kind | null>(initial ?? null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-5">
        <button
          type="button"
          onClick={() => setOpen('consultation')}
          className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-vibrant-blue hover:bg-primary text-on-primary text-lg font-semibold shadow-[0_10px_24px_rgba(0,102,255,0.28)] hover:shadow-[0_12px_28px_rgba(0,102,255,0.36)] active:scale-[0.98] transition-all"
        >
          Book Consultation <ArrowRight className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setOpen('diagnostics')}
          className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-surface-container-lowest border-2 border-vibrant-blue/70 hover:border-vibrant-blue hover:bg-primary-fixed/30 text-vibrant-blue text-lg font-semibold active:scale-[0.98] transition-all"
        >
          Book Diagnostics <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={open === 'consultation' ? 'Book a consultation' : 'Book diagnostics'}>
          <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/55 backdrop-blur-sm" onClick={() => setOpen(null)} />
          <div className="relative w-full sm:max-w-[480px]">
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute -top-12 right-3 sm:right-0 w-10 h-10 rounded-full bg-surface-container-lowest hover:bg-surface-container shadow-md flex items-center justify-center text-on-surface"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-2xl">
              <BookConsultationForm key={open} defaultType={open} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
