import type { ReactNode } from 'react'
import { Info, Phone, type LucideIcon } from 'lucide-react'
import { DeskHead, WorkBody, WorkHeader, btnSmallBlue, card } from '@/components/portal/workspace-ui'

// The executive workspace's pieces, after the DeskExe* design exports: the shared staff workspace kit
// (components/portal/workspace-ui.tsx) plus the page frame, stat cards, titled cards, tables and small labels the
// executive pages share. Phones get the blue header and one column; desktops sit right of the sidebar (ExecutiveDock).

export * from '@/components/portal/workspace-ui'

/** "3 doctors", "1 doctor" */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
/** A phone number as a tel: link target. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
export const count = (n: number) => n.toLocaleString('en-IN')

/**
 * An executive page: the phone's blue header and, on desktops, the page title with its actions on the right. Phones
 * show the actions under the header.
 */
export function ExePage({
  name,
  title,
  eyebrow,
  subtitle,
  actions,
  children,
  className = '',
}: {
  /** The signed-in executive, for the phone header's account circle. */
  name: string
  title: string
  eyebrow?: string
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <>
      <WorkHeader
        brand={{ home: '/executive/dashboard', workspace: 'Executive workspace', account: { href: '/executive/more', label: 'Account and more', name, image: null } }}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
      />
      <WorkBody>
        <DeskHead eyebrow={eyebrow} title={title} subtitle={subtitle} actions={actions} />
        {actions && <div className="lg:hidden flex flex-wrap gap-2 mb-3.5">{actions}</div>}
        <div className={`flex flex-col gap-3.5 lg:gap-5 ${className}`}>{children}</div>
      </WorkBody>
    </>
  )
}

/** A row of stat cards: two to a row on phones, `cols` on desktops. */
export function Stats({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 | 5 }) {
  const grid = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-3 xl:grid-cols-5' }[cols]
  return <section className={`grid grid-cols-2 ${grid} gap-2.5 lg:gap-4`}>{children}</section>
}

/** A stat card: label, number and a note under it (coloured when it needs attention). */
export function Stat({ label, value, note, tone, change }: { label: string; value: ReactNode; note?: ReactNode; tone?: 'ok' | 'warn' | 'high' | 'blue'; change?: ReactNode }) {
  const color = { ok: '#067647', warn: '#B54708', high: '#B42318', blue: '#2A4DD0' }[tone ?? 'ok']
  return (
    <div className={`${card} px-4 py-3.5 lg:px-5 lg:py-[18px] min-w-0`}>
      <span className="block text-[12px] lg:text-[13px] font-bold text-[#5B667A] truncate">{label}</span>
      <span className="block mt-1 lg:mt-2 text-[22px] lg:text-[28px] font-extrabold tracking-[-0.03em] leading-[1.1] tabular-nums truncate">{value}</span>
      {(note || change) && (
        <span className="flex items-center gap-1.5 mt-1 lg:mt-1.5 text-[12px] lg:text-[12.5px] font-bold text-[#5B667A] min-w-0">
          {change}
          {note && (
            <span className="truncate" style={tone ? { color } : undefined}>
              {note}
            </span>
          )}
        </span>
      )}
    </div>
  )
}

