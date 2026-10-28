'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { FilePenLine, LoaderCircle, Phone, UserCheck, X } from 'lucide-react'
import { initials } from '@/components/patient/format'
import { updateAppointmentStatus } from '@/app/actions/doctor'
import { PrescriptionWriter } from './PrescriptionWriter'

export type VisitRef = { id: string; status: string; patientName: string; phone: string | null }

const canCheckIn = (v: VisitRef) => v.status === 'confirmed'
// A finished visit can take another prescription too (to send the patient an update); it stays completed.
const canPrescribe = (v: VisitRef) => v.status === 'confirmed' || v.status === 'visited' || v.status === 'completed'

/** Button sizes: height, side padding and text size together, so callers never stack competing utilities. */
export const SIZE = {
  sm: 'h-[34px] px-3 text-[12.5px]',
  md: 'h-[42px] px-4 text-[13.5px]',
  lg: 'h-12 px-4 text-[14px]',
}

const styles = {
  primary: 'rounded-[11px] bg-[#2A4DD0] text-white shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#2443B8]',
  outline: 'rounded-[11px] border-[1.5px] lg:border border-[#D6DDE8] bg-white text-[#27324A] hover:bg-[#F4F6FA]',
  blueOutline: 'rounded-[10px] border-[1.5px] border-[#2A4DD0] bg-white text-[#2A4DD0] hover:bg-[#EEF3FF]',
  white: 'rounded-[11px] bg-white text-[#2A4DD0] hover:bg-white/90',
  icon: 'w-[34px] h-[34px] rounded-[10px] text-[#2A4DD0] hover:bg-[#EEF3FF]',
}
export type Kind = keyof typeof styles

function Button({
  kind,
  onClick,
  pending,
  title,
  children,
  className = '',
  size = SIZE.md,
}: {
  kind: Kind
  onClick: () => void
  pending?: boolean
  title?: string
  children: ReactNode
  className?: string
  size?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={kind === 'icon' ? title : undefined}
      onClick={onClick}
      disabled={pending}
      className={`inline-flex items-center justify-center gap-1.5 font-extrabold whitespace-nowrap transition-all active:scale-[0.98] disabled:opacity-60 ${kind === 'icon' ? '' : size} ${styles[kind]} ${className}`}
    >
      {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

export function CheckInButton({ visit, kind = 'outline', label = 'Check in', className, size }: { visit: VisitRef; kind?: Kind; label?: string; className?: string; size?: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (!canCheckIn(visit)) return null
  return (
    <Button
      kind={kind}
      title={`Mark ${visit.patientName} as checked in`}
      pending={pending}
      className={className}
      size={size}
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

export function PrescriptionButton({
  visit,
  kind = 'outline',
  label = 'Write Rx',
  icon = true,
  className,
  size,
}: {
  visit: VisitRef
  kind?: Kind
  label?: ReactNode
  /** The pen icon before the label. */
  icon?: boolean
  className?: string
  size?: string
}) {
  const [open, setOpen] = useState(false)
  if (!canPrescribe(visit)) return null
  return (
    <>
      <Button kind={kind} title={`Write a prescription for ${visit.patientName}`} onClick={() => setOpen(true)} className={className} size={size}>
        {(icon || kind === 'icon') && <FilePenLine className="w-4 h-4" />}
        {kind !== 'icon' && label}
      </Button>
      {open && <PrescriptionWriter visit={visit} onClose={() => setOpen(false)} />}
    </>
  )
}

export function CallLink({ phone, name, kind = 'outline', size = SIZE.md, label = 'Call', className = '' }: { phone: string | null; name: string; kind?: Kind; size?: string; label?: string; className?: string }) {
  if (!phone) return null
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      title={`Call ${name}`}
      aria-label={`Call ${name}`}
      className={`inline-flex items-center justify-center gap-1.5 font-extrabold whitespace-nowrap transition-colors ${kind === 'icon' ? '' : size} ${styles[kind]} ${className}`}
    >
      <Phone className="w-4 h-4" />
      {kind !== 'icon' && label}
    </a>
  )
}

/** The one action that moves a visit forward: check the patient in, then start the consult (write the prescription). */
export function NextStepButton({ visit, kind = 'primary', className = '', size }: { visit: VisitRef; kind?: Kind; className?: string; size?: string }) {
  if (canCheckIn(visit)) return <CheckInButton visit={visit} kind={kind} label="Check in" className={className} size={size} />
  if (visit.status === 'visited') return <PrescriptionButton visit={visit} kind={kind} label="Start consult" icon={false} className={className} size={size} />
  return null
}

/** A visit offered in the Write Rx list; `when` is its time, already formatted. */
export type PickVisit = VisitRef & { when: string }

const PICK_STATUS: Record<string, { label: string; color: string }> = {
  visited: { label: 'Checked in', color: '#067647' },
  confirmed: { label: 'Booked', color: '#2A4DD0' },
  completed: { label: 'Completed', color: '#5B667A' },
}

/**
 * Write Rx that is always there: it opens straight onto the patient in front of the doctor (`current`), otherwise it
 * lists recent visits to choose from.
 */
export function WritePrescriptionButton({
  current,
  recent,
  label = 'Write Rx',
  kind = 'outline',
  className,
  size,
}: {
  current: VisitRef | null
  recent: PickVisit[]
  label?: ReactNode
  kind?: Kind
  className?: string
  size?: string
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
        size={size}
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
      {visit && <PrescriptionWriter visit={visit} onClose={() => setVisit(null)} />}
    </>
  )
}

function VisitPicker({ visits, onPick, onClose }: { visits: PickVisit[]; onPick: (v: VisitRef) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Choose a visit">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#0B1B3F]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[85dvh] bg-white text-[#0B1B3F] rounded-t-[22px] sm:rounded-[20px] shadow-2xl p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[18px] font-extrabold tracking-[-0.01em]">Write a prescription</h3>
            <p className="mt-0.5 text-[13px] text-[#5B667A]">Choose the visit it belongs to. The patient sees it in their account.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-[#F4F6FA] hover:bg-[#EEF2F7] flex items-center justify-center shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        {visits.length ? (
          <ul className="flex flex-col overflow-y-auto -mx-1 px-1">
            {visits.map((v) => {
              const status = PICK_STATUS[v.status] ?? PICK_STATUS.confirmed
              return (
                <li key={v.id} className="border-t border-[#EEF2F7] first:border-t-0">
                  <button type="button" onClick={() => onPick(v)} className="w-full flex items-center gap-3 py-3 px-1 rounded-xl hover:bg-[#F7F9FC] text-left transition-colors">
                    <span className="w-10 h-10 rounded-full bg-white text-[#2A4DD0] shadow-[inset_0_0_0_1.5px_#D6DDE8] flex items-center justify-center text-[13px] font-extrabold shrink-0">{initials(v.patientName)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-extrabold truncate">{v.patientName}</span>
                      <span className="block text-[12px] text-[#5B667A]">{v.when}</span>
                    </span>
                    <span className="text-[12px] font-extrabold shrink-0" style={{ color: status.color }}>
                      {status.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="p-4 rounded-xl bg-[#F4F6FA] text-[13px] text-[#5B667A]">
            No paid visits in the last 30 days. Add the patient with New consult first, then write their prescription.
          </p>
        )}
      </div>
    </div>
  )
}
