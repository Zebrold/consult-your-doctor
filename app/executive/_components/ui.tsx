import type { LucideIcon } from 'lucide-react'

export type Tone = 'blue' | 'teal' | 'coral' | 'neutral' | 'primary'

const chipTones: Record<Tone, string> = {
  blue: 'bg-vibrant-blue/10 text-vibrant-blue',
  primary: 'bg-surface-container text-primary',
  teal: 'bg-fresh-teal/15 text-secondary',
  coral: 'bg-soft-coral/10 text-soft-coral',
  neutral: 'bg-surface-container-high text-indigo-gray-900',
}

const iconTones: Record<Tone, string> = {
  blue: 'bg-vibrant-blue/10 text-vibrant-blue',
  primary: 'bg-surface-container text-primary',
  teal: 'bg-fresh-teal/15 text-secondary',
  coral: 'bg-soft-coral/10 text-soft-coral',
  neutral: 'bg-surface-container-high text-indigo-gray-900',
}

const barTones: Record<Tone, string> = {
  blue: 'bg-vibrant-blue',
  primary: 'bg-primary',
  teal: 'bg-fresh-teal',
  coral: 'bg-soft-coral',
  neutral: 'bg-indigo-gray-600',
}

export function Chip({ tone = 'neutral', dot, children }: { tone?: Tone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-semibold whitespace-nowrap ${chipTones[tone]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${barTones[tone]}`} />}
      {children}
    </span>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: React.ReactNode
}) {
  return (
    <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-stack-md bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm">
      <div className="flex flex-col gap-2 max-w-3xl">
        <span className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm tracking-wide shadow-sm uppercase">
          <span className="w-2 h-2 rounded-full bg-fresh-teal" />
          {eyebrow}
        </span>
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-indigo-gray-900 tracking-tight">{title}</h1>
        <p className="font-body-md text-body-md text-indigo-gray-600">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
    </section>
  )
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  badge,
  footer,
  progress,
}: {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  tone?: Tone
  badge?: React.ReactNode
  footer?: React.ReactNode
  progress?: number
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="font-label-sm text-label-sm uppercase text-indigo-gray-600 tracking-wider">{label}</span>
        <span className={`p-2 rounded-xl shrink-0 ${iconTones[tone]}`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-display-lg text-4xl md:text-[40px] leading-none font-extrabold text-indigo-gray-900 tracking-tight">{value}</span>
          {badge}
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
          <div className={`h-full rounded-full ${barTones[tone]}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
      {footer && <div className="flex items-center justify-between gap-2 text-indigo-gray-600 font-label-sm text-label-sm">{footer}</div>}
    </div>
  )
}

export function Panel({
  title,
  icon: Icon,
  description,
  aside,
  className = '',
  id,
  children,
}: {
  title: string
  icon?: LucideIcon
  description?: string
  aside?: React.ReactNode
  className?: string
  id?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className={`bg-surface-container-lowest rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col gap-6 scroll-mt-24 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-6 h-6 text-vibrant-blue shrink-0" />}
            <h2 className="font-title-md text-title-md text-indigo-gray-900">{title}</h2>
          </div>
          {description && <p className="font-body-md text-label-sm text-indigo-gray-600 mt-1">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-indigo-gray-600">
      <Icon className="w-8 h-8 text-outline" />
      <p className="font-body-md text-sm">{children}</p>
    </div>
  )
}

/** Horizontal bars for small categorical breakdowns (label, count, share of the largest). */
export function BarList({ rows, tone = 'blue' }: { rows: { label: string; value: number; display?: string }[]; tone?: Tone }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3 font-label-sm text-label-sm">
            <span className="text-on-surface truncate">{row.label}</span>
            <span className="font-semibold text-indigo-gray-900 whitespace-nowrap">{row.display ?? row.value}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
            <div className={`h-full rounded-full ${barTones[tone]}`} style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
