'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, FileText, FileUp, LoaderCircle, Phone, Plus, Trash2, UserCheck, X } from 'lucide-react'
import { checkInLabBooking, uploadLabReport } from '@/app/actions/diagnostic-center'
import { createLabReport, labPaymentInfo, recordLabPayment, type ResultRow } from '@/app/actions/lab-desk'
import { DeskDialog, PaymentPanel } from '@/components/portal/desk'
import type { DeskPayment } from '@/components/portal/desk-types'

/** What the action buttons need to know about a booking (plain data, so server pages can pass it). */
export type BookingRef = { id: string; code: string; status: string; patientName: string; phone: string | null; testLabel: string }

const styles = {
  teal: 'bg-fresh-teal hover:bg-secondary text-on-secondary shadow-[0_4px_14px_rgba(20,184,166,0.3)]',
  blue: 'bg-vibrant-blue hover:bg-primary text-on-primary shadow-sm',
  coral: 'bg-soft-coral hover:bg-tertiary-container text-on-tertiary shadow-sm',
  soft: 'bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900',
  icon: 'p-2 hover:bg-surface-container text-vibrant-blue',
  light: 'bg-surface-container-lowest hover:bg-surface-container-low text-primary shadow-md',
}
type Kind = keyof typeof styles

const buttonClass = (kind: Kind, className = '') =>
  `inline-flex items-center justify-center gap-1.5 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all active:scale-95 disabled:opacity-60 ${
    kind === 'icon' ? '' : 'px-3.5 py-2'
  } ${styles[kind]} ${className}`

export const canCheckIn = (b: { status: string }) => b.status === 'confirmed'
export const canUpload = (b: { status: string }) => ['confirmed', 'visited', 'completed', 'report_sent'].includes(b.status)

export function CheckInButton({ booking, kind = 'soft', className }: { booking: BookingRef; kind?: Kind; className?: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  if (!canCheckIn(booking)) return null
  return (
    <button
      type="button"
      title={`Check in ${booking.patientName} (sample collected)`}
      aria-label={kind === 'icon' ? `Check in ${booking.patientName}` : undefined}
      disabled={pending}
      className={buttonClass(kind, className)}
      onClick={() =>
        start(async () => {
          const res = await checkInLabBooking(booking.id)
          if (!res.success) alert(res.error)
          router.refresh()
        })
      }
    >
      {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
      {kind !== 'icon' && 'Check In'}
    </button>
  )
}

export function ReportLink({ href, kind = 'soft', className }: { href: string | null | undefined; kind?: Kind; className?: string }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noreferrer" title="Open the uploaded report" aria-label={kind === 'icon' ? 'Open report' : undefined} className={buttonClass(kind, className)}>
      <FileText className="w-4 h-4" />
      {kind !== 'icon' && 'View Report'}
    </a>
  )
}

export function CallLink({ phone, name, kind = 'soft', className }: { phone: string | null; name: string; kind?: Kind; className?: string }) {
  if (!phone) return null
  return (
    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} title={`Call ${name}`} aria-label={`Call ${name}`} className={buttonClass(kind, className)}>
      <Phone className="w-4 h-4" />
      {kind !== 'icon' && 'Call'}
    </a>
  )
}

