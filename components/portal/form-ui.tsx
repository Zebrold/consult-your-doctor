import type { ReactNode } from 'react'

// Form pieces for the staff workspaces' new pages (branches, leave, equipment, badges): a labelled field, a text box,
// and pill buttons for a choice, after the DeskHos*/DeskDoc* exports.

export const input =
  'block w-full h-[46px] px-3.5 rounded-[10px] border border-[#D6DDE8] bg-white text-[14px] text-[#0B1B3F] placeholder:text-[#98A2B3] outline-none focus:border-[#2A4DD0] focus:ring-4 focus:ring-[#2A4DD0]/10 transition-shadow'
export const textarea = `${input} !h-auto py-3 resize-y`

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block mb-[7px] text-[13px] font-extrabold text-[#27324A]">{label}</span>
      {children}
      {hint && <span className="block mt-1.5 text-[12px] text-[#5B667A]">{hint}</span>}
    </label>
  )
}

/** A pill in a choice row: blue when chosen. */
export const choicePill = (on: boolean) =>
  `h-[38px] px-3.5 rounded-[10px] border text-[13.5px] font-extrabold transition-colors ${on ? 'border-[#2A4DD0] bg-[#2A4DD0] text-white' : 'border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#9DB4F5]'}`

/** A radio card (a dot, a title and a line under it). */
export function RadioCard({ on, title, detail, onPick }: { on: boolean; title: string; detail?: string; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      className={`flex items-start gap-3 p-3.5 rounded-xl text-left transition-colors ${on ? 'border-2 border-[#2A4DD0] bg-[#F5F8FF]' : 'border border-[#E1E7F0] bg-white hover:border-[#9DB4F5]'}`}
    >
      <span className={`mt-0.5 w-[18px] h-[18px] shrink-0 rounded-full border-2 flex items-center justify-center ${on ? 'border-[#2A4DD0]' : 'border-[#C9D2E0]'}`}>
        {on && <span className="w-2 h-2 rounded-full bg-[#2A4DD0]" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-extrabold">{title}</span>
        {detail && <span className="block mt-0.5 text-[12.5px] text-[#5B667A]">{detail}</span>}
      </span>
    </button>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  return children ? <p className="p-3 rounded-xl bg-[#FEF3F2] text-[13px] font-bold text-[#B42318]">{children}</p> : null
}
