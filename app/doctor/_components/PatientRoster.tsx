'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  Activity, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Download, Droplet, FileText, FolderOpen, HeartPulse,
  Gauge, Mail, NotebookPen, Phone, Pill, Printer, Scale, Search, Siren, Thermometer, Users, Wind, type LucideIcon,
} from 'lucide-react'
import { formatShortDate, formatSlot } from '@/components/patient/format'
import { showBMI, showHR, showSpO2, showTemp, showWeight, type Vitals } from '@/lib/vitals'
import { Avatar, Chip, MetricCard, ProgressBar } from '@/components/portal/ui'
import { CallLink, PrescriptionButton, type VisitRef } from './VisitControls'
import { WalkInButton } from './WalkInModal'

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
  active: { id: string; status: string } | null
  group: 'checked-in' | 'upcoming' | 'past'
  /** type is the record kind: 'prescription', or 'health_record' for details the hospital desk recorded. */
  records: { id: string; type: string | null; notes: string | null; fileUrl: string | null; date: string | null }[]
  vitals: (Vitals & { date: string | null }) | null
}

type Stats = {
  total: number
  newThisMonth: number
  visitsThisMonth: number
  visitsLastMonth: number
  upcoming: number
  nextUpcoming: string | null
  awaitingNotes: number
}

type Group = 'all' | RosterPatient['group']
const GROUPS: { id: Group; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'checked-in', label: 'Checked In' },
  { id: 'past', label: 'Past' },
]
const GROUP_LABEL: Record<RosterPatient['group'], string> = { 'checked-in': 'Checked in', upcoming: 'Upcoming', past: 'Seen before' }
const PAGE = 8

const demographics = (p: RosterPatient) => [p.age != null ? `${p.age}y` : null, p.gender ? p.gender[0] : null].filter(Boolean).join(' • ')
const visitRef = (p: RosterPatient): VisitRef | null => (p.active ? { id: p.active.id, status: p.active.status, patientName: p.name, phone: p.phone } : null)
/** The latest note without its vitals sentence, which has its own column. */
const noteText = (notes: string | null | undefined) => (notes ?? '').replace(/Vitals: .*?\.(?=\s|$)/, '').replace(/\s+/g, ' ').trim()
const statusDot = (p: RosterPatient) => (p.group === 'checked-in' ? 'bg-fresh-teal' : p.group === 'upcoming' ? 'bg-vibrant-blue' : 'bg-outline-variant')

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

