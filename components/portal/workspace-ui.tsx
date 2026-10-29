import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDownRight, ArrowLeft, ArrowUpRight, BadgeCheck, ChevronRight } from 'lucide-react'
import { initials } from '@/components/patient/format'
import { card } from '@/components/patient/app-ui'

// The staff workspaces' shared pieces (doctor and hospital), after the Doc*/DeskDoc* and Hos*/DeskHos* design exports:
// the blue phone header, the page body, white cards, stat cards with sparklines, small charts and status labels.
// Phones follow the 390px app design; from lg up the page sits right of the blue sidebar (DoctorDock, HospitalDock) on
// the pale grey desk background.

export { btnPrimary, btnOutline, card, InfoRow } from '@/components/patient/app-ui'

/** A small outline button for rows (Open record, Write Rx). */
export const btnSmall =
  'inline-flex items-center justify-center gap-1.5 h-[34px] px-3 rounded-[10px] text-[12.5px] font-extrabold whitespace-nowrap border border-[#D6DDE8] bg-white text-[#27324A] hover:bg-[#F4F6FA] active:scale-[0.98] transition-all'
/** A small blue-outline button (Call in, Write Rx in the waiting room). */
export const btnSmallBlue =
  'inline-flex items-center justify-center gap-1.5 h-[34px] px-3 rounded-[10px] text-[12.5px] font-extrabold whitespace-nowrap border-[1.5px] border-[#2A4DD0] bg-white text-[#2A4DD0] hover:bg-[#EEF3FF] active:scale-[0.98] transition-all disabled:opacity-60'

/** A segmented tab (desktop): white and blue when chosen. */
export const segTab = (on: boolean) =>
  `h-[34px] px-3.5 rounded-[9px] text-[13px] font-extrabold whitespace-nowrap transition-colors ${on ? 'bg-white text-[#2A4DD0] shadow-[0_1px_2px_rgba(11,27,63,0.12),0_0_0_1px_#E1E7F0]' : 'text-[#5B667A] hover:text-[#0B1B3F]'}`
export const segGroup = 'inline-flex gap-1 p-1 rounded-xl bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0]'
/** An underlined tab (phones). */
export const lineTab = (on: boolean) =>
  `flex-1 h-[42px] text-[13px] whitespace-nowrap transition-colors ${on ? 'text-[#2A4DD0] font-extrabold shadow-[inset_0_-2.5px_0_#2A4DD0]' : 'text-[#5B667A] font-bold'}`

/** A visit's status as the doctor screens name and colour it. */
export function visitStatus(status: string): { label: string; color: string } {
  switch (status) {
    case 'visited':
      return { label: 'Checked in', color: '#067647' }
    case 'completed':
      return { label: 'Completed', color: '#5B667A' }
    case 'pending_payment':
      return { label: 'Awaiting payment', color: '#B54708' }
    case 'cancelled':
      return { label: 'Cancelled', color: '#98A2B3' }
    default:
      return { label: 'Booked', color: '#2A4DD0' }
  }
}

/** Coloured status text, with a dot before it unless `dot` is off. */
export function Status({ status, label, color, dot = true, className = '' }: { status?: string; label?: string; color?: string; dot?: boolean; className?: string }) {
  const s = status ? visitStatus(status) : { label: label ?? '', color: color ?? '#5B667A' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] lg:text-[12.5px] font-extrabold whitespace-nowrap ${className}`} style={{ color: s.color }}>
      {dot && <span aria-hidden className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: s.color }} />}
      {label ?? s.label}
    </span>
  )
}

/** A round avatar: the photo, or initials in blue on white with a grey ring. */
export function Initials({ name, image, className = 'w-9 h-9 text-[12px]' }: { name: string | null; image?: string | null; className?: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className={`${className} rounded-full object-cover shrink-0 bg-[#EEF2F7]`} />
  }
  return (
    <span aria-hidden className={`${className} shrink-0 rounded-full bg-white text-[#2A4DD0] shadow-[inset_0_0_0_1.5px_#D6DDE8] flex items-center justify-center font-extrabold`}>
      {initials(name)}
    </span>
  )
}

/** The blue tick next to a doctor's name, for doctors with a registration number on file. */
export function Verified({ size = 20 }: { size?: number }) {
  return <BadgeCheck role="img" aria-label="Registration on file" width={size} height={size} className="shrink-0 fill-[#1D9BF0] text-white" strokeWidth={2.2} />
}

