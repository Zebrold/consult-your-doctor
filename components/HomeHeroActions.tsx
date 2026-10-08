'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { BookingDialog, type BookingKind } from '@/components/BookingDialog'

/**
 * The home page hero's two booking buttons. Each opens the booking form (city, hospital or lab, and the rest) in a
 * dialog. `initial` opens it straight away, for links such as /?booking=diagnostics.
 */
export function HomeHeroActions({ initial }: { initial?: BookingKind }) {
  const [open, setOpen] = useState<BookingKind | null>(initial ?? null)

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setOpen('consultation')}
          className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-vibrant-blue hover:bg-primary text-on-primary text-base md:text-[17px] font-semibold shadow-[0_10px_24px_rgba(0,102,255,0.28)] hover:shadow-[0_12px_28px_rgba(0,102,255,0.36)] active:scale-[0.98] transition-all"
        >
          Book Consultation <ArrowRight className="w-[18px] h-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => setOpen('diagnostics')}
          className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-surface-container-lowest border-2 border-vibrant-blue/70 hover:border-vibrant-blue hover:bg-primary-fixed/30 text-vibrant-blue text-base md:text-[17px] font-semibold active:scale-[0.98] transition-all"
        >
          Book Diagnostics <ArrowRight className="w-[18px] h-[18px]" />
        </button>
      </div>

      {open && <BookingDialog kind={open} onClose={() => setOpen(null)} />}
    </>
  )
}