export function PatientRoster({ patients, stats, now, initialPatient }: { patients: RosterPatient[]; stats: Stats; now: number; initialPatient: string | null }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<Group>('all')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(PAGE)
  const [selectedId, setSelectedId] = useState<string | null>(() => (initialPatient && patients.some((p) => p.id === initialPatient) ? initialPatient : patients[0]?.id ?? null))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return patients.filter((p) => {
      if (group !== 'all' && p.group !== group) return false
      if (!q) return true
      return [p.name, p.code, p.phone, p.email, p.records[0]?.notes].some((v) => v?.toLowerCase().includes(q))
    })
  }, [patients, query, group])
  const selected = patients.find((p) => p.id === selectedId) ?? null
  const groupCount = (g: Group) => (g === 'all' ? patients.length : patients.filter((p) => p.group === g).length)
  const visitDelta = stats.visitsThisMonth - stats.visitsLastMonth
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const current = Math.min(page, pages - 1)
  const pageRows = filtered.slice(current * PAGE, current * PAGE + PAGE)
  const reset = () => {
    setPage(0)
    setLimit(PAGE)
  }

  return (
    <>
      {/* Mobile: search, add, filters first */}
      <div className="md:hidden flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <SearchBox
            value={query}
            onChange={(v) => {
              setQuery(v)
              reset()
            }}
          />
          <WalkInButton label="Patient" className="px-3 py-2 rounded-xl bg-primary text-on-primary text-[12px] font-semibold flex items-center gap-1 shadow-[0_2px_8px_rgba(0,102,255,0.25)] shrink-0" />
        </div>
        <GroupPills
          group={group}
          count={groupCount}
          onPick={(g) => {
            setGroup(g)
            reset()
          }}
        />
      </div>

      {/* Metrics */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-gutter">
        <MetricCard
          label="My Patients"
          value={stats.total.toLocaleString('en-IN')}
          note={stats.newThisMonth ? `+${stats.newThisMonth} new` : undefined}
          icon={Users}
          glow
          footer={
            <div className="flex items-center justify-between gap-2">
              <span>Booked &amp; paid with you</span>
              <span className="hidden md:inline text-indigo-gray-900 font-medium">{stats.newThisMonth} this month</span>
            </div>
          }
        />
        <MetricCard
          label="Visits This Month"
          value={String(stats.visitsThisMonth)}
          note={stats.visitsLastMonth || stats.visitsThisMonth ? `${visitDelta >= 0 ? '↑ +' : '↓ '}${visitDelta}` : undefined}
          noteTone={visitDelta >= 0 ? 'teal' : 'coral'}
          icon={CalendarDays}
          footer={
            <div className="flex items-center gap-1.5">
              <ProgressBar
                pct={Math.max(stats.visitsThisMonth, stats.visitsLastMonth) ? (stats.visitsThisMonth / Math.max(stats.visitsThisMonth, stats.visitsLastMonth)) * 100 : 0}
                className="bg-primary-container"
                label={`${stats.visitsThisMonth} visits this month, ${stats.visitsLastMonth} last month`}
              />
              <span className="shrink-0">Last: {stats.visitsLastMonth}</span>
            </div>
          }
        />
        <MetricCard
          label="Upcoming Visits"
          value={String(stats.upcoming)}
          note={stats.upcoming ? 'booked' : undefined}
          icon={ClipboardList}
          tint="bg-secondary-container/40 text-secondary"
          footer={
            <div className="flex items-center justify-between gap-2">
              <span className="hidden md:inline">Next visit</span>
              <span className="text-indigo-gray-900 font-medium truncate">{stats.nextUpcoming ? formatSlot(stats.nextUpcoming, now) : 'Nothing booked yet'}</span>
            </div>
          }
        />
        <MetricCard
          label="Awaiting Your Notes"
          value={String(stats.awaitingNotes).padStart(2, '0')}
          note="checked in"
          icon={NotebookPen}
          alert={stats.awaitingNotes > 0}
          footer={
            stats.awaitingNotes > 0 ? (
              <div className="flex items-center justify-between gap-2">
                <span className="hidden md:inline text-soft-coral font-medium">Need a prescription</span>
                <button
                  type="button"
                  onClick={() => {
                    setGroup('checked-in')
                    reset()
                  }}
                  className="text-primary font-bold hover:underline"
                >
                  Review Now →
                </button>
              </div>
            ) : (
              <span>Everyone seen has a prescription</span>
            )
          }
        />
      </section>

      {/* Header & filters (tablet and up) */}
      <section className="hidden md:flex bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_12px_rgba(0,102,255,0.04)] flex-col gap-stack-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-stack-sm">
          <div className="flex items-center gap-stack-sm">
            <span className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <FolderOpen className="w-6 h-6" />
            </span>
            <div>
              <h1 className="font-title-md text-title-md text-indigo-gray-900 tracking-tight">Patient Roster &amp; Medical Records</h1>
              <p className="font-label-sm text-[12px] text-indigo-gray-600">Everyone who has booked and paid for a visit with you</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-stack-sm">
            <button type="button" onClick={() => downloadCsv(filtered)} className="px-stack-md py-2.5 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-label-sm hover:bg-surface-container flex items-center gap-1.5">
              <Download className="w-[18px] h-[18px]" /> Export Roster (CSV)
            </button>
            <button type="button" onClick={() => window.print()} className="px-stack-md py-2.5 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-label-sm hover:bg-surface-container flex items-center gap-1.5">
              <Printer className="w-[18px] h-[18px]" /> Print List
            </button>
            <WalkInButton
              label="Add New Patient"
              className="px-stack-md py-2.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm shadow-[0_4px_14px_rgba(0,102,255,0.25)] hover:bg-primary flex items-center gap-1.5"
            />
          </div>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-stack-sm pt-2">
          <div className="flex-1 xl:max-w-xl">
            <SearchBox
              value={query}
              onChange={(v) => {
                setQuery(v)
                reset()
              }}
            />
          </div>
          <GroupPills
            group={group}
            count={groupCount}
            onPick={(g) => {
              setGroup(g)
              reset()
            }}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-gutter items-start">
        {/* Roster */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="p-10 rounded-xl bg-surface-container-lowest text-center text-sm text-indigo-gray-600 shadow-sm">
              {patients.length === 0 ? 'Patients appear here once they book and pay for a visit with you.' : 'No patients match this search.'}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-surface-container-lowest rounded-xl shadow-[0_4px_24px_rgba(0,102,255,0.04)] overflow-hidden">
                <div className="px-stack-md py-stack-sm bg-surface-container-low flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-indigo-gray-600">
                    {group === 'all' ? 'My patients' : GROUPS.find((g) => g.id === group)?.label} (showing {pageRows.length} of {filtered.length})
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[860px]">
                    <thead>
                      <tr className="text-indigo-gray-600 font-label-sm text-label-sm uppercase tracking-wider">
                        <th className="py-3.5 px-stack-md font-semibold">Patient Identity</th>
                        <th className="py-3.5 px-stack-md font-semibold">Latest Notes</th>
                        <th className="py-3.5 px-stack-md font-semibold">Latest Vitals</th>
                        <th className="py-3.5 px-stack-md font-semibold">Schedule</th>
                        <th className="py-3.5 px-stack-md text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {pageRows.map((p) => {
                        const note = noteText(p.records.find((r) => noteText(r.notes))?.notes)
                        return (
                          <tr
                            key={p.id}
                            onClick={() => setSelectedId(p.id)}
                            className={`group cursor-pointer transition-colors ${p.id === selectedId ? 'bg-primary-fixed/15' : 'hover:bg-surface-container-low'}`}
                          >
                            <td className="py-4 px-stack-md">
                              <div className="flex items-center gap-stack-sm">
                                <span className="relative shrink-0">
                                  <Avatar name={p.name} className={`w-11 h-11 text-sm shadow-sm ${p.id === selectedId ? 'ring-2 ring-primary' : ''}`} />
                                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-surface-container-lowest ${statusDot(p)}`} />
                                </span>
                                <div className="min-w-0">
                                  <span className="font-title-md text-[15px] text-indigo-gray-900 group-hover:text-primary transition-colors truncate block max-w-[170px]">{p.name}</span>
                                  <span className="font-label-sm text-[12px] text-indigo-gray-600 whitespace-nowrap">
                                    {demographics(p) && `${demographics(p)} • `}
                                    <strong className="text-primary">#{p.code}</strong>
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-stack-md max-w-[220px]">
                              <div className="flex flex-col items-start gap-1">
                                {note ? (
                                  <span className="inline-block max-w-full px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-[11px] text-primary font-semibold truncate">{note}</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-surface-container-low font-label-sm text-[11px] text-outline">No notes yet</span>
                                )}
                                <span className="font-label-sm text-[11px] text-indigo-gray-600">
                                  {p.visitCount} {p.visitCount === 1 ? 'visit' : 'visits'} • {GROUP_LABEL[p.group]}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-stack-md">
                              {p.vitals ? (
                                <div className="flex flex-col gap-0.5 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 font-label-sm text-[12px]">
                                    {p.vitals.bp && <span className="font-bold text-indigo-gray-900">BP {p.vitals.bp}</span>}
                                    {p.vitals.spo2 && <span className="text-indigo-gray-600">{p.vitals.bp ? '• ' : ''}SpO2 {showSpO2(p.vitals.spo2)}</span>}
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-indigo-gray-600 font-label-sm">
                                    <Activity className="w-3 h-3 text-soft-coral" />
                                    <span>{p.vitals.hr ? `HR: ${showHR(p.vitals.hr)}` : 'HR not taken'}</span>
                                  </div>
                                  {p.vitals.date && <span className="text-[10px] text-outline font-label-sm">{formatShortDate(p.vitals.date)}</span>}
                                </div>
                              ) : (
                                <span className="font-label-sm text-[12px] text-outline">Not recorded</span>
                              )}
                            </td>
                            <td className="py-4 px-stack-md">
                              <div className="flex flex-col min-w-0">
                                {p.group === 'checked-in' ? (
                                  <span className="font-body-md text-[13px] text-fresh-teal font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Checked in now
                                  </span>
                                ) : (
                                  <span className={`font-body-md text-[13px] font-medium whitespace-nowrap ${p.nextVisit ? 'text-indigo-gray-900' : 'text-outline'}`}>{p.nextVisit ? formatSlot(p.nextVisit, now) : 'None booked'}</span>
                                )}
                                <span className="font-label-sm text-[11px] text-indigo-gray-600 truncate">{p.lastSeen ? `Last seen ${formatShortDate(p.lastSeen)}` : 'Not seen yet'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-stack-md text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <CallLink phone={p.phone} name={p.name} kind="icon" />
                                {visitRef(p) && <PrescriptionButton visit={visitRef(p)!} kind="icon" />}
                                <button type="button" title="Open record" aria-label={`Open ${p.name}'s record`} onClick={() => setSelectedId(p.id)} className="p-2 rounded-full hover:bg-surface-container text-indigo-gray-600">
                                  <FolderOpen className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-stack-md py-stack-sm flex items-center justify-between gap-3">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600">
                    Showing {current * PAGE + 1}-{current * PAGE + pageRows.length} of {filtered.length} patients
                  </span>
                  {pages > 1 && <Pager page={current} pages={pages} onPage={setPage} />}
                </div>
              </div>

              {/* Phone cards */}
              <div className="md:hidden flex flex-col gap-3">
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h2 className="text-[16px] font-bold text-indigo-gray-900 tracking-tight font-title-md">{group === 'all' ? 'My Patients' : GROUPS.find((g) => g.id === group)?.label}</h2>
                    <p className="text-[11px] text-indigo-gray-600">
                      {filtered.length} {filtered.length === 1 ? 'patient' : 'patients'}
                    </p>
                  </div>
                  <button type="button" onClick={() => downloadCsv(filtered)} className="text-[12px] font-semibold text-primary flex items-center gap-1">
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>
                {filtered.slice(0, limit).map((p) => (
                  <PhoneCard key={p.id} patient={p} open={p.id === selectedId} onToggle={() => setSelectedId(p.id === selectedId ? null : p.id)} now={now} />
                ))}
                {filtered.length > limit && (
                  <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-sm font-semibold text-primary">
                    Show more patients
                  </button>
                )}
                {selected && <PhonePreview patient={selected} />}
              </div>
            </>
          )}
        </div>

        {/* Desktop details panel */}
        <aside className="hidden md:block xl:col-span-4 xl:sticky xl:top-6">
          {selected ? (
            <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_24px_rgba(0,102,255,0.05)] flex flex-col gap-stack-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-stack-sm min-w-0">
                  <span className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-title-md text-[18px] font-bold shrink-0">
                    {selected.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-title-md text-title-md text-indigo-gray-900 tracking-tight truncate">{selected.name}</h2>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot(selected)}`} title={GROUP_LABEL[selected.group]} />
                    </div>
                    <span className="font-label-sm text-[12px] text-indigo-gray-600">
                      {demographics(selected) && `${demographics(selected)} • `}ID: #{selected.code}
                    </span>
                  </div>
                </div>
                <Chip tone={selected.group === 'checked-in' ? 'teal' : selected.group === 'upcoming' ? 'blue' : 'neutral'}>{GROUP_LABEL[selected.group]}</Chip>
              </div>
              <PatientDetails patient={selected} now={now} />
            </div>
          ) : (
            <div className="p-10 rounded-xl bg-surface-container-lowest text-center text-sm text-indigo-gray-600 shadow-sm">Select a patient to see their details.</div>
          )}
        </aside>
      </section>
    </>
  )
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative flex-1 block">
      <Search className="absolute left-3 md:left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] md:w-5 md:h-5 text-indigo-gray-600 pointer-events-none" />
      <span className="sr-only">Search patients</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name, patient ID (e.g. #CYD-1A2B3C4D), phone or notes..."
        className="w-full pl-9 md:pl-11 pr-3 py-2 md:py-2.5 rounded-xl bg-surface-container-lowest md:bg-surface-container-low border border-outline-variant/50 md:border-transparent text-indigo-gray-900 text-[13px] md:text-body-md placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
      />
    </label>
  )
}

