'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Loader2, Mail, Phone } from 'lucide-react'
import { rejectPartnerApplication } from '@/app/actions/partnerSignup'
import { PARTNER_NOUN, partnerDetailRows, type PartnerApplication } from '@/lib/partner-applications'
import { AddDiagnosticCenterButton, AddHospitalButton } from './NetworkForms'
import { DocumentChecklist } from './DocumentLinks'
import { EmptyState, Note, Status, btnOutline, btnSmall } from './ui'

// Hospitals and diagnostic centres that applied from /signup/hospital or /signup/diagnostic-centre (and branches asked
// for from a hospital's Accounts & branches page), after DeskExeHospitals: the waiting list on the left, the one being
// reviewed on the right. Approving opens the usual "add" dialog filled in from the application; the executive sets the
// staff sign-in there.

const CHECK_HINT = {
  hospital: 'Check the registration with the issuing authority, and any accreditation, before approving.',
  diagnostic_center: 'Check the registration, the NABL scope and the registration of the professional who signs reports (CYD-CLN-04).',
}

export function PartnerQueue({ applications, submittedLabels }: { applications: PartnerApplication[]; submittedLabels: Record<string, string> }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(applications[0]?.id ?? null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<{ id: string; message: string } | null>(null)

  if (applications.length === 0) {
    return <EmptyState icon={Building2}>No applications are waiting for review.</EmptyState>
  }
  const app = applications.find((a) => a.id === selectedId) ?? applications[0]

  const reject = () => {
    if (!window.confirm(`Decline the application from ${app.organizationName}? This cannot be undone.`)) return
    setError(null)
    start(async () => {
      const res = await rejectPartnerApplication(app.id)
      if (res.success) router.refresh()
      else setError({ id: app.id, message: res.error })
    })
  }

  const docs = app.documentLinks ?? []
  const allChecked = docs.every((d) => checked[`${app.id}:${d.key}`])
  const rows = partnerDetailRows(app)
  const prefill = { id: app.id, name: app.organizationName, city: app.city, address: app.address, email: app.email, contactName: app.contactName }
  const via = (a: PartnerApplication) => (a.details.branchOf ? `Branch of ${a.details.branchOf.hospitalName}` : 'Applied online')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] gap-3.5 lg:gap-5 items-start">
      <ul className="flex flex-col gap-2">
        {applications.map((a) => {
          const on = a.id === app.id
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setSelectedId(a.id)}
                aria-pressed={on}
                className={`block w-full text-left px-3.5 py-3 rounded-xl ${on ? 'border-[1.5px] border-[#2A4DD0] bg-[#F5F8FF]' : 'border border-[#E6EAF0] bg-white hover:bg-[#F9FAFC]'}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-[14px] font-extrabold truncate">{a.organizationName}</span>
                    <span className="block text-[12px] text-[#5B667A] truncate">
                      {[a.kind === 'hospital' ? 'Hospital' : 'Diagnostic centre', a.city].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11.5px] text-[#5B667A]">{submittedLabels[a.id]}</span>
                </span>
                <span className="flex items-center justify-between gap-2 mt-2 text-[12px] font-extrabold">
                  <span className="text-[#5B667A] truncate">{via(a)}</span>
                  <Status label="To review" color="#B54708" className="!text-[12px]" />
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <article className="rounded-[14px] shadow-[inset_0_0_0_1px_#E6EAF0] p-4 lg:p-5 min-w-0">
        <span className="block text-[12px] font-extrabold text-[#5B667A]">
          Review application · {via(app)} · applied {submittedLabels[app.id]}
        </span>
        <h3 className="mt-1 text-[19px] font-extrabold tracking-[-0.01em] break-words">{app.organizationName}</h3>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-[18px] gap-y-3 mt-3.5 px-4 py-3.5 rounded-xl bg-[#F7F9FC] text-[13.5px]">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">{label}</dt>
              <dd className="mt-[3px] font-bold break-words whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap gap-2 mt-3">
          <a href={`mailto:${app.email}`} className={btnSmall}>
            <Mail className="w-3.5 h-3.5" /> {app.email}
          </a>
          <a href={`tel:${app.phone}`} className={btnSmall}>
            <Phone className="w-3.5 h-3.5" /> {app.contactName}
            {app.contactRole ? `, ${app.contactRole}` : ''} · {app.phone}
          </a>
        </div>

        {docs.length > 0 && (
          <DocumentChecklist
            links={docs}
            checked={(key) => !!checked[`${app.id}:${key}`]}
            onToggle={(key) => setChecked((c) => ({ ...c, [`${app.id}:${key}`]: !c[`${app.id}:${key}`] }))}
          />
        )}

        <div className="mt-4">
          <Note>{CHECK_HINT[app.kind]}</Note>
        </div>

        {error?.id === app.id && (
          <p role="alert" className="mt-3 text-[13px] font-bold text-[#B42318]">
            {error.message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2.5 mt-4">
          <button type="button" disabled={pending} onClick={reject} aria-label={`Decline the ${PARTNER_NOUN[app.kind]} application from ${app.organizationName}`} className={`${btnOutline} !text-[#B42318]`}>
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            Reject
          </button>
          {allChecked ? (
            app.kind === 'hospital' ? (
              <AddHospitalButton fromApplication={prefill} />
            ) : (
              <AddDiagnosticCenterButton fromApplication={prefill} />
            )
          ) : (
            <span className="text-[12.5px] font-bold text-[#5B667A]">Tick every document to approve.</span>
          )}
        </div>
      </article>
    </div>
  )
}
