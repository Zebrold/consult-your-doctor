'use client'

import { useMemo, useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, LoaderCircle, Plus, Search, X } from 'lucide-react'
import { createLabBooking } from '@/app/actions/diagnostic-center'
import { formatINR } from '@/components/patient/format'

export type BookingFormProps = {
  /** Tests the lab prices, in menu order. */
  tests: { name: string; price: number }[]
  minDate: string
  maxDate: string
  defaultDate: string
}

const input =
  'w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 text-sm text-indigo-gray-900 placeholder:text-outline border border-transparent focus:outline-none focus:border-vibrant-blue focus:bg-surface-container-lowest'

/** Book tests for a walk-in or phone patient; they pay at the center. */
export function NewBookingForm({ tests, minDate, maxDate, defaultDate, onDone }: BookingFormProps & { onDone?: () => void }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? tests.filter((t) => t.name.toLowerCase().includes(q)) : tests
  }, [tests, query])
  const total = tests.filter((t) => selected.includes(t.name)).reduce((s, t) => s + t.price, 0)

  const toggle = (name: string) => setSelected((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]))

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    selected.forEach((t) => form.append('tests', t))
    if (selected.length === 0) return setError('Select at least one test.')
    start(async () => {
      const res = await createLabBooking(form)
      if (!res.success) return setError(res.error)
      setError(null)
      setDone(`Booked ${String(form.get('name'))} for ${selected.length === 1 ? selected[0] : `${selected.length} tests`}.`)
      setSelected([])
      setQuery('')
      formRef.current?.reset()
      router.refresh()
      onDone?.()
    })
  }

  if (tests.length === 0) {
    return <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600">Add tests with prices to your test menu before booking patients.</p>
  }

  return (
    <form ref={formRef} onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm text-indigo-gray-600">Patient full name</span>
        <input name="name" required minLength={2} autoComplete="off" placeholder="e.g. Priya Sundaram" className={input} />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-indigo-gray-600">Mobile number</span>
          <span className="flex items-center rounded-xl bg-surface-container-low border border-transparent focus-within:border-vibrant-blue focus-within:bg-surface-container-lowest">
            <span className="pl-3.5 text-sm font-semibold text-indigo-gray-600">+91</span>
            <input name="phone" type="tel" required inputMode="tel" autoComplete="off" placeholder="98765 43210" className="w-full bg-transparent px-2 py-2.5 text-sm text-indigo-gray-900 placeholder:text-outline focus:outline-none" />
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-indigo-gray-600">Date</span>
          <input name="date" type="date" required min={minDate} max={maxDate} defaultValue={defaultDate} className={input} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="font-label-sm text-label-sm text-indigo-gray-600 mb-1 flex w-full items-center justify-between">
          <span>Tests</span>
          {selected.length > 0 && <span className="text-vibrant-blue">{selected.length} selected</span>}
        </legend>
        {tests.length > 8 && (
          <span className="relative">
            <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a test" aria-label="Find a test" className={`${input} pl-9 py-2`} />
          </span>
        )}
        <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
          {shown.map((t) => {
            const on = selected.includes(t.name)
            return (
              <label
                key={t.name}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl cursor-pointer border text-sm transition-colors ${
                  on ? 'border-vibrant-blue bg-vibrant-blue/5 text-indigo-gray-900' : 'border-transparent bg-surface-container-low text-indigo-gray-900 hover:bg-surface-container'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <input type="checkbox" checked={on} onChange={() => toggle(t.name)} className="w-4 h-4 accent-vibrant-blue shrink-0" />
                  <span className="truncate">{t.name}</span>
                </span>
                <span className="font-semibold shrink-0">{formatINR(t.price)}</span>
              </label>
            )
          })}
          {shown.length === 0 && <p className="text-xs text-indigo-gray-600 px-1">No test matches “{query}”.</p>}
        </div>
      </fieldset>

      <div className="flex items-center justify-between px-1 text-sm">
        <span className="text-indigo-gray-600">Collect at the desk</span>
        <span className="font-title-md text-[18px] font-bold text-indigo-gray-900">{formatINR(total)}</span>
      </div>

      {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
      {done && !error && (
        <p role="status" className="p-3 rounded-lg bg-secondary-container/60 text-on-secondary-container text-sm flex items-center gap-2">
          <CircleCheck className="w-4 h-4 shrink-0" /> {done}
        </p>
      )}

      <button type="submit" disabled={pending} className="w-full py-3 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-label-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,80,203,0.2)] disabled:opacity-60">
        {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Confirm Booking
      </button>
      <p className="text-[11px] text-indigo-gray-600 text-center">
        New patients get an account on this number and can sign in with an OTP to see the booking and their report.
      </p>
    </form>
  )
}

export function NewBookingButton({ className, label = 'New Booking', ...props }: BookingFormProps & { className: string; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Plus className="w-[18px] h-[18px]" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="New booking">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">New Booking</h3>
                <p className="text-sm text-indigo-gray-600">For a walk-in or phone booking, paid at the center.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <NewBookingForm {...props} />
          </div>
        </div>
      )}
    </>
  )
}