function GroupPills({ group, count, onPick }: { group: Group; count: (g: Group) => number; onPick: (g: Group) => void }) {
  return (
    <div className="flex items-center gap-1.5 md:bg-surface-container-low md:p-1 md:rounded-full overflow-x-auto -mx-4 px-4 md:mx-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {GROUPS.map((g) => (
        <button
          key={g.id}
          type="button"
          aria-pressed={group === g.id}
          onClick={() => onPick(g.id)}
          className={`px-3 py-1.5 rounded-full font-label-sm text-[12px] md:text-label-sm shrink-0 transition-all ${
            group === g.id
              ? 'bg-primary text-on-primary font-semibold shadow-sm'
              : 'bg-surface-container-lowest md:bg-transparent border md:border-0 border-outline-variant/40 text-indigo-gray-600 hover:text-indigo-gray-900'
          }`}
        >
          {g.label} <span className="opacity-75 text-[10px] md:text-[11px]">{count(g.id)}</span>
        </button>
      ))}
    </div>
  )
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  // First, last, and the pages around the current one
  const shown = Array.from(new Set([0, page - 1, page, page + 1, pages - 1])).filter((p) => p >= 0 && p < pages).sort((a, b) => a - b)
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container disabled:opacity-40">
        <ChevronLeft className="w-[18px] h-[18px]" />
      </button>
      {shown.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - shown[i - 1] > 1 && <span className="px-1 text-indigo-gray-600 font-label-sm">…</span>}
          <button
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPage(p)}
            className={`w-8 h-8 rounded-lg font-label-sm text-label-sm transition-colors ${p === page ? 'bg-primary text-on-primary' : 'text-indigo-gray-600 hover:bg-surface-container'}`}
          >
            {p + 1}
          </button>
        </span>
      ))}
      <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container disabled:opacity-40">
        <ChevronRight className="w-[18px] h-[18px]" />
      </button>
    </div>
  )
}

