'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown } from 'lucide-react'
import { btnOutline } from './workspace-ui'

/** An outline button ("Last 6 months ⌄") opening a short white list of links, like the header's Corporate menu. */
export function RangeMenu({ label, options }: { label: string; options: { href: string; label: string; active: boolean }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div ref={ref} className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOpen(false)}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="true" className={btnOutline}>
        {label}
        <ChevronDown className={`w-[15px] h-[15px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2.4} aria-hidden />
      </button>
      <div className={`absolute right-0 top-full pt-2 z-30 transition-all duration-150 ${open ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 -translate-y-1'}`}>
        <ul className="w-[200px] py-2 rounded-lg bg-white border border-[#E4E7EC] shadow-[0_12px_28px_-8px_rgba(11,27,63,0.22)]">
          {options.map((o) => (
            <li key={o.href}>
              <Link
                href={o.href}
                scroll={false}
                tabIndex={open ? 0 : -1}
                aria-current={o.active ? 'true' : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-5 py-2.5 text-[14.5px] transition-colors hover:bg-[#F4F6FB] ${o.active ? 'font-bold text-[#2A4DD0]' : 'font-medium text-[#3D4250] hover:text-[#2A4DD0]'}`}
              >
                <span className="flex-1">{o.label}</span>
                {o.active && <Check className="w-4 h-4" strokeWidth={2.8} aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
