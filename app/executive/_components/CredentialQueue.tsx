'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Check, Copy, IdCard, Loader2, Mail, Phone, UserCheck, X } from 'lucide-react'
import { approveDoctor, rejectDoctor } from '@/app/actions/doctorAuth'
import type { Application } from '../_lib/ops'
import { Chip, EmptyState } from './ui'

type Credentials = { name: string; staffId: string; email: string; password: string }

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
      <div className="flex flex-col gap-4">
        {applications.map((app) => {
          const d = app.details
          return (
            <article key={app.id} className="p-5 md:p-6 rounded-xl bg-surface-container-low/60 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <span className="w-14 h-14 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center font-title-md text-lg font-bold shadow-sm shrink-0">
                    {app.name.replace(/^(Dr|Prof|Mr|Ms)\.?\s+/i, '').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-title-md text-title-md text-on-surface font-bold leading-snug">{app.name}</h3>
                      {d.council && <Chip tone="primary">{d.council}</Chip>}
                    </div>
                    <div className="text-indigo-gray-600 font-label-sm text-label-sm mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-vibrant-blue font-medium">{[app.specialty, d.subSpecialty].filter(Boolean).join(' • ') || 'Specialty not given'}</span>
                      {d.registration && (
                        <>
                          <span>•</span>
                          <span>Reg: <strong className="text-on-surface font-mono">{d.registration}</strong></span>
                        </>
                      )}
                      {d.experience && (
                        <>
                          <span>•</span>
                          <span>{d.experience} yrs experience</span>
                        </>
                      )}
                    </div>
                    <p className="text-on-surface-variant text-sm mt-1">
                      {d.qualification && <span className="font-semibold text-on-surface">{d.qualification}</span>}
                      {app.hospitalName && <> · {app.hospitalName}</>}
                      {d.fee && <> · Fee ₹{d.fee}</>}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-start sm:items-end shrink-0">
                  <Chip tone="neutral">Pending review</Chip>
                  <span className="text-indigo-gray-600 font-label-sm text-[11px] mt-1">Submitted {submittedLabels[app.id]}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-surface-container-lowest">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low font-label-sm text-label-sm text-on-surface">
                  <Mail className="w-3.5 h-3.5 text-vibrant-blue" /> {app.email}
                </span>
                {app.phone && (
                  <a href={`tel:${app.phone}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low font-label-sm text-label-sm text-on-surface hover:text-vibrant-blue">
                    <Phone className="w-3.5 h-3.5 text-vibrant-blue" /> {app.phone}
                  </a>
                )}
              </div>

              {error?.id === app.id && (
                <p role="alert" className="p-3 rounded-lg bg-error-container/60 text-on-error-container text-sm font-semibold">{error.message}</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-indigo-gray-600 font-label-sm text-label-sm">
                  <IdCard className="w-4 h-4 text-fresh-teal" />
                  Check the registration number with the council before approving.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => reject(app)}
                    className="px-4 py-1.5 rounded-full bg-soft-coral/10 text-soft-coral hover:bg-soft-coral/20 font-label-sm text-label-sm transition-all flex items-center gap-1 disabled:opacity-60"
                  >
                    {busy?.id === app.id && busy.action === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => approve(app)}
                    className="px-4 py-1.5 rounded-full bg-vibrant-blue text-on-primary hover:bg-primary shadow-md font-label-sm text-label-sm transition-all flex items-center gap-1 disabled:opacity-60"
                  >
                    {busy?.id === app.id && busy.action === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    Approve &amp; create account
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {credentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-indigo-gray-900/60 backdrop-blur-sm" />
          <div role="dialog" aria-modal="true" aria-labelledby="credentials-title" className="relative bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-fresh-teal/15 text-secondary flex items-center justify-center">
                <BadgeCheck className="w-6 h-6" />
              </span>
              <div>
                <h3 id="credentials-title" className="font-title-md text-title-md font-bold text-indigo-gray-900">{credentials.name} approved</h3>
                <p className="text-xs text-indigo-gray-600">The doctor signs in to the Clinician Portal with these details.</p>
              </div>
            </div>
            <dl className="flex flex-col gap-2">
              {([
                ['Staff ID', credentials.staffId],
                ['Email', credentials.email],
                ['Password', credentials.password],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-container-low">
                  <div className="min-w-0">
                    <dt className="font-label-sm text-[11px] text-indigo-gray-600 uppercase tracking-wider">{label}</dt>
                    <dd className="font-mono text-sm text-indigo-gray-900 truncate">{value}</dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(label, value)}
                    className="p-2 rounded-full hover:bg-surface-container text-indigo-gray-600 shrink-0"
                    aria-label={`Copy ${label}`}
                  >
                    {copied === label ? <Check className="w-4 h-4 text-fresh-teal" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </dl>
            <p className="text-xs text-soft-coral font-semibold">This password is shown only once. Share it with the doctor securely before closing.</p>
            <button
              type="button"
              onClick={closeCredentials}
              className="w-full py-3 rounded-full bg-vibrant-blue text-on-primary font-bold hover:bg-primary transition-all"
            >
              I&apos;ve shared the credentials
            </button>
          </div>
        </div>
      )}
    </>
  )
}
