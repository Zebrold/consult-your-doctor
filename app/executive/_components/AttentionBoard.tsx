'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CircleCheck } from 'lucide-react'
import type { AttentionItem } from '../_lib/ops'
import { CallLink, EmptyState, Severity, Status, btnSmall, segGroup, segTab } from './ui'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'high', label: 'Critical' },
  { id: 'doctors', label: 'Doctor applications' },
  { id: 'partners', label: 'Hospital & lab applications' },
  { id: 'consultations', label: 'Consultations' },
  { id: 'diagnostics', label: 'Diagnostics' },
] as const

type Filter = (typeof filters)[number]['id']

/** The Command page's "Needs attention" after DeskExeHome: segmented filters, then severity, who, issue and status. */
export function AttentionBoard({ items, limit = 8 }: { items: AttentionItem[]; limit?: number }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [showAll, setShowAll] = useState(false)

  const count = (id: Filter) => (id === 'all' ? items.length : id === 'high' ? items.filter((i) => i.severity === 'high').length : items.filter((i) => i.category === id).length)
  const filtered = items.filter((i) => filter === 'all' || (filter === 'high' ? i.severity === 'high' : i.category === filter))
  const visible = showAll ? filtered : filtered.slice(0, limit)

  return (
    <div>
      <div className="mb-3.5 -mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto no-scrollbar">
        <div role="tablist" aria-label="Filter" className={segGroup}>
          {filters
            .filter((f) => f.id === 'all' || count(f.id) > 0)
            .map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={segTab(filter === f.id)}>
                {f.label} ({count(f.id)})
              </button>
            ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CircleCheck}>Nothing needs attention here right now.</EmptyState>
      ) : (
        <>
          <div className="hidden lg:grid grid-cols-[130px_minmax(0,1fr)_minmax(0,2.2fr)_160px_120px] gap-4 px-3.5 py-2.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">
            <span>Severity</span>
            <span>Who</span>
            <span>Issue</span>
            <span>Status</span>
            <span />
          </div>
          <ul>
            {visible.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[120px_minmax(0,1fr)_minmax(0,2.2fr)_150px_150px] gap-x-4 gap-y-1.5 items-center py-3 lg:py-[13px] lg:px-3.5 border-b border-[#EEF2F7] text-[13.5px]"
              >
                <span className="flex lg:block items-center gap-2 order-1">
                  <Severity level={item.severity} />
                  <span className="lg:block lg:mt-1 text-[12px] text-[#5B667A]">{item.sinceLabel}</span>
                </span>
                <span className="min-w-0 order-3 lg:order-2 col-span-2 lg:col-span-1">
                  <span className="block font-extrabold truncate">{item.who}</span>
                  <span className="block text-[12px] text-[#5B667A] truncate">{item.portal}</span>
                </span>
                <span className="min-w-0 order-4 lg:order-3 col-span-2 lg:col-span-1">
                  <span className="block font-extrabold truncate">{item.title}</span>
                  <span className="block text-[12px] text-[#5B667A] truncate">{item.detail || '—'}</span>
                </span>
                <span className="order-5 lg:order-4">
                  <Status label={item.status} color={item.severity === 'high' ? '#B42318' : '#B54708'} />
                </span>
                <span className="order-2 lg:order-5 text-right">
                  {item.actionLabel === 'Contact patient' && item.phone ? (
                    <CallLink phone={item.phone} />
                  ) : (
                    <Link href={item.href} className={btnSmall}>
                      {item.actionLabel}
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {filtered.length > limit && (
            <div className="pt-3.5 text-center">
              <button type="button" onClick={() => setShowAll((v) => !v)} className="text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                {showAll ? 'Show fewer' : `Show all ${filtered.length}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
