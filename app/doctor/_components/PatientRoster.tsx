'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  CalendarDays, ClipboardList, Download, Droplet, FileText, FolderOpen, Mail, NotebookPen, Phone, Search, Siren, Users,
  type LucideIcon,
} from 'lucide-react'
import { formatShortDate, formatSlot } from '@/components/patient/format'
import { Avatar, Chip } from '@/components/portal/ui'
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
  records: { id: string; notes: string | null; fileUrl: string | null; date: string | null }[]
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
const PAGE = 10

const demographics = (p: RosterPatient) => [p.age != null ? `${p.age}y` : null, p.gender ? p.gender[0] : null].filter(Boolean).join(' • ')
const visitRef = (p: RosterPatient): VisitRef | null => (p.active ? { id: p.active.id, status: p.active.status, patientName: p.name, phone: p.phone } : null)

function downloadCsv(rows: RosterPatient[]) {
  const header = ['Patient ID', 'Name', 'Phone', 'Email', 'Age', 'Sex', 'Blood group', 'Visits', 'Last seen', 'Next visit']
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.map((p) => [p.code, p.name, p.phone, p.email, p.age, p.gender, p.bloodGroup, p.visitCount, p.lastSeen?.slice(0, 10), p.nextVisit?.slice(0, 16)])
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

  return (
    <>
      {/* Metrics */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-gutter">
        <Metric label="My Patients" value={stats.total.toLocaleString('en-IN')} note={stats.newThisMonth ? `+${stats.newThisMonth} new` : undefined} icon={Users} footer={<span>Booked and paid with you</span>} />
        <Metric
          label="Visits This Month"
          value={String(stats.visitsThisMonth)}
          note={stats.visitsLastMonth || stats.visitsThisMonth ? `${visitDelta >= 0 ? '+' : ''}${visitDelta}` : undefined}
          noteTone={visitDelta >= 0 ? 'teal' : 'coral'}
          icon={CalendarDays}
          footer={<span>Last month: {stats.visitsLastMonth}</span>}
        />
        <Metric
          label="Upcoming Visits"
          value={String(stats.upcoming)}
          icon={ClipboardList}
          tint="bg-secondary-container/40 text-secondary"
          footer={<span>{stats.nextUpcoming ? `Next: ${formatSlot(stats.nextUpcoming, now)}` : 'Nothing booked yet'}</span>}
        />
        <Metric
          label="Awaiting Your Notes"
          value={String(stats.awaitingNotes).padStart(2, '0')}
          note="checked in"
          icon={NotebookPen}
          alert={stats.awaitingNotes > 0}
          footer={
            stats.awaitingNotes > 0 ? (
              <button type="button" onClick={() => setGroup('checked-in')} className="text-primary font-bold hover:underline">
                Review now →
              </button>
            ) : (
              <span>Everyone seen has a prescription</span>
            )
          }
        />
      </section>

      {/* Header & filters */}
      <section className="md:bg-surface-container-lowest md:rounded-xl md:p-stack-md md:shadow-[0_2px_12px_rgba(0,102,255,0.04)] flex flex-col gap-3 md:gap-stack-md">
        <div className="hidden md:flex flex-col lg:flex-row lg:items-center justify-between gap-stack-sm">
          <div className="flex items-center gap-stack-sm">
            <span className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <FolderOpen className="w-6 h-6" />
            </span>
            <div>
              <h1 className="font-title-md text-title-md text-indigo-gray-900 tracking-tight">Patient Roster &amp; Records</h1>
              <p className="font-label-sm text-[12px] text-indigo-gray-600">Everyone who has booked and paid for a visit with you</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-stack-sm">
            <button
              type="button"
              onClick={() => downloadCsv(filtered)}
              className="px-stack-md py-2.5 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-label-sm hover:bg-surface-container flex items-center gap-1.5"
            >
              <Download className="w-[18px] h-[18px]" /> Export Roster (CSV)
            </button>
            <WalkInButton
              label="Add Walk-in Patient"
              className="px-stack-md py-2.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm shadow-[0_4px_14px_rgba(0,102,255,0.25)] hover:bg-primary flex items-center gap-1.5"
            />
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 md:gap-stack-sm">
          <div className="flex items-center gap-2 flex-1 xl:max-w-xl">
            <label className="relative flex-1">
              <Search className="absolute left-3 md:left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] md:w-5 md:h-5 text-indigo-gray-600 pointer-events-none" />
              <span className="sr-only">Search patients</span>
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setLimit(PAGE)
                }}
                placeholder="Search name, patient ID, phone or notes..."
                className="w-full pl-9 md:pl-11 pr-3 py-2 md:py-2.5 rounded-xl bg-surface-container-lowest md:bg-surface-container-low border border-outline-variant/50 md:border-transparent text-indigo-gray-900 text-[13px] md:text-body-md placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              />
            </label>
            <WalkInButton
              label="Patient"
              className="md:hidden px-3 py-2 rounded-xl bg-primary text-on-primary text-[12px] font-semibold flex items-center gap-1 shadow-[0_2px_8px_rgba(0,102,255,0.25)] shrink-0"
            />
          </div>
          <div className="flex items-center gap-1.5 md:bg-surface-container-low md:p-1 md:rounded-full overflow-x-auto -mx-4 px-4 md:mx-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={group === g.id}
                onClick={() => {
                  setGroup(g.id)
                  setLimit(PAGE)
                }}
                className={`px-3 py-1.5 rounded-full font-label-sm text-[12px] md:text-label-sm shrink-0 transition-all ${
                  group === g.id
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'bg-surface-container-lowest md:bg-transparent border md:border-0 border-outline-variant/40 text-indigo-gray-600 hover:text-indigo-gray-900'
                }`}
              >
                {g.label} <span className="opacity-75 text-[10px] md:text-[11px]">{groupCount(g.id)}</span>
              </button>
            ))}
          </div>
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
                <div className="px-stack-md py-stack-sm bg-surface-container-low">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-indigo-gray-600">
                    {group === 'all' ? 'All patients' : GROUPS.find((g) => g.id === group)?.label} ({filtered.length})
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                      <tr className="text-indigo-gray-600 font-label-sm text-label-sm uppercase tracking-wider">
                        <th className="py-3.5 px-stack-md font-semibold">Patient</th>
                        <th className="py-3.5 px-stack-md font-semibold">Latest Notes</th>
                        <th className="py-3.5 px-stack-md font-semibold">Visits</th>
                        <th className="py-3.5 px-stack-md font-semibold">Next Visit</th>
                        <th className="py-3.5 px-stack-md text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {filtered.slice(0, limit).map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedId(p.id)}
                          className={`group cursor-pointer transition-colors ${p.id === selectedId ? 'bg-primary-fixed/15' : 'hover:bg-surface-container-low'}`}
                        >
                          <td className="py-4 px-stack-md">
                            <div className="flex items-center gap-stack-sm">
                              <span className="relative shrink-0">
                                <Avatar name={p.name} className={`w-11 h-11 text-sm ${p.id === selectedId ? 'ring-2 ring-primary' : ''}`} />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-surface-container-lowest ${p.group === 'checked-in' ? 'bg-fresh-teal' : p.group === 'upcoming' ? 'bg-vibrant-blue' : 'bg-outline-variant'}`} />
                              </span>
                              <div className="min-w-0">
                                <span className="font-title-md text-[15px] text-indigo-gray-900 group-hover:text-primary transition-colors truncate block">{p.name}</span>
                                <span className="font-label-sm text-[12px] text-indigo-gray-600 whitespace-nowrap">
                                  {demographics(p) && `${demographics(p)} • `}
                                  <strong className="text-primary">#{p.code}</strong>
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-stack-md max-w-[220px]">
                            {p.records[0]?.notes ? (
                              <span className="font-label-sm text-[12px] text-indigo-gray-900 line-clamp-2">{p.records[0].notes}</span>
                            ) : (
                              <span className="font-label-sm text-[12px] text-outline">No notes yet</span>
                            )}
                          </td>
                          <td className="py-4 px-stack-md">
                            <span className="font-body-md text-[13px] text-indigo-gray-900 font-medium block">{p.visitCount} {p.visitCount === 1 ? 'visit' : 'visits'}</span>
                            <span className="font-label-sm text-[11px] text-indigo-gray-600">{p.lastSeen ? `Last seen ${formatShortDate(p.lastSeen)}` : 'Not seen yet'}</span>
                          </td>
                          <td className="py-4 px-stack-md">
                            {p.group === 'checked-in' ? (
                              <Chip tone="teal">Checked in now</Chip>
                            ) : (
                              <span className={`font-body-md text-[13px] font-medium ${p.nextVisit ? 'text-indigo-gray-900' : 'text-outline'}`}>
                                {p.nextVisit ? formatSlot(p.nextVisit, now) : 'None booked'}
                              </span>
                            )}
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
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-stack-md py-stack-sm flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600">
                    Showing {Math.min(limit, filtered.length)} of {filtered.length} patients
                  </span>
                  {filtered.length > limit && (
                    <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="px-4 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-label-sm">
                      Show more
                    </button>
                  )}
                </div>
              </div>

              {/* Phone cards */}
              <div className="md:hidden flex flex-col gap-3">
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h2 className="text-[16px] font-bold text-indigo-gray-900 tracking-tight font-title-md">{group === 'all' ? 'My Patients' : GROUPS.find((g) => g.id === group)?.label}</h2>
                    <p className="text-[11px] text-indigo-gray-600">{filtered.length} {filtered.length === 1 ? 'patient' : 'patients'}</p>
                  </div>
                  <button type="button" onClick={() => downloadCsv(filtered)} className="text-[12px] font-semibold text-primary flex items-center gap-1">
                    <Download className="w-4 h-4" /> CSV
                  </button>
                </div>
                {filtered.slice(0, limit).map((p) => {
                  const open = p.id === selectedId
                  return (
                    <article key={p.id} className={`bg-surface-container-lowest rounded-xl p-3.5 shadow-sm flex flex-col gap-2.5 ${open ? 'border-2 border-primary/40' : 'border border-outline-variant/30'}`}>
                      <button type="button" onClick={() => setSelectedId(open ? null : p.id)} className="flex items-start justify-between gap-2 text-left">
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className="relative shrink-0">
                            <Avatar name={p.name} className={`w-10 h-10 text-xs ${open ? 'ring-2 ring-primary' : ''}`} />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-surface-container-lowest ${p.group === 'checked-in' ? 'bg-fresh-teal' : p.group === 'upcoming' ? 'bg-vibrant-blue' : 'bg-outline-variant'}`} />
                          </span>
                          <span className="min-w-0">
                            <span className="text-[14px] font-bold text-indigo-gray-900 block truncate">{p.name}</span>
                            <span className="text-[11px] text-indigo-gray-600">
                              {demographics(p) && `${demographics(p)} • `}
                              <strong className="text-primary font-semibold">#{p.code}</strong>
                            </span>
                          </span>
                        </span>
                        {p.group === 'checked-in' ? <Chip tone="teal">Checked in</Chip> : p.bloodGroup ? <Chip tone="blue">{p.bloodGroup}</Chip> : null}
                      </button>
                      <div className="flex items-center justify-between gap-2 text-[11px] bg-surface-container-low px-2.5 py-1.5 rounded-lg">
                        <span className="text-indigo-gray-600">
                          {p.visitCount} {p.visitCount === 1 ? 'visit' : 'visits'}
                          {p.lastSeen ? ` • last ${formatShortDate(p.lastSeen)}` : ''}
                        </span>
                        <span className="text-indigo-gray-900 font-medium text-right">{p.nextVisit ? formatSlot(p.nextVisit, now) : 'No visit booked'}</span>
                      </div>
                      {open && <PatientDetails patient={p} now={now} compact />}
                    </article>
                  )
                })}
                {filtered.length > limit && (
                  <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-sm font-semibold text-primary">
                    Show more patients
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Desktop details panel */}
        <aside className="hidden md:block xl:col-span-4 xl:sticky xl:top-6">
          {selected ? (
            <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_4px_24px_rgba(0,102,255,0.05)] flex flex-col gap-stack-md">
              <div className="flex items-center gap-stack-sm">
                <span className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-title-md text-[18px] font-bold shrink-0">
                  {selected.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 className="font-title-md text-title-md text-indigo-gray-900 tracking-tight truncate">{selected.name}</h2>
                  <span className="font-label-sm text-[12px] text-indigo-gray-600">
                    {demographics(selected) && `${demographics(selected)} • `}ID: #{selected.code}
                  </span>
                </div>
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

function Metric({
  label,
  value,
  note,
  noteTone = 'teal',
  icon: Icon,
  tint = 'bg-primary-fixed/50 text-primary',
  footer,
  alert,
}: {
  label: string
  value: string
  note?: string
  noteTone?: 'teal' | 'coral'
  icon: LucideIcon
  tint?: string
  footer: ReactNode
  alert?: boolean
}) {
  return (
    <div className={`bg-surface-container-lowest rounded-xl p-3 md:p-stack-md shadow-[0_4px_20px_rgba(0,102,255,0.05)] relative overflow-hidden flex flex-col justify-between gap-2 ${alert ? 'ring-1 ring-soft-coral/30 border border-soft-coral/30' : 'border border-outline-variant/30 md:border-transparent'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-label-sm text-[11px] md:text-label-sm uppercase tracking-wider ${alert ? 'text-soft-coral font-bold' : 'text-indigo-gray-600'}`}>{label}</span>
        <span className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 ${alert ? 'bg-soft-coral/15 text-soft-coral' : tint}`}>
          <Icon className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" />
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 md:gap-stack-sm">
        <span className={`font-headline-lg text-[20px] md:text-headline-lg font-bold tracking-tight ${alert ? 'text-soft-coral' : 'text-indigo-gray-900'}`}>{value}</span>
        {note && <span className={`font-label-sm text-[11px] md:text-label-sm font-semibold ${alert ? 'text-soft-coral' : noteTone === 'teal' ? 'text-fresh-teal' : 'text-soft-coral'}`}>{note}</span>}
      </div>
      <div className="font-label-sm text-[10px] md:text-[11px] text-indigo-gray-600">{footer}</div>
    </div>
  )
}

function PatientDetails({ patient: p, now, compact }: { patient: RosterPatient; now: number; compact?: boolean }) {
  const latestFile = p.records.find((r) => r.fileUrl)
  const ref = visitRef(p)
  return (
    <div className="flex flex-col gap-3 md:gap-stack-md">
      <div className="bg-surface-container-low rounded-xl p-2.5 md:p-stack-sm flex flex-col gap-base">
        {!compact && <span className="font-label-sm text-label-sm text-indigo-gray-900 font-bold uppercase tracking-wider">Health Details</span>}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Fact icon={Droplet} label="Blood group" value={p.bloodGroup} />
          <Fact label="Date of birth" value={p.dateOfBirth ? formatShortDate(p.dateOfBirth) : null} />
          <Fact label="Sex" value={p.gender} />
        </div>
        <p className="text-[10px] text-indigo-gray-600 px-1">From the patient&apos;s own profile. Vitals and allergies aren&apos;t recorded here; check your notes below.</p>
      </div>

      <div className="flex flex-col gap-base">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-[12px] md:text-label-sm font-bold text-indigo-gray-900 uppercase tracking-wider">Latest Document</span>
          {latestFile?.fileUrl && (
            <a href={latestFile.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-label-sm text-[11px] font-bold hover:underline">
              Open file
            </a>
          )}
        </div>
        <div className="p-2.5 md:p-3 bg-surface-container-low rounded-xl flex items-center gap-stack-sm">
          <span className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0">
            <FileText className="w-[18px] h-[18px] md:w-5 md:h-5" />
          </span>
          <span className="flex flex-col min-w-0">
            <span className="text-[12px] md:text-[13px] text-indigo-gray-900 font-medium truncate">{latestFile ? 'Prescription attachment' : 'No documents uploaded'}</span>
            <span className="text-[10px] md:text-[11px] text-indigo-gray-600">{latestFile?.date ? formatShortDate(latestFile.date) : 'Attach one when you write a prescription'}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-base">
        <span className="font-label-sm text-[12px] md:text-label-sm font-bold text-indigo-gray-900 uppercase tracking-wider">Your Notes &amp; Prescriptions</span>
        {p.records.length === 0 ? (
          <p className="p-2.5 rounded-lg bg-surface-container-low text-[12px] text-indigo-gray-600">No notes yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {p.records.slice(0, compact ? 2 : 4).map((r) => (
              <li key={r.id} className="p-2.5 rounded-lg bg-surface-container-low">
                <p className="text-[12px] md:text-[13px] text-indigo-gray-900 line-clamp-3">{r.notes || 'Document only'}</p>
                <span className="text-[10px] md:text-[11px] text-indigo-gray-600">{r.date ? formatSlot(r.date, now) : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-2.5 md:p-stack-sm rounded-xl bg-surface-container-low flex flex-col gap-1">
        <span className="font-label-sm text-[10px] md:text-[11px] uppercase tracking-wider text-indigo-gray-600 font-bold flex items-center gap-1">
          <Siren className="w-3.5 h-3.5 text-soft-coral" /> Emergency Contact
        </span>
        <p className={`text-[12px] md:text-[13px] font-medium ${p.emergency ? 'text-indigo-gray-900' : 'text-outline'}`}>{p.emergency ?? 'Not added by the patient'}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-stack-sm">
        {ref ? (
          <PrescriptionButton visit={ref} kind="blue" className="w-full py-2.5" />
        ) : (
          <span className="col-span-1 flex items-center justify-center text-center text-[11px] text-indigo-gray-600 px-2">No open visit to write a prescription for</span>
        )}
        {p.phone ? <CallLink phone={p.phone} name={p.name} /> : <span />}
        {p.email && (
          <a href={`mailto:${p.email}`} className="col-span-2 py-2 px-3 rounded-full bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-[12px] flex items-center justify-center gap-1">
            <Mail className="w-4 h-4 text-primary" /> Email Patient
          </a>
        )}
        {!p.phone && !p.email && (
          <span className="col-span-2 text-center text-[11px] text-indigo-gray-600 flex items-center justify-center gap-1">
            <Phone className="w-3.5 h-3.5" /> No contact details on file
          </span>
        )}
      </div>
    </div>
  )
}

function Fact({ icon: Icon, label, value }: { icon?: LucideIcon; label: string; value: string | null }) {
  return (
    <div className="bg-surface-container-lowest p-2 rounded-lg min-w-0">
      <span className="font-label-sm text-[9px] md:text-[10px] text-indigo-gray-600 uppercase flex items-center justify-center gap-0.5">
        {Icon && <Icon className="w-3 h-3 text-soft-coral" />} {label}
      </span>
      <p className={`font-title-md text-[13px] md:text-[14px] font-bold mt-0.5 truncate ${value ? 'text-indigo-gray-900' : 'text-outline'}`}>{value ?? '—'}</p>
    </div>
  )
}
