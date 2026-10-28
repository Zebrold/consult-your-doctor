'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import { formatShortDate, formatSlot, formatTime, istDateKey } from '@/components/patient/format'
import { showHR, showSpO2, type Vitals } from '@/lib/vitals'
import { readNotes } from '../_lib/notes'
import { CallLink, PrescriptionButton, WritePrescriptionButton, type PickVisit, type VisitRef } from './VisitControls'
import { DeskHead, DocHeader, Initials, Panel, Readings, Row, StatCard, Status, btnOutline, card, delta, lineTab, segGroup, segTab } from './doc-ui'

export type RosterPatient = {
  id: string
  code: string
  name: string
  phone: string | null
  email: string | null
  age: number | null
  gender: string | null
  bloodGroup: string | null
  dateOfBirth: string | null
  emergency: string | null
  visitCount: number
  firstVisit: string | null
  lastSeen: string | null
  nextVisit: string | null
  active: { id: string; status: string; start: string | null } | null
  group: 'checked-in' | 'upcoming' | 'past'
  /** Newest first. type is the record kind: 'prescription', or 'health_record' for details the hospital desk recorded. */
  records: { id: string; type: string | null; notes: string | null; fileUrl: string | null; date: string | null }[]
  vitals: (Vitals & { date: string | null }) | null
}

export type RosterStats = {
  total: number
  newThisMonth: number
  visitsThisMonth: number
  visitsLastMonth: number
  lastMonthName: string
  returningPct: number
  awaitingNotes: number
  /** Paid visits per month, the last seven months. */
  visitSeries: number[]
  /** Patients on the list at the end of each of the last seven months. */
  patientSeries: number[]
}

type Group = 'all' | 'upcoming' | 'checked-in' | 'past'
const GROUPS: [Group, string][] = [
  ['all', 'All'],
  ['upcoming', 'Upcoming'],
  ['checked-in', 'Checked in'],
  ['past', 'Past'],
]
const STATUS: Record<RosterPatient['group'], { label: string; color: string }> = {
  'checked-in': { label: 'Checked in', color: '#067647' },
  upcoming: { label: 'Booked', color: '#2A4DD0' },
  past: { label: 'Completed', color: '#5B667A' },
}
const PAGE = 8
const NARROW = 'h-[42px] px-2 text-[13.5px]'

const ageSex = (p: RosterPatient) => [p.age != null ? String(p.age) : null, p.gender?.[0]?.toUpperCase()].filter(Boolean).join(' ')
const visitRef = (p: RosterPatient): VisitRef | null => (p.active ? { id: p.active.id, status: p.active.status, patientName: p.name, phone: p.phone } : null)
/** What the latest note says: the diagnosis, else the complaints, else nothing. */
const latestNote = (p: RosterPatient) => {
  for (const r of p.records) {
    const n = readNotes(r.notes)
    const text = n.diagnosis || n.complaints
    if (text && !/^Attachment from the doctor$/i.test(text)) return text
  }
  return null
}
const lastRx = (p: RosterPatient) => p.records.map((r) => readNotes(r.notes).rx).find(Boolean) ?? null
const allergy = (p: RosterPatient) => p.records.map((r) => readNotes(r.notes).allergy).find(Boolean) ?? null
function when(p: RosterPatient, now: number) {
  if (p.group === 'checked-in') return p.active?.start ? `Waiting · ${formatTime(p.active.start)}` : 'Checked in'
  if (p.group === 'upcoming' && p.nextVisit) return formatSlot(p.nextVisit, now)
  if (p.lastSeen) return istDateKey(p.lastSeen) === istDateKey(now) ? 'Seen today' : `Seen ${formatShortDate(p.lastSeen)}`
  return 'Not seen yet'
}
const readings = (p: RosterPatient) => [
  { k: 'BP', v: p.vitals?.bp ?? null },
  { k: 'SpO₂', v: p.vitals?.spo2 ? showSpO2(p.vitals.spo2) : null },
  { k: 'Pulse', v: p.vitals?.hr ? showHR(p.vitals.hr) : null },
]

