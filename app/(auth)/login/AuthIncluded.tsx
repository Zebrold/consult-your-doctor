'use client'

import { useState, useSyncExternalStore } from 'react'
import { Check, ChevronUp } from 'lucide-react'
import type { AuthPoint } from './AuthShell'

const DESKTOP = '(min-width: 1024px)'
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(DESKTOP)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** "See what's included": the portal's main parts, open on desktops and folded away on phones until tapped. */
export function AuthIncluded({ points }: { points: AuthPoint[] }) {
  // null: as the screen size has it (CSS decides, so nothing jumps while the page loads).
  const [open, setOpen] = useState<boolean | null>(null)
  const isDesktop = useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false)
  const expanded = open ?? isDesktop
  const shown = open === null ? 'hidden lg:block' : open ? 'block' : 'hidden'
  const chevron = open === null ? 'rotate-180 lg:rotate-0' : open ? '' : 'rotate-180'

  return (
    <div className="mt-5 lg:mt-7">
      <button
        type="button"
        onClick={() => setOpen(!expanded)}
        aria-expanded={expanded}
        aria-controls="auth-included"
        className="inline-flex items-center gap-2 text-[15px] lg:text-[16px] font-extrabold hover:text-white/90"
      >
        See what&apos;s included
        <ChevronUp className={`w-4 h-4 transition-transform duration-200 ${chevron}`} strokeWidth={2.6} />
      </button>
      <ul id="auth-included" className={`${shown} mt-4 lg:mt-5 space-y-4 lg:space-y-[18px]`}>
        {points.map((p) => (
          <li key={p.title} className="flex gap-3.5">
            <Check className="w-[18px] h-[18px] mt-[3px] shrink-0" strokeWidth={2.6} />
            <span className="min-w-0">
              <span className="block text-[15.5px] lg:text-[17px] font-extrabold leading-snug">{p.title}</span>
              <span className="block mt-0.5 text-[13.5px] lg:text-[15px] leading-snug text-[#D6E2FF]">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