function VitalsStrip({ vitals, compact }: { vitals: NonNullable<RosterPatient['vitals']>; compact?: boolean }) {
  const cells: { icon: LucideIcon; label: string; value: string | null }[] = [
    { icon: HeartPulse, label: compact ? 'Blood press.' : 'Blood Press.', value: vitals.bp },
    { icon: Wind, label: 'SpO2', value: vitals.spo2 ? showSpO2(vitals.spo2) : null },
    { icon: Activity, label: 'Heart Rate', value: vitals.hr ? showHR(vitals.hr) : null },
  ]
  // Weight, BMI and temperature, when someone measured them (the hospital desk or the prescription form).
  if (vitals.weight || vitals.bmi || vitals.temp) {
    cells.push(
      { icon: Thermometer, label: 'Temp.', value: vitals.temp ? showTemp(vitals.temp) : null },
      { icon: Scale, label: 'Weight', value: vitals.weight ? showWeight(vitals.weight) : null },
      { icon: Gauge, label: 'BMI', value: vitals.bmi ? showBMI(vitals.bmi) : null },
    )
  }
  return (
    <div className={`grid grid-cols-3 gap-2 text-center ${compact ? 'bg-surface-container-low p-2 rounded-lg' : 'pt-1'}`}>
      {cells.map((c) => (
        <div key={c.label} className={compact ? '' : 'bg-surface-container-lowest p-2 rounded-lg'}>
          <span className="font-label-sm text-[9px] md:text-[10px] text-indigo-gray-600 uppercase font-semibold block">{c.label}</span>
          <p className={`font-title-md text-[12px] md:text-[14px] font-bold mt-0.5 ${c.value ? 'text-indigo-gray-900' : 'text-outline'}`}>{c.value ?? '—'}</p>
          {!compact && <span className="font-label-sm text-[9px] text-indigo-gray-600">{vitals.date ? formatShortDate(vitals.date) : 'Recorded'}</span>}
        </div>
      ))}
    </div>
  )
}

