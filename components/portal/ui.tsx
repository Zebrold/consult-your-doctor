import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { initials } from '@/components/patient/format'

export type Tone = 'blue' | 'teal' | 'coral' | 'neutral'

// Status badges: a tinted background with a hairline ring, one meaning per colour
// (blue = info, teal = done/ok, coral = needs action, neutral = everything else).
const chipTones: Record<Tone, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  teal: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  coral: 'bg-red-50 text-red-700 ring-red-600/15',
  neutral: 'bg-slate-50 text-slate-600 ring-slate-500/15',
}

export function Chip({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset whitespace-nowrap ${chipTones[tone]} ${className}`}>
      {children}
    </span>
  )
}

export function Avatar({ name, image, className = 'w-10 h-10 text-sm', square }: { name: string | null; image?: string | null; className?: string; square?: boolean }) {
  const shape = square ? 'rounded-lg' : 'rounded-full'
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name ?? ''} className={`${className} ${shape} object-cover shrink-0 bg-slate-100`} />
  }
  return (
    <span className={`${className} ${shape} shrink-0 bg-slate-100 text-slate-600 font-semibold flex items-center justify-center`}>
      {initials(name)}
    </span>
  )
}

export function Card({ className = '', children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={`bg-white rounded-xl p-4 md:p-6 border border-slate-200 ${className}`}>
      {children}
    </section>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const noteColors: Record<Tone, string> = { blue: 'text-blue-700', teal: 'text-emerald-700', coral: 'text-red-700', neutral: 'text-slate-500' }

export function StatCard({
  label,
  value,
  note,
  noteTone = 'teal',
  icon: Icon,
  footer,
  alert,
}: {
  label: string
  value: ReactNode
  note?: ReactNode
  noteTone?: Tone
  icon: LucideIcon
  /** No longer drawn; still accepted from existing callers. */
  tone?: Tone
  footer?: ReactNode
  alert?: boolean
}) {
  return (
    <div className={`bg-white p-4 md:p-5 rounded-xl border flex flex-col justify-between gap-3 ${alert ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-medium ${alert ? 'text-red-700' : 'text-slate-500'}`}>{label}</span>
        <Icon className={`w-4 h-4 shrink-0 ${alert ? 'text-red-500' : 'text-slate-400'}`} />
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`text-2xl md:text-[28px] font-semibold tracking-tight leading-none tabular-nums ${alert ? 'text-red-700' : 'text-slate-900'}`}>
          {value}
        </span>
        {note && <span className={`text-sm font-medium ${noteColors[noteTone]}`}>{note}</span>}
      </div>
      {footer}
    </div>
  )
}

/** Thin bar split into coloured segments (values are counts, not percentages). */
export function SegmentBar({ parts }: { parts: { value: number; className: string; label: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  return (
    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex" role="img" aria-label={parts.map((p) => `${p.value} ${p.label}`).join(', ')}>
      {total > 0 && parts.map((p) => p.value > 0 && <div key={p.label} className={`${p.className} h-full`} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.value} ${p.label}`} />)}
    </div>
  )
}

/** Single progress bar; pct is clamped to 0–100. */
export function ProgressBar({ pct, className = 'bg-primary', label }: { pct: number; className?: string; label?: string }) {
  const width = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden" role="img" aria-label={label ?? `${width}%`}>
      <div className={`${className} h-full rounded-full`} style={{ width: `${width}%` }} />
    </div>
  )
}

/** "+12% vs last month · Last month: 9" row used under stat cards. */
export function StatFooterRow({ left, right, tone = 'teal' }: { left: ReactNode; right?: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className={`font-medium flex items-center gap-1 min-w-0 ${noteColors[tone]}`}>{left}</span>
      {right && <span className="text-slate-500 text-right shrink-0">{right}</span>}
    </div>
  )
}

/** Metric tile from the patients pages: label + icon, big value with a note, and a footer line. */
export function MetricCard({
  label,
  value,
  note,
  noteTone = 'teal',
  icon: Icon,
  footer,
  alert,
}: {
  label: string
  value: string
  note?: string
  noteTone?: 'teal' | 'coral'
  icon: LucideIcon
  /** No longer drawn; still accepted from existing callers. */
  tint?: string
  footer: ReactNode
  alert?: boolean
  /** No longer drawn; still accepted from existing callers. */
  glow?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl p-4 md:p-5 border flex flex-col justify-between gap-2 ${alert ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-medium ${alert ? 'text-red-700' : 'text-slate-500'}`}>{label}</span>
        <Icon className={`w-4 h-4 shrink-0 ${alert ? 'text-red-500' : 'text-slate-400'}`} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-semibold tracking-tight tabular-nums ${alert ? 'text-red-700' : 'text-slate-900'}`}>{value}</span>
        {note && <span className={`text-sm font-medium ${alert || noteTone === 'coral' ? 'text-red-700' : 'text-emerald-700'}`}>{note}</span>}
      </div>
      <div className="text-xs text-slate-500">{footer}</div>
    </div>
  )
}

export function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="p-6 rounded-lg border border-dashed border-slate-200 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
      <Icon className="w-6 h-6 text-slate-400" />
      {children}
    </div>
  )
}
