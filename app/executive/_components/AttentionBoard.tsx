'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CircleCheck, Microscope, Phone, Stethoscope, UserRound } from 'lucide-react'
import type { AttentionItem } from '../_lib/ops'
import { Chip, EmptyState } from './ui'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'high', label: 'Critical' },
  { id: 'doctors', label: 'Doctor applications' },
  { id: 'consultations', label: 'Consultations' },
  { id: 'diagnostics', label: 'Diagnostics' },
] as const

const portalIcons = { doctors: Stethoscope, consultations: UserRound, diagnostics: Microscope }

export function AttentionBoard({ items, limit = 12 }: { items: AttentionItem[]; limit?: number }) {
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all')
  const [showAll, setShowAll] = useState(false)

  const count = (id: (typeof filters)[number]['id']) =>
    id === 'all' ? items.length : id === 'high' ? items.filter((i) => i.severity === 'high').length : items.filter((i) => i.category === id).length

  const filtered = items.filter((i) => filter === 'all' || (filter === 'high' ? i.severity === 'high' : i.category === filter))
  const visible = showAll ? filtered : filtered.slice(0, limit)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-all ${
              filter === f.id ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'bg-surface-container-low text-indigo-gray-900 hover:bg-surface-container'
            }`}
          >
            {f.label} ({count(f.id)})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CircleCheck}>Nothing needs attention here right now.</EmptyState>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[860px] text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-indigo-gray-600 font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3.5 px-4 rounded-l-xl font-semibold">Severity</th>
                <th className="py-3.5 px-4 font-semibold">Who / Portal</th>
                <th className="py-3.5 px-4 font-semibold">Issue</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 rounded-r-xl text-right font-semibold">Next step</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {visible.map((item) => {
                const Icon = portalIcons[item.category]
                return (
                  <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap align-top">
                      <Chip tone={item.severity === 'high' ? 'coral' : 'neutral'} dot={item.severity === 'high'}>
                        {item.severity === 'high' ? 'HIGH' : 'MEDIUM'}
                      </Chip>
                      <div className="text-indigo-gray-600 font-label-sm text-[11px] mt-1">{item.sinceLabel}</div>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <div className="font-medium text-indigo-gray-900 text-sm">{item.who}</div>
                      <span className="inline-flex items-center gap-1 text-indigo-gray-600 font-label-sm text-[11px]">
                        <Icon className="w-3 h-3" /> {item.portal}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-top max-w-md">
                      <div className="font-medium text-indigo-gray-900 text-sm">{item.title}</div>
                      <p className="text-indigo-gray-600 font-label-sm text-[12px] truncate">{item.detail || '—'}</p>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap align-top">
                      <Chip tone={item.severity === 'high' ? 'coral' : 'primary'}>{item.status}</Chip>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-right align-top">
                      {item.actionLabel === 'Contact patient' && item.phone ? (
                        <a
                          href={`tel:${item.phone}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-low text-indigo-gray-900 hover:bg-surface-container font-label-sm text-label-sm transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call {item.phone}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-vibrant-blue text-on-primary hover:bg-primary font-label-sm text-label-sm shadow-sm transition-all"
                        >
                          {item.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > limit && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-center px-4 py-2 rounded-full bg-surface-container-low text-indigo-gray-900 hover:bg-surface-container font-label-sm text-label-sm"
        >
          {showAll ? 'Show fewer' : `Show all ${filtered.length}`}
        </button>
      )}
    </div>
  )
}