/** Which workspace a phone header belongs to: where the logo goes, its name, and the account circle on the right. */
export type WorkBrand = {
  home: string
  /** "Doctor workspace", "Hospital workspace" */
  workspace: string
  account: { href: string; label: string; name: string; image: string | null }
}

/** The brand row of the phone header: the logo and name, then the account's photo or initials. */
function BrandRow({ brand }: { brand: WorkBrand }) {
  return (
    <div className="flex items-center gap-2.5">
      <Link href={brand.home} aria-label={brand.workspace} className="flex-1 min-w-0 flex items-center gap-2.5">
        <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="30px" priority className="w-[30px] h-[30px] object-contain shrink-0" />
        <span className="min-w-0 leading-tight">
          <span className="block font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[18px] font-bold tracking-[-0.01em] truncate">Consult your Doctor</span>
          <span className="block text-[11.5px] text-[#CFDCFF]">{brand.workspace}</span>
        </span>
      </Link>
      <Link href={brand.account.href} aria-label={brand.account.label} className="shrink-0 w-10 h-10 rounded-full bg-white text-[#2A4DD0] flex items-center justify-center text-[14px] font-extrabold overflow-hidden active:scale-95 transition-transform">
        {brand.account.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.account.image} alt="" className="w-full h-full object-cover" />
        ) : (
          initials(brand.account.name)
        )}
      </Link>
    </div>
  )
}

const headerShell = 'lg:hidden bg-[#2A4DD0] text-white rounded-b-[28px] px-[18px] pt-[calc(env(safe-area-inset-top)+16px)] pb-[22px] print:hidden'

/** The phone's blue header: brand row, then the page's title. Desktops show the sidebar and a DeskHead instead. */
export function WorkHeader({
  brand,
  title,
  eyebrow,
  titleExtra,
  subtitle,
  children,
  avatar,
}: {
  brand: WorkBrand
  title: string
  /** A small line above the title, e.g. "Good morning,". */
  eyebrow?: string
  /** After the title on the same line, e.g. the verified tick. */
  titleExtra?: ReactNode
  subtitle?: ReactNode
  /** Under the title, inside the blue: a search box, a switch. */
  children?: ReactNode
  /** A large photo beside the title (the profile page). */
  avatar?: ReactNode
}) {
  const heading = (
    <>
      <h1 className={`${eyebrow ? 'mt-0.5 text-[26px] leading-[1.15]' : avatar ? 'text-[22px] leading-tight' : 'mt-5 text-[24px] leading-tight'} flex items-center gap-2 font-extrabold tracking-[-0.02em]`}>
        <span className="min-w-0 truncate">{title}</span>
        {titleExtra}
      </h1>
      {subtitle && <div className={`${avatar ? '' : 'mt-1'} text-[13px] text-[#DCE6FF]`}>{subtitle}</div>}
    </>
  )
  return (
    <header className={headerShell}>
      <div className="md:max-w-[720px] md:mx-auto">
        <BrandRow brand={brand} />
        {eyebrow && <p className="mt-[22px] text-[13.5px] text-[#CFDCFF]">{eyebrow}</p>}
        {avatar ? (
          <div className="flex items-center gap-3.5 mt-5">
            {avatar}
            <div className="min-w-0">{heading}</div>
          </div>
        ) : (
          heading
        )}
        {children && <div className="mt-3.5">{children}</div>}
      </div>
    </header>
  )
}

/** The phone header for a page under another (a patient record, a prescription): a back arrow, a title and actions. */
export function WorkBackHeader({ backHref, backLabel, title, action, children }: { backHref: string; backLabel: string; title: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <header className={`${headerShell} !px-3.5 !pt-[calc(env(safe-area-inset-top)+14px)]`}>
      <div className="md:max-w-[720px] md:mx-auto">
        <div className="flex items-center gap-2">
          <Link href={backHref} aria-label={backLabel} className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:bg-white/10">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
          </Link>
          <span className="flex-1 min-w-0 text-[16px] font-extrabold truncate">{title}</span>
          {action}
        </div>
        {children}
      </div>
    </header>
  )
}

