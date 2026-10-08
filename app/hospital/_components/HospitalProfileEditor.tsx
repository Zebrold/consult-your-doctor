'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { updateHospitalProfile } from '@/app/actions/hospital-profile'
import { ChipPicker } from '@/components/portal/ChipPicker'
import { DeskDialog, ErrorNote, Field, PrimaryButton, QuietButton, deskInput } from '@/components/portal/desk'
import { ACCREDITATIONS, FACILITIES, INSURERS } from '@/lib/profile-lists'
import type { HospitalInfo } from '../_lib/hospital'

export type EditableHospital = Pick<
  HospitalInfo,
  'name' | 'city' | 'address' | 'phone' | 'email' | 'emergencyPhone' | 'website' | 'about' | 'establishedYear' | 'facilities' | 'accreditations' | 'insurance'
>

/** Edits everything patients see on the hospital's public page. */
export function HospitalProfileEditor({ hospital, className, label = 'Edit Profile' }: { hospital: EditableHospital; className: string; label?: string }) {
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
      const res = await updateHospitalProfile(form)
      if (!res.success) return setError(res.error)
      setError(null)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <SlidersHorizontal className="w-[18px] h-[18px]" /> {label}
      </button>
      {open && (
        <DeskDialog title="Edit Hospital Profile" subtitle="Patients see these details on your hospital page and when they book your doctors." onClose={() => setOpen(false)} wide>
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Hospital name" className="sm:col-span-2">
                <input name="name" required minLength={2} maxLength={120} defaultValue={hospital.name} className={deskInput} />
              </Field>
              <Field label="Street address" className="sm:col-span-2">
                <input name="address" required minLength={3} maxLength={300} defaultValue={hospital.address ?? ''} placeholder="Street, area, landmark" className={deskInput} />
              </Field>
              <Field label="City">
                <input name="city" required minLength={2} maxLength={80} defaultValue={hospital.city ?? ''} className={deskInput} />
              </Field>
              <Field label="Founded in (year)">
                <input name="established_year" inputMode="numeric" maxLength={4} defaultValue={hospital.establishedYear ?? ''} placeholder="1998" className={deskInput} />
              </Field>
              <Field label="Reception phone">
                <input name="phone" type="tel" maxLength={30} defaultValue={hospital.phone ?? ''} placeholder="+91 40 1234 5678" className={deskInput} />
              </Field>
              <Field label="Emergency phone">
                <input name="emergency_phone" type="tel" maxLength={30} defaultValue={hospital.emergencyPhone ?? ''} placeholder="+91 98765 43210" className={deskInput} />
              </Field>
              <Field label="Contact email">
                <input name="email" type="email" maxLength={200} defaultValue={hospital.email ?? ''} className={deskInput} />
              </Field>
              <Field label="Website (optional)">
                <input name="website" type="url" maxLength={200} defaultValue={hospital.website ?? ''} placeholder="https://" className={deskInput} />
              </Field>
              <Field label="About the hospital" className="sm:col-span-2" hint="Specialities, history and what patients can expect. Up to 2,000 characters.">
                <textarea name="about" rows={4} maxLength={2000} defaultValue={hospital.about ?? ''} className={`${deskInput} resize-y`} />
              </Field>
            </div>

            <ChipPicker name="facilities" label="Facilities" suggestions={FACILITIES} initial={hospital.facilities} placeholder="Add a facility" />
            <ChipPicker name="accreditations" label="Accreditations" suggestions={ACCREDITATIONS} initial={hospital.accreditations} placeholder="Add an accreditation" />
            <ChipPicker name="insurance" label="Insurance accepted (cashless / reimbursement)" suggestions={INSURERS} initial={hospital.insurance} placeholder="Add an insurer or TPA" />

            <Field label="Photo of the hospital (optional, up to 5 MB)">
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-indigo-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-surface-container-high file:text-primary"
              />
            </Field>

            <ErrorNote>{error}</ErrorNote>
            <div className="flex justify-end gap-2 sticky bottom-0 bg-surface-container-lowest pt-2">
              <QuietButton onClick={() => setOpen(false)}>Cancel</QuietButton>
              <PrimaryButton pending={pending}>Save Profile</PrimaryButton>
            </div>
          </form>
        </DeskDialog>
      )}
    </>
  )
}
