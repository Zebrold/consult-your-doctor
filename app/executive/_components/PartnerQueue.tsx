'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FlaskConical, IdCard, Loader2, Mail, Phone, UserRound, X } from 'lucide-react'
import { rejectPartnerApplication } from '@/app/actions/partnerSignup'
import { PARTNER_NOUN, partnerDetailRows, type PartnerApplication } from '@/lib/partner-applications'
import { AddDiagnosticCenterButton, AddHospitalButton } from './NetworkForms'
import { Chip, EmptyState } from './ui'

// Hospitals and diagnostic centres that applied from /signup/hospital or /signup/diagnostic-centre. Approving opens
// the usual "add" dialog filled in from the application; the executive sets the staff sign-in there.

const CHECK_HINT = {
  hospital: 'Check the registration with the issuing authority, and any accreditation, before approving.',
  diagnostic_center: 'Check the registration, the NABL scope and the registration of the professional who signs reports (CYD-CLN-04).',
}

export function PartnerQueue({ applications, submittedLabels }: { applications: PartnerApplication[]; submittedLabels: Record<string, string> }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<{ id: string; message: string } | null>(null)

  const reject = (app: PartnerApplication) => {
    if (!window.confirm(`Decline the application from ${app.organizationName}? This cannot be undone.`)) return
    setBusyId(app.id)
    setError(null)
    start(async () => {
      const res = await rejectPartnerApplication(app.id)
      setBusyId(null)
      if (res.success) router.refresh()
      else setError({ id: app.id, message: res.error })
    })
  }

  if (applications.length === 0) {
    return <EmptyState icon={Building2}>No applications are waiting for review.</EmptyState>
  }

  return (
    <div className="flex flex-col gap-4">
      {applications.map((app) => {
        const Icon = app.kind === 'hospital' ? Building2 : FlaskConical
        const rows = partnerDetailRows(app)
        const prefill = { id: app.id, name: app.organizationName, city: app.city, address: app.address, email: app.email, contactName: app.contactName }
        return (
          <article key={app.id} className="p-5 md:p-6 rounded-xl bg-surface-container-low/60 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <span className="w-12 h-12 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm shrink-0">
                  <Icon className="w-6 h-6" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-title-md text-title-md text-on-surface font-bold leading-snug break-words">{app.organizationName}</h3>
                  <p className="text-sm text-indigo-gray-600 mt-0.5">
                    {app.city}
                    {app.details.facilityType ? ` · ${app.details.facilityType}` : ''}
                    {app.details.accreditation && app.details.accreditation !== 'None yet' ? ` · ${app.details.accreditation}` : ''}
                    {app.details.nablNumber ? ' · NABL accredited' : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end shrink-0">
                <Chip tone="neutral">Pending review</Chip>
                <span className="text-indigo-gray-600 font-label-sm text-[11px] mt-1">Applied {submittedLabels[app.id]}</span>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 p-4 rounded-lg bg-surface-container-lowest text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="font-label-sm text-[11px] uppercase tracking-wider text-indigo-gray-600">{label}</dt>
                  <dd className="text-indigo-gray-900 break-words">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-lowest font-label-sm text-label-sm text-on-surface">
                <UserRound className="w-3.5 h-3.5 text-vibrant-blue" /> {app.contactName}{app.contactRole ? `, ${app.contactRole}` : ''}
              </span>
              <a href={`mailto:${app.email}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-lowest font-label-sm text-label-sm text-on-surface hover:text-vibrant-blue">
                <Mail className="w-3.5 h-3.5 text-vibrant-blue" /> {app.email}
              </a>
              <a href={`tel:${app.phone}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-lowest font-label-sm text-label-sm text-on-surface hover:text-vibrant-blue">
                <Phone className="w-3.5 h-3.5 text-vibrant-blue" /> {app.phone}
              </a>
            </div>

            {error?.id === app.id && (
              <p role="alert" className="p-3 rounded-lg bg-error-container/60 text-on-error-container text-sm font-semibold">{error.message}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-start gap-2 text-indigo-gray-600 font-label-sm text-label-sm max-w-xl">
                <IdCard className="w-4 h-4 text-fresh-teal shrink-0 mt-0.5" />
                {CHECK_HINT[app.kind]}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => reject(app)}
                  aria-label={`Decline the ${PARTNER_NOUN[app.kind]} application from ${app.organizationName}`}
                  className="h-9 px-4 rounded-full bg-soft-coral/10 text-soft-coral hover:bg-soft-coral/20 font-label-sm text-label-sm transition-all flex items-center gap-1 disabled:opacity-60"
                >
                  {busyId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Decline
                </button>
                {app.kind === 'hospital' ? <AddHospitalButton fromApplication={prefill} /> : <AddDiagnosticCenterButton fromApplication={prefill} />}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
