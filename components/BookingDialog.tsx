'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { BookConsultationForm } from '@/components/BookConsultationForm'

export type BookingKind = 'consultation' | 'diagnostics'

/** The booking form (city, hospital or lab, and the rest) in a dialog, used by the hero and the header's Book Now. */
export function BookingDialog({ kind, onClose }: { kind: BookingKind; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={kind === 'consultation' ? 'Book a consultation' : 'Book diagnostics'}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-[480px]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-12 right-3 sm:right-0 w-10 h-10 rounded-full bg-surface-container-lowest hover:bg-surface-container shadow-md flex items-center justify-center text-on-surface"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-2xl">
          <BookConsultationForm key={kind} defaultType={kind} />
        </div>
      </div>
    </div>
  )
}