function PhoneCard({ patient: p, open, onToggle, now }: { patient: RosterPatient; open: boolean; onToggle: () => void; now: number }) {
  const ref = visitRef(p)
  const note = noteText(p.records.find((r) => noteText(r.notes))?.notes)
  return (
    <article className={`bg-surface-container-lowest rounded-xl p-3.5 shadow-sm flex flex-col gap-2.5 md:gap-3 ${open ? 'border-2 border-primary/40' : 'border border-outline-variant/30'}`}>
      <button type="button" onClick={onToggle} className="flex items-start justify-between gap-2 text-left">
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="relative shrink-0">
            <Avatar name={p.name} className={`${open ? 'w-11 h-11 ring-2 ring-primary' : 'w-10 h-10'} text-xs shadow-sm`} />
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-surface-container-lowest ${statusDot(p)}`} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="text-[14px] font-bold text-indigo-gray-900 truncate">{p.name}</span>
              {p.group === 'checked-in' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-fresh-teal/15 text-secondary shrink-0">Checked in</span>}
            </span>
            <span className="text-[11px] text-indigo-gray-600">
              {demographics(p) && `${demographics(p)} • `}
              <strong className="text-primary font-semibold">#{p.code}</strong>
            </span>
          </span>
        </span>
        {!open && p.bloodGroup ? <Chip tone="blue">{p.bloodGroup}</Chip> : null}
      </button>

      {open && note && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-block max-w-full px-2 py-0.5 rounded-full bg-primary-fixed/30 text-primary font-label-sm text-[10px] font-semibold truncate">{note}</span>
          <span className="text-[10px] text-indigo-gray-600">{p.visitCount} {p.visitCount === 1 ? 'visit' : 'visits'}</span>
        </div>
      )}

      {open && p.vitals ? (
        <VitalsStrip vitals={p.vitals} compact />
      ) : (
        <div className="flex items-center justify-between gap-2 text-[11px] bg-surface-container-low px-2.5 py-1.5 rounded-lg">
          <span className="text-indigo-gray-600 truncate">
            {p.vitals?.bp ? (
              <>
                BP: <span className="font-bold text-indigo-gray-900">{p.vitals.bp}</span>
                {p.vitals.hr && <span className="text-fresh-teal font-semibold"> • HR {showHR(p.vitals.hr)}</span>}
              </>
            ) : (
              `${p.visitCount} ${p.visitCount === 1 ? 'visit' : 'visits'}${p.lastSeen ? ` • last ${formatShortDate(p.lastSeen)}` : ''}`
            )}
          </span>
          {!open && <span className="text-indigo-gray-600 text-right shrink-0">{p.nextVisit ? formatSlot(p.nextVisit, now) : 'No visit booked'}</span>}
        </div>
      )}

      {open && (
        <>
          <div className="flex items-center justify-between text-[11px] text-indigo-gray-600 border-t border-surface-container pt-2">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-indigo-gray-900">{p.group === 'checked-in' ? 'Checked in now' : p.nextVisit ? formatSlot(p.nextVisit, now) : 'No visit booked'}</span>
            </span>
            <span>{p.lastSeen ? `Last seen ${formatShortDate(p.lastSeen)}` : 'First visit'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {ref ? (
              <PrescriptionButton visit={ref} kind="blue" label="Prescription" pad="px-3 py-1.5" className="!rounded-lg w-full" />
            ) : (
              <a href={`#record-${p.id}`} className="py-1.5 px-3 rounded-lg bg-primary text-on-primary font-label-sm text-[12px] font-semibold flex items-center justify-center gap-1 shadow-sm">
                <FolderOpen className="w-4 h-4" /> Open Record
              </a>
            )}
            {p.phone ? (
              <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} className="py-1.5 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-[12px] font-semibold flex items-center justify-center gap-1">
                <Phone className="w-4 h-4 text-primary" /> Call
              </a>
            ) : p.email ? (
              <a href={`mailto:${p.email}`} className="py-1.5 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-[12px] font-semibold flex items-center justify-center gap-1">
                <Mail className="w-4 h-4 text-primary" /> Email
              </a>
            ) : (
              <span className="text-[11px] text-indigo-gray-600 flex items-center justify-center">No contact details</span>
            )}
          </div>
        </>
      )}
    </article>
  )
}

