'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, CircleCheck, CircleDashed, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react'
import { removeLabTest, saveLabTest } from '@/app/actions/diagnostic-center'
import { DIAGNOSTIC_PLATFORM_FEE } from '@/lib/pricing'

type Test = { name: string; price: number | null }
type Result = { success: true } | { success: false; error: string }
/** Saves and removes tests. The lab's own actions by default; the hospital passes its own for its test charges. */
export type TestActions = { save: (name: string, price: number) => Promise<Result>; remove: (name: string) => Promise<Result> }

const LAB_ACTIONS: TestActions = { save: saveLabTest, remove: removeLabTest }

const short = (name: string) => {
  const words = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words.slice(0, 3).map((w) => w[0]) : [name.slice(0, 3)]).join('').toUpperCase()
}

const BADGES = ['bg-vibrant-blue/10 text-vibrant-blue', 'bg-primary/10 text-primary', 'bg-fresh-teal/10 text-fresh-teal', 'bg-secondary/10 text-secondary', 'bg-primary-fixed text-primary']

function TestRow({ test, index, booked, actions, bookable }: { test: Test; index: number; booked: number; actions: TestActions; bookable: boolean }) {
  const router = useRouter()
  const [price, setPrice] = useState(test.price != null ? String(test.price) : '')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const changed = price !== (test.price != null ? String(test.price) : '')
  const priced = !!test.price

  const save = () =>
    start(async () => {
      const res = await actions.save(test.name, Number(price))
      setError(res.success ? null : res.error)
      if (res.success) router.refresh()
    })
  const remove = () => {
    if (!confirm(`Remove “${test.name}” from your test menu? Patients will no longer see it.`)) return
    start(async () => {
      const res = await actions.remove(test.name)
      if (!res.success) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <li className="p-2.5 md:p-0 md:py-3 rounded-lg md:rounded-none bg-surface-container-low md:bg-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
      <div className="flex items-start gap-2.5 md:gap-3 min-w-0">
        <span className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-bold text-[10px] md:text-[11px] shrink-0 mt-0.5 ${priced ? BADGES[index % BADGES.length] : 'bg-soft-coral/10 text-soft-coral'}`}>
          {short(test.name)}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-title-md text-[13px] md:text-[14px] font-bold text-indigo-gray-900 break-words">{test.name}</span>
            {booked > 0 && <span className="hidden md:inline px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[10px] font-bold">Booked {booked}×</span>}
          </div>
          <span className={`block font-body-md text-[11px] md:text-[12px] ${priced ? 'text-indigo-gray-600' : 'text-soft-coral font-semibold'}`}>
            {priced ? (
              <>
                {booked > 0 && <span className="md:hidden">Booked {booked} {booked === 1 ? 'time' : 'times'} • </span>}
                {bookable ? 'Bookable online' : 'Amount shown to patients'}
              </>
            ) : (
              bookable ? 'No price set: patients can’t book this test' : 'No amount set yet'
            )}
          </span>
          {error && <p role="alert" className="text-[12px] text-error mt-0.5">{error}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3 self-end sm:self-center shrink-0">
        <label className="flex items-center gap-1 bg-surface-container-lowest md:bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant/40 focus-within:border-vibrant-blue">
          <span className="font-bold text-indigo-gray-900 text-[13px]">₹</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && changed && save()}
            inputMode="numeric"
            aria-label={`Price for ${test.name}`}
            placeholder="0"
            className="w-14 md:w-16 bg-transparent font-title-md text-[14px] font-bold text-indigo-gray-900 text-right focus:outline-none"
          />
          <span className="text-[10px] text-indigo-gray-600">INR</span>
        </label>
        <span className={`hidden sm:flex items-center gap-1 font-label-sm text-[11px] font-bold w-[72px] ${priced ? 'text-fresh-teal' : 'text-soft-coral'}`}>
          {priced ? <CircleCheck className="w-4 h-4" /> : <CircleDashed className="w-4 h-4" />}
          {priced ? 'Active' : 'No price'}
        </span>
        {changed ? (
          <button type="button" onClick={save} disabled={pending || !price} title="Save price" className="px-3 py-1.5 rounded-full bg-vibrant-blue text-on-primary text-[12px] font-bold flex items-center gap-1 disabled:opacity-60">
            {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
          </button>
        ) : (
          <button type="button" onClick={remove} disabled={pending} title={`Remove ${test.name}`} aria-label={`Remove ${test.name}`} className="p-1.5 rounded-full text-indigo-gray-600 hover:text-error hover:bg-error-container/50 disabled:opacity-60">
            {pending ? <LoaderCircle className="w-[18px] h-[18px] animate-spin" /> : <Trash2 className="w-[18px] h-[18px]" />}
          </button>
        )}
      </div>
    </li>
  )
}

/**
 * A test menu with the amount for each test. For a lab it is what patients can book online; the hospital passes its
 * own `actions` and `note` for its test charges.
 */
export function TestMenu({
  tests,
  booked = {},
  actions = LAB_ACTIONS,
  bookable = true,
  note = `Patients pay these prices plus a ₹${DIAGNOSTIC_PLATFORM_FEE} platform fee when they book online. Changes show on the booking page straight away.`,
}: {
  tests: Test[]
  booked?: Record<string, number>
  actions?: TestActions
  note?: string
  /** Lab tests can be booked online; a hospital's test charges are a price list. */
  bookable?: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(true)
  const [pending, start] = useTransition()

  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    start(async () => {
      const res = await actions.save(String(form.get('name') || ''), Number(form.get('price')))
      if (!res.success) return setError(res.error)
      setError(null)
      formEl.reset()
      router.refresh()
    })
  }

  const q = query.trim().toLowerCase()
  const shown = q ? tests.filter((t) => t.name.toLowerCase().includes(q)) : tests
  const field = 'w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest text-indigo-gray-900 text-[13px] border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30'

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <form onSubmit={add} className="p-3 md:p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-col md:flex-row md:items-end gap-3">
        <label className="flex-1 flex flex-col gap-1">
          <span className="font-label-sm text-[11px] text-indigo-gray-600 font-semibold">New Diagnostic Test Name</span>
          <input name="name" required minLength={2} maxLength={120} placeholder="e.g. Vitamin D3 (25-OH) Total" className={field} />
        </label>
        <label className="md:w-36 flex flex-col gap-1">
          <span className="font-label-sm text-[11px] text-indigo-gray-600 font-semibold">Price (₹ INR)</span>
          <span className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-indigo-gray-600 text-[13px]">₹</span>
            <input name="price" type="number" required min={1} step={1} placeholder="1100" className={`${field} pl-6 font-bold`} />
          </span>
        </label>
        <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-fresh-teal hover:scale-[1.02] text-on-secondary text-[12px] font-bold shadow-sm flex items-center justify-center gap-1 transition-transform disabled:opacity-60 shrink-0">
          {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Test
        </button>
      </form>
      {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}

      <div className="flex items-center gap-2">
        {tests.length > 8 && (
          <label className="relative flex-1">
            <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your tests" aria-label="Search your tests" className="w-full pl-9 pr-3 py-2 rounded-full bg-surface-container-low text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30" />
          </label>
        )}
        {tests.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="md:hidden ml-auto px-3 py-1.5 rounded-full bg-surface-container text-primary text-[12px] font-semibold flex items-center gap-1"
          >
            {open ? 'Hide list' : `Show ${tests.length} tests`}
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {tests.length === 0 ? (
        <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600 text-center">Your menu is empty. Add the tests you offer so patients can book them.</p>
      ) : (
        <ul className={`${open ? 'flex' : 'hidden md:flex'} flex-col gap-2 md:gap-0 md:divide-y md:divide-surface-container`}>
          {shown.map((t, i) => (
            <TestRow key={`${t.name}-${t.price}`} test={t} index={i} booked={booked[t.name] ?? 0} actions={actions} bookable={bookable} />
          ))}
          {shown.length === 0 && <li className="py-3 text-sm text-indigo-gray-600">No test matches “{query}”.</li>}
        </ul>
      )}
      <p className="text-[11px] text-indigo-gray-600">{note}</p>
    </div>
  )
}
