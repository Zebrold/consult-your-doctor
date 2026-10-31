import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, type LucideIcon } from "lucide-react";

// The public content pages (corporate, about, FAQ…), in the home page's look: a blue hero under the blue
// site header, white sections with rounded cards, and a blue banner to close.

export const SIDES = "px-4 md:px-[max(24px,10%)]";

export const btnWhite =
  "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-white text-[#1D4ED8] text-[15px] font-extrabold shadow-[0_8px_20px_rgba(4,16,70,0.25)] hover:bg-[#F2F6FF] active:scale-[0.98] transition-all";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl border-[1.5px] border-white/70 text-white text-[15px] font-extrabold hover:bg-white/10 active:scale-[0.98] transition-all";
export const btnBlue =
  "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#2A4DD0] text-white text-[15px] font-extrabold shadow-[0_8px_18px_rgba(42,77,208,0.28)] hover:bg-[#2443B8] active:scale-[0.98] transition-all";
export const btnOutline =
  "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl border-[1.5px] border-[#D6DDE8] bg-white text-[#27324A] text-[15px] font-extrabold hover:border-[#A9CBFF] hover:bg-[#F7F9FF] active:scale-[0.98] transition-all";
export const card = "rounded-[20px] bg-white shadow-[0_0_0_1px_#E6EBF3,0_1px_2px_rgba(11,27,63,0.04)]";

/** The page wrapper: the site's font and ink. */
export function SitePage({ children }: { children: ReactNode }) {
  return <div className="font-(family-name:--font-manrope) text-[#0B1B3F] bg-white">{children}</div>;
}

/** The blue band under the header: an eyebrow, the title, a line, actions, and optionally something on the right. */
export function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  lead: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-[#1D4ED8] text-white">
      <span aria-hidden className="absolute -z-10 -right-32 -top-40 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(169,203,255,0.32),rgba(169,203,255,0)_62%)]" />
      <span aria-hidden className="absolute -z-10 -left-40 -bottom-56 w-[520px] h-[520px] rounded-full border-[70px] border-white/[0.05]" />
      <div className={`${SIDES} pt-8 pb-12 md:pt-14 md:pb-20 ${aside ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14 lg:items-center" : ""}`}>
        <div className="max-w-[720px]">
          <p className="inline-flex items-center h-7 px-3 rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/25 text-[12px] font-extrabold uppercase tracking-[0.08em]">{eyebrow}</p>
          <h1 className="mt-4 text-[32px] md:text-[46px] lg:text-[52px] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance">{title}</h1>
          <p className="mt-4 text-[15.5px] md:text-[18px] leading-[1.6] text-[#DCE7FF] max-w-[600px] text-pretty">{lead}</p>
          {actions && <div className="mt-7 flex flex-col sm:flex-row gap-3">{actions}</div>}
        </div>
        {aside && <div className="mt-10 lg:mt-0">{aside}</div>}
      </div>
    </section>
  );
}

/** A section with the site's side padding. `tint` gives it the pale background between white ones. */
export function Section({ id, tint = false, children, className = "" }: { id?: string; tint?: boolean; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`${SIDES} py-12 md:py-20 scroll-mt-24 ${tint ? "bg-[#F6F8FC] border-y border-[#EEF2F7]" : ""} ${className}`}>
      {children}
    </section>
  );
}

