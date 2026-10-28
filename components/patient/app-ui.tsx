import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

// The patient app's shared pieces: the page body, desktop page title, cards, section heads, buttons and small labels.
// Phones follow the app design (#F6F8FC page, white cards with a hairline ring); desktops sit right of the sidebar.

/** A primary button or link: blue, white text. */
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] text-[13.5px] font-extrabold whitespace-nowrap bg-[#2A4DD0] text-white shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#2443B8] active:scale-[0.98] transition-all disabled:opacity-60 disabled:shadow-none";
/** A secondary button or link: white with a grey outline. */
export const btnOutline =
  "inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] text-[13.5px] font-extrabold whitespace-nowrap border-[1.5px] border-[#D6DDE8] bg-white text-[#27324A] hover:bg-[#F4F6FA] active:scale-[0.98] transition-all";
/** A red button for a failed payment. */
export const btnDanger =
  "inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] text-[13.5px] font-extrabold whitespace-nowrap bg-[#B42318] text-white hover:bg-[#912018] active:scale-[0.98] transition-all";

/** A white card: the phone's hairline ring, the desktop's ring and soft shadow. */
export const card = "rounded-[18px] lg:rounded-2xl bg-white shadow-[0_0_0_1px_#E6EBF3] lg:shadow-[0_0_0_1px_#E6EAF0,0_1px_2px_rgba(11,27,63,0.04)]";

/** The page under the header: Manrope on the app's pale blue, room for the tab bar on phones. */
export function PageBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className={`font-(family-name:--font-manrope) text-[#0B1B3F] pb-dock lg:pb-11 ${className}`}>
      <div className="max-w-[1340px] lg:px-9 lg:pt-7">{children}</div>
    </main>
  );
}

/** The desktop page title (phones show theirs in the blue header): title, a line under it, and actions on the right. */
export function DeskTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="hidden lg:flex items-end justify-between gap-5 mb-[22px]">
      <div className="min-w-0">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em] leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-[#5B667A]">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

/** A section's title with an optional line under it and a "See all" style link on the right. */
export function SectionHead({ title, sub, href, link = "View all", id }: { title: string; sub?: ReactNode; href?: string; link?: string; id?: string }) {
  return (
    <div className="flex items-end lg:items-start justify-between gap-3 mb-3 lg:mb-3.5">
      <div className="min-w-0">
        <h2 id={id} className="text-[18px] lg:text-[16px] font-extrabold tracking-[-0.02em] lg:tracking-[-0.01em]">{title}</h2>
        {sub && <p className="mt-0.5 lg:mt-[3px] text-[12.5px] lg:text-[13px] text-[#5B667A]">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 flex items-center gap-0.5 text-[13px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
          {link}
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.6} />
        </Link>
      )}
    </div>
  );
}

/** Small grey facts with a dot before each, e.g. "• Open 24/7  • 12 doctors". */
export function Dots({ items, className = "", nowrap = false }: { items: (string | null | undefined | false)[]; className?: string; nowrap?: boolean }) {
  const shown = items.filter(Boolean) as string[];
  if (!shown.length) return null;
  return (
    <span className={`flex ${nowrap ? "" : "flex-wrap"} gap-x-3.5 gap-y-1.5 ${className}`}>
      {shown.map((t) => (
        <span key={t} className="inline-flex items-center gap-1.5 text-[10.5px] lg:text-[11.5px] font-bold text-[#4A5878] whitespace-nowrap">
          <span aria-hidden className="shrink-0 w-1 h-1 rounded-full bg-[#9AA4B5]" />
          {t}
        </span>
      ))}
    </span>
  );
}

/** A coloured status: a dot and its label. */
export function StatusDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold whitespace-nowrap" style={{ color }}>
      <span aria-hidden className="w-[7px] h-[7px] rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/** A rating in a soft green pill, e.g. "★ 4.8". */
export function RatingPill({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span className={`shrink-0 inline-flex items-center gap-[3px] px-[7px] py-0.5 rounded-[7px] bg-[#EAF7F0] text-[11.5px] font-extrabold text-[#0B1B3F] ${className}`}>
      <span className="sr-only">Rated </span>★ {rating.toFixed(1)}
    </span>
  );
}

/** A label and its value in a list row, e.g. "Booking fee · ₹119". */
export function InfoRow({ label, value, valueClass = "" }: { label: ReactNode; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-3 py-[9px] lg:py-[11px] border-t border-[#EEF2F7] text-[13px] lg:text-[13.5px]">
      <span className="text-[#5B667A]">{label}</span>
      <span className={`font-extrabold text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

/** The phone header's search box: a white field with the blue search button. Searches doctors, hospitals and labs. */
export function AppSearch({ placeholder = "Search doctors, hospitals or tests", defaultValue, hidden }: { placeholder?: string; defaultValue?: string; hidden?: Record<string, string> }) {
  return (
    <form action="/find" role="search" className="relative flex items-center gap-2.5 h-12 pl-3.5 pr-[5px] rounded-[14px] bg-white text-[#0B1B3F] shadow-[0_8px_18px_rgba(11,27,63,0.18)]">
      <Search className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
      <label htmlFor="app-search" className="sr-only">Search</label>
      <input id="app-search" type="search" name="q" defaultValue={defaultValue} placeholder={placeholder} className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] placeholder:text-[#7A8599]" />
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" aria-label="Search" className="shrink-0 w-[38px] h-[38px] rounded-[10px] bg-[#2A4DD0] text-white flex items-center justify-center active:scale-95 transition-transform">
        <Search className="w-[17px] h-[17px]" strokeWidth={2.2} />
      </button>
    </form>
  );
}

/** An empty state inside a card: a round icon, a title and a line. */
export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className={`${card} px-5 py-7 text-center`}>
      <span className="inline-flex w-12 h-12 rounded-full shadow-[inset_0_0_0_1px_#E1E7F0] items-center justify-center text-[#2A4DD0]">{icon}</span>
      <p className="mt-2.5 text-[15px] font-extrabold">{title}</p>
      {children && <div className="mt-0.5 text-[12.5px] text-[#5B667A]">{children}</div>}
    </div>
  );
}
