'use client'

import { useState } from 'react'
import { CircleCheck, Search } from 'lucide-react'
import type { AttentionItem } from '../_lib/ops'
import { CallLink, EmptyState, Initials, Status, card, segGroup, segTab } from './ui'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'consultations', label: 'Consultations' },
  { id: 'diagnostics', label: 'Lab tests' },
  { id: 'payment', label: 'Awaiting payment' },
] as const

type Tab = (typeof tabs)[number]['id']

const matchesTab = (item: AttentionItem, tab: Tab) =>
  tab === 'all' || (tab === 'urgent' ? item.severity === 'high' : tab === 'payment' ? item.status === 'Awaiting payment' : item.category === tab)

/** The patient care queue after DeskExePatients: patients whose bookings stalled, with a call button. */
export function PatientCareQueue({ items }: { items: AttentionItem[] }) {
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(10)

  const q = query.trim().toLowerCase()
  const filtered = items.filter((i) => matchesTab(i, tab) && (!q || [i.who, i.phone, i.detail, i.title].some((v) => v?.toLowerCase().includes(q))))

  return (
    <section className={`${card} p-4 lg:p-[22px] min-w-0`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3.5">
        <div>
          <h2 className="text-[16px] font-extrabold">Patient care queue</h2>
          <p className="mt-[3px] text-[13px] text-[#5B667A]">{items.length} open</p>
        </div>
        <label className="flex items-center gap-2 h-10 px-3 rounded-[10px] bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0] w-full sm:w-72">
          <Search className="w-4 h-4 text-[#5B667A] shrink-0" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, phone, doctor or lab" aria-label="Search the care queue" className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[13px]" />
        </label>
      </div>
      <div className="mb-3 -mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto no-scrollbar">
        <div role="tablist" aria-label="Filter" className={segGroup}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id)
                setLimit(10)
              }}
              className={segTab(tab === t.id)}
            >
              {t.label} ({items.filter((i) => matchesTab(i, t.id)).length})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CircleCheck}>No patient bookings need follow-up here.</EmptyState>
      ) : (
        <ul>
          {filtered.slice(0, limit).map((item) => {
            const high = item.severity === 'high'
            return (
              <li key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 py-3.5 border-t border-[#EEF2F7]">
                <span className="flex items-center gap-3 min-w-0 flex-1">
                  <Initials name={item.who} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-extrabold">{item.who}</span>
                      {high && <span className="inline-flex h-5 items-center px-1.5 rounded bg-[#FEF3F2] text-[#B42318] text-[10.5px] font-extrabold tracking-[0.04em]">URGENT</span>}
                    </span>
                    <span className="block text-[12px] text-[#5B667A] truncate">{[item.phone, item.portal].filter(Boolean).join(' · ')}</span>
                  </span>
                </span>
                <span className="min-w-0 sm:flex-[1.4] sm:pl-0 pl-12">
                  <span className="block text-[13.5px] font-extrabold truncate">{item.title}</span>
                  <span className="block text-[12px] text-[#5B667A] truncate">{item.detail || '—'}</span>
                </span>
                <span className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0 sm:w-[260px] shrink-0">
                  <span className="text-right">
                    <Status label={item.status} color={high ? '#B42318' : '#B54708'} />
                    <span className="block text-[12px] text-[#5B667A]">{item.sinceLabel}</span>
                  </span>
                  {item.phone ? <CallLink phone={item.phone} /> : <span className="text-[12px] text-[#5B667A]">No phone</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {filtered.length > limit && (
        <div className="pt-3.5 text-center">
          <button type="button" onClick={() => setLimit((l) => l + 10)} className="text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
            Show all {filtered.length}
          </button>
        </div>
      )}
    </section>
  )
}
