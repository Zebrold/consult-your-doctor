'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Check, Copy, Loader2, Mail, Phone } from 'lucide-react'
import { approveDoctor, rejectDoctor } from '@/app/actions/doctorAuth'
import { doctorDetailRows } from '@/lib/doctor-applications'
import type { Application } from '../_lib/ops'
import { DocumentLinks } from './DocumentLinks'
import { EmptyState, Initials, btnOutline, btnPrimary, btnSmall } from './ui'

type Credentials = { name: string; staffId: string; email: string; password: string; activationLink?: string | null }

export function CredentialQueue({ applications, submittedLabels }: { applications: Application[]; submittedLabels: Record<string, string> }) {
  const router = useRouter()
  const [busy, setBusy] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
  const [error, setError] = useState<{ id: string; message: string } | null>(null)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const approve = async (app: Application) => {
    setBusy({ id: app.id, action: 'approve' })
    setError(null)
    const res = await approveDoctor(app.id)
    setBusy(null)
    if (res.success && res.credentials) {
      setCredentials({ name: app.name, ...res.credentials })
    } else {
      setError({ id: app.id, message: ('error' in res && res.error) || 'Approval failed' })
    }
  }

  const reject = async (app: Application) => {
    if (!window.confirm(`Reject the application from ${app.name}? This cannot be undone.`)) return
    setBusy({ id: app.id, action: 'reject' })
    setError(null)
    const res = await rejectDoctor(app.id)
    setBusy(null)
    if (res.success) router.refresh()
    else setError({ id: app.id, message: ('error' in res && res.error) || 'Rejection failed' })
  }

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  const closeCredentials = () => {
    setCredentials(null)
    router.refresh()
  }

  if (applications.length === 0) {
    return <EmptyState icon={BadgeCheck}>No doctor applications are waiting for review.</EmptyState>
  }

  return (
    <>
      <ul>
        {applications.map((app) => {
          const d = app.details
          const rows = doctorDetailRows(app.extra)
          const line = [[app.specialty, d.subSpecialty].filter(Boolean).join(' · ') || 'Specialty not given', d.qualification, d.experience ? `${d.experience} yrs` : null].filter(Boolean).join(' · ')
          return (
            <li key={app.id} className="py-4 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
              <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-5">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Initials name={app.name} className="w-10 h-10 text-[13px]" />
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-extrabold break-words">{app.name}</p>
                    <p className="text-[12.5px] text-[#5B667A]">{line}</p>
                    <p className="text-[12.5px] text-[#5B667A]">
                      {[d.registration ? `Reg. ${d.registration}` : 'No registration number', d.council, app.hospitalName ? `chose ${app.hospitalName}` : 'no hospital chosen', d.fee ? `fee ₹${d.fee}` : null]
                        .filter(Boolean)
                        .join(' · ')}{' '}
                      · applied {submittedLabels[app.id]}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <a href={`mailto:${app.email}`} className={btnSmall}>
                        <Mail className="w-3.5 h-3.5" /> {app.email}
                      </a>
                      {app.phone && (
                        <a href={`tel:${app.phone}`} className={btnSmall}>
                          <Phone className="w-3.5 h-3.5" /> {app.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 lg:shrink-0">
                  <button type="button" disabled={busy !== null} onClick={() => reject(app)} className={`${btnOutline} !text-[#B42318]`}>
                    {busy?.id === app.id && busy.action === 'reject' && <Loader2 className="w-4 h-4 animate-spin" />}
                    Reject
                  </button>
                  <button type="button" disabled={busy !== null} onClick={() => approve(app)} className={btnPrimary}>
                    {busy?.id === app.id && busy.action === 'approve' && <Loader2 className="w-4 h-4 animate-spin" />}
                    Approve
                  </button>
                </div>
              </div>

              {rows.length > 0 && (
                <details className="mt-3 lg:ml-[52px] group">
                  <summary className="cursor-pointer text-[13px] font-extrabold text-[#2A4DD0] list-none [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">Show everything they sent ›</span>
                    <span className="hidden group-open:inline">Hide the details</span>
                  </summary>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-[18px] gap-y-3 mt-2.5 px-4 py-3.5 rounded-xl bg-[#F7F9FC] text-[13.5px]">
                    {rows.map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">{label}</dt>
                        <dd className="mt-[3px] font-bold break-words whitespace-pre-line">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
              <div className="lg:ml-[52px]">
                <DocumentLinks links={app.documentLinks} />
              </div>

              {error?.id === app.id && (
                <p role="alert" className="mt-3 lg:ml-[52px] text-[13px] font-bold text-[#B42318]">
                  {error.message}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      {credentials && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-[#0B1B3F]/55 backdrop-blur-[2px]" />
          <div role="dialog" aria-modal="true" aria-labelledby="credentials-title" className="relative bg-white w-full sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[22px] sm:rounded-2xl p-5 lg:p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-[#ECFDF3] text-[#067647] flex items-center justify-center">
                <BadgeCheck className="w-6 h-6" />
              </span>
              <div>
                <h3 id="credentials-title" className="text-[17px] font-extrabold">
                  {credentials.name} approved
                </h3>
                <p className="text-[12.5px] text-[#5B667A]">They sign in to the doctor workspace with these details.</p>
              </div>
            </div>
            <dl className="flex flex-col gap-2">
              {(
                [
                  ['Staff ID', credentials.staffId],
                  ['Email', credentials.email],
                  ['Password', credentials.password],
                  ...(credentials.activationLink ? [['Activation link', credentials.activationLink] as const] : []),
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0]">
                  <div className="min-w-0">
                    <dt className="text-[11.5px] font-extrabold uppercase tracking-[0.04em] text-[#5B667A]">{label}</dt>
                    <dd className="font-mono text-[13.5px] truncate">{value}</dd>
                  </div>
                  <button type="button" onClick={() => copy(label, value)} className="shrink-0 w-9 h-9 rounded-full hover:bg-[#EEF2F8] flex items-center justify-center text-[#5B667A]" aria-label={`Copy ${label}`}>
                    {copied === label ? <Check className="w-4 h-4 text-[#067647]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </dl>
            <p className="text-[12.5px] font-bold text-[#B42318]">This password is shown only once. Share it with the doctor privately before closing.</p>
            <button type="button" onClick={closeCredentials} className={btnPrimary}>
              I’ve shared the details
            </button>
          </div>
        </div>
      )}
    </>
  )
}