/** The page under the header: room for the tab bar on phones; on desktops, the padded column right of the sidebar. */
export function WorkBody({ children, className = '', bar = true }: { children: ReactNode; className?: string; bar?: boolean }) {
  return (
    <main className={`${bar ? 'pb-[calc(96px+env(safe-area-inset-bottom))]' : 'pb-[calc(110px+env(safe-area-inset-bottom))]'} lg:pb-11`}>
      <div className={`px-4 pt-3.5 md:max-w-[720px] md:mx-auto lg:max-w-[1340px] lg:mx-0 lg:px-9 lg:pt-7 ${className}`}>{children}</div>
    </main>
  )
}

/** The desktop page title with a line under it and actions on the right (phones show the title in the blue header). */
export function DeskHead({ eyebrow, title, titleExtra, subtitle, actions }: { eyebrow?: string; title: string; titleExtra?: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="hidden lg:flex items-end justify-between gap-5 mb-[22px]">
      <div className="min-w-0">
        {eyebrow && <p className="text-[14px] font-bold text-[#5B667A]">{eyebrow}</p>}
        <h1 className={`${eyebrow ? 'mt-1' : ''} flex items-center gap-2 text-[26px] font-extrabold tracking-[-0.02em] leading-tight`}>
          {title}
          {titleExtra}
        </h1>
        {subtitle && <p className="mt-1 text-[14px] text-[#5B667A]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  )
}

/** A white card. */
export function Panel({ children, className = '', id, label }: { children: ReactNode; className?: string; id?: string; label?: string }) {
  return (
    <section id={id} aria-label={label} className={`${card} p-4 lg:p-[22px] ${className}`}>
      {children}
    </section>
  )
}

/** A card's title, an optional line under it, and something on the right (a count, a link). */
export function PanelHead({ title, sub, right, className = 'mb-2 lg:mb-3.5' }: { title: string; sub?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-start justify-between gap-2.5 lg:gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[16px] font-extrabold lg:tracking-[-0.01em]">{title}</h2>
        {sub && <p className="mt-0.5 lg:mt-[3px] text-[12.5px] lg:text-[13px] text-[#5B667A]">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/** "Full schedule ›" */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="shrink-0 flex items-center gap-0.5 lg:gap-1 text-[13px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
      {children}
      <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.6} />
    </Link>
  )
}

/** Three readings side by side between hairlines, e.g. BP / SpO₂ / Pulse. */
export function Readings({ items, className = '', big = false }: { items: { k: string; v: string | null }[]; className?: string; big?: boolean }) {
  return (
    <div className={`grid grid-cols-3 ${className}`}>
      {items.map((r, i) => (
        <span key={r.k} className={`min-w-0 py-2.5 ${i ? 'pl-3 border-l border-[#EEF2F7]' : ''}`}>
          <span className="block text-[11.5px] font-bold text-[#5B667A]">{r.k}</span>
          <span className={`block truncate font-extrabold ${big ? 'text-[15px]' : 'text-[14px] lg:text-[15px]'} ${r.v ? '' : 'text-[#98A2B3]'}`}>{r.v ?? '—'}</span>
        </span>
      ))}
    </div>
  )
}

/** A grey line for an empty list. */
export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="py-3 text-[13px] text-[#5B667A] border-t border-[#EEF2F7]">{children}</p>
}

/** A small line chart of a series, the last point marked. */
export function Sparkline({ values, width = 96, height = 34 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const x = (i: number) => 2 + (i * (width - 4)) / (values.length - 1)
  const y = (v: number) => (max === min ? height / 2 + 1 : height - 3 - ((v - min) / (max - min)) * (height - 8))
  const points = values.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
  const line = `M${points.join(' L')}`
  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <path d={`${line} L${x(values.length - 1).toFixed(1)} ${height} L2 ${height} Z`} fill="#EEF3FF" />
      <path d={line} fill="none" stroke="#2A4DD0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3" fill="#2A4DD0" />
    </svg>
  )
}

export type Delta = { text: string; dir: 'up' | 'down' | 'flat'; good: boolean }

/** A change against an earlier period: "+2", "-3", "33%", with an arrow; green when it's good news. */
export function delta(now: number, before: number, { percent = false, higherIsGood = true } = {}): Delta {
  const diff = now - before
  const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  const text = percent && before > 0 ? `${Math.round((Math.abs(diff) / before) * 100)}%` : `${diff > 0 ? '+' : ''}${diff}`
  return { text, dir, good: dir === 'flat' || (dir === 'up') === higherIsGood }
}

/** A desktop stat card: label, number, change and note, and a sparkline (or `extra`) on the right. */
export function StatCard({ label, value, change, note, series, extra }: { label: string; value: ReactNode; change?: Delta; note?: ReactNode; series?: number[]; extra?: ReactNode }) {
  const color = !change || change.dir === 'flat' ? '#5B667A' : change.good ? '#067647' : '#B42318'
  const Arrow = change?.dir === 'down' ? ArrowDownRight : ArrowUpRight
  return (
    <div className={`${card} px-5 py-[18px] min-w-0`}>
      <span className="block text-[13px] font-bold text-[#5B667A] truncate">{label}</span>
      <div className="flex items-end justify-between gap-2 mt-2">
        <span className="min-w-0">
          <span className="block text-[28px] font-extrabold tracking-[-0.03em] leading-[1.1] tabular-nums">{value}</span>
          <span className="flex items-center gap-1 mt-1.5 text-[12.5px] font-bold text-[#5B667A] whitespace-nowrap">
            {change && (
              <span className="inline-flex items-center gap-0.5 font-extrabold" style={{ color }}>
                {change.dir !== 'flat' && <Arrow className="w-[13px] h-[13px]" strokeWidth={2.6} />}
                {change.text}
              </span>
            )}
            <span className="truncate">{note}</span>
          </span>
        </span>
        {extra ?? (series && <Sparkline values={series} />)}
      </div>
    </div>
  )
}

/** A ring showing a share, with the number in the middle. */
export function Donut({ pct, size = 110, label = 'booked' }: { pct: number; size?: number; label?: string }) {
  const stroke = 9
  const r = size / 2 - 8
  const c = 2 * Math.PI * r
  const shown = Math.max(0, Math.min(100, pct))
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F7" strokeWidth={stroke} />
        {shown > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A4DD0" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c.toFixed(1)} strokeDashoffset={(c * (1 - shown / 100)).toFixed(1)} />
        )}
      </svg>
      <span className="text-center">
        <span className="block text-[19px] font-extrabold">{Math.round(shown)}%</span>
        <span className="block text-[10.5px] font-bold text-[#5B667A]">{label}</span>
      </span>
    </span>
  )
}

