'use client'

import { useEffect, useState, useTransition, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Check, LoaderCircle, SlidersHorizontal, X } from 'lucide-react'
import { updateHospitalProfile } from '@/app/actions/hospital-profile'
import { ChipPicker } from '@/components/portal/ChipPicker'
import { LocationPicker } from '@/components/portal/LocationPicker'
import { ACCREDITATIONS, FACILITIES, INSURERS } from '@/lib/profile-lists'
import type { LatLng } from '@/lib/geo'
import type { HospitalInfo } from '../_lib/hospital'

export type EditableHospital = Pick<
  HospitalInfo,
  'name' | 'city' | 'address' | 'phone' | 'email' | 'emergencyPhone' | 'website' | 'about' | 'establishedYear' | 'facilities' | 'accreditations' | 'insurance'
>

// The Edit hospital profile dialog, after the user's DeskHosEditProfile design: basic details, the map pin, contact
// and about, then facilities, insurance and the photo. updateHospitalProfile saves every field together, so all of
// them stay in this one form.

const label = 'block mb-1.5 text-[13px] font-extrabold text-[#27324A]'
const input =
  'block w-full h-[46px] px-3.5 rounded-xl border border-[#D6DDE8] bg-white text-[14.5px] text-[#0B1B3F] placeholder:text-[#8A94A6] outline-none focus:border-[#2A4DD0] focus:ring-2 focus:ring-[#2A4DD0]/15 transition-shadow'
const btn = 'inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] text-[13.5px] font-extrabold whitespace-nowrap transition-colors disabled:opacity-60'

function Card({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <section className="px-4 py-[18px] sm:px-6 sm:py-[22px] rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0]">
      <div className="mb-[18px]">
        <h3 className="text-[15.5px] font-extrabold">{title}</h3>
        <p className="mt-0.5 text-[13px] text-[#5B667A]">{sub}</p>
      </div>
      {children}
    </section>
  )
}

function Text({ name, text, required = false, wide = false, ...rest }: { name: string; text: string; required?: boolean; wide?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className={label}>
        {text}
        {required && <span className="text-[#B42318]"> *</span>}
      </span>
      <input name={name} required={required} className={input} {...rest} />
    </label>
  )
}

