import Image from 'next/image'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

// The login pages' frame, in the site's look: on desktops a blue panel that says which portal this is, what's inside
// and the home page's picture for it, beside the white form; phones get the form as a card.

export type AuthPanel = {
  eyebrow: string
  title: string
  lead: string
  /** What the portal does, true to lib/assistant/knowledge.ts. */
  points: string[]
  art: { src: string; width: number; height: number; className: string }
}

export const authLabel = 'text-[13.5px] font-bold text-[#27324A]'
/** A field without side padding: each use adds its own (room for an icon on the left, or none). */
export const authField =
  'w-full h-12 rounded-xl bg-white border border-[#D6DDE8] text-[15px] text-[#0B1B3F] placeholder:text-[#9AA4B5] outline-none transition-shadow focus:border-[#1D4ED8] focus:ring-4 focus:ring-[#A9CBFF]/40 disabled:opacity-60'
export const authButton =
  'w-full h-12 px-6 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-[15px] font-extrabold flex items-center justify-center gap-2 shadow-[0_10px_20px_-10px_rgba(29,78,216,0.7)] transition-colors active:scale-[0.99] disabled:opacity-60 disabled:shadow-none'
export const authLink = 'font-extrabold text-[#1D4ED8] hover:underline underline-offset-4'
export const authError = 'p-3 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13.5px] font-semibold'

export function AuthShell({ panel, children }: { panel: AuthPanel; children: ReactNode }) {
  return (
    <div className="w-full max-w-[1120px] font-(family-name:--font-manrope) text-[#0B1B3F] lg:grid lg:grid-cols-2 lg:min-h-[640px] lg:rounded-[28px] lg:overflow-hidden lg:bg-white lg:shadow-[0_0_0_1px_#E6EBF3,0_40px_80px_-48px_rgba(11,27,63,0.5)]">
      <aside className="hidden lg:flex relative isolate overflow-hidden flex-col bg-[#1D4ED8] text-white px-12 xl:px-14 pt-12 xl:pt-14">
        <span aria-hidden className="absolute -z-10 -right-24 -top-32 w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(169,203,255,0.35),rgba(169,203,255,0)_62%)]" />
        <span aria-hidden className="absolute -z-10 -left-32 -bottom-40 w-[420px] h-[420px] rounded-full border-[60px] border-white/[0.05]" />
        <p className="self-start inline-flex items-center h-7 px-3 rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/25 text-[12px] font-extrabold uppercase tracking-[0.08em]">
          {panel.eyebrow}
        </p>
        <h2 className="mt-5 text-[32px] xl:text-[36px] leading-[1.12] font-extrabold tracking-[-0.025em] text-balance">{panel.title}</h2>
        <p className="mt-3 max-w-[420px] text-[15.5px] leading-[1.6] text-[#DCE7FF]">{panel.lead}</p>
        <ul className="mt-7 space-y-3">
          {panel.points.map((p) => (
            <li key={p} className="flex items-center gap-3 text-[15px] font-semibold">
              <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" strokeWidth={3.2} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <div className="relative mt-auto h-[240px] shrink-0">
          <Image
            src={panel.art.src}
            alt=""
            width={panel.art.width}
            height={panel.art.height}
            sizes="480px"
            className={`absolute left-1/2 -translate-x-1/2 max-w-none drop-shadow-[0_18px_28px_rgba(4,16,70,0.35)] ${panel.art.className}`}
          />
        </div>
      </aside>

      <div className="w-full max-w-[480px] mx-auto lg:max-w-none flex flex-col justify-center px-6 py-8 sm:p-9 lg:px-14 xl:px-16 lg:py-12 rounded-[24px] lg:rounded-none bg-white shadow-[0_0_0_1px_#E6EBF3,0_24px_48px_-32px_rgba(11,27,63,0.35)] lg:shadow-none">
        <p className="lg:hidden mb-3 text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#2A4DD0]">{panel.eyebrow}</p>
        {children}
      </div>
    </div>
  )
}

/** The art each kind of login shows: the home page's pictures. */
export const ART = {
  doctor: { src: '/images/home/doctor.webp', width: 376, height: 518, className: 'bottom-0 h-full w-auto' },
  hospital: { src: '/images/home/hospital-building.webp', width: 787, height: 357, className: 'bottom-6 w-[88%] h-auto' },
  lab: { src: '/images/home/lab-microscope.webp', width: 419, height: 395, className: 'bottom-2 h-[92%] w-auto' },
} satisfies Record<string, AuthPanel['art']>
