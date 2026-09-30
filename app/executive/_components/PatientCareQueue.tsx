'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CircleCheck, Clock, Microscope, Phone, Search, SlidersHorizontal, UserRound } from 'lucide-react'
import type { AttentionItem } from '../_lib/ops'
import { Chip, EmptyState } from './ui'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'consultations', label: 'Consultations' },
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'payment', label: 'Awaiting payment' },
] as const

type Tab = (typeof tabs)[number]['id']

const matchesTab = (item: AttentionItem, tab: Tab) =>
  tab === 'all' || (tab === 'payment' ? item.status === 'Awaiting payment' : item.category === tab)

export function PatientCareQueue({ items }: { items: AttentionItem[] }) {
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(8)

  const q = query.trim().toLowerCase()
  const filtered = items.filter(
    (i) => matchesTab(i, tab) && (!q || [i.who, i.phone, i.detail, i.title].some((v) => v?.toLowerCase().includes(q)))
  )

  return (
    <div className="flex flex-col gap-stack-md">
      <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <h2 className="font-title-md text-title-md text-indigo-gray-900">Patient Care Queue</h2>
            <span className="px-2 py-0.5 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm">{items.length} open</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by patient, phone, doctor or lab..."
              aria-label="Search the care queue"
              className="pl-9 pr-4 py-2 bg-surface-container-low rounded-full text-label-sm text-on-surface outline-none focus:ring-2 focus:ring-vibrant-blue/30 w-64 sm:w-72"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setLimit(8) }}
              aria-pressed={tab === t.id}
              className={`px-3.5 py-1.5 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all ${
                tab === t.id ? 'bg-vibrant-blue text-on-primary font-semibold' : 'bg-surface-container-low text-indigo-gray-600 hover:text-on-surface'
              }`}
            >
              {t.label} ({items.filter((i) => matchesTab(i, t.id)).length})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm">
          <EmptyState icon={CircleCheck}>No patient bookings need follow-up here.</EmptyState>
        </div>
      ) : (
        filtered.slice(0, limit).map((item) => {
          const Icon = item.category === 'diagnostics' ? Microscope : UserRound
          const high = item.severity === 'high'
          return (
            <article key={item.id} className="relative overflow-hidden bg-surface-container-lowest p-5 md:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
              <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${high ? 'bg-soft-coral' : 'bg-primary'}`} />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-11 h-11 rounded-full bg-surface-container text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {item.who.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-title-md text-lg font-bold text-indigo-gray-900">{item.who}</span>
                      <Chip tone={high ? 'coral' : 'primary'}>{high ? 'URGENT' : 'FOLLOW UP'}</Chip>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-indigo-gray-600 font-label-sm text-label-sm">
                      {item.phone && <span>{item.phone}</span>}
                      {item.phone && <span>•</span>}
                      <span className="inline-flex items-center gap-1"><Icon className="w-3.5 h-3.5" /> {item.portal}</span>
                      <span>•</span>
                      <span className={`inline-flex items-center gap-1 ${high ? 'text-soft-coral font-semibold' : ''}`}>
                        <Clock className="w-3.5 h-3.5" /> {item.sinceLabel}
                      </span>
                    </div>
                  </div>
                </div>
                <Chip tone={high ? 'coral' : 'neutral'}>{item.status}</Chip>
              </div>

              <div className="ml-2 bg-surface-container-low/60 p-3 rounded-lg">
                <div className={`font-label-sm text-label-sm font-bold uppercase tracking-wider mb-1 ${high ? 'text-soft-coral' : 'text-primary'}`}>{item.title}</div>
                <p className="font-body-md text-[15px] text-indigo-gray-900">{item.detail || '—'}</p>
              </div>

              <div className="pl-2 flex flex-wrap items-center gap-2">
                {item.phone ? (
                  <a href={`tel:${item.phone}`} className="px-3 py-1.5 rounded-full bg-vibrant-blue text-on-primary hover:bg-primary font-label-sm text-label-sm font-semibold transition-all flex items-center gap-1 shadow-sm">
                    <Phone className="w-4 h-4" /> Call patient
                  </a>
                ) : (
                  <span className="px-3 py-1.5 rounded-full bg-surface-container-low text-indigo-gray-600 font-label-sm text-label-sm">No phone on file</span>
                )}
                {item.category === 'diagnostics' && (
                  <Link href="/executive/diagnostics" className="px-3 py-1.5 rounded-full bg-surface-container text-indigo-gray-900 hover:bg-surface-container-high font-label-sm text-label-sm transition-all flex items-center gap-1">
                    Lab operations <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </article>
          )
        })
      )}

      {filtered.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 8)} className="self-center px-4 py-2 rounded-full bg-surface-container-lowest shadow-sm text-indigo-gray-900 hover:bg-surface-container font-label-sm text-label-sm">
          Show more ({filtered.length - limit} remaining)
        </button>
      )}
    </div>
  )
}
