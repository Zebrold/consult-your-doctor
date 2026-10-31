'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, UserPlus, X } from 'lucide-react'
import { addNewPatient, sendDoctorPatientOtp } from '@/app/actions/doctor'

const input =
  'w-full h-11 rounded-[11px] bg-white border-[1.5px] border-[#D6DDE8] px-3.5 text-[14px] text-[#0B1B3F] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#2A4DD0]'

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[12px] font-extrabold text-[#5B667A]">{label}</span>
      {children}
    </label>
  )
}

/** Registers a patient who is seeing the doctor now, with a visit starting immediately. */
export function WalkInButton({ className, label = 'Add walk-in patient', icon }: { className: string; label?: ReactNode; icon?: ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  // Whether a code has been texted to the patient for this walk-in.
  const [codeSent, setCodeSent] = useState(false)

  // Texts the patient a code. The patient is only added once the code is entered and checked (addNewPatient).
  const sendCode = (form: HTMLFormElement | null) => {
    if (!form) return
    const phone = String(new FormData(form).get('phone_number') || '')
    setError(null)
    start(async () => {
      const res = await sendDoctorPatientOtp(phone)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setCodeSent(true)
    })
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    if (!codeSent || !String(form.get('code') || '').trim()) {
      setError('Send the patient a code, then enter it here to add them.')
      return
    }
    start(async () => {
      const res = await addNewPatient(form)
      if (!res.success) {
        setError(res.error || 'Could not add the patient.')
        return
      }
      setOpen(false)
      setCodeSent(false)
      setError(null)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {icon ?? <UserPlus className="w-4 h-4" />}
        <span>{label}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Add walk-in patient">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-[#0B1B3F]/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form
            onSubmit={submit}
            className="relative w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto bg-white text-[#0B1B3F] rounded-t-[22px] sm:rounded-[20px] shadow-2xl p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 flex flex-col gap-4 font-(family-name:--font-manrope)"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[18px] font-extrabold tracking-[-0.01em]">New consult</h3>
                <p className="mt-0.5 text-[13px] text-[#5B667A]">Adds a walk-in patient&apos;s record and a visit with you starting now.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-9 h-9 rounded-full bg-[#F4F6FA] hover:bg-[#EEF2F7] flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name" className="sm:col-span-2">
                <input name="full_name" required className={input} autoComplete="off" />
              </Field>
              <Field label="Mobile number">
                <input name="phone_number" type="tel" required className={input} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Email (optional)">
                <input name="email" type="email" className={input} />
              </Field>
              <div className="sm:col-span-2 flex items-end gap-2">
                <Field label="Code from the patient" className="flex-1 min-w-0">
                  <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={input} placeholder="6-digit code" />
                </Field>
                <button
                  type="button"
                  disabled={pending}
                  onClick={(e) => sendCode((e.currentTarget as HTMLButtonElement).form)}
                  className="h-[42px] px-4 rounded-[11px] border-[1.5px] border-[#2A4DD0] text-[#2A4DD0] text-[13px] font-extrabold hover:bg-[#F4F6FA] disabled:opacity-60 shrink-0"
                >
                  {codeSent ? 'Resend code' : 'Send code'}
                </button>
              </div>
              <p className="sm:col-span-2 -mt-1 text-[12px] text-[#5B667A]">
                {codeSent
                  ? 'A code was texted to the patient. Ask them to read it out, then add the patient.'
                  : 'Send the patient a code first. Their record is only added once they confirm their number.'}
              </p>
            </div>

            <fieldset className="flex flex-col gap-3 pt-3 border-t border-[#EEF2F7]">
              <legend className="text-[14px] font-extrabold pt-3">Clinical notes (optional, only what you measured)</legend>
              <Field label="Reason for visit / working diagnosis">
                <input name="diagnosis" className={input} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="BP">
                  <input name="bp" className={input} placeholder="mmHg" />
                </Field>
                <Field label="SpO₂">
                  <input name="spo2" className={input} placeholder="%" />
                </Field>
                <Field label="Pulse">
                  <input name="hr" className={input} placeholder="bpm" />
                </Field>
              </div>
              <Field label="Allergies">
                <input name="allergy" className={input} />
              </Field>
              <Field label="Medication given or prescribed">
                <input name="medications" className={input} />
              </Field>
            </fieldset>

            {error && (
              <p role="alert" className="p-3 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13px] font-bold">
                {error}
              </p>
            )}
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2.5">
              <button type="button" onClick={() => setOpen(false)} className="h-[42px] px-5 rounded-[11px] border-[1.5px] border-[#D6DDE8] bg-white text-[13.5px] font-extrabold text-[#27324A] hover:bg-[#F4F6FA]">
                Cancel
              </button>
              <button type="submit" disabled={pending} className="h-[42px] px-5 rounded-[11px] bg-[#2A4DD0] hover:bg-[#2443B8] text-white text-[13.5px] font-extrabold flex items-center justify-center gap-2 disabled:opacity-60">
                {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
                Add patient
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
