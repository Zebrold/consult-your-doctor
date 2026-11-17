'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Check, LoaderCircle, X } from 'lucide-react'

// A full form dialog in the look of the hospital's Add doctor dialog (the user's DeskHosAddDoctor design,
// app/hospital/_components/DoctorDialogs.tsx): a white sheet with the title and a close button, a step strip, numbered
// sections of bordered fields, and Cancel / Save in a footer that stays in view. Full screen on phones.

export const dlgLabel = 'block mb-1.5 text-[13px] font-extrabold text-[#27324A]'
export const dlgInput =
  'block w-full h-[46px] px-3.5 rounded-xl border border-[#D6DDE8] bg-white text-[14.5px] text-[#0B1B3F] placeholder:text-[#8A94A6] outline-none focus:border-[#2A4DD0] focus:ring-2 focus:ring-[#2A4DD0]/15 disabled:opacity-60 transition-shadow'
export const dlgHint = 'block mt-1.5 text-[12.5px] leading-[1.45] text-[#5B667A]'
const btn = 'inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] text-[13.5px] font-extrabold whitespace-nowrap transition-colors disabled:opacity-60'
export const dlgBtnBlue = `${btn} bg-[#2A4DD0] text-white shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#2443B8]`
export const dlgBtnLine = `${btn} border border-[#D6DDE8] bg-white text-[#27324A] hover:bg-[#F4F6FA]`
/** A choice button in a row of two (radio style): blue when chosen. */
export const dlgChip = (on: boolean) =>
  `inline-flex items-center justify-center gap-1.5 min-h-[46px] px-3.5 py-2 rounded-[10px] border text-[13.5px] font-extrabold text-center transition-colors ${
    on ? 'border-[#2A4DD0] bg-[#2A4DD0] text-white' : 'border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#A9BCEF]'
  }`

/** The red star after a required field's label. */
export function Req() {
  return <span className="text-[#B42318]"> *</span>
}

/** A labelled field: the label (with a star when required), the control, and an optional line under it. */
export function DlgField({ label, required = false, hint, className = '', children }: { label: string; required?: boolean; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={dlgLabel}>
        {label}
        {required && <Req />}
      </span>
      {children}
      {hint && <span className={dlgHint}>{hint}</span>}
    </label>
  )
}