/** Phone: the selected patient's records and emergency contact, under the list. */
function PhonePreview({ patient: p }: { patient: RosterPatient }) {
  const latestFile = p.records.find((r) => r.fileUrl)
  const latestNote = p.records.find((r) => noteText(r.notes))
  return (
    <div id={`record-${p.id}`} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant/30 flex flex-col gap-3 mt-1 scroll-mt-20">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-wider text-indigo-gray-900 font-label-sm">Record Preview</span>
        <span className="text-[11px] text-primary font-semibold truncate max-w-[50%]">{p.name}</span>
      </div>
      <PreviewRow
        icon={FileText}
        title={latestFile ? 'Prescription document' : 'No documents uploaded'}
        sub={latestFile?.date ? formatShortDate(latestFile.date) : 'Attach one with a prescription'}
        action={latestFile?.fileUrl ? <a href={latestFile.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary font-bold hover:underline">View</a> : null}
      />
      <PreviewRow
        icon={Pill}
        title={latestNote ? noteText(latestNote.notes) : 'No notes yet'}
        sub={`${p.records.length} ${p.records.length === 1 ? 'note' : 'notes'} on file`}
      />
      <div className="text-[11px] bg-surface-container-low p-2 rounded-lg flex items-center justify-between gap-2">
        <span className="text-indigo-gray-600 shrink-0">Emergency</span>
        <span className={`font-medium truncate ${p.emergency ? 'text-primary' : 'text-outline'}`}>{p.emergency ?? 'Not added'}</span>
      </div>
    </div>
  )
}

function PreviewRow({ icon: Icon, title, sub, action }: { icon: LucideIcon; title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="p-2.5 bg-surface-container-low rounded-lg flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-8 h-8 rounded bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0">
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] font-semibold text-indigo-gray-900 truncate">{title}</span>
          <span className="text-[10px] text-indigo-gray-600">{sub}</span>
        </div>
      </div>
      {action}
    </div>
  )
}

function PatientDetails({ patient: p, now }: { patient: RosterPatient; now: number }) {
  const latestFile = p.records.find((r) => r.fileUrl)
  const ref = visitRef(p)
  return (
    <div className="flex flex-col gap-stack-md">
      <div className="bg-surface-container-low rounded-xl p-stack-sm flex flex-col gap-base">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm text-indigo-gray-900 font-bold uppercase tracking-wider">Latest Vitals</span>
          {p.vitals?.date && <span className="text-[11px] text-indigo-gray-600">{formatShortDate(p.vitals.date)}</span>}
        </div>
        {p.vitals ? (
          <VitalsStrip vitals={p.vitals} />
        ) : (
          <p className="text-[11px] text-indigo-gray-600">No vitals recorded yet. Add BP, SpO2 and heart rate when you write a prescription.</p>
        )}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <Fact icon={Droplet} label="Blood group" value={p.bloodGroup} />
          <Fact label="Date of birth" value={p.dateOfBirth ? formatShortDate(p.dateOfBirth) : null} />
          <Fact label="Sex" value={p.gender} />
        </div>
      </div>

      <div className="flex flex-col gap-base">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900 uppercase tracking-wider">Latest Document</span>
          {latestFile?.fileUrl && (
            <a href={latestFile.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-label-sm text-[11px] font-bold hover:underline">
              Full file
            </a>
          )}
        </div>
        <div className="p-3 bg-surface-container-low rounded-xl flex items-center gap-stack-sm">
          <span className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0">
            <FileText className="w-5 h-5" />
          </span>
          <span className="flex flex-col min-w-0">
            <span className="text-[13px] text-indigo-gray-900 font-medium truncate">{latestFile ? 'Prescription attachment' : 'No documents uploaded'}</span>
            <span className="text-[11px] text-indigo-gray-600">{latestFile?.date ? formatShortDate(latestFile.date) : 'Attach one when you write a prescription'}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-base">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900 uppercase tracking-wider">Notes &amp; Prescriptions</span>
          {ref && <PrescriptionButton visit={ref} kind="icon" />}
        </div>
        {p.records.length === 0 ? (
          <p className="p-2.5 rounded-lg bg-surface-container-low text-[12px] text-indigo-gray-600">No notes yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {p.records.slice(0, 4).map((r) => {
              const fromHospital = r.type === 'health_record'
              const Icon = fromHospital ? HeartPulse : Pill
              return (
                <li key={r.id} className="p-2.5 rounded-lg bg-surface-container-low flex items-start gap-2">
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${fromHospital ? 'text-soft-coral' : 'text-primary'}`} />
                  <div className="min-w-0 flex-1">
                    {fromHospital && <span className="block text-[10px] font-bold uppercase tracking-wider text-soft-coral">Hospital health record</span>}
                    <p className="text-[13px] text-indigo-gray-900 line-clamp-2">{noteText(r.notes) || (fromHospital ? 'Vitals recorded at the desk' : 'Document only')}</p>
                    <span className="text-[11px] text-indigo-gray-600">{r.date ? formatSlot(r.date, now) : ''}</span>
                  </div>
                  {r.fileUrl && (
                    <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] font-bold text-primary hover:underline">
                      Open
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="p-stack-sm rounded-xl bg-surface-container-low flex flex-col gap-1">
        <span className="font-label-sm text-[11px] uppercase tracking-wider text-indigo-gray-600 font-bold flex items-center gap-1">
          <Siren className="w-3.5 h-3.5 text-soft-coral" /> Emergency Contact
        </span>
        <p className={`text-[13px] font-medium ${p.emergency ? 'text-indigo-gray-900' : 'text-outline'}`}>{p.emergency ?? 'Not added by the patient'}</p>
      </div>

      <div className="grid grid-cols-2 gap-stack-sm pt-base">
        {ref ? (
          <PrescriptionButton visit={ref} kind="blue" label="Write Prescription" pad="px-3 py-2.5" className="w-full shadow-[0_4px_12px_rgba(0,102,255,0.2)]" />
        ) : (
          <span className="flex items-center justify-center text-center text-[11px] text-indigo-gray-600 px-2">No open visit to prescribe for</span>
        )}
        {p.phone ? (
          <CallLink phone={p.phone} name={p.name} pad="px-3 py-2.5" className="w-full" />
        ) : (
          <span className="flex items-center justify-center text-[11px] text-indigo-gray-600 gap-1">
            <Phone className="w-3.5 h-3.5" /> No phone
          </span>
        )}
      </div>
      {p.email && (
        <a href={`mailto:${p.email}`} className="-mt-2 w-full py-2 px-3 rounded-full bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-[12px] flex items-center justify-center gap-1">
          <Mail className="w-4 h-4 text-primary" /> Message Patient
        </a>
      )}
    </div>
  )
}

function Fact({ icon: Icon, label, value }: { icon?: LucideIcon; label: string; value: string | null }) {
  return (
    <div className="bg-surface-container-lowest p-2 rounded-lg min-w-0">
      <span className="font-label-sm text-[10px] text-indigo-gray-600 uppercase flex items-center justify-center gap-0.5">
        {Icon && <Icon className="w-3 h-3 text-soft-coral" />} {label}
      </span>
      <p className={`font-title-md text-[14px] font-bold mt-0.5 truncate ${value ? 'text-indigo-gray-900' : 'text-outline'}`}>{value ?? '—'}</p>
    </div>
  )
}