/** A white card with a title, a line under it and something on the right (a count, a link, tabs). */
export function Card({ title, sub, right, children, id, className = '' }: { title: string; sub?: ReactNode; right?: ReactNode; children: ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`${card} p-4 lg:p-[22px] min-w-0 scroll-mt-24 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2.5 lg:gap-3 mb-3 lg:mb-4">
        <div className="min-w-0">
          <h2 className="text-[16px] font-extrabold lg:tracking-[-0.01em]">{title}</h2>
          {sub && <p className="mt-0.5 lg:mt-[3px] text-[12.5px] lg:text-[13px] text-[#5B667A]">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

/** A table that scrolls sideways on narrow screens. */
export function Table({ children, min = 720 }: { children: ReactNode; min?: number }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
      <table className="w-full text-left text-[13px] lg:text-[13.5px] border-separate border-spacing-0" style={{ minWidth: min }}>
        {children}
      </table>
    </div>
  )
}
/** A table header cell: pale grey, small capitals. */
export const th = 'px-3 lg:px-3.5 py-2.5 bg-[#F7F9FC] text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[#5B667A] whitespace-nowrap first:rounded-l-[10px] last:rounded-r-[10px]'
/** A table body cell, with a hairline under it. */
export const td = 'px-3 lg:px-3.5 py-3 border-b border-[#EEF2F7] align-middle'

export type Tone = 'blue' | 'teal' | 'coral' | 'neutral' | 'primary' | 'amber'

const chipTones: Record<Tone, string> = {
  blue: 'bg-[#EEF3FF] text-[#2A4DD0]',
  primary: 'bg-[#EEF3FF] text-[#2A4DD0]',
  teal: 'bg-[#ECFDF3] text-[#067647]',
  coral: 'bg-[#FEF3F2] text-[#B42318]',
  amber: 'bg-[#FFFAEB] text-[#B54708]',
  neutral: 'bg-[#F2F4F7] text-[#5B667A]',
}
const dotTones: Record<Tone, string> = {
  blue: 'bg-[#2A4DD0]',
  primary: 'bg-[#2A4DD0]',
  teal: 'bg-[#067647]',
  coral: 'bg-[#B42318]',
  amber: 'bg-[#B54708]',
  neutral: 'bg-[#5B667A]',
}

/** A small label: a count, a tag, a state. */
export function Chip({ tone = 'neutral', dot, children, className = '' }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 h-[22px] px-2 rounded-md text-[11.5px] font-extrabold whitespace-nowrap ${chipTones[tone]} ${className}`}>
      {dot && <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${dotTones[tone]}`} />}
      {children}
    </span>
  )
}

/** HIGH / MEDIUM, as the attention tables show severity. */
export function Severity({ level }: { level: 'high' | 'medium' }) {
  return (
    <span className={`inline-flex h-6 items-center px-[9px] rounded-full text-[11.5px] font-extrabold whitespace-nowrap ${level === 'high' ? 'bg-[#FEF3F2] text-[#B42318]' : 'bg-[#F1F4F9] text-[#5B667A]'}`}>
      {level === 'high' ? 'HIGH' : 'MEDIUM'}
    </span>
  )
}

/** A grey line with an icon, for an empty list. */
export function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-[13px] text-[#5B667A]">
      <Icon className="w-7 h-7 text-[#98A2B3]" strokeWidth={1.8} aria-hidden />
      <p>{children}</p>
    </div>
  )
}

/** A blue note, e.g. how a queue works. */
export function Note({ children, icon: Icon = Info, tone = 'blue' }: { children: ReactNode; icon?: LucideIcon; tone?: 'blue' | 'amber' }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-[13px] leading-relaxed ${tone === 'blue' ? 'bg-[#EEF3FF] text-[#1E3A9E]' : 'bg-[#FFFAEB] text-[#93370D]'}`}>
      <Icon className="w-[17px] h-[17px] mt-0.5 shrink-0" strokeWidth={2.2} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** A small "Call" button for a phone number. */
export function CallLink({ phone, label = 'Call' }: { phone: string; label?: string }) {
  return (
    <a href={telHref(phone)} className={btnSmallBlue}>
      <Phone className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden />
      {label}
    </a>
  )
}

/** Horizontal bars for small breakdowns (label, count, share of the largest). */
export function BarList({ rows }: { rows: { label: string; value: number; display?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3 text-[13px]">
            <span className="text-[#27324A] truncate">{row.label}</span>
            <span className="font-extrabold whitespace-nowrap tabular-nums">{row.display ?? row.value}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#EEF2F7] overflow-hidden">
            <div className="h-full rounded-full bg-[#2A4DD0]" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A row in a list: label left, value right, hairline above. */
export function Line({ label, sub, right }: { label: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <div className="text-[13.5px] font-extrabold truncate">{label}</div>
        {sub && <div className="text-[12.5px] text-[#5B667A]">{sub}</div>}
      </div>
      {right && <div className="shrink-0 text-right text-[13.5px]">{right}</div>}
    </div>
  )
}
