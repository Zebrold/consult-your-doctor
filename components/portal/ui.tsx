import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { initials } from '@/components/patient/format'

export type Tone = 'blue' | 'teal' | 'coral' | 'neutral'

const chipTones: Record<Tone, string> = {
  blue: 'bg-vibrant-blue/10 text-vibrant-blue',
  teal: 'bg-secondary-container text-on-secondary-container',
  coral: 'bg-error-container text-tertiary',
  neutral: 'bg-surface-container text-indigo-gray-600',
}

export function Chip({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold whitespace-nowrap ${chipTones[tone]} ${className}`}>
      {children}
    </span>
  )
}

export function Avatar({ name, image, className = 'w-10 h-10 text-sm', square }: { name: string | null; image?: string | null; className?: string; square?: boolean }) {
  const shape = square ? 'rounded-xl' : 'rounded-full'
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name ?? ''} className={`${className} ${shape} object-cover shrink-0 bg-surface-container`} />
  }
  return (
    <span className={`${className} ${shape} shrink-0 bg-primary-fixed text-on-primary-fixed font-bold flex items-center justify-center`}>
      {initials(name)}
    </span>
  )
}

export function Card({ className = '', children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={`bg-surface-container-lowest rounded-2xl md:rounded-xl p-4 md:p-stack-md shadow-sm border border-surface-container md:border-transparent ${className}`}>
      {children}
    </section>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3 md:mb-4">
      <div className="min-w-0">
        <h2 className="font-title-md text-[16px] md:text-title-md text-indigo-gray-900 font-bold">{title}</h2>
        {subtitle && <p className="font-label-sm text-[11px] md:text-label-sm text-indigo-gray-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const statTints: Record<Tone, string> = {
  blue: 'bg-primary-fixed text-on-primary-fixed',
  teal: 'bg-secondary-container text-on-secondary-container',
  coral: 'bg-error-container text-tertiary',
  neutral: 'bg-surface-container-high text-vibrant-blue',
}

export function StatCard({
  label,
  value,
  note,
  noteTone = 'teal',
  icon: Icon,
  tone = 'blue',
  footer,
  alert,
}: {
  label: string
  value: ReactNode
  note?: ReactNode
  noteTone?: Tone
  icon: LucideIcon
  tone?: Tone
  footer?: ReactNode
  alert?: boolean
}) {
  const noteColor = { blue: 'text-primary', teal: 'text-secondary', coral: 'text-soft-coral', neutral: 'text-indigo-gray-600' }[noteTone]
  return (
    <div
      className={`bg-surface-container-lowest p-3 md:p-stack-md rounded-xl shadow-sm border md:border-transparent flex flex-col justify-between gap-2 ${
        alert ? 'border-soft-coral/30 ring-1 ring-soft-coral/20' : 'border-surface-container'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span className={`font-label-sm text-[11px] md:text-label-sm uppercase tracking-wider ${alert ? 'text-soft-coral font-bold' : 'text-indigo-gray-600'}`}>{label}</span>
          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span className={`font-headline-lg text-[24px] md:font-display-lg md:text-display-lg font-extrabold tracking-tight leading-none ${alert ? 'text-soft-coral' : 'text-indigo-gray-900'}`}>
              {value}
            </span>
            {note && <span className={`font-label-sm text-[11px] md:text-label-sm font-semibold ${noteColor}`}>{note}</span>}
          </div>
        </div>
        <span className={`w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${statTints[tone]}`}>
          <Icon className="w-[18px] h-[18px] md:w-[26px] md:h-[26px]" />
        </span>
      </div>
      {footer}
    </div>
  )
}

/** Thin bar split into coloured segments (values are counts, not percentages). */
export function SegmentBar({ parts }: { parts: { value: number; className: string; label: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  return (
    <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden flex" role="img" aria-label={parts.map((p) => `${p.value} ${p.label}`).join(', ')}>
      {total > 0 && parts.map((p) => p.value > 0 && <div key={p.label} className={`${p.className} h-full`} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.value} ${p.label}`} />)}
    </div>
  )
}

export function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="p-6 rounded-xl bg-surface-container-low text-center text-sm text-indigo-gray-600 flex flex-col items-center gap-2">
      <Icon className="w-7 h-7 text-outline" />
      {children}
    </div>
  )
}