/** A rupee amount box: "₹" on the left, the number input (give it `dlgBareInput`) beside it. */
export function DlgRupee({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-[46px] rounded-xl border border-[#D6DDE8] bg-white overflow-hidden focus-within:border-[#2A4DD0] focus-within:ring-2 focus-within:ring-[#2A4DD0]/15">
      <span className="shrink-0 flex items-center px-3 bg-[#F7F9FC] border-r border-[#D6DDE8] text-[14px] font-extrabold text-[#27324A]">₹</span>
      {children}
    </span>
  )
}
export const dlgBareInput = 'flex-1 min-w-0 border-0 outline-none bg-transparent px-3.5 text-[14.5px] text-[#0B1B3F] placeholder:text-[#8A94A6]'

/** One numbered card of fields. */
export function DlgSection({ n, title, sub, children }: { n: number; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="px-4 py-[18px] sm:px-6 sm:py-[22px] rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0]">
      <div className="flex gap-3 items-start mb-[18px]">
        <span className="shrink-0 w-7 h-7 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[13px] font-extrabold">{n}</span>
        <div>
          <h3 className="text-[15.5px] font-extrabold">{title}</h3>
          <p className="mt-0.5 text-[13px] text-[#5B667A]">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

/** Two fields a row on wider screens, one on phones. */
export function DlgGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] items-start">{children}</div>
}

export function DlgError({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="p-3.5 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13.5px] font-bold">
      {children}
    </p>
  )
}

/** The sections of a form, then the footer with Cancel and the submit button. */
export function DlgForm({
  onSubmit,
  onCancel,
  pending,
  submitLabel,
  submitIcon,
  error,
  children,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  pending: boolean
  submitLabel: string
  submitIcon?: ReactNode
  error?: ReactNode
  children: ReactNode
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col gap-[18px] px-3 sm:px-7 py-5 sm:py-6">
        {children}
        <DlgError>{error}</DlgError>
      </div>
      <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-7 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t border-[#E6EAF0]">
        <span className="text-[12.5px] font-bold text-[#5B667A]">
          Fields marked <span className="text-[#B42318]">*</span> are required
        </span>
        <span className="flex gap-2.5 sm:ml-auto">
          <button type="button" onClick={onCancel} className={`${dlgBtnLine} flex-1 sm:flex-none`}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={`${dlgBtnBlue} flex-1 sm:flex-none`}>
            {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : submitIcon}
            {submitLabel}
          </button>
        </span>
      </div>
    </form>
  )
}

export type DlgStep = { label: string; sub: string }

/**
 * The dialog itself: the title and close button, the step strip (all ticked once `done`), and its content. Escape
 * closes it.
 */
export function FormDialog({
  title,
  subtitle,
  steps,
  done = false,
  width = 920,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  steps?: DlgStep[]
  done?: boolean
  width?: 640 | 920
  onClose: () => void
  children: ReactNode
}) {
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    // The page behind stays still while the dialog scrolls.
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [])

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] overflow-y-auto bg-[rgba(11,27,63,0.55)] backdrop-blur-[3px] font-(family-name:--font-manrope) text-[#0B1B3F]">
      <div
        className={`relative min-h-full sm:min-h-0 w-full sm:my-10 sm:mx-auto sm:rounded-[20px] bg-white shadow-[0_24px_60px_rgba(11,27,63,0.28),0_0_0_1px_rgba(11,27,63,0.06)] overflow-hidden ${
          width === 640 ? 'sm:w-[min(640px,calc(100%-32px))]' : 'sm:w-[min(920px,calc(100%-32px))]'
        }`}
      >
        <div className="flex items-start justify-between gap-4 px-4 sm:px-7 pt-[22px] sm:pt-[26px] pb-5">
          <div className="min-w-0">
            <h2 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em]">{title}</h2>
            <p className="mt-[5px] text-[13.5px] sm:text-[14px] text-[#5B667A]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-[38px] h-[38px] rounded-[11px] bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] flex items-center justify-center text-[#27324A] hover:bg-[#EEF2F8]"
          >
            <X className="w-[18px] h-[18px]" strokeWidth={2.4} />
          </button>
        </div>

        {steps && steps.length > 1 && (
          <ol aria-label="Progress" className="flex items-center justify-center gap-3 sm:gap-3.5 px-4 sm:px-7 py-4 bg-[#F7F9FC] border-y border-[#EEF2F7]">
            {steps.map((s, i) => {
              const on = done || i === 0
              return (
                <li key={s.label} className="flex items-center gap-2.5">
                  <span
                    className={`shrink-0 w-[30px] h-[30px] rounded-full border-[1.5px] flex items-center justify-center text-[13px] font-extrabold ${
                      on ? 'border-[#2A4DD0] bg-[#2A4DD0] text-white' : 'border-[#C9D2E0] bg-white text-[#5B667A]'
                    }`}
                  >
                    {done ? <Check className="w-[15px] h-[15px]" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="hidden sm:block">
                    <span className={`block text-[13.5px] font-extrabold ${on ? 'text-[#0B1B3F]' : 'text-[#5B667A]'}`}>{s.label}</span>
                    <span className="block text-[11.5px] text-[#5B667A]">{s.sub}</span>
                  </span>
                  {i < steps.length - 1 && <span aria-hidden className="w-6 sm:w-16 h-0.5 ml-1 rounded-sm bg-[#D6DDE8]" />}
                </li>
              )
            })}
          </ol>
        )}
        {(!steps || steps.length < 2) && <div className="border-t border-[#EEF2F7]" />}

        {children}
      </div>
    </div>
  )
}

/** The finished screen: a tick, the title, what was made, a note, and the buttons. */
export function DlgDone({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 sm:px-7 py-9 text-center">
      <span className="w-14 h-14 rounded-full bg-[#2A4DD0] text-white flex items-center justify-center">
        <Check className="w-7 h-7" strokeWidth={3} />
      </span>
      <h3 className="text-[20px] font-extrabold">{title}</h3>
      {children}
      <div className="flex flex-wrap justify-center gap-2.5 pt-1">{actions}</div>
    </div>
  )
}
