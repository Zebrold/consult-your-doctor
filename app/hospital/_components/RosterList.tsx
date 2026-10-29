'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarPlus, ChevronDown, Download, Phone } from 'lucide-react'
import { EmptyLine, Initials, Panel, PanelHead, btnOutline, btnPrimary, card, plural, telHref } from './hos-ui'
import { EditDoctorButton, type EditableDoctor } from './DoctorDialogs'

export type RosterState = 'consulting' | 'available' | 'later' | 'done' | 'scheduled' | 'off'

export type RosterDoctor = {
  id: string
  name: string
  image: string | null
  phone: string | null
  department: string
  /** "Orthopaedics · 5 yrs" */
  credentials: string
  shift: string | null
  slots: number
  booked: number
  state: RosterState
  stateNote: string | null
  /** Morning, afternoon and evening: the hours and how many slots. */
  periods: { label: string; hours: string; slots: number }[]
  /** Runs of back-to-back slots on the 8 AM – 9 PM timeline, as percentages. */
  blocks: { left: number; width: number; slots: number; time: string }[]
  edit: EditableDoctor
}

const STATE: Record<RosterState, { label: string; color: string }> = {
  consulting: { label: 'In consultation', color: '#2A4DD0' },
  available: { label: 'On duty', color: '#067647' },
  later: { label: 'Shift later', color: '#5B667A' },
  done: { label: 'Done for the day', color: '#5B667A' },
  scheduled: { label: 'On duty', color: '#067647' },
  off: { label: 'Not scheduled', color: '#B42318' },
}

const AXIS = [8, 10, 12, 14, 16, 18, 20]
const axisLabel = (h: number) => `${h > 12 ? h - 12 : h}${h < 12 ? 'a' : 'p'}`
const timeGrid = 'grid grid-cols-[230px_minmax(0,1fr)_150px] xl:grid-cols-[250px_minmax(0,1fr)_160px] gap-4'

