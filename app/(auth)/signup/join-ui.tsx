'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, ChevronDown, File as FileIcon, Loader2, Upload, X, type LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { COUNTRY_CODES } from '@/lib/countryCodes'
import { startDocumentUploads } from '@/app/actions/applicationUploads'
import { acceptAttr, docFileProblem, DOC_BUCKET, type ApplicantKind, type ApplicationDoc } from '@/lib/application-documents'
import {
  EMAIL_MESSAGE,
  GSTIN_PAN_MESSAGE,
  INDIA_MOBILE_MESSAGE,
  INDIA_MOBILE_PATTERN,
  LATER_TIME_MESSAGE,
  OTHER_PHONE_MESSAGE,
  OTHER_PHONE_PATTERN,
  gstinMatchesPan,
  isLaterTime,
  phoneDigits,
} from '@/lib/join-rules'

// The join pages (/signup/doctor, /signup/hospital, /signup/diagnostic-centre), after the user's "Join as" designs: a
// blue band with the title, a step strip, the form in numbered sections, and cards beside it about how joining works.

// ---------- Classes ----------

export const inputCls =
  'w-full h-12 px-3.5 rounded-[10px] bg-white border border-[#D5DCE6] text-[15px] text-[#0B1B3F] placeholder:text-[#9AA4B5] outline-none transition-shadow focus:border-[#1D4ED8] focus:ring-4 focus:ring-[#1D4ED8]/15 disabled:bg-[#F7F9FC] disabled:text-[#7A8599]'
export const textareaCls = `${inputCls} h-auto min-h-[92px] py-3 leading-relaxed resize-y`
const selectCls = `${inputCls} appearance-none pr-10 cursor-pointer invalid:text-[#5B667A]`

// ---------- Page ----------

