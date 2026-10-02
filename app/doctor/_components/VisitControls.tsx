'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { FilePenLine, LoaderCircle, Phone, UserCheck, X } from 'lucide-react'
import { addPrescription, updateAppointmentStatus } from '@/app/actions/doctor'

export type VisitRef = { id: string; status: string; patientName: string; phone: string | null }

const canCheckIn = (v: VisitRef) => v.status === 'confirmed'
const canPrescribe = (v: VisitRef) => v.status === 'confirmed' || v.status === 'visited'

const styles = {
  solid: 'bg-fresh-teal hover:bg-secondary text-on-secondary shadow-[0_4px_14px_rgba(20,184,166,0.3)]',
  blue: 'bg-vibrant-blue hover:bg-primary text-on-primary shadow-sm',
  soft: 'bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900',
  icon: 'p-2 hover:bg-surface-container text-vibrant-blue',
}

function Button({
  kind,
  onClick,
  pending,
  title,
  children,
  className = '',
}: {
  kind: keyof typeof styles
  onClick: () => void
  pending?: boolean
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={kind === 'icon' ? title : undefined}
      onClick={onClick}
      disabled={pending}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-label-sm text-label-sm transition-all active:scale-95 disabled:opacity-60 ${
        kind === 'icon' ? '' : 'px-3.5 py-2'
      } ${styles[kind]} ${className}`}
    >
      {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

export function CheckInButton({ visit, kind = 'soft', label = 'Check In', className }: { visit: VisitRef; kind?: keyof typeof styles; label?: string; className?: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (!canCheckIn(visit)) return null
  return (
    <Button
      kind={kind}
      title={`Mark ${visit.patientName} as checked in`}
      pending={pending}
      className={className}
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

export function PrescriptionButton({ visit, kind = 'soft', label = 'Write Prescription', className }: { visit: VisitRef; kind?: keyof typeof styles; label?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  if (!canPrescribe(visit)) return null
  return (
    <>
      <Button kind={kind} title={`Write a prescription for ${visit.patientName}`} onClick={() => setOpen(true)} className={className}>
        <FilePenLine className="w-4 h-4" />
        {kind !== 'icon' && label}
      </Button>
      {open && <PrescriptionModal visit={visit} onClose={() => setOpen(false)} />}
    </>
  )
}

export function CallLink({ phone, name, kind = 'soft' }: { phone: string | null; name: string; kind?: keyof typeof styles }) {
  if (!phone) return null
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      title={`Call ${name}`}
      aria-label={`Call ${name}`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-label-sm text-label-sm transition-colors ${kind === 'icon' ? '' : 'px-3.5 py-2'} ${styles[kind]}`}
    >
      <Phone className="w-4 h-4" />
      {kind !== 'icon' && 'Call Patient'}
    </a>
  )
}

/** The one action that moves a visit forward: check the patient in, then write their prescription. */
export function NextStepButton({ visit, className = '' }: { visit: VisitRef; className?: string }) {
  if (canCheckIn(visit)) return <CheckInButton visit={visit} kind="solid" label="Check In Patient" className={`px-6 py-3 ${className}`} />
  if (canPrescribe(visit)) return <PrescriptionButton visit={visit} kind="solid" label="Write Prescription" className={`px-6 py-3 ${className}`} />
  return null
}

function PrescriptionModal({ visit, onClose }: { visit: VisitRef; onClose: () => void }) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (file && file.size > 5 * 1024 * 1024) return setError('The attachment must be under 5 MB.')
    const form = new FormData()
    form.append('appointmentId', visit.id)
    form.append('notes', notes)
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
            <p className="text-sm text-indigo-gray-600">For {visit.patientName}. Saving it completes the visit.</p>
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
            Save &amp; Complete Visit
          </button>
        </div>
      </form>
    </div>
  )
}
