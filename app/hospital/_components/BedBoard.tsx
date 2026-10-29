'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeft, BedSingle, Download, LogOut, Plus, Search, Settings2, Trash2, UserPlus, X } from 'lucide-react'
import { formatINR, formatShortDate } from '@/components/patient/format'
import { DeskDialog, ErrorNote, Field, PrimaryButton, QuietButton, deskInput } from '@/components/portal/desk'
import { addBeds, admitPatient, dischargePatient, findPatientByPhone, hospitalPatientOptions, removeBed, transferPatient, updateBed } from '@/app/actions/beds'
import { BED_TYPES, stayDays, type Bed, type BedStatus } from '@/lib/beds'
import { DeskHead, HosBody, HosHeader, Meter, PhoneStats, Row, StatCard, btnOutline, btnPrimary, card, lineTab, plural, segGroup, segTab } from './hos-ui'

export type BoardDoctor = { id: string; name: string; department: string }

/** Numbers the server works out from admissions and discharges (the board counts the beds itself). */
export type BedStats = { admittedToday: number; dischargedToday: number; avgStay: number | null; staysCounted: number }

type Filter = 'all' | 'available' | 'occupied' | 'unavailable'
type Mode = 'main' | 'edit' | 'move' | 'discharge'

const FILTERS: [Filter, string, string][] = [
  ['all', 'All', 'All beds'],
  ['available', 'Free', 'Free'],
  ['occupied', 'In use', 'In use'],
  ['unavailable', 'Cleaning', 'Cleaning'],
]

// A bed tile: blue when a patient is in it, white with a coloured ring otherwise.
const LOOK: Record<'occupied' | BedStatus, { label: string; tile: string; key: string }> = {
  occupied: { label: 'In use', tile: 'bg-[#2A4DD0] text-white', key: 'bg-[#2A4DD0]' },
  available: { label: 'Free', tile: 'bg-white text-[#067647] shadow-[inset_0_0_0_1.5px_#ABEFC6] lg:shadow-[inset_0_0_0_1.5px_#12B76A]', key: 'shadow-[inset_0_0_0_1.5px_#12B76A]' },
  cleaning: { label: 'Cleaning', tile: 'bg-white text-[#B54708] shadow-[inset_0_0_0_1.5px_#FEC84B] lg:shadow-[inset_0_0_0_1.5px_#F79009]', key: 'shadow-[inset_0_0_0_1.5px_#F79009]' },
  maintenance: { label: 'Repair', tile: 'bg-white text-[#5B667A] shadow-[inset_0_0_0_1.5px_#D0D5DD] lg:shadow-[inset_0_0_0_1.5px_#98A2B3]', key: 'shadow-[inset_0_0_0_1.5px_#98A2B3]' },
}

const lookOf = (b: Bed) => LOOK[b.admission ? 'occupied' : b.status]

function matches(b: Bed, filter: Filter) {
  if (filter === 'available') return !b.admission && b.status === 'available'
  if (filter === 'occupied') return !!b.admission
  if (filter === 'unavailable') return !b.admission && b.status !== 'available'
  return true
}

