import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** A quiet context label for the right of the TopBar (hospital name, listing status). */
export function TopBarChip({ icon: Icon, children, tone = 'plain' }: { icon?: LucideIcon; children: ReactNode; tone?: 'plain' | 'live' | 'off' }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 text-sm text-slate-600 max-w-[260px]">
      {tone !== 'plain' && <span aria-hidden className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone === 'live' ? 'bg-emerald-500' : 'bg-red-500'}`} />}
      {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  )
}
