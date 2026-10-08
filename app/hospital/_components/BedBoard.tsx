'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeft, BedDouble, BedSingle, Brush, LogOut, Plus, Search, Settings2, Trash2, UserPlus, Wrench } from 'lucide-react'
import { formatINR, formatShortDate } from '@/components/patient/format'
import { DeskDialog, ErrorNote, Field, PrimaryButton, QuietButton, deskInput } from '@/components/portal/desk'
import { addBeds, admitPatient, dischargePatient, findPatientByPhone, hospitalPatientOptions, removeBed, transferPatient, updateBed } from '@/app/actions/beds'
import { BED_TYPES, stayDays, type Bed, type BedStatus } from '@/lib/beds'

export type BoardDoctor = { id: string; name: string; department: string }

type Filter = 'all' | 'available' | 'occupied' | 'unavailable'

const STATUS_LOOK: Record<'occupied' | BedStatus, { label: string; tile: string; dot: string; icon: typeof BedSingle }> = {
  occupied: { label: 'Occupied', tile: 'bg-primary-fixed/50 border-vibrant-blue/30 hover:border-vibrant-blue', dot: 'bg-vibrant-blue', icon: BedDouble },
  available: { label: 'Available', tile: 'bg-secondary-container/25 border-fresh-teal/30 hover:border-fresh-teal', dot: 'bg-fresh-teal', icon: BedSingle },
  cleaning: { label: 'Cleaning', tile: 'bg-amber-50 border-amber-300/60 hover:border-amber-400', dot: 'bg-amber-400', icon: Brush },
  maintenance: { label: 'Maintenance', tile: 'bg-surface-container border-outline-variant/60 hover:border-outline', dot: 'bg-outline', icon: Wrench },
}

const lookOf = (b: Bed) => STATUS_LOOK[b.admission ? 'occupied' : b.status]

/** The bed board: every bed by ward, colour-coded, with admitting, moving and discharging patients. */
export function BedBoard({ beds, doctors, now }: { beds: Bed[]; doctors: BoardDoctor[]; now: number }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Bed | null>(null)

  const counts = {
    all: beds.length,
    available: beds.filter((b) => !b.admission && b.status === 'available').length,
    occupied: beds.filter((b) => b.admission).length,
    unavailable: beds.filter((b) => !b.admission && b.status !== 'available').length,
  }
  const q = query.trim().toLowerCase()
  const shown = beds.filter((b) => {
    if (filter === 'available' && (b.admission || b.status !== 'available')) return false
    if (filter === 'occupied' && !b.admission) return false
    if (filter === 'unavailable' && (b.admission || b.status === 'available')) return false
    if (!q) return true
    return [b.ward, b.label, b.admission?.patient.name, b.admission?.patient.phone, b.admission?.doctor?.name].some((s) => s?.toLowerCase().includes(q))
  })
  const byWard = new Map<string, Bed[]>()
  for (const b of shown) byWard.set(b.ward, [...(byWard.get(b.ward) ?? []), b])
  const wards = Array.from(byWard.entries())
  const current = open ? beds.find((b) => b.id === open.id) ?? null : null

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 shadow-[0_4px_24px_rgba(0,80,203,0.04)] border border-surface-container md:border-transparent flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-title-md text-[18px] md:text-title-md font-bold text-on-surface">Bed Allocation Board</h2>
          <p className="text-[13px] md:text-body-md text-indigo-gray-600">Tap a bed to admit, move or discharge a patient, or to change the bed.</p>
        </div>
        <label className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <span className="sr-only">Search beds</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Patient, doctor, ward or bed" className={`${deskInput} pl-9`} />
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="tablist" aria-label="Filter beds">
        {(
          [
            ['all', 'All beds'],
            ['available', 'Available'],
            ['occupied', 'Occupied'],
            ['unavailable', 'Cleaning & maintenance'],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
              filter === key ? 'bg-vibrant-blue text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {label} <span className={filter === key ? 'text-on-primary/80' : 'text-indigo-gray-600'}>{counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-indigo-gray-600">
        {(['available', 'occupied', 'cleaning', 'maintenance'] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_LOOK[k].dot}`} /> {STATUS_LOOK[k].label}
          </span>
        ))}
      </div>

      {wards.length === 0 ? (
        <p className="p-6 rounded-xl bg-surface-container-low text-center text-sm text-indigo-gray-600">
          {beds.length === 0 ? 'No beds yet. Use Add Beds to set up your wards.' : 'No beds match this filter.'}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {wards.map(([ward, list]) => {
            const occupied = list.filter((b) => b.admission).length
            return (
              <div key={ward} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-title-md text-[15px] font-bold text-on-surface">{ward}</h3>
                  <span className="text-[12px] font-semibold text-indigo-gray-600">
                    {occupied}/{list.length} occupied
                  </span>
                </div>
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5">
                  {list.map((b) => {
                    const look = lookOf(b)
                    const Icon = look.icon
                    return (
                      <li key={b.id}>
                        <button
                          type="button"
                          onClick={() => setOpen(b)}
                          className={`w-full h-full min-h-[104px] text-left p-3 rounded-xl border-2 transition-colors flex flex-col gap-1.5 ${look.tile}`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[14px] text-on-surface truncate">{b.label}</span>
                            <Icon className="w-4 h-4 text-indigo-gray-600 shrink-0" aria-hidden />
                          </span>
                          <span className="text-[11px] text-indigo-gray-600 truncate">{BED_TYPES[b.type] ?? b.type}{b.dailyRate ? ` • ${formatINR(b.dailyRate)}/day` : ''}</span>
                          {b.admission ? (
                            <span className="mt-auto flex flex-col">
                              <span className="text-[13px] font-semibold text-on-surface truncate">{b.admission.patient.name}</span>
                              <span className="text-[11px] text-indigo-gray-600 truncate">
                                Day {stayDays(b.admission.admittedAt, now)}
                                {b.admission.doctor ? ` • ${b.admission.doctor.name}` : ''}
                              </span>
                            </span>
                          ) : (
                            <span className="mt-auto flex items-center gap-1.5 text-[12px] font-semibold text-on-surface">
                              <span className={`w-2 h-2 rounded-full ${look.dot}`} /> {look.label}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {current && <BedDialog bed={current} beds={beds} doctors={doctors} now={now} onClose={() => setOpen(null)} />}
    </section>
  )
}

function BedDialog({ bed, beds, doctors, now, onClose }: { bed: Bed; beds: Bed[]; doctors: BoardDoctor[]; now: number; onClose: () => void }) {
  const [mode, setMode] = useState<'main' | 'edit' | 'move' | 'discharge'>('main')
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
export function AddBedsButton({ wards }: { wards: string[] }) {
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
        className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold shadow-[0_8px_20px_rgba(0,102,255,0.28)] hover:brightness-105 active:scale-95 transition-all"
      >
        <Plus className="w-[18px] h-[18px]" /> Add Beds
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