export function UploadReportButton({
  booking,
  hasReport,
  kind = 'blue',
  className,
  children,
}: {
  booking: BookingRef
  hasReport?: boolean
  kind?: Kind
  className?: string
  children?: ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'upload'>('create')
  const [rows, setRows] = useState<ResultRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  if (!canUpload(booking)) return null
  const label = hasReport ? 'Replace Report' : 'Add Report'

  const openDialog = () => {
    // One row per booked test to start with; tests with several parameters (CBC, lipid profile) get more rows.
    setRows(booking.testLabel.split(',').map((t) => ({ test: t.trim(), value: '', unit: '', range: '', flag: '' })).filter((r) => r.test))
    setMode('create')
    setError(null)
    setOpen(true)
  }
  const close = () => setOpen(false)
  const update = (i: number, patch: Partial<ResultRow>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const upload = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const file = form.get('report') as File | null
    if (!file || file.size === 0) return setError('Choose the report file to upload.')
    if (file.size > 5 * 1024 * 1024) return setError('The report must be under 5 MB.')
    start(async () => {
      const res = await uploadLabReport(form)
      if (!res.success) return setError(res.error)
      close()
      router.refresh()
    })
  }

  const create = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    start(async () => {
      const res = await createLabReport({
        bookingId: booking.id,
        rows,
        remarks: String(form.get('remarks') || ''),
        authorisedBy: String(form.get('authorisedBy') || ''),
        referredBy: String(form.get('referredBy') || ''),
        sample: String(form.get('sample') || ''),
      })
      if (!res.ok) return setError(res.error)
      close()
      router.refresh()
    })
  }

  const cell = 'w-full rounded-lg bg-surface-container-low px-2.5 py-2 text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30'

  return (
    <>
      <button
        type="button"
        title={`${label} for ${booking.patientName}`}
        aria-label={kind === 'icon' ? `${label} for ${booking.patientName}` : undefined}
        onClick={openDialog}
        className={buttonClass(kind, className)}
      >
        <FileUp className="w-4 h-4" />
        {kind !== 'icon' && (children ?? label)}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={label}>
          <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full sm:max-w-3xl max-h-[94vh] overflow-y-auto bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">{label}</h3>
                <p className="text-sm text-indigo-gray-600 truncate">
                  {booking.patientName} • ID {booking.code} • {booking.testLabel}
                </p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-surface-container-low" role="tablist">
              {([
                ['create', 'Create PDF report'],
                ['upload', 'Upload a file'],
              ] as const).map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={mode === key}
                  onClick={() => {
                    setMode(key)
                    setError(null)
                  }}
                  className={`py-2 rounded-full text-[13px] font-bold transition-colors ${mode === key ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'text-indigo-gray-600 hover:text-indigo-gray-900'}`}
                >
                  {text}
                </button>
              ))}
            </div>

            {mode === 'create' ? (
              <form onSubmit={create} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-label-sm text-[11px] text-indigo-gray-600 font-semibold uppercase tracking-wider">Referred by (optional)</span>
                    <input name="referredBy" maxLength={80} placeholder="Dr. A. Rao or Self" className={cell} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-label-sm text-[11px] text-indigo-gray-600 font-semibold uppercase tracking-wider">Sample</span>
                    <select name="sample" defaultValue="Blood" className={cell}>
                      {['Blood', 'Serum', 'Plasma', 'Urine', 'Stool', 'Swab', 'Sputum', 'Imaging', 'Other'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1.4fr_0.9fr_auto] gap-2 px-1 text-[11px] font-semibold text-indigo-gray-600 uppercase tracking-wider">
                  <span>Test / parameter</span>
                  <span>Result</span>
                  <span>Unit</span>
                  <span>Reference range</span>
                  <span>Flag</span>
                  <span className="w-8" />
                </div>
                <ul className="flex flex-col gap-2">
                  {rows.map((r, i) => (
                    <li key={i} className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1.4fr_0.9fr_auto] gap-2 p-2 sm:p-0 rounded-xl bg-surface-container-low/50 sm:bg-transparent">
                      <input value={r.test} onChange={(e) => update(i, { test: e.target.value })} placeholder="Haemoglobin" aria-label="Test or parameter" className={`${cell} col-span-2 sm:col-span-1 font-semibold`} />
                      <input value={r.value} onChange={(e) => update(i, { value: e.target.value })} placeholder="13.4" aria-label="Result" className={cell} />
                      <input value={r.unit} onChange={(e) => update(i, { unit: e.target.value })} placeholder="g/dL" aria-label="Unit" className={cell} />
                      <input value={r.range} onChange={(e) => update(i, { range: e.target.value })} placeholder="12.0 – 15.5" aria-label="Reference range" className={cell} />
                      <select value={r.flag} onChange={(e) => update(i, { flag: e.target.value })} aria-label="Flag" className={cell}>
                        <option value="">Normal</option>
                        <option>Low</option>
                        <option>High</option>
                        <option>Abnormal</option>
                        <option>Critical</option>
                      </select>
                      <button type="button" onClick={() => setRows((list) => list.filter((_, j) => j !== i))} aria-label="Remove row" className="w-8 h-8 self-center rounded-full hover:bg-surface-container flex items-center justify-center text-indigo-gray-600 justify-self-end">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => setRows((list) => [...list, { test: '', value: '', unit: '', range: '', flag: '' }])} className="self-start inline-flex items-center gap-1.5 text-[13px] font-bold text-vibrant-blue">
                  <Plus className="w-4 h-4" /> Add a result
                </button>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600">Remarks (optional)</span>
                  <textarea name="remarks" rows={2} placeholder="Interpretation or notes for the doctor" className={`${cell} text-sm resize-none`} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600">Authorised by</span>
                  <input name="authorisedBy" required minLength={2} placeholder="Dr. R. Kapoor, Pathologist" className={`${cell} text-sm`} />
                </label>
                <p className="text-xs text-indigo-gray-600">
                  A PDF report is created, saved to the patient’s account and sent to them on WhatsApp and by email.{hasReport ? ' It replaces the current report.' : ''}
                </p>
                {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={close} className="px-5 py-2.5 rounded-full text-sm font-semibold text-indigo-gray-600 hover:bg-surface-container">
                    Cancel
                  </button>
                  <button type="submit" disabled={pending} className="px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                    {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Create PDF &amp; Send
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={upload} className="flex flex-col gap-4">
                <input type="hidden" name="bookingId" value={booking.id} />
                <label className="flex flex-col gap-1.5">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600">Report file (PDF, JPG, PNG or WebP, up to 5 MB)</span>
                  <input
                    name="report"
                    type="file"
                    required
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="block w-full text-sm text-indigo-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-surface-container-high file:text-primary"
                  />
                </label>
                <p className="text-xs text-indigo-gray-600">
                  The report is saved to the patient’s account and sent to them on WhatsApp and by email.
                  {hasReport ? ' Uploading again replaces the current file.' : ''}
                </p>
                {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={close} className="px-5 py-2.5 rounded-full text-sm font-semibold text-indigo-gray-600 hover:bg-surface-container">
                    Cancel
                  </button>
                  <button type="submit" disabled={pending} className="px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                    {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                    Upload &amp; Send to Patient
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/** Takes payment for an unpaid booking (one the desk made, after the patient confirmed their code). */
export function TakeLabPaymentButton({ booking, kind = 'blue', className }: { booking: BookingRef; kind?: Kind; className?: string }) {
  const router = useRouter()
  const [payment, setPayment] = useState<DeskPayment | null>(null)
  const [pending, start] = useTransition()
  if (booking.status !== 'pending_payment') return null

  const open = () =>
    start(async () => {
      const res = await labPaymentInfo(booking.id)
      if (!res.ok) return alert(res.error)
      setPayment(res.payment)
    })

  return (
    <>
      <button type="button" onClick={open} disabled={pending} title={`Take payment from ${booking.patientName}`} aria-label={kind === 'icon' ? `Take payment from ${booking.patientName}` : undefined} className={buttonClass(kind, className)}>
        {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {kind !== 'icon' && 'Take Payment'}
      </button>
      {payment && (
        <DeskDialog title="Take payment" subtitle="PayU, the UPI scanner or cash." onClose={() => setPayment(null)}>
          <PaymentPanel
            payment={payment}
            onRecord={(method, reference) => recordLabPayment({ bookingId: booking.id, method, reference })}
            onPaid={() => {
              setPayment(null)
              router.refresh()
            }}
          />
        </DeskDialog>
      )}
    </>
  )
}

/** The one thing to do next for a booking: take payment, check in, add the report, or open the sent report. */
export function NextStep({ booking, reportUrl, kind = 'blue' }: { booking: BookingRef; reportUrl?: string | null; kind?: Kind }) {
  if (booking.status === 'pending_payment') return <TakeLabPaymentButton booking={booking} kind={kind === 'icon' || kind === 'light' ? kind : 'coral'} />
  if (booking.status === 'confirmed') return <CheckInButton booking={booking} kind={kind === 'icon' || kind === 'light' ? kind : 'teal'} />
  if (booking.status === 'visited' || booking.status === 'completed') return <UploadReportButton booking={booking} kind={kind} />
  if (booking.status === 'report_sent') {
    return reportUrl ? <ReportLink href={reportUrl} kind={kind === 'icon' || kind === 'light' ? kind : 'soft'} /> : <UploadReportButton booking={booking} kind={kind} />
  }
  return null
}
