'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, SlidersHorizontal, X } from 'lucide-react'
import { updateLabProfile } from '@/app/actions/diagnostic-center'

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

/** Edits the center details patients see when they find and book the lab. */
export function LabProfileEditor({ name, city, address, className, label = 'Edit Details' }: { name: string; city: string | null; address: string | null; className: string; label?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const image = form.get('image') as File | null
    if (image && image.size > 5 * 1024 * 1024) return setError('The photo must be under 5 MB.')
    start(async () => {
      const res = await updateLabProfile(form)
      if (!res.success) return setError(res.error)
      setOpen(false)
      setError(null)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <SlidersHorizontal className="w-[18px] h-[18px]" /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Edit center details">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form onSubmit={submit} className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">Edit Center Details</h3>
                <p className="text-sm text-indigo-gray-600">Patients see these when they search for labs and book tests.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Center name" className="sm:col-span-2">
                <input name="name" required minLength={2} defaultValue={name} className={input} />
              </Field>
              <Field label="City">
                <input name="city" required minLength={2} defaultValue={city ?? ''} className={input} />
              </Field>
              <Field label="Address">
                <input name="address" defaultValue={address ?? ''} placeholder="Street, area, landmark" className={input} />
              </Field>
              <Field label="Photo of the center (optional, up to 5 MB)" className="sm:col-span-2">
                <input
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-sm text-indigo-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-surface-container-high file:text-primary"
                />
              </Field>
            </div>

            {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-full text-sm font-semibold text-indigo-gray-600 hover:bg-surface-container">
                Cancel
              </button>
              <button type="submit" disabled={pending} className="px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
                Save Details
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