function downloadCsv(rows: RosterPatient[]) {
  const header = ['Patient ID', 'Name', 'Phone', 'Email', 'Age', 'Sex', 'Blood group', 'Visits', 'Last seen', 'Next visit', 'BP', 'SpO2', 'Heart rate']
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.map((p) => [
    p.code, p.name, p.phone, p.email, p.age, p.gender, p.bloodGroup, p.visitCount, p.lastSeen?.slice(0, 10), p.nextVisit?.slice(0, 16),
    p.vitals?.bp, p.vitals?.spo2, p.vitals?.hr,
  ])
  const blob = new Blob([[header, ...lines].map((l) => l.map(esc).join(',')).join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `my-patients-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function PatientRoster({
  doctor,
  patients,
  stats,
  now,
  initialPatient,
  initialQuery,
}: {
  doctor: { name: string; image: string | null }
  patients: RosterPatient[]
  stats: RosterStats
  now: number
  initialPatient: string | null
  initialQuery: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [group, setGroup] = useState<Group>('all')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(PAGE)
  const [selectedId, setSelectedId] = useState<string | null>(() => (initialPatient && patients.some((p) => p.id === initialPatient) ? initialPatient : null))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '')
    return patients.filter((p) => {
      if (group !== 'all' && p.group !== group) return false
      if (!q) return true
      return [p.name, p.code, p.phone, p.email, p.records[0]?.notes].some((v) => v?.toLowerCase().includes(q))
    })
  }, [patients, query, group])
  const selected = patients.find((p) => p.id === selectedId) ?? filtered[0] ?? null
  const count = (g: Group) => (g === 'all' ? patients.length : patients.filter((p) => p.group === g).length)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const current = Math.min(page, pages - 1)
  const pageRows = filtered.slice(current * PAGE, current * PAGE + PAGE)
  const choose = (g: Group) => {
    setGroup(g)
    setPage(0)
    setLimit(PAGE)
  }
  const search = (v: string) => {
    setQuery(v)
    setPage(0)
    setLimit(PAGE)
  }

  // Write Rx opens on the patient checked in now, otherwise offers everyone with an open visit.
  const checkedIn = patients.find((p) => p.group === 'checked-in')
  const recent: PickVisit[] = patients.filter((p) => p.active).map((p) => ({ ...visitRef(p)!, when: p.active?.start ? formatSlot(p.active.start, now) : 'Open visit' }))
  const emptyText = patients.length === 0 ? 'Patients appear here once they book and pay for a visit with you.' : 'No patients match this search.'

  return (
    <>
      <DocHeader doctor={doctor} title="My patients" subtitle="Patients who booked and paid with you">
        <label className="flex items-center gap-2.5 h-12 px-3.5 rounded-[14px] bg-white text-[#0B1B3F]">
          <Search className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
          <span className="sr-only">Search patients</span>
          <input type="search" value={query} onChange={(e) => search(e.target.value)} placeholder="Search by name or patient ID" className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[14px] placeholder:text-[#7A8599]" />
        </label>
      </DocHeader>

      <main className="pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-11">
        {/* ---------- Phones ---------- */}
        <div className="lg:hidden px-4 pt-3.5 md:max-w-[720px] md:mx-auto flex flex-col">
          <section aria-label="Your patients in numbers" className={`${card} grid grid-cols-3 overflow-hidden`}>
            <div className="px-3.5 py-3 shadow-[inset_-1px_0_0_#EEF2F7]">
              <span className="block text-[11.5px] font-bold text-[#5B667A]">Total</span>
              <span className="block mt-0.5 text-[20px] font-extrabold tabular-nums">{stats.total}</span>
              <span className="block text-[11.5px] font-bold text-[#2A4DD0]">+{stats.newThisMonth} new</span>
            </div>
            <div className="px-3.5 py-3 shadow-[inset_-1px_0_0_#EEF2F7]">
              <span className="block text-[11.5px] font-bold text-[#5B667A]">This month</span>
              <span className="block mt-0.5 text-[20px] font-extrabold tabular-nums">{stats.visitsThisMonth}</span>
              <span className="block text-[11.5px] font-bold text-[#067647]">visits</span>
            </div>
            <button type="button" onClick={() => choose('checked-in')} className="block px-3.5 py-3 text-left">
              <span className={`block text-[11.5px] font-bold ${stats.awaitingNotes ? 'text-[#B42318]' : 'text-[#5B667A]'}`}>Notes due</span>
              <span className={`block mt-0.5 text-[20px] font-extrabold tabular-nums ${stats.awaitingNotes ? 'text-[#B42318]' : ''}`}>{stats.awaitingNotes}</span>
              <span className="block text-[11.5px] font-extrabold text-[#2A4DD0]">{stats.awaitingNotes ? 'Review now' : 'All done'}</span>
            </button>
          </section>

          <div role="tablist" className="flex mt-3.5 border-b border-[#E1E7F0]">
            {GROUPS.map(([g, label]) => (
              <button key={g} type="button" role="tab" aria-selected={group === g} onClick={() => choose(g)} className={lineTab(group === g)}>
                {label} {count(g)}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 mb-0.5">
            <span className="text-[13px] font-bold text-[#5B667A]">
              {filtered.length} {filtered.length === 1 ? 'patient' : 'patients'}
            </span>
            <button type="button" onClick={() => downloadCsv(filtered)} className="flex items-center gap-[5px] text-[13px] font-extrabold text-[#2A4DD0]">
              <Download className="w-[15px] h-[15px]" /> Export CSV
            </button>
          </div>
          {filtered.length === 0 && <p className={`${card} mt-2.5 p-6 text-center text-[13px] text-[#5B667A]`}>{emptyText}</p>}
          {filtered.slice(0, limit).map((p) => {
            const vr = visitRef(p)
            const note = latestNote(p)
            return (
              <article key={p.id} className={`${card} mt-2.5 p-3.5`}>
                <Link href={`/doctor/patients/${p.id}`} className="flex items-center gap-3">
                  <Initials name={p.name} className="w-11 h-11 text-[14px]" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-extrabold truncate">{p.name}</span>
                    <span className="block text-[12px] text-[#5B667A] truncate">{[ageSex(p), p.code].filter(Boolean).join(' · ')}</span>
                  </span>
                  <Status label={STATUS[p.group].label} color={STATUS[p.group].color} dot={false} />
                </Link>
                <p className="mt-2.5 text-[12.5px] text-[#27324A] truncate">{[note ?? `${p.visitCount} ${p.visitCount === 1 ? 'visit' : 'visits'}`, when(p, now)].join(' · ')}</p>
                <Readings items={readings(p)} className="mt-2.5 border-y border-[#EEF2F7]" />
                <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2 mt-3">
                  {vr ? (
                    <PrescriptionButton visit={vr} kind="primary" label="Prescription" icon={false} size="h-[38px] px-2 text-[12.5px]" />
                  ) : (
                    <span className="flex items-center justify-center text-[11.5px] font-bold text-[#98A2B3] text-center">No open visit</span>
                  )}
                  <Link href={`/doctor/patients/${p.id}`} className="inline-flex items-center justify-center h-[38px] rounded-[11px] border-[1.5px] border-[#D6DDE8] bg-white text-[12.5px] font-extrabold text-[#27324A]">
                    Record
                  </Link>
                  {p.phone ? (
                    <CallLink phone={p.phone} name={p.name} size="h-[38px] px-2 text-[12.5px]" />
                  ) : (
                    <span className="flex items-center justify-center text-[11.5px] font-bold text-[#98A2B3]">No phone</span>
                  )}
                </div>
              </article>
            )
          })}
          {filtered.length > limit && (
            <button type="button" onClick={() => setLimit((l) => l + PAGE)} className={`${btnOutline} mt-3`}>
              Show more patients
            </button>
          )}
        </div>

        {/* ---------- Desktops ---------- */}
        <div className="hidden lg:block max-w-[1340px] px-9 pt-7">
          <DeskHead
            title="My patients"
            subtitle="Patients who booked and paid with you"
            actions={
              <>
                <button type="button" onClick={() => downloadCsv(filtered)} className={`${btnOutline} lg:border`}>
                  <Download className="w-[15px] h-[15px]" /> Export CSV
                </button>
                <WritePrescriptionButton current={checkedIn ? visitRef(checkedIn) : null} recent={recent} kind="primary" />
              </>
            }
          />

          <section className="grid grid-cols-4 gap-4 mb-5">
            <StatCard label="Total patients" value={stats.total} change={delta(stats.newThisMonth, 0)} note="this month" series={stats.patientSeries} />
            <StatCard
              label="Visits this month"
              value={stats.visitsThisMonth}
              change={delta(stats.visitsThisMonth, stats.visitsLastMonth, { percent: true })}
              note={`vs ${stats.lastMonthName}`}
              series={stats.visitSeries}
            />
            <StatCard label="Returning patients" value={`${stats.returningPct}%`} note="had more than one visit" />
            <StatCard
              label="Notes due"
              value={stats.awaitingNotes}
              note={
                stats.awaitingNotes ? (
                  <button type="button" onClick={() => choose('checked-in')} className="font-extrabold text-[#2A4DD0] hover:underline">
                    Checked in, no prescription yet
                  </button>
                ) : (
                  'Everyone seen has a prescription'
                )
              }
            />
          </section>

          <section className="grid grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
            <Panel>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-[16px] font-extrabold">Patient list</h2>
                <div role="tablist" className={segGroup}>
                  {GROUPS.map(([g, label]) => (
                    <button key={g} type="button" role="tab" aria-selected={group === g} onClick={() => choose(g)} className={segTab(group === g)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {query && (
                <p className="-mt-2 mb-3 text-[13px] text-[#5B667A]">
                  Showing patients matching <strong className="text-[#0B1B3F]">“{query}”</strong>.{' '}
                  <button type="button" onClick={() => search('')} className="font-extrabold text-[#2A4DD0] hover:underline">
                    Clear
                  </button>
                </p>
              )}
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_96px_110px_130px] gap-4 px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">
                <span>Patient</span>
                <span>Latest note</span>
                <span>BP</span>
                <span>Status</span>
                <span>Visit</span>
              </div>
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-[#5B667A]">{emptyText}</p>
              ) : (
                <ul>
                  {pageRows.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        aria-pressed={p.id === selected?.id}
                        onClick={() => setSelectedId(p.id)}
                        className={`grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_96px_110px_130px] gap-4 items-center w-[calc(100%+28px)] -mx-3.5 px-3.5 py-[13px] border-b border-[#EEF2F7] rounded-[10px] text-left text-[13.5px] transition-colors ${
                          p.id === selected?.id ? 'bg-[#F2F6FF]' : 'hover:bg-[#F7F9FC]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Initials name={p.name} className="w-9 h-9 text-[12px]" />
                          <span className="min-w-0">
                            <span className="block font-extrabold truncate">{p.name}</span>
                            <span className="block text-[12px] text-[#5B667A] truncate">{[ageSex(p), p.code].filter(Boolean).join(' · ')}</span>
                          </span>
                        </span>
                        <span className={`truncate ${latestNote(p) ? 'text-[#27324A]' : 'text-[#98A2B3]'}`}>{latestNote(p) ?? 'No notes yet'}</span>
                        <span className={`font-bold ${p.vitals?.bp ? '' : 'text-[#98A2B3]'}`}>{p.vitals?.bp ?? '—'}</span>
                        <Status label={STATUS[p.group].label} color={STATUS[p.group].color} />
                        <span className="text-[12.5px] text-[#5B667A] truncate">{when(p, now)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {pages > 1 && (
                <div className="flex items-center justify-between gap-3 pt-3.5">
                  <span className="text-[12.5px] font-bold text-[#5B667A]">
                    {current * PAGE + 1}–{current * PAGE + pageRows.length} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5B667A] hover:bg-[#F4F6FA] disabled:opacity-40">
                      <ChevronLeft className="w-[18px] h-[18px]" />
                    </button>
                    <span className="px-1 text-[12.5px] font-extrabold">
                      {current + 1} / {pages}
                    </span>
                    <button type="button" aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5B667A] hover:bg-[#F4F6FA] disabled:opacity-40">
                      <ChevronRight className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                </div>
              )}
            </Panel>

            <aside className={`${card} overflow-hidden sticky top-[96px]`}>
              {selected ? <Details patient={selected} /> : <p className="p-8 text-center text-[13px] text-[#5B667A]">Select a patient to see their details.</p>}
            </aside>
          </section>
        </div>
      </main>
    </>
  )
}

/** The desktop panel beside the list: the chosen patient's latest note, readings, history and actions. */
function Details({ patient: p }: { patient: RosterPatient }) {
  const vr = visitRef(p)
  const note = latestNote(p)
  const rx = lastRx(p)
  const allergies = allergy(p)
  const heading = 'text-[12px] font-extrabold tracking-[0.06em] text-[#5B667A]'
  return (
    <>
      <div className="px-[22px] py-5 border-b border-[#EEF2F7] flex items-center gap-3.5">
        <Initials name={p.name} className="w-14 h-14 text-[17px]" />
        <span className="min-w-0">
          <span className="block text-[19px] font-extrabold truncate">{p.name}</span>
          <span className="block text-[13px] text-[#5B667A] truncate">{[ageSex(p), p.code].filter(Boolean).join(' · ')}</span>
        </span>
      </div>
      <div className="px-[22px] pt-4 pb-5">
        <p className={heading}>LATEST NOTE</p>
        <p className={`mt-1 mb-3 text-[14px] leading-normal ${note ? '' : 'text-[#98A2B3]'}`}>{note ?? 'No notes yet'}</p>
        <Readings items={readings(p)} big className="border-y border-[#EEF2F7]" />
        <Row label="Allergies">{allergies ? <span className="text-[#B42318]">{allergies}</span> : <span className="text-[#98A2B3]">None recorded</span>}</Row>
        <Row label="Last visit">{p.lastSeen ? formatShortDate(p.lastSeen) : 'First visit'}</Row>
        <Row label="Visits with you">
          {p.visitCount} {p.visitCount === 1 ? 'visit' : 'visits'}
        </Row>
        <p className={`${heading} mt-3.5 mb-1.5`}>LAST PRESCRIPTION</p>
        <p className={`text-[13.5px] leading-normal ${rx ? 'text-[#27324A]' : 'text-[#98A2B3]'}`}>{rx ?? 'No prescription yet'}</p>
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr] gap-2 mt-4">
          {vr ? (
            <PrescriptionButton visit={vr} kind="primary" label="Prescription" icon={false} size={NARROW} />
          ) : (
            <span className="flex items-center justify-center text-center text-[11.5px] font-bold text-[#98A2B3]">No open visit</span>
          )}
          <Link href={`/doctor/patients/${p.id}`} className={`inline-flex items-center justify-center ${NARROW} rounded-[11px] border border-[#D6DDE8] bg-white font-extrabold text-[#27324A] hover:bg-[#F4F6FA]`}>
            Record
          </Link>
          {p.phone ? <CallLink phone={p.phone} name={p.name} size={NARROW} /> : <span className="flex items-center justify-center text-[11.5px] font-bold text-[#98A2B3]">No phone</span>}
        </div>
      </div>
    </>
  )
}

