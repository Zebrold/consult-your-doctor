'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { FilePenLine, LoaderCircle, Phone, UserCheck, X } from 'lucide-react'
import { initials } from '@/components/patient/format'
import { addPrescription, updateAppointmentStatus } from '@/app/actions/doctor'

export type VisitRef = { id: string; status: string; patientName: string; phone: string | null }

const canCheckIn = (v: VisitRef) => v.status === 'confirmed'
// A finished visit can take another prescription too (to send the patient an update); it stays completed.
const canPrescribe = (v: VisitRef) => v.status === 'confirmed' || v.status === 'visited' || v.status === 'completed'

const styles = {
  solid: 'bg-fresh-teal hover:bg-secondary text-on-secondary shadow-[0_4px_14px_rgba(20,184,166,0.3)]',
  blue: 'bg-vibrant-blue hover:bg-primary text-on-primary shadow-sm',
  soft: 'bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900',
  light: 'bg-surface-container-lowest hover:bg-surface-container-low text-primary shadow-md',
  pale: 'bg-surface-container-low hover:bg-surface-container text-indigo-gray-900',
  icon: 'p-2 hover:bg-surface-container text-vibrant-blue',
}

function Button({
  kind,
  onClick,
  pending,
  title,
  children,
  className = '',
  pad = 'px-3.5 py-2',
}: {
  kind: keyof typeof styles
  onClick: () => void
  pending?: boolean
  title?: string
  children: ReactNode
  className?: string
  /** Padding classes (kept separate so callers can resize without two competing padding utilities). */
  pad?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={kind === 'icon' ? title : undefined}
      onClick={onClick}
      disabled={pending}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all active:scale-95 disabled:opacity-60 ${
        kind === 'icon' ? '' : pad
      } ${styles[kind]} ${className}`}
    >
      {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

export function CheckInButton({ visit, kind = 'soft', label = 'Check In', className, pad }: { visit: VisitRef; kind?: keyof typeof styles; label?: string; className?: string; pad?: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (!canCheckIn(visit)) return null
  return (
    <Button
      kind={kind}
      title={`Mark ${visit.patientName} as checked in`}
      pending={pending}
      className={className}
      pad={pad}
      onClick={() =>
        start(async () => {
          const res = await updateAppointmentStatus(visit.id, 'visited')
          if (!res.success) alert(res.error)
          router.refresh()
        })
      }
    >
      {!pending && <UserCheck className="w-4 h-4" />}
      {kind !== 'icon' && label}
    </Button>
  )
}

export function PrescriptionButton({ visit, kind = 'soft', label = 'Write Prescription', className, pad }: { visit: VisitRef; kind?: keyof typeof styles; label?: ReactNode; className?: string; pad?: string }) {
  const [open, setOpen] = useState(false)
  if (!canPrescribe(visit)) return null
  return (
    <>
      <Button kind={kind} title={`Write a prescription for ${visit.patientName}`} onClick={() => setOpen(true)} className={className} pad={pad}>
        <FilePenLine className="w-4 h-4" />
        {kind !== 'icon' && label}
      </Button>
      {open && <PrescriptionModal visit={visit} onClose={() => setOpen(false)} />}
    </>
  )
}

export function CallLink({ phone, name, kind = 'soft', pad = 'px-3.5 py-2', className = '' }: { phone: string | null; name: string; kind?: keyof typeof styles; pad?: string; className?: string }) {
  if (!phone) return null
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      title={`Call ${name}`}
      aria-label={`Call ${name}`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-label-sm text-label-sm transition-colors ${kind === 'icon' ? '' : pad} ${styles[kind]} ${className}`}
    >
      <Phone className="w-4 h-4" />
      {kind !== 'icon' && 'Call Patient'}
    </a>
  )
}

/** The one action that moves a visit forward: check the patient in, then write their prescription. */
export function NextStepButton({ visit, kind = 'solid', className = '', pad = 'px-6 py-3' }: { visit: VisitRef; kind?: keyof typeof styles; className?: string; pad?: string }) {
  if (canCheckIn(visit)) return <CheckInButton visit={visit} kind={kind} label="Check In Patient" className={className} pad={pad} />
  if (visit.status === 'visited') return <PrescriptionButton visit={visit} kind={kind} label="Write Prescription" className={className} pad={pad} />
  return null
}

/** A visit offered in the dashboard's Write Prescription list; `when` is its time, already formatted. */
export type PickVisit = VisitRef & { when: string }

const PICK_STATUS: Record<string, { label: string; cls: string }> = {
  visited: { label: 'Checked in', cls: 'bg-fresh-teal/15 text-secondary' },
  confirmed: { label: 'Booked', cls: 'bg-primary/10 text-primary' },
  completed: { label: 'Completed', cls: 'bg-surface-container text-indigo-gray-600' },
}

