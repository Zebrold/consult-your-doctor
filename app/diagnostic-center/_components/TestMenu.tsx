'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react'
import { removeLabTest, saveLabTest } from '@/app/actions/diagnostic-center'
import { DIAGNOSTIC_PLATFORM_FEE } from '@/lib/pricing'

type Test = { name: string; price: number | null }

const short = (name: string) => {
  const words = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words.slice(0, 3).map((w) => w[0]) : [name.slice(0, 3)]).join('').toUpperCase()
}

function TestRow({ test }: { test: Test }) {
  const router = useRouter()
  const [price, setPrice] = useState(test.price != null ? String(test.price) : '')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const changed = price !== (test.price != null ? String(test.price) : '')

  const save = () =>
    start(async () => {
      const res = await saveLabTest(test.name, Number(price))
      setError(res.success ? null : res.error)
      if (res.success) router.refresh()
    })
  const remove = () => {
    if (!confirm(`Remove “${test.name}” from your test menu? Patients will no longer be able to book it.`)) return
    start(async () => {
      const res = await removeLabTest(test.name)
      if (!res.success) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <li className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${test.price ? 'bg-vibrant-blue/10 text-vibrant-blue' : 'bg-soft-coral/10 text-soft-coral'}`}>{short(test.name)}</span>
        <div className="min-w-0">
          <p className="font-title-md text-[14px] font-bold text-indigo-gray-900 break-words">{test.name}</p>
          <p className={`text-[12px] ${test.price ? 'text-indigo-gray-600' : 'text-soft-coral font-semibold'}`}>
            {test.price ? 'Bookable online' : 'No price set: patients can’t book this test'}
          </p>
          {error && <p role="alert" className="text-[12px] text-error mt-0.5">{error}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <label className="flex items-center gap-1 bg-surface-container-low px-2.5 py-1.5 rounded-lg border border-outline-variant/40 focus-within:border-vibrant-blue">
          <span className="font-bold text-indigo-gray-900 text-[13px]">₹</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && changed && save()}
            inputMode="numeric"
            aria-label={`Price for ${test.name}`}
            placeholder="0"
            className="w-16 bg-transparent font-title-md text-[14px] font-bold text-indigo-gray-900 text-right focus:outline-none"
          />
        </label>
        {changed ? (
          <button type="button" onClick={save} disabled={pending || !price} title="Save price" className="px-3 py-1.5 rounded-full bg-vibrant-blue text-on-primary text-[12px] font-bold flex items-center gap-1 disabled:opacity-60">
            {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
          </button>
        ) : (
          <button type="button" onClick={remove} disabled={pending} title={`Remove ${test.name}`} aria-label={`Remove ${test.name}`} className="p-2 rounded-full text-indigo-gray-600 hover:text-error hover:bg-error-container/50 disabled:opacity-60">
            {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </li>
  )
}

/** The lab's test menu: what patients can book, at what price. */
export function TestMenu({ tests }: { tests: Test[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [pending, start] = useTransition()

  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    start(async () => {
      const res = await saveLabTest(String(form.get('name') || ''), Number(form.get('price')))
      if (!res.success) return setError(res.error)
      setError(null)
      formEl.reset()
      router.refresh()
    })
  }

  const q = query.trim().toLowerCase()
  const shown = q ? tests.filter((t) => t.name.toLowerCase().includes(q)) : tests

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="p-3.5 rounded-xl bg-surface-container-low flex flex-col md:flex-row md:items-end gap-3">
        <label className="flex-1 flex flex-col gap-1">
          <span className="font-label-sm text-[11px] text-indigo-gray-600">New test name</span>
          <input name="name" required minLength={2} maxLength={120} placeholder="e.g. Vitamin D (25-OH)" className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-indigo-gray-900 text-[14px] border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30" />
        </label>
        <label className="md:w-36 flex flex-col gap-1">
          <span className="font-label-sm text-[11px] text-indigo-gray-600">Price (₹)</span>
          <input name="price" type="number" required min={1} step={1} placeholder="1100" className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-indigo-gray-900 font-bold text-[14px] border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30" />
        </label>
        <button type="submit" disabled={pending} className="px-4 py-2.5 rounded-full bg-fresh-teal hover:bg-secondary text-on-secondary text-[13px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-60 shrink-0">
          {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Test
        </button>
      </form>
      {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}

      {tests.length > 8 && (
        <label className="relative">
          <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your tests" aria-label="Search your tests" className="w-full pl-9 pr-3 py-2 rounded-full bg-surface-container-low text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30" />
        </label>
      )}

      {tests.length === 0 ? (
        <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600 text-center">Your menu is empty. Add the tests you offer so patients can book them.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-surface-container">
          {shown.map((t) => (
            <TestRow key={`${t.name}-${t.price}`} test={t} />
          ))}
          {shown.length === 0 && <li className="py-3 text-sm text-indigo-gray-600">No test matches “{query}”.</li>}
        </ul>
      )}
      <p className="text-[11px] text-indigo-gray-600">Patients pay these prices plus a ₹{DIAGNOSTIC_PLATFORM_FEE} platform fee when they book online. Changes show on the booking page straight away.</p>
    </div>
  )
}
