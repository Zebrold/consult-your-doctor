'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, GraduationCap, IdCard, LoaderCircle, Pencil, Plus, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import { updateDoctorProfile } from '@/app/actions/doctor'
import { ChipPicker } from '@/components/portal/ChipPicker'
import { EDUCATION_KINDS, type EducationEntry } from '@/lib/education'
import { INSURERS } from '@/lib/profile-lists'

export type EditableProfile = {
  name: string
  phone: string | null
  specialty: string | null
  qualifications: string | null
  experience: number | null
  fee: number | null
  bio: string | null
  address: string | null
  /** The sections below are edited only when given (the schedule page passes just the basics). */
  registrationNumber?: string | null
  registrationCouncil?: string | null
  education?: EducationEntry[]
  insurance?: string[]
}

export type ProfileTab = 'basic' | 'registration' | 'education' | 'insurance'

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

const blankEntry = (): EducationEntry => ({ kind: 'Degree', title: '', institution: '', year: '' })

/** Edits the details patients see on your public profile (saved with updateDoctorProfile). */
export function ProfileEditor({
  profile,
  className,
  label = 'Edit Public Profile',
  ariaLabel,
  tab: initialTab = 'basic',
}: {
  profile: EditableProfile
  className: string
  /** Button text; pass an empty string for an icon-only button (then give it an ariaLabel). */
  label?: string
  ariaLabel?: string
  /** The section the editor opens on. */
  tab?: ProfileTab
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ProfileTab>(initialTab)
  const [education, setEducation] = useState<EducationEntry[]>(profile.education ?? [])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const extended = profile.education !== undefined
  const tabs: { key: ProfileTab; label: string; icon: typeof UserRound }[] = [
    { key: 'basic', label: 'Basic details', icon: UserRound },
    ...(extended
      ? ([
          { key: 'registration', label: 'Registration', icon: IdCard },
          { key: 'education', label: 'Education & Training', icon: GraduationCap },
          { key: 'insurance', label: 'Insurance', icon: ShieldCheck },
        ] as const)
      : []),
  ]

  const openEditor = () => {
    setTab(initialTab)
    setEducation(profile.education ?? [])
    setError(null)
    setOpen(true)
  }

  const update = (i: number, patch: Partial<EducationEntry>) => setEducation((list) => list.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  const move = (i: number, by: number) =>
    setEducation((list) => {
      const next = [...list]
      const [item] = next.splice(i, 1)
      next.splice(Math.max(0, Math.min(next.length, i + by)), 0, item)
      return next
    })

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const image = form.get('image') as File | null
    if (image && image.size > 5 * 1024 * 1024) return setError('The photo must be under 5 MB.')
    if (extended) {
      const filled = education.filter((x) => x.title.trim() || x.institution.trim() || x.year.trim())
      if (filled.some((x) => !x.title.trim())) {
        setTab('education')
        return setError('Each education entry needs the degree or course name.')
      }
      form.set('education', JSON.stringify(filled))
    }
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
      <button type="button" onClick={openEditor} className={className} aria-label={ariaLabel} title={ariaLabel}>
        <Pencil className={label ? 'w-[18px] h-[18px]' : 'w-3.5 h-3.5'} />
        {label && <span>{label}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Edit profile">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form onSubmit={submit} className="relative w-full sm:max-w-3xl h-[94vh] sm:h-auto sm:max-h-[92vh] bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 sm:p-6 pb-3 flex items-start justify-between gap-3 border-b border-surface-container">
              <div>
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">Edit Public Profile</h3>
                <p className="text-sm text-indigo-gray-600">Patients see these details when they find and book you.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {tabs.length > 1 && (
              <div className="px-5 sm:px-6 pt-3 flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Profile sections">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.key}
                    onClick={() => setTab(t.key)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                      tab === t.key ? 'bg-vibrant-blue text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <t.icon className="w-4 h-4" /> {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4">
              {/* Every section stays in the form (hidden when another tab is open) so one Save keeps them all. */}
              <div hidden={tab !== 'basic'} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Full name">
                  <input name="full_name" required defaultValue={profile.name} className={input} />
                </Field>
                <Field label="Mobile number">
                  <input name="phone_number" type="tel" defaultValue={profile.phone ?? ''} className={input} />
                </Field>
                <Field label="Specialty">
                  <input name="specialty" required defaultValue={profile.specialty ?? ''} className={input} />
                </Field>
                <Field label="Qualifications" hint="As printed after your name, e.g. MBBS, MD (General Medicine)">
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

              {extended && (
                <>
                  <div hidden={tab !== 'registration'} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <p className="sm:col-span-2 text-sm text-indigo-gray-600">Your medical registration prints on every prescription and shows on your public profile.</p>
                    <Field label="Registration number">
                      <input name="registration_number" maxLength={40} defaultValue={profile.registrationNumber ?? ''} placeholder="e.g. 54321" className={input} />
                    </Field>
                    <Field label="Medical council">
                      <input name="registration_council" maxLength={80} defaultValue={profile.registrationCouncil ?? ''} placeholder="e.g. Telangana State Medical Council" className={input} />
                    </Field>
                  </div>

                  <div hidden={tab !== 'education'} className="flex flex-col gap-3">
                    <p className="text-sm text-indigo-gray-600">Add your degrees, residencies, fellowships and certifications, in the order patients should see them.</p>
                    {education.length === 0 && <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600 text-center">No entries yet.</p>}
                    <ul className="flex flex-col gap-3">
                      {education.map((entry, i) => (
                        <li key={i} className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-label-sm text-[12px] font-bold text-primary uppercase tracking-wider">Entry {i + 1}</span>
                            <span className="flex items-center gap-1">
                              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" title="Move up" className="p-1.5 rounded-full hover:bg-surface-container disabled:opacity-30">
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => move(i, 1)} disabled={i === education.length - 1} aria-label="Move down" title="Move down" className="p-1.5 rounded-full hover:bg-surface-container disabled:opacity-30">
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => setEducation((list) => list.filter((_, j) => j !== i))} aria-label="Remove entry" title="Remove" className="p-1.5 rounded-full text-error hover:bg-error-container/50">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                            <Field label="Type" className="sm:col-span-2">
                              <select value={entry.kind} onChange={(e) => update(i, { kind: e.target.value })} className={input}>
                                {EDUCATION_KINDS.map((k) => (
                                  <option key={k}>{k}</option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Degree / course" className="sm:col-span-4">
                              <input value={entry.title} onChange={(e) => update(i, { title: e.target.value })} maxLength={120} placeholder="MBBS, MD (Cardiology), FACC…" className={input} />
                            </Field>
                            <Field label="College / university / hospital" className="sm:col-span-4">
                              <input value={entry.institution} onChange={(e) => update(i, { institution: e.target.value })} maxLength={160} placeholder="e.g. Osmania Medical College, Hyderabad" className={input} />
                            </Field>
                            <Field label="Year" className="sm:col-span-2">
                              <input value={entry.year} onChange={(e) => update(i, { year: e.target.value })} maxLength={15} placeholder="2012 or 2012–2015" className={input} />
                            </Field>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => setEducation((list) => [...list, blankEntry()])} disabled={education.length >= 20} className="self-start px-4 py-2 rounded-full bg-primary-fixed/60 text-primary text-[13px] font-bold inline-flex items-center gap-1.5 hover:bg-primary-fixed disabled:opacity-50">
                      <Plus className="w-4 h-4" /> Add education or training
                    </button>
                  </div>

                  <div hidden={tab !== 'insurance'} className="flex flex-col gap-3">
                    <p className="text-sm text-indigo-gray-600">Insurers and schemes your patients can use for your consultations (cashless or reimbursement).</p>
                    <input type="hidden" name="insurance_present" value="1" />
                    <ChipPicker name="insurance" label="Insurance accepted" suggestions={INSURERS} initial={profile.insurance ?? []} placeholder="Add an insurer or TPA" />
                  </div>
                </>
              )}

              {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
            </div>

            <div className="p-4 sm:px-6 border-t border-surface-container flex justify-end gap-2">
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