/** A section's eyebrow, title and line. */
export function SectionHead({ eyebrow, title, lead, center = false }: { eyebrow?: string; title: ReactNode; lead?: ReactNode; center?: boolean }) {
  return (
    <div className={`max-w-[680px] ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className="text-[13px] md:text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#2A4DD0]">{eyebrow}</p>}
      <h2 className="mt-2 text-[26px] md:text-[36px] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance">{title}</h2>
      {lead && <p className="mt-3 text-[15px] md:text-[17px] leading-[1.6] text-[#4A5878] text-pretty">{lead}</p>}
    </div>
  );
}

/** A rounded icon tile in the site's pale blue. */
export function IconTile({ icon: Icon, className = "" }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={`w-12 h-12 rounded-[14px] bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center shrink-0 ${className}`}>
      <Icon className="w-[22px] h-[22px]" strokeWidth={2.1} />
    </span>
  );
}

/** A card with an icon, a title and a line. */
export function FeatureCard({ icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className={`${card} p-5 md:p-6 flex gap-4`}>
      <IconTile icon={icon} />
      <div className="min-w-0">
        <h3 className="text-[16.5px] md:text-[17px] font-extrabold">{title}</h3>
        <p className="mt-1.5 text-[14.5px] md:text-[15px] leading-[1.6] text-[#4A5878]">{children}</p>
      </div>
    </div>
  );
}

/** Numbered steps: a column on phones, a row of cards on desktops. */
export function Steps({ steps }: { steps: { icon: LucideIcon; title: string; text: string }[] }) {
  return (
    <ol className={`mt-8 md:mt-12 grid gap-3.5 md:gap-5 ${steps.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}>
      {steps.map(({ icon: Icon, title, text }, i) => (
        <li key={title} className={`${card} relative p-5 md:p-6`}>
          <div className="flex items-center justify-between">
            <IconTile icon={Icon} />
            <span className="text-[40px] leading-none font-extrabold tracking-[-0.04em] text-[#E6ECF8]">{String(i + 1).padStart(2, "0")}</span>
          </div>
          <h3 className="mt-4 text-[17px] font-extrabold">{title}</h3>
          <p className="mt-1.5 text-[14.5px] leading-[1.6] text-[#4A5878]">{text}</p>
        </li>
      ))}
    </ol>
  );
}

/** Questions that open in place. */
export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className={`${card} px-5 md:px-7`}>
      {items.map((f, i) => (
        <details key={f.q} className={`group py-5 ${i ? "border-t border-[#EEF2F7]" : ""}`}>
          <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="text-[15.5px] md:text-[17px] font-extrabold">{f.q}</span>
            <span className="w-8 h-8 rounded-full bg-[#F2F5FB] flex items-center justify-center shrink-0 group-open:bg-[#2A4DD0] group-open:text-white transition-colors">
              <ChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" strokeWidth={2.6} />
            </span>
          </summary>
          <div className="mt-3 text-[14.5px] md:text-[15px] leading-[1.65] text-[#4A5878] max-w-[760px]">{f.a}</div>
        </details>
      ))}
    </div>
  );
}

/** The blue banner that closes a page. */
export function CtaBand({ title, lead, actions }: { title: string; lead: string; actions: ReactNode }) {
  return (
    <section className={`${SIDES} pb-14 md:pb-24`}>
      <div className="relative isolate overflow-hidden rounded-[24px] md:rounded-[28px] text-white bg-[radial-gradient(120%_160%_at_0%_0%,#3566F2_0%,#1D4ED8_42%,#11309F_100%)] shadow-[0_30px_60px_-28px_rgba(29,78,216,0.65)] px-6 py-9 md:px-14 md:py-14 md:flex md:items-center md:justify-between md:gap-10">
        <span aria-hidden className="absolute -z-10 right-[-10%] -top-40 w-[460px] h-[460px] rounded-full bg-[radial-gradient(circle,rgba(169,203,255,0.38),rgba(169,203,255,0)_62%)]" />
        <div className="max-w-[560px]">
          <h2 className="text-[26px] md:text-[34px] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance">{title}</h2>
          <p className="mt-2.5 text-[15px] md:text-[16.5px] leading-[1.6] text-[#DCE7FF]">{lead}</p>
        </div>
        <div className="mt-7 md:mt-0 flex flex-col sm:flex-row gap-3 shrink-0">{actions}</div>
      </div>
    </section>
  );
}

/** "See prices →" */
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-[15px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
      {children} <ArrowRight className="w-4 h-4" strokeWidth={2.6} />
    </Link>
  );
}
