import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** A small context pill for the right of the TopBar (hospital name, listing status). */
export function TopBarChip({ icon: Icon, children, tone = 'plain' }: { icon?: LucideIcon; children: ReactNode; tone?: 'plain' | 'live' | 'off' }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-label-sm max-w-[260px]">
      {tone !== 'plain' && <span aria-hidden className={`w-2 h-2 rounded-full shrink-0 ${tone === 'live' ? 'bg-fresh-teal animate-pulse' : 'bg-soft-coral'}`} />}
      {Icon && <Icon className="w-3.5 h-3.5 text-vibrant-blue shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  )
}