/** Edits everything patients see on the hospital's public page. */
export function HospitalProfileEditor({
  hospital,
  location,
  className,
  label: buttonLabel = 'Edit profile',
  icon = true,
}: {
  hospital: EditableHospital
  location?: LatLng | null
  className: string
  label?: string
  /** Show the sliders icon before the label (off for the cards' "+ Add" links). */
  icon?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()

  const close = () => {
    setOpen(false)
    setError(null)
    setSaved(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const image = form.get('image') as File | null
    if (image && image.size > 5 * 1024 * 1024) return setError('The photo must be under 5 MB.')
    start(async () => {
      const res = await updateHospitalProfile(form)
      if (!res.success) {
        setSaved(false)
        return setError(res.error)
      }
      setError(null)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {icon && <SlidersHorizontal className="w-[18px] h-[18px]" />} {buttonLabel}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Edit hospital profile" className="fixed inset-0 z-[100] overflow-y-auto bg-[rgba(11,27,63,0.55)] backdrop-blur-[3px] font-(family-name:--font-manrope) text-[#0B1B3F] text-left">
          <div className="relative min-h-full sm:min-h-0 w-full sm:w-[min(820px,calc(100%-32px))] sm:my-10 sm:mx-auto sm:rounded-[20px] bg-white shadow-[0_24px_60px_rgba(11,27,63,0.28),0_0_0_1px_rgba(11,27,63,0.06)] overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-4 sm:px-7 pt-[22px] sm:pt-[26px] pb-5">
              <div>
                <h2 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em]">Edit hospital profile</h2>
                <p className="mt-[5px] text-[13.5px] sm:text-[14px] font-normal text-[#5B667A]">Patients see these details on your hospital page and when they book your doctors.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="shrink-0 w-[38px] h-[38px] rounded-[11px] bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] flex items-center justify-center text-[#27324A] hover:bg-[#EEF2F8]">
                <X className="w-[18px] h-[18px]" strokeWidth={2.4} />
              </button>
            </div>

            <form onSubmit={submit} onChange={() => saved && setSaved(false)}>
              <div className="flex flex-col gap-[18px] px-3 sm:px-7 pt-[22px] pb-6 border-t border-[#EEF2F7]">
                <Card title="Basic details" sub="How your hospital appears in search and on its page.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-[18px]">
                    <Text name="name" text="Hospital name" required wide minLength={2} maxLength={120} defaultValue={hospital.name} />
                    <Text name="address" text="Street address" required wide minLength={3} maxLength={300} defaultValue={hospital.address ?? ''} placeholder="Street, area, landmark" />
                    <Text name="city" text="City" required minLength={2} maxLength={80} defaultValue={hospital.city ?? ''} />
                    <Text name="established_year" text="Founded in" inputMode="numeric" maxLength={4} defaultValue={hospital.establishedYear ?? ''} placeholder="1998" />
                  </div>
                </Card>

                <Card title="Location on the map" sub="Patients nearby see your hospital and doctors first, with the distance.">
                  <LocationPicker initial={location ?? null} look="workspace" />
                </Card>

                <Card title="Contact" sub="Shown on your hospital page and the booking slip.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-[18px]">
                    <Text name="phone" text="Reception phone" type="tel" maxLength={30} defaultValue={hospital.phone ?? ''} placeholder="+91 40 1234 5678" />
                    <Text name="emergency_phone" text="Emergency phone" type="tel" maxLength={30} defaultValue={hospital.emergencyPhone ?? ''} placeholder="+91 98765 43210" />
                    <Text name="email" text="Contact email" type="email" maxLength={200} defaultValue={hospital.email ?? ''} />
                    <Text name="website" text="Website (optional)" type="url" maxLength={200} defaultValue={hospital.website ?? ''} placeholder="https://" />
                  </div>
                </Card>

                <Card title="About the hospital" sub="A short introduction patients read before booking.">
                  <label className="block">
                    <span className="sr-only">About the hospital</span>
                    <textarea name="about" maxLength={2000} defaultValue={hospital.about ?? ''} className={`${input} !h-auto min-h-[110px] py-3 resize-y leading-[1.5]`} />
                  </label>
                  <span className="block mt-1.5 text-[12.5px] leading-[1.45] text-[#5B667A]">Specialities, history and what patients can expect. Up to 2,000 characters.</span>
                </Card>

                <Card title="Facilities & insurance" sub="What your hospital offers, its accreditations and the insurers it accepts.">
                  <div className="flex flex-col gap-5">
                    <ChipPicker name="facilities" label="Facilities" suggestions={FACILITIES} initial={hospital.facilities} placeholder="Add a facility" />
                    <ChipPicker name="accreditations" label="Accreditations" suggestions={ACCREDITATIONS} initial={hospital.accreditations} placeholder="Add an accreditation" />
                    <ChipPicker name="insurance" label="Insurance accepted" suggestions={INSURERS} initial={hospital.insurance} placeholder="Add an insurer or TPA" />
                  </div>
                </Card>

                <Card title="Photo of the hospital" sub="Shown on your hospital page and in search. JPG, PNG or WebP, up to 5 MB.">
                  <input
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Photo of the hospital"
                    className="block w-full text-[13.5px] text-[#5B667A] file:mr-3 file:h-[42px] file:px-4 file:rounded-[11px] file:border file:border-solid file:border-[#D6DDE8] file:bg-white file:text-[13.5px] file:font-extrabold file:text-[#27324A] hover:file:bg-[#F4F6FA]"
                  />
                </Card>

                {error && (
                  <p role="alert" className="p-3.5 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13.5px] font-bold">
                    {error}
                  </p>
                )}
              </div>

              <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-7 py-4 bg-white border-t border-[#E6EAF0]">
                <span className="text-[13px] font-bold text-[#5B667A]" role="status">
                  {saved ? (
                    <span className="inline-flex items-center gap-1.5 text-[#2A4DD0] font-extrabold">
                      <Check className="w-4 h-4" strokeWidth={3} /> Profile saved and live
                    </span>
                  ) : (
                    'Changes go live on your patient page as soon as you save.'
                  )}
                </span>
                <span className="flex gap-2.5 sm:shrink-0">
                  <button type="button" onClick={close} className={`${btn} flex-1 sm:flex-none border border-[#D6DDE8] bg-white text-[#27324A] hover:bg-[#F4F6FA]`}>
                    {saved ? 'Close' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={pending} className={`${btn} flex-1 sm:flex-none bg-[#2A4DD0] text-white shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#2443B8]`}>
                    {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Save profile
                  </button>
                </span>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
