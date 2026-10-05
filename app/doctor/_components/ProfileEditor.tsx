'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Pencil, X } from 'lucide-react'
import { updateDoctorProfile } from '@/app/actions/doctor'

export type EditableProfile = {
  name: string
  phone: string | null
  specialty: string | null
  qualifications: string | null
  experience: number | null
  fee: number | null
  bio: string | null
  address: string | null
}

const input =
  'w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30'

function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="font-label-sm text-label-sm text-indigo-gray-600">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-indigo-gray-600">{hint}</span>}
    </label>
  )
}

/** Edits the details patients see on your public profile (saved with updateDoctorProfile). */
export function ProfileEditor({
  profile,
  className,
  label = 'Edit Public Profile',
  ariaLabel,
}: {
  profile: EditableProfile
  className: string
  /** Button text; pass an empty string for an icon-only button (then give it an ariaLabel). */
  label?: string
  ariaLabel?: string
}) {
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
      const res = await updateDoctorProfile(form)
      if (!res.success) {
        setError(res.error || 'Could not save your profile.')
        return
      }
      setOpen(false)
      setError(null)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label={ariaLabel} title={ariaLabel}>
        <Pencil className={label ? 'w-[18px] h-[18px]' : 'w-3.5 h-3.5'} />
        {label && <span>{label}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Edit profile">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form onSubmit={submit} className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">Edit Public Profile</h3>
                <p className="text-sm text-indigo-gray-600">Patients see these details when they find and book you.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name">
                <input name="full_name" required defaultValue={profile.name} className={input} />
              </Field>
              <Field label="Mobile number">
                <input name="phone_number" type="tel" defaultValue={profile.phone ?? ''} className={input} />
              </Field>
              <Field label="Specialty">
                <input name="specialty" required defaultValue={profile.specialty ?? ''} className={input} />
              </Field>
              <Field label="Qualifications">
                <input name="qualifications" defaultValue={profile.qualifications ?? ''} placeholder="MBBS, MD" className={input} />
              </Field>
              <Field label="Years of experience">
                <input name="experience_years" type="number" min={0} max={70} defaultValue={profile.experience ?? ''} className={input} />
              </Field>
              <Field label="Consultation fee (₹)" hint="Patients also pay a platform fee at checkout.">
                <input name="consultation_fee" type="number" min={0} step={1} required defaultValue={profile.fee ?? ''} className={input} />
              </Field>
              <Field label="Clinic address" className="sm:col-span-2">
                <input name="address" defaultValue={profile.address ?? ''} className={input} />
              </Field>
              <Field label="About you" className="sm:col-span-2">
                <textarea name="bio" rows={4} defaultValue={profile.bio ?? ''} placeholder="Your experience, areas of focus and languages" className={input} />
              </Field>
              <Field label="Profile photo (optional, up to 5 MB)" className="sm:col-span-2">
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
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
