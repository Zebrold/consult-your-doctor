'use client'

import { useState } from 'react'
import { Download, Search, Stethoscope } from 'lucide-react'
import { doctorName } from '@/components/patient/format'
import { EmptyState, Initials, Table, Verified, btnOutline, td, th } from './ui'

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
  verified: boolean
}

const PAGE = 25

function downloadCsv(rows: RosterRow[]) {
  const header = ['Doctor', 'Specialty', 'Qualifications', 'Hospital', 'City', 'Experience (yrs)', 'Fee (INR)', "Today's appointments", 'Open future slots', 'Verified badge']
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`
  }
  const lines = [header, ...rows.map((r) => [doctorName(r.name), r.specialty, r.qualifications, r.hospital, r.city, r.experienceYears, r.fee, r.todayCount, r.openSlots, r.verified ? 'Yes' : 'No'])]
  const blob = new Blob(['﻿' + lines.map((l) => l.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `doctor-roster-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** The roster after DeskExeDoctors: every doctor with today's bookings, open slots and badge, filterable and exportable. */
export function DoctorRoster({ doctors, specialties }: { doctors: RosterRow[]; specialties: string[] }) {
  const [specialty, setSpecialty] = useState('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const q = query.trim().toLowerCase()
  const filtered = doctors.filter((d) => (specialty === 'all' || d.specialty === specialty) && (!q || [d.name, d.hospital, d.city, d.specialty].some((v) => v?.toLowerCase().includes(q))))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3.5">
        <label className="flex-1 min-w-[220px] flex items-center gap-2 h-10 px-3 rounded-[10px] bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0]">
          <Search className="w-4 h-4 text-[#5B667A] shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLimit(PAGE)
            }}
            placeholder="Search doctor, hospital or city"
            aria-label="Search doctors"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[13px]"
          />
        </label>
        <select
          value={specialty}
          onChange={(e) => {
            setSpecialty(e.target.value)
            setLimit(PAGE)
          }}
          aria-label="Filter by specialty"
          className="h-10 px-3 rounded-[10px] border border-[#D6DDE8] bg-white text-[13px] font-bold outline-none focus:border-[#2A4DD0]"
        >
          <option value="all">All specialties ({specialties.length})</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0} className={btnOutline}>
          <Download className="w-4 h-4" /> Export roster (CSV)
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Stethoscope}>No doctors match these filters.</EmptyState>
      ) : (
        <>
          <Table min={900}>
            <thead>
              <tr>
                <th className={th}>Doctor</th>
                <th className={th}>Practice</th>
                <th className={th}>Exp.</th>
                <th className={th}>Fee</th>
                <th className={th}>Today</th>
                <th className={th}>Open slots</th>
                <th className={th}>Badge</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((d) => (
                <tr key={d.id}>
                  <td className={td}>
                    <span className="flex items-center gap-3 min-w-0">
                      <Initials name={d.name} />
                      <span className="min-w-0">
                        <span className="block font-extrabold truncate">{doctorName(d.name)}</span>
                        <span className="block text-[12px] text-[#5B667A] truncate">
                          {d.specialty}
                          {d.qualifications ? ` · ${d.qualifications}` : ''}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className={td}>
                    <span className="block font-bold truncate max-w-[220px]">{d.hospital ?? 'No hospital'}</span>
                    {d.city && <span className="block text-[12px] text-[#5B667A]">{d.city}</span>}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{d.experienceYears != null ? `${d.experienceYears} yrs` : '—'}</td>
                  <td className={`${td} font-extrabold tabular-nums`}>₹{d.fee.toLocaleString('en-IN')}</td>
                  <td className={`${td} whitespace-nowrap`}>{d.todayCount} booked</td>
                  <td className={`${td} whitespace-nowrap`}>{d.openSlots > 0 ? <span className="font-bold text-[#2A4DD0]">{d.openSlots} open</span> : <span className="font-bold text-[#B54708]">None open</span>}</td>
                  <td className={td}>{d.verified ? <Verified size={18} /> : <span className="text-[#98A2B3]">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="flex items-center justify-between gap-3 pt-3.5 text-[12.5px] text-[#5B667A]">
            <span>
              Showing {Math.min(limit, filtered.length)} of {filtered.length} doctors
            </span>
            {filtered.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                Show more
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
