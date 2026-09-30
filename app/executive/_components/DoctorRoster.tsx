'use client'

import { useState } from 'react'
import { Download, Search, Stethoscope } from 'lucide-react'
import { EmptyState } from './ui'

export type RosterRow = {
  id: string
  name: string
  specialty: string
  qualifications: string | null
  hospital: string | null
  city: string | null
  experienceYears: number | null
  fee: number
  todayCount: number
  openSlots: number
}

const PAGE = 25

function downloadCsv(rows: RosterRow[]) {
  const header = ['Doctor', 'Specialty', 'Qualifications', 'Hospital', 'City', 'Experience (yrs)', 'Fee (INR)', "Today's appointments", 'Open future slots']
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [header, ...rows.map((r) => [r.name, r.specialty, r.qualifications, r.hospital, r.city, r.experienceYears, r.fee, r.todayCount, r.openSlots])]
  const blob = new Blob([lines.map((l) => l.map(escape).join(',')).join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `doctor-roster-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function DoctorRoster({ doctors, specialties }: { doctors: RosterRow[]; specialties: string[] }) {
  const [specialty, setSpecialty] = useState('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const q = query.trim().toLowerCase()
  const filtered = doctors.filter(
    (d) =>
      (specialty === 'all' || d.specialty === specialty) &&
      (!q || [d.name, d.hospital, d.city, d.specialty].some((v) => v?.toLowerCase().includes(q)))
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={specialty}
          onChange={(e) => { setSpecialty(e.target.value); setLimit(PAGE) }}
          aria-label="Filter by specialty"
          className="pl-3 pr-8 py-2 rounded-full bg-surface-container-low text-on-surface font-label-sm text-label-sm outline-none focus:ring-2 focus:ring-vibrant-blue cursor-pointer"
        >
          <option value="all">All specialties ({specialties.length})</option>
          {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-600" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }}
            placeholder="Search doctor, hospital or city..."
            aria-label="Search doctors"
            className="pl-9 pr-4 py-2 rounded-full bg-surface-container-low text-on-surface font-label-sm text-label-sm outline-none focus:ring-2 focus:ring-vibrant-blue w-60 sm:w-72"
          />
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(filtered)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm shadow-md hover:bg-primary transition-all"
        >
          <Download className="w-4 h-4" /> Export roster (CSV)
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Stethoscope}>No doctors match these filters.</EmptyState>
      ) : (
        <div className="w-full bg-surface-container-lowest rounded-xl overflow-hidden ring-1 ring-surface-container">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-indigo-gray-600 font-label-sm text-label-sm">
                  <th className="py-3.5 px-5 font-semibold">Clinician &amp; Specialization</th>
                  <th className="py-3.5 px-4 font-semibold">Affiliated Hospital</th>
                  <th className="py-3.5 px-4 font-semibold">Experience</th>
                  <th className="py-3.5 px-4 font-semibold">Consultation Fee</th>
                  <th className="py-3.5 px-4 font-semibold">Today</th>
                  <th className="py-3.5 px-5 font-semibold">Open Slots</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filtered.slice(0, limit).map((d) => (
                  <tr key={d.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-full bg-surface-container text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {d.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="font-label-sm text-label-sm text-on-surface font-bold truncate">Dr. {d.name}</div>
                          <div className="font-label-sm text-[11px] text-vibrant-blue truncate">
                            {d.specialty}{d.qualifications ? ` • ${d.qualifications}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-label-sm text-label-sm text-on-surface-variant">
                      {d.hospital ?? '—'}{d.city ? ` (${d.city})` : ''}
                    </td>
                    <td className="py-4 px-4 font-label-sm text-label-sm text-on-surface">{d.experienceYears != null ? `${d.experienceYears} yrs` : '—'}</td>
                    <td className="py-4 px-4 font-label-sm text-label-sm text-on-surface font-semibold">₹{d.fee.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-4">
                      <span className="font-label-sm text-label-sm font-semibold text-on-surface">{d.todayCount} booked</span>
                      <div className="w-24 bg-surface-container rounded-full h-1 mt-1">
                        <div className="bg-vibrant-blue h-full rounded-full" style={{ width: `${Math.min(100, d.todayCount * 12.5)}%` }} />
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold ${
                          d.openSlots > 0 ? 'bg-fresh-teal/15 text-secondary' : 'bg-soft-coral/10 text-soft-coral'
                        }`}
                      >
                        {d.openSlots > 0 ? `${d.openSlots} available` : 'No open slots'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-3 text-indigo-gray-600 font-label-sm text-label-sm">
            <span>Showing {Math.min(limit, filtered.length)} of {filtered.length} doctors</span>
            {filtered.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="px-4 py-1.5 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface-container">
                Show more
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
