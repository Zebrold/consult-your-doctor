'use client'

import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import { Chip, EmptyState } from './ui'

export type DirectoryRow = {
  id: string
  name: string
  phone: string | null
  consultations: number
  labTests: number
  lastActivity: string
  lastActivityLabel: string
  lastStatus: string
}

const PAGE = 20

export function PatientDirectory({ patients }: { patients: DirectoryRow[] }) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const q = query.trim().toLowerCase()
  const filtered = patients.filter((p) => !q || p.name.toLowerCase().includes(q) || p.phone?.includes(q))

  return (
    <div className="flex flex-col gap-4">
      <div className="relative self-start">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-600" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }}
          placeholder="Search by name or phone..."
          aria-label="Search patients"
          className="pl-9 pr-4 py-2 rounded-full bg-surface-container-low text-on-surface font-label-sm text-label-sm outline-none focus:ring-2 focus:ring-vibrant-blue w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users}>No patients match your search.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="text-indigo-gray-600 font-label-sm text-label-sm bg-surface-container-low">
                <th className="py-3 px-4 rounded-l-lg font-semibold">Patient</th>
                <th className="py-3 px-4 font-semibold">Phone</th>
                <th className="py-3 px-4 font-semibold">Consultations</th>
                <th className="py-3 px-4 font-semibold">Lab tests</th>
                <th className="py-3 px-4 rounded-r-lg font-semibold">Latest booking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-sm">
              {filtered.slice(0, limit).map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-on-surface">{p.name}</td>
                  <td className="py-3 px-4 text-indigo-gray-600">
                    {p.phone ? <a href={`tel:${p.phone}`} className="hover:text-vibrant-blue">{p.phone}</a> : '—'}
                  </td>
                  <td className="py-3 px-4 font-mono">{p.consultations}</td>
                  <td className="py-3 px-4 font-mono">{p.labTests}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Chip tone={p.lastStatus === 'Cancelled' ? 'coral' : p.lastStatus === 'Awaiting payment' ? 'neutral' : 'teal'}>{p.lastStatus}</Chip>
                      <span className="text-[11px] text-indigo-gray-600">{p.lastActivityLabel}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="self-center px-4 py-2 rounded-full bg-surface-container-low text-indigo-gray-900 hover:bg-surface-container font-label-sm text-label-sm">
          Show more ({filtered.length - limit} remaining)
        </button>
      )}
    </div>
  )
}