function exportCsv(rows: RosterDoctor[], day: string) {
  const header = ['Doctor', 'Department', 'Phone', 'Shift', 'Slots', 'Booked', 'Status']
  const lines = rows.map((d) => [d.name, d.department, d.phone ?? '', d.shift ?? 'Not scheduled', d.slots, d.booked, d.stateNote ?? STATE[d.state].label])
  const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `duty-roster-${day}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Downloads the day's duty sheet (CSV). */
export function DutySheetButton({ doctors, day, className, label = 'Duty sheet' }: { doctors: RosterDoctor[]; day: string; className: string; label?: string }) {
  return (
    <button type="button" onClick={() => exportCsv(doctors, day)} disabled={!doctors.length} className={`${className} disabled:opacity-50`}>
      <Download className="w-4 h-4" /> {label}
    </button>
  )
}

/**
 * The day's roster after the HosRoster/DeskHosRoster exports: on phones a card per doctor that opens to their
 * morning, afternoon and evening; on desktops the shift timeline from 8 AM to 9 PM.
 */
export function RosterList({ doctors, departments, day }: { doctors: RosterDoctor[]; departments: string[]; day: string }) {
  const [open, setOpen] = useState<string | null>(doctors[0]?.id ?? null)
  const empty = 'No doctors yet. Add your first doctor to start publishing slots.'
  const slotsHref = (d: RosterDoctor) => `/hospital/doctors/${d.id}/schedule?date=${day}`

  return (
    <>
      {/* Phones */}
      <section className="lg:hidden">
        <div className="flex items-center justify-between gap-3 mt-3.5">
          <h2 className="text-[16px] font-extrabold">Doctors</h2>
          <DutySheetButton doctors={doctors} day={day} label="Export duty sheet" className="flex items-center gap-[5px] text-[13px] font-extrabold text-[#2A4DD0]" />
        </div>
        {doctors.length === 0 && <p className="mt-3 text-[13px] text-[#5B667A]">{empty}</p>}
        {doctors.map((d) => {
          const isOpen = open === d.id
          const state = STATE[d.state]
          return (
            <article key={d.id} className={`${card} mt-2.5 p-3.5 ${isOpen ? '!shadow-[0_0_0_1.5px_#2A4DD0]' : ''}`}>
              <button type="button" onClick={() => setOpen(isOpen ? null : d.id)} aria-expanded={isOpen} className="w-full flex items-center gap-3 text-left">
                <Initials name={d.name} image={d.image} className="w-11 h-11 text-[13px]" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-extrabold truncate">{d.name}</span>
                  <span className="block text-[12px] text-[#5B667A] truncate">{d.credentials}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[12px] font-extrabold" style={{ color: state.color }}>
                    {d.stateNote ?? state.label}
                  </span>
                  <span className="block text-[12px] text-[#5B667A]">{d.slots ? `${d.booked} / ${d.slots} booked` : 'No slots'}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-[#8A94A6] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="mt-3">
                  {d.periods.map((p) => (
                    <div key={p.label} className="flex justify-between gap-2 py-2.5 border-t border-[#EEF2F7] text-[13px]">
                      <span className="min-w-0">
                        <span className="block font-extrabold">{p.label}</span>
                        <span className="block text-[12px] text-[#5B667A]">{p.hours}</span>
                      </span>
                      <span className={`font-extrabold shrink-0 ${p.slots ? '' : 'text-[#98A2B3]'}`}>{p.slots ? plural(p.slots, 'slot') : 'No slots'}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 gap-2 mt-2.5">
                    {d.phone ? (
                      <a href={telHref(d.phone)} className={`${btnOutline} !h-[38px] !px-2 !text-[12.5px]`}>
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    ) : (
                      <span className={`${btnOutline} !h-[38px] !px-2 !text-[12.5px] opacity-50`}>No phone</span>
                    )}
                    <EditDoctorButton doctor={d.edit} departments={departments} className={`${btnOutline} !h-[38px] !px-2 !text-[12.5px]`} />
                    <Link href={slotsHref(d)} className={`${btnPrimary} !h-[38px] !px-2 !text-[12.5px] !shadow-none`}>
                      <CalendarPlus className="w-3.5 h-3.5" /> Slots
                    </Link>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </section>

      {/* Desktops: the shift timeline */}
      <Panel className="hidden lg:block">
        <PanelHead title="Shift timeline" sub="Clinic hours by doctor, 8 AM – 9 PM" />
        {doctors.length === 0 ? (
          <EmptyLine>{empty}</EmptyLine>
        ) : (
          <div role="table" aria-label="Shift timeline">
            <div role="row" className={`${timeGrid} pb-2`}>
              <span />
              <span className="relative h-4" aria-hidden>
                {AXIS.map((h) => (
                  <span key={h} className="absolute -translate-x-1/2 text-[11.5px] font-bold text-[#5B667A]" style={{ left: `${((h - 8) / 13) * 100}%` }}>
                    {axisLabel(h)}
                  </span>
                ))}
              </span>
              <span />
            </div>
            {doctors.map((d) => {
              const state = STATE[d.state]
              return (
                <div key={d.id} role="row" className={`${timeGrid} items-center py-1.5 border-t border-[#EEF2F7]`}>
                  <span role="cell" className="flex items-center gap-2.5 min-w-0">
                    <Initials name={d.name} image={d.image} />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-extrabold truncate">{d.name}</span>
                      <span className="block text-[12px] text-[#5B667A] truncate">
                        {d.department} ·{' '}
                        <span className="font-extrabold" style={{ color: state.color }}>
                          {d.stateNote ?? state.label}
                        </span>
                      </span>
                    </span>
                  </span>
                  <span
                    role="cell"
                    className="relative h-[52px]"
                    style={{ background: 'repeating-linear-gradient(to right, #F4F6FA 0, #F4F6FA 1px, transparent 1px, transparent calc(100% / 13))' }}
                  >
                    {d.blocks.map((b) => (
                      <span
                        key={b.left}
                        title={`${b.time} · ${plural(b.slots, 'slot')}`}
                        className="absolute top-[9px] bottom-[9px] rounded-lg bg-[#2A4DD0] text-white px-2.5 flex items-center text-[12px] font-extrabold whitespace-nowrap overflow-hidden"
                        style={{ left: `${b.left}%`, width: `${b.width}%` }}
                      >
                        Clinic · {plural(b.slots, 'slot')}
                      </span>
                    ))}
                    {d.blocks.length === 0 && <span className="absolute inset-y-0 left-2 flex items-center text-[12px] font-bold text-[#98A2B3]">No slots this day</span>}
                  </span>
                  <span role="cell" className="flex items-center justify-end gap-2">
                    <span className="text-[13px] font-extrabold whitespace-nowrap">{d.slots ? `${d.booked} / ${d.slots}` : '—'}</span>
                    <EditDoctorButton
                      doctor={d.edit}
                      departments={departments}
                      iconOnly
                      className="w-[34px] h-[34px] rounded-[10px] border border-[#D6DDE8] bg-white flex items-center justify-center text-[#27324A] hover:bg-[#F4F6FA] shrink-0"
                    />
                    <Link href={slotsHref(d)} className={`${btnOutline} !h-[34px] !px-3 !text-[12.5px]`}>
                      Slots
                    </Link>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </>
  )
}
