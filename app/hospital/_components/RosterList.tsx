'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarPlus, Download, Phone, Search, Stethoscope } from 'lucide-react'
import { Avatar, Chip, EmptyState, type Tone } from '@/components/portal/ui'
import { EditDoctorButton, type EditableDoctor } from './DoctorDialogs'

export type RosterState = 'consulting' | 'available' | 'later' | 'done' | 'scheduled' | 'off'

export type RosterDoctor = {
  id: string
  name: string
  image: string | null
  phone: string | null
  department: string
  credentials: string | null
  shift: string | null
  slots: number
  booked: number
  state: RosterState
  stateNote: string | null
  edit: EditableDoctor
}

const STATE: Record<RosterState, { label: string; tone: Tone; dot: string }> = {
  consulting: { label: 'In consultation', tone: 'blue', dot: 'bg-vibrant-blue animate-pulse' },
  available: { label: 'Available', tone: 'teal', dot: 'bg-fresh-teal' },
  later: { label: 'Shift later', tone: 'neutral', dot: 'bg-outline-variant' },
  done: { label: 'Done for the day', tone: 'neutral', dot: 'bg-outline-variant' },
  scheduled: { label: 'Scheduled', tone: 'blue', dot: 'bg-vibrant-blue' },
  off: { label: 'Not scheduled', tone: 'coral', dot: 'bg-soft-coral' },
}

function exportCsv(rows: RosterDoctor[], day: string) {
  const header = ['Doctor', 'Department', 'Phone', 'Shift', 'Slots', 'Booked', 'Status']
  const lines = rows.map((d) => [d.name, d.department, d.phone ?? '', d.shift ?? 'Not scheduled', d.slots, d.booked, STATE[d.state].label])
  const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `duty-roster-${day}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function RosterList({ doctors, departments, day }: { doctors: RosterDoctor[]; departments: string[]; day: string }) {
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState('all')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = doctors.filter(
      (d) => (dept === 'all' || d.department === dept) && (!q || [d.name, d.department, d.credentials, d.phone].some((s) => s?.toLowerCase().includes(q))),
    )
    const byDept = new Map<string, RosterDoctor[]>()
    for (const d of list) byDept.set(d.department, [...(byDept.get(d.department) ?? []), d])
    return Array.from(byDept.entries())
  }, [doctors, query, dept])

  return (
    <div className="flex flex-col gap-4 md:gap-stack-md">
      <div className="p-3 md:p-4 bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container md:border-transparent flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="relative flex-1 min-w-0 sm:max-w-sm">
            <Search className="w-5 h-5 text-indigo-gray-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search doctor, department or phone…"
              aria-label="Search doctors"
              className="w-full pl-11 pr-4 py-2.5 rounded-full bg-surface-container-low text-[14px] text-indigo-gray-900 placeholder:text-indigo-gray-600 focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30"
            />
          </label>
          <button type="button" onClick={() => exportCsv(groups.flatMap(([, list]) => list), day)} className="self-end sm:self-auto px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-label-sm flex items-center gap-1.5">
            <Download className="w-4 h-4 text-vibrant-blue" /> Export Duty Sheet
          </button>
        </div>
        {departments.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 md:mx-0 md:px-0">
            {['all', ...departments].map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={dept === d}
                onClick={() => setDept(d)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap ${dept === d ? 'bg-vibrant-blue text-on-primary' : 'bg-surface-container-low text-indigo-gray-600 hover:text-indigo-gray-900'}`}
              >
                {d === 'all' ? 'All departments' : d}
              </button>
            ))}
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={Stethoscope}>{doctors.length ? 'No doctor matches your search.' : 'No doctors yet. Add your first doctor to start publishing slots.'}</EmptyState>
      ) : (
        groups.map(([department, list]) => {
          const onDuty = list.filter((d) => d.state !== 'off').length
          return (
            <section key={department} className="bg-surface-container-lowest rounded-2xl md:rounded-xl p-4 md:p-stack-md shadow-sm border border-surface-container md:border-transparent flex flex-col gap-3 md:gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-title-md text-[16px] md:text-title-md font-bold text-indigo-gray-900 truncate">{department}</h3>
                    <span className="text-[12px] text-indigo-gray-600">
                      {list.length} {list.length === 1 ? 'doctor' : 'doctors'}
                    </span>
                  </div>
                </div>
                <Chip tone={onDuty ? 'blue' : 'neutral'}>{onDuty} on duty</Chip>
              </div>
              <ul className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {list.map((d) => {
                  const state = STATE[d.state]
                  return (
                    <li key={d.id} className="p-3.5 md:p-4 rounded-xl bg-surface-container-low flex flex-col justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Avatar name={d.name} image={d.image} className="w-12 h-12 md:w-14 md:h-14 text-sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-title-md text-[15px] md:text-[16px] font-bold text-indigo-gray-900 truncate">{d.name}</h4>
                              {d.credentials && <p className="text-[12px] text-primary font-semibold truncate">{d.credentials}</p>}
                            </div>
                            <EditDoctorButton doctor={d.edit} departments={departments} iconOnly className="p-2 rounded-full hover:bg-surface-container text-indigo-gray-600 shrink-0" />
                          </div>
                          <p className="text-[12px] text-indigo-gray-600 mt-0.5">
                            {d.shift ? `Shift: ${d.shift} • ${d.booked}/${d.slots} booked` : 'No slots published for this day'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${state.dot}`} />
                          <span className={`text-[12px] font-bold truncate ${state.tone === 'teal' ? 'text-secondary' : state.tone === 'blue' ? 'text-vibrant-blue' : state.tone === 'coral' ? 'text-soft-coral' : 'text-indigo-gray-600'}`}>
                            {d.stateNote ?? state.label}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          {d.phone && (
                            <a href={`tel:${d.phone.replace(/[^\d+]/g, '')}`} className="px-3 py-1.5 rounded-full bg-vibrant-blue text-on-primary text-[12px] font-bold flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" /> Call
                            </a>
                          )}
                          <Link href={`/hospital/doctors/${d.id}/schedule?date=${day}`} className="px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900 text-[12px] font-bold flex items-center gap-1">
                            <CalendarPlus className="w-3.5 h-3.5 text-vibrant-blue" /> Slots
                          </Link>
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
