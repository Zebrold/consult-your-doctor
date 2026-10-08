'use client'

import { useState, type KeyboardEvent } from 'react'
import { Check, Plus, X } from 'lucide-react'

/**
 * Pick several values from suggestions, or type your own. Each chosen value is submitted with the form as a hidden
 * input named `name`, so a server action reads them with formData.getAll(name).
 */
export function ChipPicker({ name, label, suggestions, initial, placeholder = 'Add another', hint }: { name: string; label: string; suggestions: string[]; initial: string[]; placeholder?: string; hint?: string }) {
  const [chosen, setChosen] = useState<string[]>(initial)
  const [draft, setDraft] = useState('')
  const has = (v: string) => chosen.some((c) => c.toLowerCase() === v.toLowerCase())
  const toggle = (v: string) => setChosen((list) => (has(v) ? list.filter((c) => c.toLowerCase() !== v.toLowerCase()) : [...list, v]))
  const add = () => {
    const value = draft.trim().replace(/\s+/g, ' ').slice(0, 80)
    if (value && !has(value)) setChosen((list) => [...list, value])
    setDraft('')
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    }
  }
  const extra = chosen.filter((c) => !suggestions.some((s) => s.toLowerCase() === c.toLowerCase()))

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-label-sm text-label-sm text-indigo-gray-600 mb-1.5">{label}</legend>
      {chosen.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <div className="flex flex-wrap gap-1.5">
        {[...suggestions, ...extra].map((v) => {
          const on = has(v)
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(v)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-colors ${
                on ? 'bg-vibrant-blue text-on-primary border-vibrant-blue' : 'bg-surface-container-lowest text-on-surface border-outline-variant/60 hover:border-vibrant-blue/50'
              }`}
            >
              {on ? <Check className="w-3.5 h-3.5" /> : null}
              {v}
              {on && extra.includes(v) && <X className="w-3.5 h-3.5 opacity-80" aria-label={`Remove ${v}`} />}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          maxLength={80}
          placeholder={placeholder}
          className="flex-1 rounded-lg bg-surface-container-low px-3.5 py-2 text-[14px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30"
        />
        <button type="button" onClick={add} disabled={!draft.trim()} className="px-3.5 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-[13px] font-semibold inline-flex items-center gap-1 disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      {hint && <span className="text-[11px] text-indigo-gray-600">{hint}</span>}
    </fieldset>
  )
}
