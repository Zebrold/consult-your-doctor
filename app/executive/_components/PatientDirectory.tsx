'use client'

import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import { EmptyState, Status, Table, td, telHref, th } from './ui'

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

const statusColor = (s: string) => (s === 'Cancelled' ? '#98A2B3' : s === 'Awaiting payment' ? '#B54708' : '#2A4DD0')

/** Everyone who has booked a consultation or a lab test, most recent first. */
export function PatientDirectory({ patients }: { patients: DirectoryRow[] }) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const q = query.trim().toLowerCase()
  const filtered = patients.filter((p) => !q || p.name.toLowerCase().includes(q) || p.phone?.includes(q))

  return (
    <div>
      <label className="flex items-center gap-2 h-10 px-3 mb-3.5 rounded-[10px] bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0] w-full sm:w-72">
        <Search className="w-4 h-4 text-[#5B667A] shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setLimit(PAGE)
          }}
          placeholder="Search by name or phone"
          aria-label="Search patients"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[13px]"
        />
      </label>

      {filtered.length === 0 ? (
        <EmptyState icon={Users}>No patients match your search.</EmptyState>
      ) : (
        <Table min={680}>
          <thead>
            <tr>
              <th className={th}>Patient</th>
              <th className={th}>Phone</th>
              <th className={th}>Consultations</th>
              <th className={th}>Lab tests</th>
              <th className={th}>Latest booking</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, limit).map((p) => (
              <tr key={p.id}>
                <td className={`${td} font-extrabold`}>{p.name}</td>
                <td className={td}>
                  {p.phone ? (
                    <a href={telHref(p.phone)} className="font-bold text-[#2A4DD0] hover:underline underline-offset-4">
                      {p.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`${td} tabular-nums`}>{p.consultations}</td>
                <td className={`${td} tabular-nums`}>{p.labTests}</td>
                <td className={td}>
                  <span className="flex items-center gap-2">
                    <Status label={p.lastStatus} color={statusColor(p.lastStatus)} />
                    <span className="text-[12px] text-[#5B667A]">{p.lastActivityLabel}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {filtered.length > limit && (
        <div className="pt-3.5 text-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
            Show more ({filtered.length - limit} left)
          </button>
        </div>
      )}
    </div>
  )
}