/** A bar chart: grey bars with the `active` one blue, and a few gridlines. */
export function BarChart({ bars, label, width = 520, height = 190 }: { bars: { label: string; value: number; active?: boolean }[]; label: string; width?: number; height?: number }) {
  const top = 10
  const base = height - 20
  const max = Math.max(3, Math.ceil(Math.max(0, ...bars.map((b) => b.value)) / 3) * 3)
  const ticks = [max, (max * 2) / 3, max / 3, 0]
  const left = 36
  const step = (width - left) / bars.length
  const y = (v: number) => base - (v / max) * (base - top)
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} className="block w-full h-auto">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={width} y1={y(t)} y2={y(t)} stroke="#EEF2F7" />
          <text x="0" y={y(t) + 4} fontSize="11" fill="#8A94A6">
            {Number.isInteger(t) ? t : t.toFixed(1)}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const cx = left + step * i + step / 2
        return (
          <g key={b.label}>
            <title>{`${b.label}: ${b.value}`}</title>
            <rect x={cx - 14} y={y(b.value)} width="28" height={Math.max(0, base - y(b.value))} rx="5" fill={b.active ? '#2A4DD0' : '#C9D5F2'} />
            <text x={cx} y={height - 4} fontSize="11" textAnchor="middle" fill="#5B667A">
              {b.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** A thin progress bar. */
export function Meter({ pct, label }: { pct: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="h-2 rounded-full bg-[#EEF2F7] overflow-hidden">
      <span className="block h-full bg-[#2A4DD0] rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

/** A row in a list: a label on the left and a bold value on the right, between hairlines. */
export function Row({ label, children, className = '' }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`flex justify-between gap-3 py-2.5 lg:py-[11px] border-t border-[#EEF2F7] text-[13px] lg:text-[13.5px] ${className}`}>
      <span className="text-[#5B667A] shrink-0">{label}</span>
      <span className="font-extrabold text-right min-w-0 break-words">{children}</span>
    </div>
  )
}