/** The blue band under the site header: breadcrumb, icon, title and what the page is for. */
export function JoinHero({ crumb, icon: Icon, title, intro, children }: { crumb: string; icon: LucideIcon; title: string; intro: string; children?: ReactNode }) {
  return (
    <div className="bg-[#1D4ED8] text-white px-4 md:px-[max(24px,10%)] pt-6 md:pt-11 pb-[26px] md:pb-[100px]">
      <nav aria-label="Breadcrumb" className="text-[13.5px] md:text-[14px] font-bold">
        <Link href="/corporate" className="font-extrabold hover:underline underline-offset-4">
          Partner with us
        </Link>
        <span className="text-[#C7D6FF]"> <span className="opacity-60">/</span> {crumb}</span>
      </nav>
      <div className="mt-4 md:mt-5 flex flex-col md:flex-row items-start gap-3.5 md:gap-[18px]">
        <span className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-[14px] bg-white text-[#1D4ED8] flex items-center justify-center shadow-[0_6px_16px_rgba(4,16,70,0.18)]">
          <Icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h1 className="text-[27px] md:text-[36px] leading-[1.2] md:leading-[1.15] font-extrabold tracking-[-0.02em] md:mt-0.5">{title}</h1>
          <p className="mt-2 md:mt-2.5 max-w-[700px] text-[14.5px] md:text-[16.5px] leading-[1.6] text-[#DCE6FF]">{intro}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export type JoinStep = { title: string }

/**
 * The steps across the top. The last one happens after the application is sent. Steps already reached can be opened
 * again from here (`onStep`).
 */
export function StepStrip({
  steps,
  after,
  current,
  done,
  submitted,
  reached = 0,
  onStep,
}: {
  steps: JoinStep[]
  after: string
  current: number
  done: boolean[]
  submitted: boolean
  reached?: number
  onStep?: (i: number) => void
}) {
  const all = [...steps.map((s) => s.title), after]
  return (
    <ol
      aria-label="Application steps"
      className="relative -mt-[52px] md:-mt-[57px] hidden md:flex xl:grid overflow-x-auto xl:overflow-visible snap-x snap-mandatory [scrollbar-width:none] p-2 rounded-[18px] md:rounded-[20px] bg-white shadow-[0_10px_30px_-12px_rgba(11,27,63,0.22)] border border-[#EEF2F7]"
      style={{ gridTemplateColumns: `repeat(${all.length}, minmax(0, 1fr))` }}
    >
      {all.map((title, i) => {
        const isAfter = i === steps.length
        const isDone = isAfter ? false : submitted || done[i]
        const isCurrent = !submitted && i === current
        const canOpen = !submitted && !isAfter && !isCurrent && i <= reached && !!onStep
        return (
          <li
            key={title}
            aria-current={isCurrent ? 'step' : undefined}
            className={`snap-start shrink-0 min-w-[172px] xl:min-w-0 flex items-center gap-3 px-3.5 lg:px-4 py-4 md:py-5 rounded-[13px] ${
              isCurrent ? 'bg-[#F2F6FF]' : ''
            } ${i > 0 && !isCurrent && i - 1 !== current ? 'xl:border-l xl:rounded-none xl:border-[#EEF2F7]' : ''}`}
          >
            <span
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[13.5px] font-extrabold ${
                isCurrent ? 'bg-[#1D4ED8] text-white' : isDone ? 'bg-[#E3EBFF] text-[#1D4ED8]' : 'bg-white text-[#5B667A] shadow-[inset_0_0_0_1.5px_#C9D2E0]'
              }`}
            >
              {isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={`block text-[11px] lg:text-[11.5px] font-extrabold tracking-[0.08em] uppercase ${isCurrent ? 'text-[#1D4ED8]' : 'text-[#7A8599]'}`}>
                Step {i + 1}
                {isAfter && ' · After you send'}
                <span className="sr-only">{isDone ? ', done' : isCurrent ? ', in progress' : ''}</span>
              </span>
              {canOpen ? (
                <button type="button" onClick={() => onStep(i)} className="block text-left text-[14px] lg:text-[14.5px] leading-snug font-extrabold text-[#4A5878] hover:text-[#1D4ED8] underline-offset-4 hover:underline">
                  {title}
                </button>
              ) : (
                <span className={`block text-[14px] lg:text-[14.5px] leading-snug font-extrabold ${isCurrent ? 'text-[#0B1B3F]' : 'text-[#4A5878]'}`}>{title}</span>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** The phone's progress card inside the blue band (the step strip below takes over from tablet width). */
export function PhoneSteps({ steps, after, current, submitted }: { steps: JoinStep[]; after: string; current: number; done: boolean[]; submitted: boolean }) {
  const all = [...steps.map((s) => s.title), after]
  const at = submitted ? all.length - 1 : current
  const next = submitted ? '' : all.slice(at + 1, at + 3).join(' · ')
  return (
    <div className="md:hidden mt-[18px] p-3.5 rounded-[14px] bg-white/[0.12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]">
      <p className="text-[12px] font-extrabold tracking-[0.06em] uppercase text-[#CFDCFF]">
        Step {at + 1} of {all.length}
      </p>
      <p className="mt-0.5 text-[15px] font-extrabold text-white">{all[at]}</p>
      <div aria-hidden className="mt-2.5 flex gap-1.5">
        {all.map((title, i) => (
          <span key={title} className={`flex-1 h-1 rounded-[4px] ${submitted || i <= at ? 'bg-white' : 'bg-white/30'}`} />
        ))}
      </div>
      {next && <p className="mt-2 text-[12px] text-[#DCE7FF]">Next: {next}</p>}
    </div>
  )
}

/** The form beside its cards; the cards go under the form below 1280px. */
export function JoinColumns({ form, aside }: { form: ReactNode; aside: ReactNode }) {
  return (
    <div className="mt-4 md:mt-6 grid gap-5 md:gap-6 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
      <div className="min-w-0">{form}</div>
      <aside className="grid gap-5 md:grid-cols-2 xl:grid-cols-1 xl:gap-4 items-start">{aside}</aside>
    </div>
  )
}

export const joinCard = 'rounded-[20px] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06),0_8px_24px_-16px_rgba(11,27,63,0.16)]'

// ---------- Form parts ----------

/** One numbered part of the form, shown while its step is open. Its fields count towards the step of the same name. */
export function JoinSection({ n, section, title, sub, badge, children }: { n: number; section: string; title: string; sub: string; badge?: boolean; children: ReactNode }) {
  const { active } = useContext(JoinContext)
  return (
    <fieldset data-section={section} hidden={active !== section} className="min-w-0">
      <legend className="sr-only">{title}</legend>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-5">
        <div className="flex items-start gap-3">
          <span aria-hidden className="shrink-0 w-[30px] h-[30px] rounded-full bg-[#EEF3FF] text-[#1D4ED8] text-[14px] font-extrabold flex items-center justify-center">
            {n}
          </span>
          <div>
            <h2 className="text-[19px] md:text-[20px] leading-tight font-extrabold tracking-[-0.01em] text-[#0B1B3F] mt-[3px]">{title}</h2>
            <p className="mt-1 text-[14px] text-[#5B667A]">{sub}</p>
          </div>
        </div>
        {badge && <span className="ml-[42px] sm:ml-0 px-2.5 py-1 rounded-full bg-[#EEF3FF] text-[#1D4ED8] text-[12px] font-extrabold">Required for verification</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-[18px] gap-y-5">{children}</div>
    </fieldset>
  )
}

function LabelText({ label, required, optional }: { label: string; required?: boolean; optional?: boolean }) {
  return (
    <>
      {label}
      {required && <span aria-hidden className="text-[#D92D20]"> *</span>}
      {optional && <span className="font-medium text-[#7A8599]"> (optional)</span>}
    </>
  )
}

const labelCls = 'block mb-2 text-[13px] leading-snug font-extrabold text-[#27324A]'
const hintCls = 'mt-1.5 text-[12.5px] leading-snug text-[#7A8599]'
const spanCls = { 1: 'sm:col-span-1', 2: 'sm:col-span-2', 3: 'sm:col-span-3' } as const

/** A labelled control. `span` is how many of the three columns it takes. */
export function Field({
  label,
  htmlFor,
  required,
  optional,
  hint,
  span = 1,
  pair,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  optional?: boolean
  hint?: ReactNode
  span?: 1 | 2 | 3
  /** Half width on the phone (two to a row). */
  pair?: boolean
  children: ReactNode
}) {
  const error = useContext(JoinContext).errors[htmlFor]
  return (
    <div className={`min-w-0 flex flex-col ${pair ? 'col-span-1' : 'col-span-2'} ${spanCls[span]} ${error ? invalidCls : ''}`}>
      <label htmlFor={htmlFor} className={`${labelCls} sm:min-h-[19px]`}>
        <LabelText label={label} required={required} optional={optional} />
      </label>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint && <p className={hintCls}>{hint}</p>}
    </div>
  )
}

/** The red outline on an invalid field's box (inputs, selects, and the boxes with a prefix). */
const invalidCls = '[&_input]:border-[#F04438] [&_select]:border-[#F04438] [&_textarea]:border-[#F04438] [&_.join-box]:border-[#F04438]'

function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 text-[12.5px] leading-snug font-semibold text-[#B42318]">
      {children}
    </p>
  )
}

export function SelectBox({ placeholder = 'Select', options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string; options: (string | { value: string; label: string })[] }) {
  return (
    <div className="relative">
      <select defaultValue="" {...props} className={selectCls}>
        <option value="" disabled={props.required}>
          {placeholder}
        </option>
        {options.map((o) => {
          const { value, label } = typeof o === 'string' ? { value: o, label: o } : o
          return (
            <option key={value} value={value}>
              {label}
            </option>
          )
        })}
      </select>
      <ChevronDown aria-hidden className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#3B475E] pointer-events-none" strokeWidth={2.2} />
    </div>
  )
}

/** An input with a fixed part in front, like ₹. */
export function PrefixInput({ prefix, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { prefix: string }) {
  return (
    <div className="join-box flex h-12 rounded-[10px] bg-white border border-[#D5DCE6] overflow-hidden transition-shadow focus-within:border-[#1D4ED8] focus-within:ring-4 focus-within:ring-[#1D4ED8]/15">
      <span aria-hidden className="shrink-0 w-[42px] flex items-center justify-center bg-[#F4F6FA] border-r border-[#D5DCE6] text-[15px] font-bold text-[#27324A]">
        {prefix}
      </span>
      <input {...props} className="flex-1 min-w-0 px-3 bg-transparent text-[15px] text-[#0B1B3F] placeholder:text-[#9AA4B5] outline-none" />
    </div>
  )
}

const countryCodes = [...COUNTRY_CODES].sort((a, b) => a.code.localeCompare(b.code))

/**
 * A phone number with its country code shown as "+91" in front (the code is a select laid over it). Digits only: an
 * Indian mobile is 10 digits starting with 6, 7, 8 or 9 (a pasted +91 or leading 0 is taken off); other countries take
 * 6 to 15 digits. The server checks the same (lib/join-rules.ts).
 */
export function PhoneInput({ id, name, codeName, required, autoComplete = 'tel-national', label }: { id: string; name: string; codeName: string; required?: boolean; autoComplete?: string; label: string }) {
  const [code, setCode] = useState('+91')
  const india = code === '+91'
  return (
    <div className="join-box flex h-12 rounded-[10px] bg-white border border-[#D5DCE6] overflow-hidden transition-shadow focus-within:border-[#1D4ED8] focus-within:ring-4 focus-within:ring-[#1D4ED8]/15">
      <span className="relative shrink-0 min-w-[54px] px-3 flex items-center justify-center bg-[#F4F6FA] border-r border-[#D5DCE6] text-[15px] font-bold text-[#27324A]">
        {code}
        <select
          name={codeName}
          aria-label={`${label}: country code`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        >
          {countryCodes.map((c) => (
            <option key={c.code} value={c.dialCode}>
              {c.code} {c.dialCode}
            </option>
          ))}
        </select>
      </span>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        required={required}
        autoComplete={autoComplete}
        pattern={india ? INDIA_MOBILE_PATTERN : OTHER_PHONE_PATTERN}
        title={india ? INDIA_MOBILE_MESSAGE : OTHER_PHONE_MESSAGE}
        placeholder={india ? '98765 43210' : undefined}
        onInput={(e) => {
          const input = e.currentTarget
          input.value = phoneDigits(input.value, india)
        }}
        className="flex-1 min-w-0 px-3 bg-transparent text-[15px] text-[#0B1B3F] placeholder:text-[#9AA4B5] outline-none"
      />
    </div>
  )
}

const choiceBox =
  'peer-checked:bg-[#1D4ED8] peer-checked:border-[#1D4ED8] shrink-0 w-[18px] h-[18px] border-[1.5px] border-[#9AA4B5] bg-white flex items-center justify-center transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-[#1D4ED8]/20'

const radioDot =
  'shrink-0 w-[18px] h-[18px] rounded-full border-[1.5px] border-[#9AA4B5] bg-white transition-all peer-checked:border-[5.5px] peer-checked:border-[#1D4ED8] peer-focus-visible:ring-4 peer-focus-visible:ring-[#1D4ED8]/20'

/** Checkbox pills or tiles. With `required`, at least one must be ticked. */
export function CheckGroup({
  label,
  name,
  options,
  required,
  optional,
  hint,
  variant = 'pill',
  defaultValues = [],
  onValuesChange,
}: {
  label: string
  name: string
  options: string[]
  required?: boolean
  optional?: boolean
  hint?: string
  variant?: 'pill' | 'tile'
  defaultValues?: string[]
  onValuesChange?: (values: string[]) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const labelId = `${name}-label`
  const [values, setValues] = useState(defaultValues)

  // The browser has no "tick at least one" rule, so the first box carries the message until one is ticked.
  const mark = useCallback(
    (next: string[]) => ref.current?.querySelector('input')?.setCustomValidity(required && next.length === 0 ? 'Choose at least one.' : ''),
    [required],
  )
  useEffect(() => mark(values), [mark, values])

  const error = useContext(JoinContext).errors[`group:${name}`]
  return (
    <div role="group" aria-labelledby={labelId} data-group={name} className="min-w-0 col-span-2 sm:col-span-3">
      <span id={labelId} className={labelCls}>
        <LabelText label={label} required={required} optional={optional} />
      </span>
      <div ref={ref} className={variant === 'pill' ? 'flex flex-wrap gap-2.5' : 'grid grid-cols-2 sm:grid-cols-3 gap-2.5'}>
        {options.map((option) => (
          <label
            key={option}
            className={`relative cursor-pointer flex items-center gap-2.5 border border-[#D5DCE6] bg-white text-[14.5px] font-semibold text-[#27324A] hover:border-[#9DB4F5] has-[:checked]:border-[#1D4ED8] has-[:checked]:bg-[#F2F6FF] transition-colors ${
              variant === 'pill' ? 'h-11 px-4 rounded-full' : 'min-h-12 px-4 py-2 rounded-[10px] leading-snug'
            }`}
          >
            <input
              type="checkbox"
              name={name}
              value={option}
              checked={values.includes(option)}
              onChange={(e) => {
                const next = e.target.checked ? [...values, option] : values.filter((v) => v !== option)
                mark(next)
                setValues(next)
                onValuesChange?.(next)
              }}
              className="peer sr-only"
            />
            <span aria-hidden className={`${choiceBox} rounded-[4px]`}>
              <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
            </span>
            {option}
          </label>
        ))}
      </div>
      {error ? <FieldError>{error}</FieldError> : hint && <p className={hintCls}>{hint}</p>}
    </div>
  )
}

/** Radio pills, e.g. Yes / No. */
export function RadioGroup({
  label,
  name,
  options,
  required,
  span = 1,
  pair,
  stack,
}: {
  label: string
  name: string
  options: { value: string; label: string }[]
  required?: boolean
  span?: 1 | 2 | 3
  pair?: boolean
  stack?: boolean
}) {
  const labelId = `${name}-label`
  const error = useContext(JoinContext).errors[`group:${name}`]
  return (
    <div role="radiogroup" aria-labelledby={labelId} data-group={name} className={`min-w-0 ${pair ? 'col-span-1' : 'col-span-2'} ${spanCls[span]}`}>
      <span id={labelId} className={`${labelCls} sm:min-h-[19px]`}>
        <LabelText label={label} required={required} />
      </span>
      <div className={`flex gap-2 ${stack ? 'flex-wrap sm:flex-col sm:items-start' : 'flex-wrap'}`}>
        {options.map((o) => (
          <label
            key={o.value}
            className="relative cursor-pointer inline-flex items-center gap-2.5 h-11 px-4 rounded-full border border-[#D5DCE6] bg-white text-[14.5px] font-semibold text-[#27324A] hover:border-[#9DB4F5] has-[:checked]:border-[#1D4ED8] has-[:checked]:bg-[#F2F6FF] transition-colors"
          >
            <input type="radio" name={name} value={o.value} required={required} className="peer sr-only" />
            <span aria-hidden className={radioDot} />
            {o.label}
          </label>
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}

const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`)

/**
 * A document box. The file stays in its (unnamed) input, so it never goes into the form's data; the form uploads it to
 * storage first (useJoinForm). When uploads aren't available yet, the box says the document is sent by email instead.
 */
export function FileField({ doc, uploads, span = 3 }: { doc: ApplicationDoc; uploads: boolean; span?: 1 | 2 | 3 }) {
  const ref = useRef<HTMLInputElement>(null)
  const [chosen, setChosen] = useState<{ name: string; size: number } | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const id = `doc-${doc.key}`
  const error = useContext(JoinContext).errors[id]

  const pick = (input: HTMLInputElement) => {
    const file = input.files?.[0]
    const issue = file ? docFileProblem(doc.accept, file) : null
    input.setCustomValidity(issue ?? '')
    setProblem(issue)
    setChosen(file ? { name: file.name, size: file.size } : null)
  }
  const clear = () => {
    if (!ref.current) return
    ref.current.value = ''
    pick(ref.current)
    // Let the form recount its steps.
    ref.current.dispatchEvent(new Event('change', { bubbles: true }))
  }

  return (
    <div className={`min-w-0 col-span-2 ${spanCls[span]}`}>
      <label htmlFor={id} className={labelCls}>
        <LabelText label={doc.label} required={doc.required && uploads} optional={!doc.required} />
      </label>
      <div
        className={`relative flex items-center gap-3 min-h-[62px] p-3 rounded-[12px] border border-dashed transition-colors focus-within:ring-4 focus-within:ring-[#1D4ED8]/15 ${
          problem || error ? 'border-[#F04438] bg-[#FEF3F2]' : chosen ? 'border-[#9DB4F5] bg-[#F2F6FF]' : 'border-[#C9D3E3] bg-[#F7F9FD]'
        }`}
      >
        <span aria-hidden className="shrink-0 w-[38px] h-[38px] rounded-[10px] bg-[#E6EDFF] text-[#1D4ED8] flex items-center justify-center">
          {chosen && !problem ? <FileIcon className="w-[18px] h-[18px]" /> : <Upload className="w-[18px] h-[18px]" strokeWidth={2.2} />}
        </span>
        <span className="flex-1 min-w-0 text-[13.5px] leading-snug">
          {!uploads ? (
            <span className="text-[#5B667A]">Our team will ask you for this by email after you apply.</span>
          ) : chosen ? (
            <>
              <span className="block truncate font-bold text-[#0B1B3F]">{chosen.name}</span>
              <span className={problem ? 'text-[#B42318] font-semibold' : 'text-[#5B667A]'}>{problem ?? sizeLabel(chosen.size)}</span>
            </>
          ) : (
            <span className="text-[#7A8599]">{doc.hint}</span>
          )}
        </span>
        {uploads && chosen && (
          <button
            type="button"
            onClick={clear}
            aria-label={`Remove ${doc.label}`}
            className="relative z-10 shrink-0 w-9 h-9 rounded-[10px] text-[#5B667A] hover:bg-white hover:text-[#B42318] flex items-center justify-center"
          >
            <X className="w-4 h-4" strokeWidth={2.4} />
          </button>
        )}
        <span
          aria-hidden
          className={`shrink-0 h-9 px-3.5 rounded-[10px] bg-white border border-[#D5DCE6] text-[14px] font-bold text-[#0B1B3F] flex items-center ${uploads ? '' : 'opacity-50'}`}
        >
          {chosen ? 'Change' : 'Choose file'}
        </span>
        {/* Laid over the box, so a click anywhere opens the picker and the browser's "required" message points here. */}
        <input
          ref={ref}
          id={id}
          type="file"
          data-doc={doc.key}
          accept={acceptAttr(doc.accept)}
          required={doc.required && uploads}
          disabled={!uploads}
          onChange={(e) => pick(e.currentTarget)}
          className={`absolute inset-0 w-full h-full opacity-0 ${uploads ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        />
      </div>
      {error && !problem && <FieldError>{error}</FieldError>}
    </div>
  )
}

/** The declarations above the send button. */
export function Declarations({ section, items }: { section: string; items: { name: string; text: string }[] }) {
  const { active, errors } = useContext(JoinContext)
  return (
    <fieldset data-section={section} hidden={active !== section} className="min-w-0 mt-8 pt-7 border-t border-[#EEF2F7] flex flex-col gap-3.5">
      <legend className="sr-only">Declarations</legend>
      {items.map((item) => (
        <div key={item.name}>
          <label className="relative flex items-start gap-3 cursor-pointer text-[14.5px] leading-[1.55] text-[#27324A]">
            <input name={item.name} type="checkbox" required className="peer sr-only" />
            <span aria-hidden className={`${choiceBox} rounded-[4px] mt-[3px] ${errors[item.name] ? 'border-[#F04438]' : ''}`}>
              <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
            </span>
            {item.text}
          </label>
          {errors[item.name] && (
            <div className="ml-[30px]">
              <FieldError>{errors[item.name]}</FieldError>
            </div>
          )}
        </div>
      ))}
    </fieldset>
  )
}

/** The buttons under each step: Back and Continue, and on the last step the terms line, Back and Send application. */
export function SendRow({ busy }: { busy: string | null }) {
  const { isFirst, isLast, back, step, total } = useContext(JoinContext)
  const link = 'font-extrabold text-[#1D4ED8] hover:underline underline-offset-2'
  const backButton = !isFirst && (
    <button
      type="button"
      onClick={back}
      disabled={busy !== null}
      className="shrink-0 w-full sm:w-auto h-[52px] px-5 rounded-[12px] border border-[#D5DCE6] bg-white text-[#27324A] text-[16px] font-extrabold flex items-center justify-center gap-2 hover:bg-[#F7F9FC] transition-colors disabled:opacity-60"
    >
      <ArrowLeft className="w-5 h-5" strokeWidth={2.4} /> Back
    </button>
  )
  if (!isLast) {
    return (
      <div className="mt-8 pt-6 border-t border-[#EEF2F7] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
          {backButton}
          <span className="text-center sm:text-left text-[13.5px] font-semibold text-[#7A8599]">
            Step {step + 1} of {total}
          </span>
        </div>
        <button
          type="submit"
          className="shrink-0 w-full sm:w-auto h-[52px] px-7 rounded-[12px] bg-[#1D4ED8] hover:bg-[#1A44C2] text-white text-[17px] font-extrabold flex items-center justify-center gap-2.5 shadow-[0_8px_18px_-8px_rgba(29,78,216,0.7)] transition-colors active:scale-[0.99]"
        >
          Continue <ArrowRight className="w-5 h-5" strokeWidth={2.4} />
        </button>
      </div>
    )
  }
  return (
    <div className="mt-7 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
      <p className="text-[13.5px] leading-[1.6] text-[#5B667A] max-w-[420px]">
        By sending this application you agree to our{' '}
        <Link href="/terms-of-use" className={link}>
          Terms &amp; Conditions
        </Link>{' '}
        for doctors and partners and our{' '}
        <Link href="/privacy-policy" className={link}>
          Privacy Policy
        </Link>
        .
      </p>
      <div className="flex flex-col-reverse sm:flex-row gap-3">
      {backButton}
      <button
        type="submit"
        disabled={busy !== null}
        className="shrink-0 w-full sm:w-auto h-[52px] px-7 rounded-[12px] bg-[#1D4ED8] hover:bg-[#1A44C2] text-white text-[17px] font-extrabold flex items-center justify-center gap-2.5 shadow-[0_8px_18px_-8px_rgba(29,78,216,0.7)] transition-colors active:scale-[0.99] disabled:opacity-70"
      >
        {busy ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> {busy}
          </>
        ) : (
          <>
            Send application <ArrowRight className="w-5 h-5" strokeWidth={2.4} />
          </>
        )}
      </button>
      </div>
    </div>
  )
}

/** What replaces the form once the application is sent. */
export function JoinSent({ title, text }: { title: string; text: string }) {
  return (
    <div className={`${joinCard} p-8 md:p-12 flex flex-col items-center text-center gap-4`}>
      <span className="w-14 h-14 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center">
        <Check className="w-7 h-7" strokeWidth={3} />
      </span>
      <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[#0B1B3F]">{title}</h2>
      <p className="max-w-[520px] text-[15.5px] leading-[1.65] text-[#5B667A]">{text}</p>
      <Link href="/corporate" className="mt-2 h-[46px] px-6 rounded-[12px] border border-[#D6DDE8] text-[#27324A] text-[14px] font-extrabold flex items-center justify-center hover:bg-[#F7F9FC]">
        Back to Partner with us
      </Link>
    </div>
  )
}

// ---------- Cards beside the form ----------

const asideTitle = 'text-[17px] font-extrabold tracking-[-0.01em] text-[#0B1B3F]'
const asideSub = 'mt-1 text-[13.5px] leading-snug text-[#5B667A]'

export function HowJoiningCard({ steps, perks }: { steps: { title: string; text: string }[]; perks: string[] }) {
  return (
    <section aria-labelledby="how-joining" className={`${joinCard} p-6`}>
      <h2 id="how-joining" className={asideTitle}>
        How joining works
      </h2>
      <p className={asideSub}>Every application is checked by our team.</p>
      <ol className="mt-4 flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3">
            <span aria-hidden className="shrink-0 w-[26px] h-[26px] mt-px rounded-full bg-[#EEF3FF] text-[#1D4ED8] text-[12.5px] font-extrabold flex items-center justify-center">
              {i + 1}
            </span>
            <span>
              <span className="block text-[15px] font-extrabold text-[#0B1B3F]">{s.title}</span>
              <span className="block mt-0.5 text-[13.5px] leading-[1.5] text-[#5B667A]">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <h3 className="mt-5 pt-5 border-t border-[#EEF2F7] text-[15px] font-extrabold text-[#0B1B3F]">What you get</h3>
      <ul className="mt-3 flex flex-col gap-2.5">
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[14px] leading-snug text-[#27324A]">
            <Check aria-hidden className="shrink-0 w-4 h-4 mt-0.5 text-[#1D4ED8]" strokeWidth={2.8} />
            {p}
          </li>
        ))}
      </ul>
    </section>
  )
}

function DocList({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <ul className="mt-3">
      {items.map((item) => {
        const body = (
          <>
            <FileIcon aria-hidden className="shrink-0 w-4 h-4 mt-0.5 text-[#1D4ED8]" strokeWidth={2.2} />
            {item.label}
          </>
        )
        return (
          <li key={item.label} className="border-t border-[#EEF2F7] first:border-t-0">
            {item.href ? (
              <Link href={item.href} className="flex items-start gap-2.5 py-2.5 text-[14px] leading-snug font-semibold text-[#0B1B3F] hover:text-[#1D4ED8]">
                {body}
              </Link>
            ) : (
              <span className="flex items-start gap-2.5 py-2.5 text-[14px] leading-snug font-semibold text-[#0B1B3F]">{body}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function KeepReadyCard({ items }: { items: string[] }) {
  return (
    <section aria-labelledby="keep-ready" className={`${joinCard} p-6`}>
      <h2 id="keep-ready" className={asideTitle}>
        Keep these ready
      </h2>
      <p className={asideSub}>Clear scans or photos. PDF, JPG or PNG.</p>
      <div className="mt-1 border-t border-[#EEF2F7]">
        <DocList items={items.map((label) => ({ label }))} />
      </div>
    </section>
  )
}

export function StandardsCard({ docs }: { docs: { href: string; label: string }[] }) {
  return (
    <section aria-labelledby="standards" className={`${joinCard} p-6`}>
      <h2 id="standards" className={`${asideTitle} pb-1`}>
        Standards partners follow
      </h2>
      <div className="mt-2 border-t border-[#EEF2F7]">
        <DocList items={docs} />
      </div>
    </section>
  )
}

export function AlreadyCard({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <section aria-labelledby="already" className={`${joinCard} p-6`}>
      <h2 id="already" className={asideTitle}>
        {title}
      </h2>
      <p className={asideSub}>Sign in with the staff ID and password our team gave you.</p>
      <Link
        href={href}
        className="mt-4 h-12 rounded-[12px] border-[1.5px] border-[#1D4ED8] text-[#1D4ED8] text-[15px] font-extrabold flex items-center justify-center hover:bg-[#F2F6FF] transition-colors"
      >
        {label}
      </Link>
      <p className="mt-3.5 text-[13.5px] text-[#5B667A]">
        Questions before you apply?{' '}
        <Link href="/contact" className="font-extrabold text-[#1D4ED8] hover:underline underline-offset-2">
          Contact our team
        </Link>
      </p>
    </section>
  )
}

// ---------- Steps, checks and sending ----------

type JoinCtx = {
  /** The section whose step is open. */
  active: string
  step: number
  total: number
  isFirst: boolean
  isLast: boolean
  back: () => void
  /** Messages under the fields, by field id (`group:<name>` for check and radio groups, the name for declarations). */
  errors: Record<string, string>
}

const JoinContext = createContext<JoinCtx>({ active: '', step: 0, total: 1, isFirst: true, isLast: true, back: () => {}, errors: {} })

/** Gives the form's parts the open step and the messages under the fields (the `ctx` from useJoinForm). */
export function JoinFormProvider({ value, children }: { value: JoinCtx; children: ReactNode }) {
  return <JoinContext.Provider value={value}>{children}</JoinContext.Provider>
}

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
const isControl = (el: unknown): el is Control => el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement

/** Where a control's message goes: its check or radio group, else its id, else its name (declarations). */
function errorKey(el: Control) {
  const group = el.closest('[data-group]')?.getAttribute('data-group')
  if (group && (el.type === 'checkbox' || el.type === 'radio')) return `group:${group}`
  return el.id || el.name
}

/** The controls a message belongs to, to see whether it has been put right. */
function controlsForKey(form: HTMLFormElement, key: string): Control[] {
  if (key.startsWith('group:')) return Array.from(form.querySelectorAll(`[data-group="${CSS.escape(key.slice(6))}"] input`)).filter(isControl)
  const byId = form.querySelector(`#${CSS.escape(key)}`)
  if (isControl(byId)) return [byId]
  const byName = form.elements.namedItem(key)
  return isControl(byName) ? [byName] : []
}

/** The control the server named (an input's name, or doc:<key> for a document). */
function findField(form: HTMLFormElement, field: string): Control | null {
  if (field.startsWith('doc:')) {
    const doc = form.querySelector(`#doc-${CSS.escape(field.slice(4))}`)
    return isControl(doc) ? doc : null
  }
  const item = form.elements.namedItem(field)
  if (isControl(item)) return item
  if (item instanceof RadioNodeList) return isControl(item[0]) ? item[0] : null
  return null
}

const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * What's wrong with a control, in words. Format messages come from its `title` (the rules in lib/join-rules.ts), and a
 * `data-range` attribute can say what a number or date range means ("You must be at least 21").
 */
function messageFor(el: Control): string {
  const v = el.validity
  if (v.customError) return el.validationMessage
  if (v.valueMissing) {
    if (el instanceof HTMLSelectElement) return 'Choose one from the list.'
    if (el.type === 'checkbox') return el.closest('[data-group]') ? 'Choose at least one.' : 'Tick this to continue.'
    if (el.type === 'radio') return 'Choose one.'
    if (el.type === 'file') return 'Add this document.'
    if (el.type === 'date') return 'Choose a date.'
    if (el.type === 'time') return 'Choose a time.'
    return 'This is required.'
  }
  if (v.typeMismatch && el.type === 'email') return EMAIL_MESSAGE
  if (v.typeMismatch && el.type === 'url') return 'Enter the full web address, starting with https://'
  if (v.patternMismatch || v.typeMismatch) return el.title || 'Check the format.'
  if (v.rangeUnderflow || v.rangeOverflow) {
    if (el.dataset.range) return el.dataset.range
    const { min, max } = el as HTMLInputElement
    if (el.type === 'date') return v.rangeUnderflow ? `Choose a date on or after ${shortDate(min)}.` : `Choose a date on or before ${shortDate(max)}.`
    if (min && max) return `Enter a number from ${min} to ${max}.`
    return v.rangeUnderflow ? `Enter ${min} or more.` : `Enter ${max} or less.`
  }
  if (v.tooShort) return `Enter at least ${(el as HTMLInputElement).minLength} characters.`
  if (v.tooLong) return `Use at most ${(el as HTMLInputElement).maxLength} characters.`
  if (v.badInput) return el.type === 'number' ? 'Enter a number.' : 'Check this value.'
  if (v.stepMismatch) return 'Enter a whole number.'
  return el.validationMessage || 'Check this field.'
}

/**
 * The checks that compare two fields, kept on the second field as its message: a closing time after the opening time
 * (`data-after="<id of the opening time>"`) and a GSTIN that contains the PAN (`data-pan-of="<id of the PAN>"`).
 */
function crossCheck(form: HTMLFormElement) {
  form.querySelectorAll<HTMLInputElement>('input[data-after]').forEach((el) => {
    const from = form.querySelector<HTMLInputElement>(`#${CSS.escape(el.dataset.after!)}`)?.value ?? ''
    el.setCustomValidity(isLaterTime(from, el.value) ? '' : el.dataset.afterMessage || LATER_TIME_MESSAGE)
  })
  form.querySelectorAll<HTMLInputElement>('input[data-pan-of]').forEach((el) => {
    el.setCustomValidity('')
    if (!el.value || el.validity.patternMismatch) return
    const pan = form.querySelector<HTMLInputElement>(`#${CSS.escape(el.dataset.panOf!)}`)?.value ?? ''
    if (!gstinMatchesPan(el.value, pan)) el.setCustomValidity(GSTIN_PAN_MESSAGE)
  })
}

type ActionResult = { success?: boolean; error?: string | null; field?: string | null } | null

/**
 * The join form, one step at a time. Continue checks the open step's fields and puts a message under each one to fix;
 * the next step opens only when they are all right. Send checks every step again, uploads the chosen documents to
 * storage, then sends the form with the upload's id through `send` (the server action). When the server turns the
 * application away over one field, its step opens with the message under that field.
 */
export function useJoinForm({ kind, sections, send }: { kind: ApplicantKind; sections: string[]; send: (data: FormData) => Promise<ActionResult> }) {
  const formRef = useRef<HTMLFormElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [done, setDone] = useState<boolean[]>(sections.map(() => false))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [stage, setStage] = useState<'uploading' | 'sending' | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The field to bring into view once its step is showing.
  const focusNext = useRef<Control | null>(null)
  // The last upload, reused when the same files are sent again after the server asked for a correction.
  const lastUpload = useRef<{ uploadId: string; files: Map<string, File> } | null>(null)
  const last = sections.length - 1

  const controlsOf = useCallback(
    (section: string) =>
      Array.from(formRef.current?.querySelectorAll<HTMLFieldSetElement>(`fieldset[data-section="${section}"]`) ?? [])
        .flatMap((fieldset) => Array.from(fieldset.elements).filter(isControl))
        .filter((el) => !el.disabled),
    [],
  )

  /** The messages for one step's fields, and the first field to fix. */
  const check = useCallback(
    (section: string) => {
      if (formRef.current) crossCheck(formRef.current)
      const found: Record<string, string> = {}
      let first: Control | null = null
      for (const el of controlsOf(section)) {
        if (el.validity.valid) continue
        const key = errorKey(el)
        if (found[key]) continue
        found[key] = messageFor(el)
        first ??= el
      }
      return { found, first }
    },
    [controlsOf],
  )

  // Bring the field to fix into view (its step may have just opened).
  useEffect(() => {
    const el = focusNext.current
    if (!el) return
    focusNext.current = null
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
  }, [errors, step])

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  const open = (i: number, scroll = true) => {
    setStep(i)
    setReached((r) => Math.max(r, i))
    if (scroll) requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  /** Checks the open step; opens the next one when everything in it is right. */
  const next = () => {
    const { found, first } = check(sections[step])
    setErrors(found)
    if (first) {
      focusNext.current = first
      return
    }
    setError(null)
    setDone((d) => d.map((v, i) => (i === step ? true : v)))
    open(step + 1)
  }

  const back = () => {
    setErrors({})
    setError(null)
    open(Math.max(0, step - 1))
  }

  /** The step strip: open a step already reached (going forward checks the steps in between). */
  const goTo = (target: number) => {
    if (target === step || target > reached) return
    if (target > step) {
      for (let i = step; i < target; i++) {
        const { found, first } = check(sections[i])
        if (first) {
          setErrors(found)
          focusNext.current = first
          if (i !== step) open(i, false)
          return
        }
      }
    }
    setErrors({})
    open(target)
  }

  /** On each change: capital letters where asked (data-upper), and messages that have been put right go away. */
  const updateProgress = (e?: React.FormEvent<HTMLFormElement>) => {
    const form = formRef.current
    if (!form) return
    const t = e?.target
    if (t instanceof HTMLInputElement && t.dataset.upper !== undefined && t.value !== t.value.toUpperCase()) {
      const at = t.selectionStart
      t.value = t.value.toUpperCase()
      if (at !== null) t.setSelectionRange(at, at)
    }
    crossCheck(form)
    setErrors((prev) => {
      const keys = Object.keys(prev).filter((key) => controlsForKey(form, key).some((el) => !el.validity.valid))
      return keys.length === Object.keys(prev).length ? prev : Object.fromEntries(keys.map((key) => [key, prev[key]]))
    })
    setDone(sections.map((section, i) => i <= reached && i !== step && controlsOf(section).every((el) => el.validity.valid)))
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // Sent by hand: a form `action` would reset every field when the server returns an error.
    e.preventDefault()
    const form = e.currentTarget
    if (stage) return
    if (step < last) {
      next()
      return
    }
    setError(null)

    // Every step is checked again; the first one with something to fix opens.
    for (let i = 0; i <= last; i++) {
      const { found, first } = check(sections[i])
      if (first) {
        setErrors(found)
        focusNext.current = first
        if (i !== step) open(i, false)
        return
      }
    }
    setErrors({})

    const files = new Map<string, File>()
    form.querySelectorAll<HTMLInputElement>('input[type="file"][data-doc]').forEach((input) => {
      const file = input.files?.[0]
      if (file && !input.disabled) files.set(input.dataset.doc!, file)
    })

    let uploadId = ''
    if (files.size > 0) {
      const prev = lastUpload.current
      const same = prev && prev.files.size === files.size && [...files].every(([key, file]) => prev.files.get(key) === file)
      if (same) {
        uploadId = prev.uploadId
      } else {
        setStage('uploading')
        // Our own messages are shown as they are; a dropped connection gets plain words, not "Failed to fetch".
        let problem: string | null = null
        try {
          const start = await startDocumentUploads(
            kind,
            [...files].map(([key, file]) => ({ key, name: file.name, size: file.size })),
          )
          if (!start.ok) problem = start.error
          else {
            const storage = createClient().storage.from(DOC_BUCKET)
            for (const upload of start.uploads) {
              const { error: uploadError } = await storage.uploadToSignedUrl(upload.path, upload.token, files.get(upload.key)!, { contentType: upload.contentType })
              if (uploadError) {
                problem = 'A document could not be uploaded. Check your connection and try again.'
                break
              }
            }
            if (!problem) {
              lastUpload.current = { uploadId: start.uploadId, files }
              uploadId = start.uploadId
            }
          }
        } catch {
          problem = 'We could not upload your documents. Check your connection and send the application again.'
        }
        if (problem) {
          setStage(null)
          setError(problem)
          return
        }
      }
    }

    const data = new FormData(form)
    if (uploadId) data.set('uploadId', uploadId)
    setStage('sending')
    let result: ActionResult
    try {
      result = await send(data)
    } catch {
      result = { success: false, error: 'We could not reach our server. Check your connection and send the application again.' }
    }
    setStage(null)

    if (result?.success) {
      setSubmitted(true)
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
      return
    }
    const message = result?.error || 'Please check your details and send the application again.'
    // A message about one field goes under it, on its step; anything else shows above the form.
    const el = result?.field ? findField(form, result.field) : null
    const section = el?.closest('fieldset[data-section]')?.getAttribute('data-section')
    const at = section ? sections.indexOf(section) : -1
    if (el && at >= 0) {
      setErrors({ [errorKey(el)]: message })
      focusNext.current = el
      if (at !== step) open(at, false)
    } else {
      setError(message)
    }
  }

  const busy = stage === 'uploading' ? 'Uploading documents…' : stage === 'sending' ? 'Sending…' : null
  const ctx: JoinCtx = { active: sections[step], step, total: sections.length, isFirst: step === 0, isLast: step === last, back, errors }

  return { formRef, errorRef, onSubmit, updateProgress, done, step, reached, goTo, submitted, error, busy, ctx }
}

export function FormError({ error, errorRef }: { error: string | null; errorRef: React.RefObject<HTMLDivElement | null> }) {
  if (!error) return null
  return (
    <div ref={errorRef} role="alert" className="mb-7 p-4 rounded-[12px] bg-[#FEF3F2] text-[#B42318] text-[14px] font-semibold">
      {error}
    </div>
  )
}
