'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, FileUp, LoaderCircle, Phone, UserCheck, X } from 'lucide-react'
import { checkInLabBooking, uploadLabReport } from '@/app/actions/diagnostic-center'

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
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  if (!canUpload(booking)) return null
  const label = hasReport ? 'Replace Report' : 'Upload Report'

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const file = form.get('report') as File | null
    if (!file || file.size === 0) return setError('Choose the report file to upload.')
    if (file.size > 5 * 1024 * 1024) return setError('The report must be under 5 MB.')
    start(async () => {
      const res = await uploadLabReport(form)
      if (!res.success) return setError(res.error)
      setOpen(false)
      setError(null)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        title={`${label} for ${booking.patientName}`}
        aria-label={kind === 'icon' ? `${label} for ${booking.patientName}` : undefined}
        onClick={() => setOpen(true)}
        className={buttonClass(kind, className)}
      >
        <FileUp className="w-4 h-4" />
        {kind !== 'icon' && (children ?? label)}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={label}>
          <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form onSubmit={submit} className="relative w-full sm:max-w-lg bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <input type="hidden" name="bookingId" value={booking.id} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">{label}</h3>
                <p className="text-sm text-indigo-gray-600 truncate">
                  {booking.patientName} • ID {booking.code}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low text-sm text-indigo-gray-900">
              <span className="block font-label-sm text-label-sm text-indigo-gray-600 mb-0.5">Tests</span>
              {booking.testLabel}
            </div>

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
              The patient can open the report from their Consult Your Doctor account as soon as it’s uploaded.
              {hasReport ? ' Uploading again replaces the current file.' : ''}
            </p>

            {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-full text-sm font-semibold text-indigo-gray-600 hover:bg-surface-container">
                Cancel
              </button>
              <button type="submit" disabled={pending} className="px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                Upload &amp; Send to Patient
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

/** The one thing to do next for a booking: check in, upload the report, or open the sent report. */
export function NextStep({ booking, reportUrl, kind = 'blue' }: { booking: BookingRef; reportUrl?: string | null; kind?: Kind }) {
  if (booking.status === 'confirmed') return <CheckInButton booking={booking} kind={kind === 'icon' || kind === 'light' ? kind : 'teal'} />
  if (booking.status === 'visited' || booking.status === 'completed') return <UploadReportButton booking={booking} kind={kind} />
  if (booking.status === 'report_sent') {
    return reportUrl ? <ReportLink href={reportUrl} kind={kind === 'icon' || kind === 'light' ? kind : 'soft'} /> : <UploadReportButton booking={booking} kind={kind} />
  }
  return null
}
