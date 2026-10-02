'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, UserPlus, X } from 'lucide-react'
import { addNewPatient } from '@/app/actions/doctor'

const input =
  'w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30'

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="font-label-sm text-label-sm text-indigo-gray-600">{label}</span>
      {children}
    </label>
  )
}

/** Registers a patient who is seeing the doctor now, with a visit starting immediately. */
export function WalkInButton({ className, label = 'Add Walk-in Patient' }: { className: string; label?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    start(async () => {
      const res = await addNewPatient(form)
      if (!res.success) {
        setError(res.error || 'Could not add the patient.')
        return
      }
      setOpen(false)
      setError(null)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <UserPlus className="w-[18px] h-[18px]" />
        <span>{label}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Add walk-in patient">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form onSubmit={submit} className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">Walk-in Patient</h3>
                <p className="text-sm text-indigo-gray-600">Creates the patient&apos;s record and a visit with you starting now.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name" className="sm:col-span-2">
                <input name="full_name" required className={input} autoComplete="off" />
              </Field>
              <Field label="Mobile number">
                <input name="phone_number" type="tel" className={input} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Email (optional)">
                <input name="email" type="email" className={input} />
              </Field>
            </div>

            <fieldset className="flex flex-col gap-3 pt-2 border-t border-surface-container">
              <legend className="font-label-sm text-label-sm text-indigo-gray-900 font-bold pt-3">Clinical notes (optional, only what you measured)</legend>
              <Field label="Reason for visit / working diagnosis">
                <input name="diagnosis" className={input} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="BP">
                  <input name="bp" className={input} placeholder="mmHg" />
                </Field>
                <Field label="SpO2">
                  <input name="spo2" className={input} placeholder="%" />
                </Field>
                <Field label="Heart rate">
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

            {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-full text-sm font-semibold text-indigo-gray-600 hover:bg-surface-container">
                Cancel
              </button>
              <button type="submit" disabled={pending} className="px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
                Add Patient
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