function exportCensus(beds: Bed[], now: number) {
  const header = ['Ward', 'Bed', 'Type', 'Status', 'Patient', 'Mobile', 'Attending doctor', 'Admitted', 'Day', 'Expected discharge', 'Reason']
  const lines = beds.map((b) => {
    const a = b.admission
    return [
      b.ward,
      b.label,
      BED_TYPES[b.type] ?? b.type,
      lookOf(b).label,
      a?.patient.name ?? '',
      a?.patient.phone ?? '',
      a?.doctor?.name ?? '',
      a ? formatShortDate(a.admittedAt) : '',
      a ? stayDays(a.admittedAt, now) : '',
      a?.expectedDischarge ? formatShortDate(a.expectedDischarge) : '',
      a?.reason ?? '',
    ]
  })
  const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'bed-census.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * The beds page after the HosBeds/DeskHosBeds exports: the numbers, every bed by ward as a tile, and the chosen bed's
 * details with its next step (admit, discharge or mark ready). Admitting, moving and discharging open the bed dialog.
 */
export function BedBoard({
  beds,
  doctors,
  now,
  staff,
  ready,
  stats,
  notice,
  recent,
}: {
  beds: Bed[]
  doctors: BoardDoctor[]
  now: number
  staff: { name: string }
  /** The beds tables exist, so beds can be added. */
  ready: boolean
  stats: BedStats
  /** Shown above the board, e.g. that beds aren't saved to the database yet. */
  notice?: ReactNode
  /** The recent discharges card. */
  recent: ReactNode
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ id: string; mode: Mode } | null>(null)

  const counts = Object.fromEntries(FILTERS.map(([k]) => [k, beds.filter((b) => matches(b, k)).length])) as Record<Filter, number>
  const occupancy = beds.length ? Math.round((counts.occupied / beds.length) * 100) : 0
  const repair = beds.filter((b) => !b.admission && b.status === 'maintenance').length

  const q = query.trim().toLowerCase()
  const shown = beds.filter(
    (b) => matches(b, filter) && (!q || [b.ward, b.label, b.admission?.patient.name, b.admission?.patient.phone, b.admission?.doctor?.name].some((s) => s?.toLowerCase().includes(q))),
  )
  const wardNames = Array.from(new Set(beds.map((b) => b.ward)))
  const wards = wardNames
    .map((ward) => {
      const all = beds.filter((b) => b.ward === ward)
      return {
        ward,
        total: all.length,
        used: all.filter((b) => b.admission).length,
        free: all.filter((b) => matches(b, 'available')).length,
        list: shown.filter((b) => b.ward === ward),
      }
    })
    .filter((w) => w.list.length)

  // Phones show the chosen bed's card once one is tapped; desktops always show one in the side panel.
  const picked = selId ? beds.find((b) => b.id === selId) ?? null : null
  const deskBed = picked ?? shown[0] ?? beds[0] ?? null
  const open = dialog ? beds.find((b) => b.id === dialog.id) ?? null : null
  const act = (b: Bed, mode: Mode) => setDialog({ id: b.id, mode })
  // On phones the chosen bed's card sits under the wards, so bring it into view.
  const pick = (id: string) => {
    setSelId(id)
    if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => document.getElementById('selected-bed')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const subtitle = 'Every bed by ward. Admissions show on the attending doctor’s dashboard as soon as you save them.'
  const keys: ('occupied' | BedStatus)[] = ['available', 'occupied', 'cleaning', ...(repair ? (['maintenance'] as const) : [])]
  const legend = keys.map((k) => (
    <span key={k} className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-[3px] lg:rounded-[4px] ${LOOK[k].key}`} />
      {LOOK[k].label}
    </span>
  ))

  return (
    <>
      <HosHeader staff={staff} title="Inpatient beds" subtitle={subtitle}>
        <label className="flex items-center gap-2.5 h-12 px-3.5 rounded-[14px] bg-white text-[#0B1B3F]">
          <Search className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
          <span className="sr-only">Search beds</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Patient, doctor, ward or bed" className="flex-1 min-w-0 bg-transparent outline-none text-[14px] placeholder:text-[#7A8599]" />
        </label>
      </HosHeader>
      <HosBody>
        <DeskHead
          title="Inpatient beds"
          subtitle={subtitle}
          actions={
            <>
              <button type="button" onClick={() => exportCensus(beds, now)} disabled={!beds.length} className={`${btnOutline} disabled:opacity-50`}>
                <Download className="w-4 h-4" /> Census report
              </button>
              {ready && <AddBedsButton wards={wardNames} className={btnPrimary} />}
            </>
          }
        />
        {notice}

        <PhoneStats
          cols={4}
          stats={[
            { label: 'Total', value: beds.length, note: plural(wardNames.length, 'ward') },
            { label: 'In use', value: counts.occupied, note: `${occupancy}%`, color: '#2A4DD0' },
            { label: 'Free', value: counts.available, note: 'ready', color: '#067647' },
            { label: 'Cleaning', value: counts.unavailable, note: repair ? `${repair} in repair` : 'pending', color: '#B54708' },
          ]}
        />
        {ready && (
          <div className="lg:hidden mt-3.5">
            <AddBedsButton wards={wardNames} className={`${btnPrimary} w-full !h-[46px] !shadow-none`} />
          </div>
        )}

        <section className="hidden lg:grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Total beds" value={beds.length} note={`${plural(wardNames.length, 'ward')} · ${counts.available} free`} />
          <StatCard label="Occupancy" value={`${occupancy}%`} note={`${counts.occupied} of ${beds.length} beds in use`} />
          <StatCard label="Admissions today" value={stats.admittedToday} note={`${stats.dischargedToday} discharged today`} />
          <StatCard
            label="Avg. length of stay"
            value={stats.avgStay === null ? '—' : `${stats.avgStay.toFixed(1)} days`}
            note={stats.staysCounted ? `Last ${plural(stats.staysCounted, 'discharge')}` : 'No discharges yet'}
          />
        </section>

        {/* Phones: underlined tabs and the key */}
        <div className="lg:hidden mt-3.5">
          <div role="tablist" aria-label="Filter beds" className="flex border-b border-[#E1E7F0]">
            {FILTERS.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={lineTab(filter === k)}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-3 text-[12px] font-bold text-[#5B667A]">{legend}</div>
        </div>

        {/* Desktops: segmented tabs, search and the key on the right */}
        <div className="hidden lg:flex items-center justify-between gap-4 mb-4">
          <div role="tablist" aria-label="Filter beds" className={segGroup}>
            {FILTERS.map(([k, , label]) => (
              <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={segTab(filter === k)}>
                {label} <span className={filter === k ? '' : 'text-[#8A94A6]'}>{counts[k]}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 min-w-0">
            <label className="flex items-center gap-2 h-[38px] px-3 rounded-xl bg-white shadow-[inset_0_0_0_1px_#E6EAF0] focus-within:shadow-[inset_0_0_0_1.5px_#2A4DD0] w-[220px] min-w-0">
              <Search className="w-4 h-4 text-[#5B667A] shrink-0" />
              <span className="sr-only">Search beds</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Patient, doctor, ward or bed" className="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-[#7A8599]" />
            </label>
            <div className="hidden xl:flex gap-[18px] text-[12.5px] font-bold text-[#5B667A]">{legend}</div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] lg:gap-5 lg:items-start">
          <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0 mt-3.5 lg:mt-0">
            {wards.length === 0 ? (
              <p className={`${card} p-6 text-center text-[13.5px] text-[#5B667A]`}>
                {beds.length === 0 ? (ready ? 'No beds yet. Use Add beds to set up your wards.' : 'Beds aren’t set up yet.') : 'No beds match this filter.'}
              </p>
            ) : (
              wards.map((w) => (
                <section key={w.ward} className={`${card} p-4 lg:p-[22px]`}>
                  <div className="flex items-center justify-between gap-4 mb-3 lg:mb-3.5">
                    <span className="min-w-0">
                      <h2 className="text-[16px] font-extrabold truncate">{w.ward}</h2>
                      <span className="block mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">
                        {w.used} of {w.total} in use<span className="hidden lg:inline"> · {w.free} free</span>
                      </span>
                    </span>
                    <span className="hidden lg:block w-[180px] shrink-0">
                      <Meter pct={w.total ? (w.used / w.total) * 100 : 0} label={`${w.ward}: ${w.used} of ${w.total} beds in use`} />
                    </span>
                  </div>
                  <ul className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-2 lg:gap-2.5">
                    {w.list.map((b) => {
                      const look = lookOf(b)
                      const ring = picked?.id === b.id ? '!shadow-[0_0_0_3px_#0B1B3F]' : deskBed?.id === b.id ? 'lg:!shadow-[0_0_0_3px_#0B1B3F]' : ''
                      return (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => pick(b.id)}
                            aria-pressed={picked?.id === b.id}
                            aria-label={`${b.ward} ${b.label}: ${b.admission ? b.admission.patient.name : look.label}`}
                            className={`w-full h-[58px] lg:h-[70px] px-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-center transition-shadow ${look.tile} ${ring}`}
                          >
                            <span className="max-w-full text-[13px] lg:text-[13.5px] font-extrabold truncate">{b.label}</span>
                            <span className="max-w-full text-[10.5px] lg:text-[11px] font-bold opacity-85 truncate">{b.admission ? b.admission.patient.name.split(' ')[0] : look.label}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0 lg:sticky lg:top-[96px]">
            {picked && (
              <div id="selected-bed" className="lg:hidden">
                <SelectedBed bed={picked} now={now} onAct={act} onClose={() => setSelId(null)} />
              </div>
            )}
            {deskBed && (
              <div className="hidden lg:block">
                <SelectedBed bed={deskBed} now={now} onAct={act} desk />
              </div>
            )}
            {recent}
          </div>
        </div>
      </HosBody>

      {open && dialog && <BedDialog key={`${open.id}:${dialog.mode}`} bed={open} beds={beds} doctors={doctors} now={now} initialMode={dialog.mode} onClose={() => setDialog(null)} />}
    </>
  )
}

/** The chosen bed: who is in it and the next step. Desktops show it as the side panel with a blue head. */
function SelectedBed({ bed, now, onAct, onClose, desk = false }: { bed: Bed; now: number; onAct: (b: Bed, mode: Mode) => void; onClose?: () => void; desk?: boolean }) {
  const a = bed.admission
  const look = lookOf(bed)
  const title = /^bed\b/i.test(bed.label) ? bed.label : `Bed ${bed.label}`
  const status = [look.label, BED_TYPES[bed.type], bed.dailyRate ? `${formatINR(bed.dailyRate)}/day` : null].filter(Boolean).join(' · ')
  const cta = a
    ? { label: 'Discharge', icon: LogOut, mode: 'discharge' as Mode }
    : bed.status === 'available'
      ? { label: 'Admit patient', icon: UserPlus, mode: 'main' as Mode }
      : { label: 'Mark ready', icon: BedSingle, mode: 'main' as Mode }
  const second = a ? { label: 'Move bed', icon: ArrowRightLeft, mode: 'move' as Mode } : { label: 'Edit bed', icon: Settings2, mode: 'edit' as Mode }
  const Cta = cta.icon
  const Second = second.icon

  const rows = (
    <>
      <Row label="Patient">{a?.patient.name ?? '—'}</Row>
      <Row label="Attending doctor">{a?.doctor?.name ?? '—'}</Row>
      <Row label="Admitted">{a ? `${formatShortDate(a.admittedAt)} · day ${stayDays(a.admittedAt, now)}` : '—'}</Row>
      {(desk || a?.reason) && <Row label="Reason">{a?.reason ?? '—'}</Row>}
      {a?.expectedDischarge && <Row label="Expected discharge">{formatShortDate(a.expectedDischarge)}</Row>}
      {a && bed.dailyRate ? <Row label="Bed charges so far">{formatINR(bed.dailyRate * stayDays(a.admittedAt, now))}</Row> : null}
    </>
  )

  if (desk)
    return (
      <aside aria-label="Selected bed" className={`${card} overflow-hidden`}>
        <div className="px-[22px] py-[18px] bg-[#2A4DD0] text-white">
          <span className="block text-[11.5px] font-extrabold tracking-[0.08em] text-[#CFDCFF]">SELECTED BED</span>
          <span className="block text-[22px] font-extrabold truncate">{title}</span>
          <span className="block text-[13px] text-[#E3EAFF] truncate">
            {bed.ward} · {status}
          </span>
        </div>
        <div className="px-[22px] pt-3.5 pb-[22px]">
          {rows}
          <div className="grid grid-cols-2 gap-2 mt-3.5">
            <button type="button" onClick={() => onAct(bed, second.mode)} className={`${btnOutline} !px-2`}>
              <Second className="w-4 h-4" /> {second.label}
            </button>
            <button type="button" onClick={() => onAct(bed, cta.mode)} className={`${btnPrimary} !px-2 !shadow-none`}>
              <Cta className="w-4 h-4" /> {cta.label}
            </button>
          </div>
          {a && (
            <button type="button" onClick={() => onAct(bed, 'main')} className="w-full mt-3 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
              All details and edit bed
            </button>
          )}
          <p className="mt-3 text-[12.5px] text-[#5B667A]">Select any bed to admit, move or discharge a patient.</p>
        </div>
      </aside>
    )

  return (
    <section aria-label="Selected bed" className={`${card} p-4 !shadow-[0_0_0_1.5px_#2A4DD0]`}>
      <div className="flex items-start justify-between gap-2.5">
        <span className="min-w-0">
          <h2 className="text-[16px] font-extrabold truncate">
            {title} <span className="font-bold text-[#5B667A]">· {bed.ward}</span>
          </h2>
          <span className="block mt-0.5 text-[12.5px] text-[#5B667A] truncate">{status}</span>
        </span>
        <button type="button" onClick={() => onAct(bed, a ? 'main' : 'edit')} className="shrink-0 h-8 text-[12.5px] font-extrabold text-[#2A4DD0]">
          {a ? 'Details' : 'Edit bed'}
        </button>
      </div>
      <div className="mt-2">{rows}</div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button type="button" onClick={onClose} className={`${btnOutline} !h-[42px]`}>
          <X className="w-4 h-4" /> Close
        </button>
        <button type="button" onClick={() => onAct(bed, cta.mode)} className={`${btnPrimary} !h-[42px] !shadow-none`}>
          <Cta className="w-4 h-4" /> {cta.label}
        </button>
      </div>
      {a && (
        <button type="button" onClick={() => onAct(bed, 'move')} className={`${btnOutline} w-full !h-[42px] mt-2`}>
          <ArrowRightLeft className="w-4 h-4" /> Move to another bed
        </button>
      )}
    </section>
  )
}

function BedDialog({ bed, beds, doctors, now, initialMode = 'main', onClose }: { bed: Bed; beds: Bed[]; doctors: BoardDoctor[]; now: number; initialMode?: Mode; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const look = lookOf(bed)
  const title = `${bed.ward} • ${bed.label}`

  if (mode === 'edit') return <EditBedDialog bed={bed} onClose={onClose} onBack={() => setMode('main')} />

  return (
    <DeskDialog title={title} subtitle={`${BED_TYPES[bed.type] ?? bed.type} bed • ${look.label}${bed.dailyRate ? ` • ${formatINR(bed.dailyRate)} per day` : ''}`} onClose={onClose} wide>
      {bed.admission ? (
        mode === 'move' ? (
          <MovePatient allocationId={bed.admission.id} beds={beds.filter((b) => b.id !== bed.id && !b.admission && b.status === 'available')} onDone={onClose} onBack={() => setMode('main')} />
        ) : mode === 'discharge' ? (
          <Discharge allocationId={bed.admission.id} name={bed.admission.patient.name} onDone={onClose} onBack={() => setMode('main')} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-surface-container-low grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Fact label="Patient" value={bed.admission.patient.name} />
              <Fact label="Mobile" value={bed.admission.patient.phone ?? '—'} />
              <Fact label="Attending doctor" value={bed.admission.doctor?.name ?? '—'} />
              <Fact label="Admitted" value={`${formatShortDate(bed.admission.admittedAt)} • day ${stayDays(bed.admission.admittedAt, now)}`} />
              <Fact label="Expected discharge" value={bed.admission.expectedDischarge ? formatShortDate(bed.admission.expectedDischarge) : 'Not set'} />
              {bed.dailyRate ? <Fact label="Bed charges so far" value={formatINR(bed.dailyRate * stayDays(bed.admission.admittedAt, now))} /> : null}
              {bed.admission.reason && <Fact label="Reason for admission" value={bed.admission.reason} wide />}
              {bed.admission.notes && <Fact label="Notes" value={bed.admission.notes} wide />}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <QuietButton onClick={() => setMode('edit')}>
                <span className="inline-flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4" /> Edit bed
                </span>
              </QuietButton>
              <button type="button" onClick={() => setMode('move')} className="px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-sm font-semibold inline-flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4" /> Move to another bed
              </button>
              <PrimaryButton type="button" onClick={() => setMode('discharge')}>
                <LogOut className="w-4 h-4" /> Discharge
              </PrimaryButton>
            </div>
          </div>
        )
      ) : bed.status === 'available' ? (
        <AdmitForm bed={bed} doctors={doctors} onDone={onClose} onEdit={() => setMode('edit')} />
      ) : (
        <StatusActions bed={bed} onDone={onClose} onEdit={() => setMode('edit')} />
      )}
    </DeskDialog>
  )
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-indigo-gray-600">{label}</p>
      <p className="font-semibold text-on-surface break-words">{value}</p>
    </div>
  )
}

type PatientOption = { id: string; name: string; phone: string | null; doctorId: string | null }

function AdmitForm({ bed, doctors, onDone, onEdit }: { bed: Bed; doctors: BoardDoctor[]; onDone: () => void; onEdit: () => void }) {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientOption[] | null>(null)
  const [patient, setPatient] = useState<PatientOption | null>(null)
  const [search, setSearch] = useState('')
  const [phone, setPhone] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const loading = patients === null

  // The hospital's patients load once, when the form opens.
  useEffect(() => {
    let alive = true
    void hospitalPatientOptions().then((res) => {
      if (!alive) return
      setPatients(res.ok ? res.patients : [])
      if (!res.ok) setError(res.error)
    })
    return () => {
      alive = false
    }
  }, [])

  const q = search.trim().toLowerCase()
  const matches = (patients ?? []).filter((p) => !q || p.name.toLowerCase().includes(q) || p.phone?.includes(q)).slice(0, 8)

  const lookUp = () =>
    start(async () => {
      const res = await findPatientByPhone(phone)
      if (!res.ok) return setError(res.error)
      setError(null)
      setPatient({ ...res.patient, doctorId: null })
    })

  const submit = (form: FormData) =>
    start(async () => {
      if (!patient) return setError('Choose the patient to admit.')
      const res = await admitPatient({
        bedId: bed.id,
        patientId: patient.id,
        doctorId: String(form.get('doctorId') || ''),
        reason: String(form.get('reason') || ''),
        notes: String(form.get('notes') || ''),
        expectedDischarge: String(form.get('expectedDischarge') || '') || null,
      })
      if (!res.ok) return setError(res.error)
      onDone()
      router.refresh()
    })

  return (
    <form action={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="font-label-sm text-label-sm text-indigo-gray-600">Patient</span>
        {patient ? (
          <div className="p-3 rounded-xl bg-primary-fixed/40 flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block font-bold text-on-surface truncate">{patient.name}</span>
              <span className="block text-[12px] text-indigo-gray-600">{patient.phone ?? 'No mobile number'}</span>
            </span>
            <button type="button" onClick={() => setPatient(null)} className="text-[13px] font-semibold text-primary hover:underline shrink-0">
              Change
            </button>
          </div>
        ) : (
          <>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={loading ? 'Loading your patients…' : 'Search your patients by name or mobile'} className={deskInput} />
            {matches.length > 0 && (
              <ul className="max-h-52 overflow-y-auto flex flex-col gap-1 rounded-xl bg-surface-container-low p-1.5">
                {matches.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPatient(p)
                        if (p.doctorId && doctors.some((d) => d.id === p.doctorId)) setDoctorId(p.doctorId)
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-container-lowest flex items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-[14px] text-on-surface truncate">{p.name}</span>
                      <span className="text-[12px] text-indigo-gray-600 shrink-0">{p.phone ?? ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 items-end">
              <Field label="Or find a registered patient by mobile number" className="flex-1">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" className={deskInput} />
              </Field>
              <button type="button" onClick={lookUp} disabled={pending || !phone.trim()} className="px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-1.5">
                <Search className="w-4 h-4" /> Find
              </button>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Attending doctor">
          <select name="doctorId" required value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={deskInput}>
            <option value="" disabled>
              Choose a doctor
            </option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} • {d.department}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Expected discharge (optional)">
          <input name="expectedDischarge" type="date" className={deskInput} />
        </Field>
        <Field label="Reason for admission" className="sm:col-span-2">
          <input name="reason" maxLength={500} placeholder="e.g. Dengue fever with low platelets, observation" className={deskInput} />
        </Field>
        <Field label="Notes (optional)" className="sm:col-span-2">
          <textarea name="notes" rows={2} maxLength={2000} placeholder="Diet, isolation needs, attendant details…" className={`${deskInput} resize-none`} />
        </Field>
      </div>

      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-wrap justify-between gap-2">
        <QuietButton onClick={onEdit}>
          <span className="inline-flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" /> Edit bed
          </span>
        </QuietButton>
        <PrimaryButton pending={pending} disabled={!patient}>
          <UserPlus className="w-4 h-4" /> Admit to {bed.label}
        </PrimaryButton>
      </div>
    </form>
  )
}

function MovePatient({ allocationId, beds, onDone, onBack }: { allocationId: string; beds: Bed[]; onDone: () => void; onBack: () => void }) {
  const router = useRouter()
  const [bedId, setBedId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const move = () =>
    start(async () => {
      if (!bedId) return setError('Choose the bed to move to.')
      const res = await transferPatient({ allocationId, bedId })
      if (!res.ok) return setError(res.error)
      onDone()
      router.refresh()
    })
  return (
    <div className="flex flex-col gap-4">
      {beds.length === 0 ? (
        <p className="p-3 rounded-lg bg-surface-container-low text-sm text-indigo-gray-600">There’s no free bed to move to right now.</p>
      ) : (
        <Field label="Move to">
          <select value={bedId} onChange={(e) => setBedId(e.target.value)} className={deskInput}>
            <option value="">Choose an available bed</option>
            {beds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.ward} • {b.label} ({BED_TYPES[b.type] ?? b.type})
              </option>
            ))}
          </select>
        </Field>
      )}
      <ErrorNote>{error}</ErrorNote>
      <div className="flex justify-end gap-2">
        <QuietButton onClick={onBack}>Back</QuietButton>
        <PrimaryButton type="button" pending={pending} onClick={move} disabled={!beds.length}>
          <ArrowRightLeft className="w-4 h-4" /> Move patient
        </PrimaryButton>
      </div>
    </div>
  )
}

function Discharge({ allocationId, name, onDone, onBack }: { allocationId: string; name: string; onDone: () => void; onBack: () => void }) {
  const router = useRouter()
  const [next, setNext] = useState<'cleaning' | 'available'>('cleaning')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const discharge = () =>
    start(async () => {
      const res = await dischargePatient({ allocationId, nextStatus: next, notes })
      if (!res.ok) return setError(res.error)
      onDone()
      router.refresh()
    })
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-indigo-gray-600">
        Discharge <span className="font-semibold text-on-surface">{name}</span>. The doctor’s and the patient’s pages update straight away.
      </p>
      <Field label="Discharge notes (optional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} placeholder="Condition at discharge, follow-up advice…" className={`${deskInput} resize-none`} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="font-label-sm text-label-sm text-indigo-gray-600 mb-1">After discharge, the bed is</legend>
        {(
          [
            ['cleaning', 'Sent for cleaning'],
            ['available', 'Available right away'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-on-surface">
            <input type="radio" name="next" checked={next === key} onChange={() => setNext(key)} className="accent-vibrant-blue" /> {label}
          </label>
        ))}
      </fieldset>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex justify-end gap-2">
        <QuietButton onClick={onBack}>Back</QuietButton>
        <PrimaryButton type="button" pending={pending} onClick={discharge}>
          <LogOut className="w-4 h-4" /> Discharge patient
        </PrimaryButton>
      </div>
    </div>
  )
}

function StatusActions({ bed, onDone, onEdit }: { bed: Bed; onDone: () => void; onEdit: () => void }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const ready = () =>
    start(async () => {
      const res = await updateBed({ bedId: bed.id, ward: bed.ward, label: bed.label, type: bed.type, dailyRate: bed.dailyRate, status: 'available' })
      if (!res.ok) return setError(res.error)
      onDone()
      router.refresh()
    })
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-indigo-gray-600">This bed is marked for {bed.status}. Make it available once it’s ready for the next patient.</p>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-wrap justify-between gap-2">
        <QuietButton onClick={onEdit}>
          <span className="inline-flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" /> Edit bed
          </span>
        </QuietButton>
        <PrimaryButton type="button" pending={pending} onClick={ready}>
          <BedSingle className="w-4 h-4" /> Mark available
        </PrimaryButton>
      </div>
    </div>
  )
}

function EditBedDialog({ bed, onClose, onBack }: { bed: Bed; onClose: () => void; onBack: () => void }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const save = (form: FormData) =>
    start(async () => {
      const rate = String(form.get('dailyRate') || '').trim()
      const res = await updateBed({
        bedId: bed.id,
        ward: String(form.get('ward') || ''),
        label: String(form.get('label') || ''),
        type: String(form.get('type') || 'general'),
        dailyRate: rate ? Number(rate) : null,
        status: (bed.admission ? 'available' : String(form.get('status') || 'available')) as BedStatus,
      })
      if (!res.ok) return setError(res.error)
      onClose()
      router.refresh()
    })
  const remove = () =>
    start(async () => {
      if (!window.confirm(`Remove ${bed.label} from ${bed.ward}? Its admission history goes with it.`)) return
      const res = await removeBed(bed.id)
      if (!res.ok) return setError(res.error)
      onClose()
      router.refresh()
    })
  return (
    <DeskDialog title={`Edit ${bed.label}`} subtitle={bed.ward} onClose={onClose}>
      <form action={save} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Ward">
            <input name="ward" required maxLength={60} defaultValue={bed.ward} className={deskInput} />
          </Field>
          <Field label="Bed label">
            <input name="label" required maxLength={30} defaultValue={bed.label} className={deskInput} />
          </Field>
          <Field label="Bed type">
            <select name="type" defaultValue={bed.type} className={deskInput}>
              {Object.entries(BED_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Charge per day (₹, optional)">
            <input name="dailyRate" type="number" min={0} step={1} defaultValue={bed.dailyRate ?? ''} className={deskInput} />
          </Field>
          {!bed.admission && (
            <Field label="Availability" className="sm:col-span-2">
              <select name="status" defaultValue={bed.status} className={deskInput}>
                <option value="available">Available</option>
                <option value="cleaning">Cleaning</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </Field>
          )}
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex flex-wrap justify-between gap-2">
          <button type="button" onClick={remove} disabled={pending || !!bed.admission} title={bed.admission ? 'Discharge or move the patient first' : undefined} className="px-4 py-2.5 rounded-full text-sm font-semibold text-error hover:bg-error-container/50 disabled:opacity-40 inline-flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" /> Remove bed
          </button>
          <div className="flex gap-2">
            <QuietButton onClick={onBack}>Back</QuietButton>
            <PrimaryButton pending={pending}>Save bed</PrimaryButton>
          </div>
        </div>
      </form>
    </DeskDialog>
  )
}

/** Adds a run of beds to a ward ("Bed 1" to "Bed 10"). */
export function AddBedsButton({ wards, className }: { wards: string[]; className?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const submit = (form: FormData) =>
    start(async () => {
      const rate = String(form.get('dailyRate') || '').trim()
      const res = await addBeds({
        ward: String(form.get('ward') || ''),
        type: String(form.get('type') || 'general'),
        prefix: String(form.get('prefix') || ''),
        start: Number(form.get('start') || 1),
        count: Number(form.get('count') || 0),
        dailyRate: rate ? Number(rate) : null,
      })
      if (!res.ok) return setError(res.error)
      setError(null)
      setOpen(false)
      router.refresh()
    })
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold shadow-[0_8px_20px_rgba(15,23,42,0.11)] hover:brightness-105 active:scale-95 transition-all'
        }
      >
        <Plus className="w-[18px] h-[18px]" /> Add beds
      </button>
      {open && (
        <DeskDialog title="Add beds" subtitle="Set up a ward, or add more beds to one." onClose={() => setOpen(false)}>
          <form action={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Ward" className="sm:col-span-2" hint="e.g. General Ward, ICU, Maternity Ward, Private Rooms">
                <input name="ward" required maxLength={60} list="bed-wards" placeholder="General Ward" className={deskInput} />
                <datalist id="bed-wards">
                  {wards.map((w) => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
              </Field>
              <Field label="Bed type">
                <select name="type" defaultValue="general" className={deskInput}>
                  {Object.entries(BED_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Charge per day (₹, optional)">
                <input name="dailyRate" type="number" min={0} step={1} placeholder="1500" className={deskInput} />
              </Field>
              <Field label="Number of beds">
                <input name="count" type="number" required min={1} max={200} defaultValue={10} className={deskInput} />
              </Field>
              <Field label="Label" hint="Beds are numbered after it: Bed 1, Bed 2, …">
                <div className="flex gap-2">
                  <input name="prefix" maxLength={20} defaultValue="Bed" className={deskInput} />
                  <input name="start" type="number" min={0} max={9999} defaultValue={1} aria-label="First number" className={`${deskInput} w-24`} />
                </div>
              </Field>
            </div>
            <ErrorNote>{error}</ErrorNote>
            <div className="flex justify-end gap-2">
              <QuietButton onClick={() => setOpen(false)}>Cancel</QuietButton>
              <PrimaryButton pending={pending}>
                <Plus className="w-4 h-4" /> Add beds
              </PrimaryButton>
            </div>
          </form>
        </DeskDialog>
      )}
    </>
  )
}