/**
 * Write Prescription that is always there: it opens straight onto the patient in front of the doctor (`current`),
 * otherwise it lists recent visits to choose from.
 */
export function WritePrescriptionButton({
  current,
  recent,
  label,
  kind = 'pale',
  className,
  pad,
}: {
  current: VisitRef | null
  recent: PickVisit[]
  label: ReactNode
  kind?: keyof typeof styles
  className?: string
  pad?: string
}) {
  const [picking, setPicking] = useState(false)
  const [visit, setVisit] = useState<VisitRef | null>(null)
  return (
    <>
      <Button
        kind={kind}
        title={current ? `Write a prescription for ${current.patientName}` : 'Write a prescription'}
        onClick={() => (current ? setVisit(current) : setPicking(true))}
        className={className}
        pad={pad}
      >
        <FilePenLine className="w-4 h-4" />
        {label}
      </Button>
      {picking && (
        <VisitPicker
          visits={recent}
          onClose={() => setPicking(false)}
          onPick={(v) => {
            setPicking(false)
            setVisit(v)
          }}
        />
      )}
      {visit && <PrescriptionModal visit={visit} onClose={() => setVisit(null)} />}
    </>
  )
}

function VisitPicker({ visits, onPick, onClose }: { visits: PickVisit[]; onPick: (v: VisitRef) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Choose a visit">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[85vh] bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">Write a prescription</h3>
            <p className="text-sm text-indigo-gray-600">Choose the visit it belongs to. The patient sees it in their account.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        {visits.length ? (
          <ul className="flex flex-col gap-2 overflow-y-auto -mx-1 px-1">
            {visits.map((v) => {
              const status = PICK_STATUS[v.status] ?? PICK_STATUS.confirmed
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => onPick(v)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-primary-fixed/40 text-left transition-colors"
                  >
                    <span className="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-[13px] font-bold shrink-0">{initials(v.patientName)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-indigo-gray-900 truncate">{v.patientName}</span>
                      <span className="block text-xs text-indigo-gray-600">{v.when}</span>
                    </span>
                    <span className={`px-2.5 py-1 rounded-full font-label-sm text-[11px] font-semibold shrink-0 ${status.cls}`}>{status.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600">
            No paid visits in the last 30 days. Add the patient with New Consultation first, then write their prescription.
          </p>
        )}
      </div>
    </div>
  )
}

function PrescriptionModal({ visit, onClose }: { visit: VisitRef; onClose: () => void }) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [vitals, setVitals] = useState({ bp: '', spo2: '', hr: '' })
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (file && file.size > 5 * 1024 * 1024) return setError('The attachment must be under 5 MB.')
    const form = new FormData()
    form.append('appointmentId', visit.id)
    form.append('notes', notes)
    for (const [key, value] of Object.entries(vitals)) if (value.trim()) form.append(key, value)
    if (file) form.append('file', file)
    start(async () => {
      const res = await addPrescription(form)
      if ('error' in res && res.error) {
        setError(res.error)
        return
      }
      onClose()
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Prescription for ${visit.patientName}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full sm:max-w-lg bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">Prescription</h3>
            <p className="text-sm text-indigo-gray-600">
              {visit.status === 'completed'
                ? `For ${visit.patientName}. It’s added to this visit and appears in their account.`
                : `For ${visit.patientName}. It appears in their account, and saving it completes the visit.`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-sm text-label-sm text-indigo-gray-600">Notes &amp; medication</span>
          <textarea
            required
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Diagnosis, medicines with dose and duration, advice and follow-up"
            className="w-full rounded-lg bg-surface-container-low p-3 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30"
          />
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-label-sm text-label-sm text-indigo-gray-600 mb-1.5">Vitals measured at this visit (optional)</legend>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['bp', 'BP', 'mmHg'],
              ['spo2', 'SpO2', '%'],
              ['hr', 'Heart rate', 'bpm'],
            ] as const).map(([key, label, unit]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[11px] text-indigo-gray-600">{label}</span>
                <input
                  value={vitals[key]}
                  onChange={(e) => setVitals((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder={unit}
                  maxLength={20}
                  className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30"
                />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-sm text-label-sm text-indigo-gray-600">Attach a document (optional, PDF or image, up to 5 MB)</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-indigo-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-surface-container-high file:text-primary"
          />
        </label>
        {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-semibold text-indigo-gray-600 hover:bg-surface-container">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
            {visit.status === 'completed' ? 'Save & Share' : 'Save & Complete Visit'}
          </button>
        </div>
      </form>
    </div>
  )
}
