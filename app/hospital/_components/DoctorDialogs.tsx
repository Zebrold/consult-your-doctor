'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, LoaderCircle, Pencil, Plus, X } from 'lucide-react'
import { createHospitalDoctor, updateHospitalDoctor } from '@/app/actions/hospital'
import { WelcomeLetterButton } from '@/components/portal/WelcomeLetterButton'

const input =
  'w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 text-[15px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30'

function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="font-label-sm text-label-sm text-indigo-gray-600">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-indigo-gray-600">{hint}</span>}
    </label>
  )
}

function Dialog({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">{title}</h3>
            <p className="text-sm text-indigo-gray-600">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const actions = (pending: boolean, label: string, onCancel: () => void) => (
  <div className="flex justify-end gap-2">
    <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-full text-sm font-semibold text-indigo-gray-600 hover:bg-surface-container">
      Cancel
    </button>
    <button type="submit" disabled={pending} className="px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-60">
      {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
      {label}
    </button>
  </div>
)

/** Registers a new doctor at this hospital with a staff login (ID generated, password set here). */
export function AddDoctorButton({ departments, className, label = 'Add Doctor' }: { departments: string[]; className: string; label?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<string | null>(null)
  const [activationLink, setActivationLink] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  // Kept only while the confirmation shows, so the welcome letter can print it.
  const [password, setPassword] = useState('')
  const [pending, start] = useTransition()

  const close = () => {
    setOpen(false)
    setError(null)
    setCreated(null)
    setActivationLink(null)
    setInviteEmail(null)
    setPassword('')
    setCopiedLink(false)
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const chosen = String(form.get('password') || '').trim()
    const email = String(form.get('email') || '').trim()
    if (!email && (!chosen || chosen.length < 8)) {
      return setError('Provide the doctor’s email for an account invitation, or set a password of at least 8 characters.')
    }
    start(async () => {
      const res = await createHospitalDoctor(form)
      if ('error' in res && res.error) return setError(res.error)
      setError(null)
      const r = res as { doctorId?: string; activationLink?: string | null; email?: string | null }
      setCreated(r.doctorId ?? '')
      setActivationLink(r.activationLink ?? null)
      setInviteEmail(r.email ?? null)
      setPassword(chosen)
      router.refresh()
    })
  }

  const copyLink = async () => {
    if (activationLink) {
      await navigator.clipboard.writeText(activationLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Plus className="w-[18px] h-[18px]" /> {label}
      </button>
      {open && (
        <Dialog title="Add Doctor" subtitle="Creates the doctor’s listing, staff ID and email invitation." onClose={close}>
          {created !== null ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-secondary-container/50 text-on-secondary-container flex items-start gap-3">
                <CircleCheck className="w-5 h-5 shrink-0 mt-0.5 text-fresh-teal" />
                <div className="text-sm">
                  <p className="font-bold">Doctor profile &amp; credentials created.</p>
                  <p>
                    Login ID: <span className="font-mono font-bold text-primary">{created}</span>
                  </p>
                  {inviteEmail && (
                    <p className="mt-1 text-xs text-on-secondary-variant">
                      An activation email has been dispatched to <span className="font-semibold">{inviteEmail}</span>.
                    </p>
                  )}
                </div>
              </div>

              {activationLink && (
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
                  <span className="font-label-sm text-[12px] font-bold text-indigo-gray-700">Personalized Activation Link:</span>
                  <div className="flex items-center gap-2">
                    <input readOnly value={activationLink} className="flex-1 text-xs bg-surface-container-lowest px-2.5 py-1.5 rounded-lg border border-outline-variant/30 font-mono text-outline truncate" />
                    <button type="button" onClick={copyLink} className="px-3 py-1.5 rounded-lg bg-vibrant-blue text-white text-xs font-bold hover:bg-primary transition-colors">
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                  <span className="text-[11px] text-indigo-gray-500">The clinician can click this link to verify their email and set their password.</span>
                </div>
              )}

              <p className="text-xs text-indigo-gray-600">Publish their consultation slots from the Roster so patients can book them.</p>
              {created && password && (
                <WelcomeLetterButton
                  username={created}
                  password={password}
                  className="w-full py-2.5 rounded-full bg-primary-fixed/60 hover:bg-primary-fixed text-primary text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                />
              )}
              <div className="flex justify-end">
                <button type="button" onClick={close} className="px-5 py-2.5 rounded-full bg-vibrant-blue text-on-primary text-sm font-bold">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Full name" className="sm:col-span-2">
                  <input name="fullName" required minLength={2} placeholder="Dr. Ananya Rao" className={input} />
                </Field>
                <Field label="Doctor's Email (Account Invitation)" hint="Sends secure activation link; doctor sets password." className="sm:col-span-2">
                  <input name="email" type="email" placeholder="doctor@example.com" className={input} />
                </Field>
                <Field label="Specialty / department">
                  <input name="specialty" required list="hospital-departments" placeholder="Cardiology" className={input} />
                  <datalist id="hospital-departments">
                    {departments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Years of experience">
                  <input name="experienceYears" type="number" min={0} max={70} defaultValue={0} className={input} />
                </Field>
                <Field label="Consultation fee (₹)" hint="Patients also pay a platform fee online.">
                  <input name="consultationFee" type="number" min={1} required className={input} />
                </Field>
                <Field label="Manual password (optional)" hint="If not setting by invitation link (min 8 chars).">
                  <input name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Leave empty for email invite" className={input} />
                </Field>
              </div>
              {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
              {actions(pending, 'Add Doctor & Send Invite', close)}
            </form>
          )}
        </Dialog>
      )}
    </>
  )
}

export type EditableDoctor = {
  id: string
  name: string
  phone: string | null
  specialty: string | null
  experience: number | null
  fee: number | null
  qualifications: string | null
  address: string | null
  bio: string | null
}

export function EditDoctorButton({ doctor, departments, className, iconOnly }: { doctor: EditableDoctor; departments: string[]; className: string; iconOnly?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    start(async () => {
      const res = await updateHospitalDoctor(form)
      if (!res.success) return setError(res.error)
      setOpen(false)
      setError(null)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} title={`Edit ${doctor.name}`} aria-label={iconOnly ? `Edit ${doctor.name}` : undefined}>
        <Pencil className="w-4 h-4" />
        {!iconOnly && 'Edit'}
      </button>
      {open && (
        <Dialog title={`Edit ${doctor.name}`} subtitle="Patients see these details when they book." onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <input type="hidden" name="doctorId" value={doctor.id} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Specialty / department">
                <input name="specialty" required list="hospital-departments-edit" defaultValue={doctor.specialty ?? ''} className={input} />
                <datalist id="hospital-departments-edit">
                  {departments.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </Field>
              <Field label="Mobile number">
                <input name="phone" type="tel" defaultValue={doctor.phone ?? ''} className={input} />
              </Field>
              <Field label="Years of experience">
                <input name="experience" type="number" min={0} max={70} required defaultValue={doctor.experience ?? 0} className={input} />
              </Field>
              <Field label="Consultation fee (₹)">
                <input name="fee" type="number" min={1} required defaultValue={doctor.fee ?? ''} className={input} />
              </Field>
              <Field label="Qualifications" className="sm:col-span-2">
                <input name="qualifications" defaultValue={doctor.qualifications ?? ''} placeholder="MBBS, MD" className={input} />
              </Field>
              <Field label="Clinic / room" className="sm:col-span-2">
                <input name="address" defaultValue={doctor.address ?? ''} placeholder="OPD Block B, Room 204" className={input} />
              </Field>
              <Field label="About" className="sm:col-span-2">
                <textarea name="bio" rows={3} defaultValue={doctor.bio ?? ''} className={input} />
              </Field>
            </div>
            {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
            {actions(pending, 'Save Changes', () => setOpen(false))}
          </form>
        </Dialog>
      )}
    </>
  )
}
