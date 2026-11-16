'use client'

import { useRef, useState, useTransition, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, CircleCheck, ExternalLink, LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react'
import { createHospitalDoctor, updateHospitalDoctor, deleteHospitalDoctor } from '@/app/actions/hospital'
import { setHospitalDoctorPaused } from '@/app/actions/doctor-pause'
import { sendDoctorPasswordLink, uploadDoctorPhoto } from '@/app/actions/hospital-doctor-account'
import { WelcomeLetterButton } from '@/components/portal/WelcomeLetterButton'

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
  staffId?: string | null
  email?: string | null
  image?: string | null
  hospitalName?: string | null
  registrationNumber?: string | null
  registrationCouncil?: string | null
  /** Bookings paused (undefined hides the switch; the Staff page doesn't pass it). */
  paused?: boolean
  pausedBy?: 'doctor' | 'hospital' | null
  /** False until migration 20261118 has run. */
  pauseReady?: boolean
}

// The Add doctor and Edit doctor dialogs, after the user's DeskHosAddDoctor and DeskHosEditDoctor designs, in the same
// workspace style as the Add patient dialog. Only fields the product stores are shown.

const label = 'block mb-1.5 text-[13px] font-extrabold text-[#27324A]'
const input =
  'block w-full h-[46px] px-3.5 rounded-xl border border-[#D6DDE8] bg-white text-[14.5px] text-[#0B1B3F] placeholder:text-[#8A94A6] outline-none focus:border-[#2A4DD0] focus:ring-2 focus:ring-[#2A4DD0]/15 read-only:bg-[#F7F9FC] transition-shadow'
const hint = 'block mt-1.5 text-[12.5px] leading-[1.45] text-[#5B667A]'
const btn = 'inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] text-[13.5px] font-extrabold whitespace-nowrap transition-colors disabled:opacity-60'
const btnBlue = `${btn} bg-[#2A4DD0] text-white shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#2443B8]`
const btnLine = `${btn} border border-[#D6DDE8] bg-white text-[#27324A] hover:bg-[#F4F6FA]`
const overlay = 'fixed inset-0 z-[100] overflow-y-auto bg-[rgba(11,27,63,0.55)] backdrop-blur-[3px] font-(family-name:--font-manrope) text-[#0B1B3F]'
const shell = 'relative min-h-full sm:min-h-0 w-full sm:my-10 sm:mx-auto sm:rounded-[20px] bg-white shadow-[0_24px_60px_rgba(11,27,63,0.28),0_0_0_1px_rgba(11,27,63,0.06)] overflow-hidden'
const closeBtn = 'shrink-0 w-[38px] h-[38px] rounded-[11px] bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] flex items-center justify-center text-[#27324A] hover:bg-[#EEF2F8]'

const chip = (on: boolean) =>
  `inline-flex items-center justify-center gap-1.5 min-h-[46px] px-3.5 py-2 rounded-[10px] border text-[13.5px] font-extrabold text-center transition-colors ${
    on ? 'border-[#2A4DD0] bg-[#2A4DD0] text-white' : 'border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#A9BCEF]'
  }`

const councilsList = [
  'National Medical Commission (NMC)',
  'Andhra Pradesh Medical Council',
  'Delhi Medical Council',
  'Maharashtra Medical Council',
  'Karnataka Medical Council',
  'Tamil Nadu Medical Council',
  'Telangana State Medical Council',
  'West Bengal Medical Council',
  'Gujarat Medical Council',
  'Kerala Medical Council',
]

function Req() {
  return <span className="text-[#B42318]"> *</span>
}

function Section({ n, title, sub, children }: { n: number; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="px-4 py-[18px] sm:px-6 sm:py-[22px] rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0]">
      <div className="flex gap-3 items-start mb-[18px]">
        <span className="shrink-0 w-7 h-7 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[13px] font-extrabold">{n}</span>
        <div>
          <h3 className="text-[15.5px] font-extrabold">{title}</h3>
          <p className="mt-0.5 text-[13px] text-[#5B667A]">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function CouncilSelect({ defaultValue }: { defaultValue?: string | null }) {
  const options = defaultValue && !councilsList.includes(defaultValue) ? [defaultValue, ...councilsList] : councilsList
  return (
    <select name="registrationCouncil" defaultValue={defaultValue ?? ''} className={`${input} cursor-pointer`}>
      <option value="">Choose the council</option>
      {options.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}

function Rupee({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-[46px] rounded-xl border border-[#D6DDE8] overflow-hidden focus-within:border-[#2A4DD0] focus-within:ring-2 focus-within:ring-[#2A4DD0]/15">
      <span className="shrink-0 flex items-center px-3 bg-[#F7F9FC] border-r border-[#D6DDE8] text-[14px] font-extrabold text-[#27324A]">₹</span>
      {children}
    </span>
  )
}

const bareInput = 'flex-1 min-w-0 border-0 outline-none px-3.5 text-[14.5px] text-[#0B1B3F] placeholder:text-[#8A94A6]'

/** Registers a new doctor at this hospital. */
export function AddDoctorButton({
  departments,
  className,
  label: text = 'Add Doctor',
  hospitalName,
}: {
  departments: string[]
  className: string
  label?: string
  /** Shown read-only in the form; hidden when not given. */
  hospitalName?: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [round, setRound] = useState(0)
  const [mode, setMode] = useState<'invite' | 'manual'>('invite')
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<string | null>(null)
  const [activationLink, setActivationLink] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [password, setPassword] = useState('')
  const [pending, start] = useTransition()

  const reset = () => {
    setError(null)
    setCreated(null)
    setActivationLink(null)
    setInviteEmail(null)
    setPassword('')
    setCopiedLink(false)
    setMode('invite')
  }
  const close = () => {
    setOpen(false)
    reset()
  }
  const another = () => {
    reset()
    setRound((r) => r + 1)
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const chosen = mode === 'manual' ? String(form.get('password') || '').trim() : ''
    if (mode === 'manual' && chosen.length < 8) return setError('Set a password of at least 8 characters, or choose the email link.')
    if (mode === 'invite') form.delete('password')
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

  const steps = [
    { n: 1, label: 'Doctor profile', sub: 'Name and registration' },
    { n: 2, label: 'Clinic details', sub: 'Fee and room' },
    { n: 3, label: 'Account access', sub: 'Sign-in' },
  ]
  const done = created !== null

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Plus className="w-[18px] h-[18px]" /> {text}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Add doctor" className={overlay}>
          <div className={`${shell} sm:w-[min(920px,calc(100%-32px))]`}>
            <div className="flex items-start justify-between gap-4 px-4 sm:px-7 pt-[22px] sm:pt-[26px] pb-5">
              <div>
                <h2 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em]">Add doctor</h2>
                <p className="mt-[5px] text-[13.5px] sm:text-[14px] text-[#5B667A]">Create the doctor’s profile, set their fee, and invite them to the doctor portal.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className={closeBtn}>
                <X className="w-[18px] h-[18px]" strokeWidth={2.4} />
              </button>
            </div>

            <ol aria-label="Progress" className="flex items-center justify-center gap-3 sm:gap-3.5 px-4 sm:px-7 py-4 bg-[#F7F9FC] border-y border-[#EEF2F7]">
              {steps.map((s) => (
                <li key={s.n} className="flex items-center gap-2.5">
                  <span
                    className={`shrink-0 w-[30px] h-[30px] rounded-full border-[1.5px] flex items-center justify-center text-[13px] font-extrabold ${
                      done || s.n === 1 ? 'border-[#2A4DD0] bg-[#2A4DD0] text-white' : 'border-[#C9D2E0] bg-white text-[#5B667A]'
                    }`}
                  >
                    {done ? <Check className="w-[15px] h-[15px]" strokeWidth={3} /> : s.n}
                  </span>
                  <span className="hidden sm:block">
                    <span className={`block text-[13.5px] font-extrabold ${done || s.n === 1 ? 'text-[#0B1B3F]' : 'text-[#5B667A]'}`}>{s.label}</span>
                    <span className="block text-[11.5px] text-[#5B667A]">{s.sub}</span>
                  </span>
                  {s.n < 3 && <span aria-hidden className="w-6 sm:w-16 h-0.5 ml-1 rounded-sm bg-[#D6DDE8]" />}
                </li>
              ))}
            </ol>

            {done ? (
              <div className="flex flex-col items-center gap-4 px-4 sm:px-7 py-9 text-center">
                <span className="w-14 h-14 rounded-full bg-[#2A4DD0] text-white flex items-center justify-center">
                  <Check className="w-7 h-7" strokeWidth={3} />
                </span>
                <h3 className="text-[20px] font-extrabold">Doctor added</h3>
                <p className="text-[14px] text-[#5B667A]">
                  Staff ID <span className="font-mono font-extrabold text-[#2A4DD0] bg-[#EEF3FF] px-2 py-0.5 rounded-md">{created}</span>
                  {inviteEmail ? (
                    <>
                      {' '}
                      · a link to set their password was emailed to <strong className="text-[#0B1B3F]">{inviteEmail}</strong>
                    </>
                  ) : null}
                </p>

                {activationLink && (
                  <div className="w-full max-w-[560px] p-4 rounded-2xl bg-[#F5F8FF] shadow-[0_0_0_1px_#DCE6FF] flex flex-col gap-2 text-left">
                    <span className="text-[13px] font-extrabold text-[#27324A]">Activation link</span>
                    <div className="flex items-center gap-2">
                      <input readOnly value={activationLink} aria-label="Activation link" className={`${input} !h-[42px] text-[12.5px] font-mono truncate`} />
                      <button type="button" onClick={copyLink} className={`${btnBlue} shrink-0`}>
                        {copiedLink ? 'Copied' : 'Copy link'}
                      </button>
                    </div>
                    <span className={hint}>The doctor can open this link any time to set their password.</span>
                  </div>
                )}

                {created && password && <WelcomeLetterButton username={created} password={password} className={`${btnLine} w-full max-w-[560px]`} />}

                <div className="flex gap-2.5 pt-1">
                  <button type="button" onClick={another} className={btnLine}>
                    <Plus className="w-4 h-4" strokeWidth={2.6} /> Add another doctor
                  </button>
                  <button type="button" onClick={close} className={btnBlue}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form key={round} onSubmit={submit}>
                <div className="flex flex-col gap-[18px] px-3 sm:px-7 py-5 sm:py-6">
                  <Section n={1} title="Doctor profile" sub="What patients see when they book this doctor.">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] items-start">
                      <label className="block min-w-0">
                        <span className={label}>
                          Full name
                          <Req />
                        </span>
                        <input name="fullName" required minLength={2} maxLength={120} autoComplete="off" className={input} />
                        <span className={hint}>As on the medical registration certificate.</span>
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>
                          Speciality
                          <Req />
                        </span>
                        <input name="specialty" required list="hospital-departments" maxLength={80} autoComplete="off" className={input} />
                        <datalist id="hospital-departments">
                          {departments.map((d) => (
                            <option key={d} value={d} />
                          ))}
                        </datalist>
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>
                          Years of experience
                          <Req />
                        </span>
                        <input name="experienceYears" type="number" inputMode="numeric" min={0} max={70} required className={input} />
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>Mobile number</span>
                        <input name="phone" type="tel" inputMode="tel" maxLength={30} autoComplete="off" className={input} />
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>
                          Qualifications
                          <Req />
                        </span>
                        <input name="qualifications" required maxLength={200} className={input} />
                        <span className={hint}>For example MBBS, MS (Ortho).</span>
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>Medical registration number</span>
                        <input name="registrationNumber" maxLength={40} autoComplete="off" className={input} />
                        <span className={hint}>Needed for the Verified badge.</span>
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>Medical council</span>
                        <CouncilSelect />
                      </label>
                    </div>
                  </Section>

                  <Section n={2} title="Clinic and consultation" sub="Where and when patients can book this doctor.">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] items-start">
                      {hospitalName && (
                        <label className="block min-w-0 sm:col-span-2">
                          <span className={label}>Hospital</span>
                          <input readOnly value={hospitalName} className={input} />
                        </label>
                      )}
                      <label className="block min-w-0">
                        <span className={label}>
                          Consultation fee
                          <Req />
                        </span>
                        <Rupee>
                          <input name="consultationFee" type="number" inputMode="numeric" min={1} required aria-label="Consultation fee in rupees" className={bareInput} />
                        </Rupee>
                        <span className={hint}>Collected at your counter for each visit. Publish the doctor’s slots from Doctors &amp; roster after adding them.</span>
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>Room or cabin</span>
                        <input name="address" maxLength={200} className={input} />
                        <span className={hint}>Shown on the confirmation slip.</span>
                      </label>
                    </div>
                  </Section>

                  <Section n={3} title="Account access" sub="How the doctor signs in to the doctor portal.">
                    <div role="radiogroup" aria-label="Account access" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-[18px]">
                      <button type="button" role="radio" aria-checked={mode === 'invite'} onClick={() => setMode('invite')} className={chip(mode === 'invite')}>
                        Email a link to set their password
                      </button>
                      <button type="button" role="radio" aria-checked={mode === 'manual'} onClick={() => setMode('manual')} className={chip(mode === 'manual')}>
                        Set a password myself
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] items-start">
                      <label className="block min-w-0">
                        <span className={label}>
                          Doctor’s email
                          <Req />
                        </span>
                        <input name="email" type="email" required autoComplete="off" maxLength={200} className={input} />
                        <span className={hint}>{mode === 'invite' ? 'We email a link so the doctor sets their own password.' : 'The doctor can also sign in with this email.'}</span>
                      </label>
                      {mode === 'manual' && (
                        <label className="block min-w-0">
                          <span className={label}>
                            Password
                            <Req />
                          </span>
                          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
                          <span className={hint}>At least 8 characters. Share it with the doctor yourself.</span>
                        </label>
                      )}
                    </div>
                    <p className="mt-[18px] flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[#F5F8FF] text-[13px] leading-[1.45] text-[#27324A]">
                      <CircleCheck className="w-[18px] h-[18px] shrink-0 text-[#2A4DD0] mt-px" />A Doctor ID is created automatically. Patients can book the doctor once their slots are published.
                    </p>
                  </Section>

                  {error && (
                    <p role="alert" className="p-3.5 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13.5px] font-bold">
                      {error}
                    </p>
                  )}
                </div>

                <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-7 py-4 bg-white border-t border-[#E6EAF0]">
                  <span className="text-[12.5px] font-bold text-[#5B667A]">
                    Fields marked <span className="text-[#B42318]">*</span> are required
                  </span>
                  <span className="flex gap-2.5 ml-auto">
                    <button type="button" onClick={close} className={btnLine}>
                      Cancel
                    </button>
                    <button type="submit" disabled={pending} className={btnBlue}>
                      {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" strokeWidth={2.6} />}
                      {mode === 'invite' ? 'Add doctor and send invite' : 'Add doctor'}
                    </button>
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/** Edits one doctor's profile: the details patients see when booking. */
export function EditDoctorButton({
  doctor,
  departments,
  className,
  iconOnly,
}: {
  doctor: EditableDoctor
  departments: string[]
  className: string
  iconOnly?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('basic')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()
  const [bioText, setBioText] = useState(doctor.bio || '')
  // The pause switch acts at once; it isn't part of Save.
  const [paused, setPaused] = useState(!!doctor.paused)
  const [pauseError, setPauseError] = useState<string | null>(null)
  const [pausePending, startPause] = useTransition()

  const title = doctor.name.startsWith('Dr') ? doctor.name : `Dr. ${doctor.name}`

  // Profile photo: uploads as soon as a file is chosen; it isn't part of Save.
  const photoInput = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<string | null>(doctor.image ?? null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoPending, startPhoto] = useTransition()
  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setPhotoError('Use a JPG, PNG or WebP photo.')
    if (file.size > 5 * 1024 * 1024) return setPhotoError('The photo must be under 5 MB.')
    setPhotoError(null)
    const preview = URL.createObjectURL(file)
    const data = new FormData()
    data.append('doctorId', doctor.id)
    data.append('image', file)
    startPhoto(async () => {
      const res = await uploadDoctorPhoto(data)
      if (!res.ok) {
        URL.revokeObjectURL(preview)
        return setPhotoError(res.error)
      }
      setPhoto(preview)
      router.refresh()
    })
  }

  // Password reset link: emailed to the doctor only; the link never reaches this page.
  const [resetSent, setResetSent] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetPending, startReset] = useTransition()
  const sendReset = () => {
    setResetSent(null)
    setResetError(null)
    startReset(async () => {
      const res = await sendDoctorPasswordLink(doctor.id)
      if (!res.ok) return setResetError(res.error)
      setResetSent(res.sentTo)
    })
  }

  const togglePause = () => {
    const next = !paused
    setPauseError(null)
    startPause(async () => {
      const res = await setHospitalDoctorPaused(doctor.id, next)
      if (!res.ok) return setPauseError(res.error)
      setPaused(res.paused)
      router.refresh()
    })
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    start(async () => {
      const res = await updateHospitalDoctor(form)
      if (!res.success) {
        setSaved(false)
        return setError(res.error)
      }
      setError(null)
      setSaved(true)
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!window.confirm(`Are you sure you want to remove ${title} from the hospital directory?`)) return
    const form = new FormData()
    form.append('doctorId', doctor.id)
    start(async () => {
      const res = await deleteHospitalDoctor(form)
      if (!res.success) return setError(res.error || 'Could not remove the doctor.')
      setOpen(false)
      setError(null)
      router.refresh()
    })
  }

  const tabs = [
    { id: 'basic', label: 'Basic information', sub: 'Name and contact' },
    { id: 'clinic', label: 'Clinic and consultation', sub: 'Speciality, experience and fee' },
    { id: 'qualifications', label: 'Qualifications', sub: 'Education and registration' },
    { id: 'schedule', label: 'Schedule', sub: 'Slots and leave' },
    { id: 'account', label: 'Account access', sub: 'Staff ID and sign-in email' },
    { id: 'about', label: 'About', sub: 'What patients read' },
  ]
  const current = tabs.find((t) => t.id === activeTab) ?? tabs[0]
  const panel = (id: string) => (activeTab === id ? 'flex flex-col gap-[18px]' : 'hidden')

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSaved(false)
          setError(null)
          setOpen(true)
        }}
        className={className}
        title={`Edit ${doctor.name}`}
        aria-label={iconOnly ? `Edit ${doctor.name}` : undefined}
      >
        <Pencil className="w-4 h-4" />
        {!iconOnly && 'Edit'}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Edit ${title}`} className={overlay}>
          <div className={`${shell} sm:w-[min(1040px,calc(100%-32px))]`}>
            <div className="flex items-start justify-between gap-4 px-4 sm:px-7 pt-[22px] sm:pt-[26px] pb-5">
              <div>
                <h2 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em]">Edit {title}</h2>
                <p className="mt-[5px] text-[13.5px] sm:text-[14px] text-[#5B667A]">Update the doctor’s details, clinic information and account access.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className={closeBtn}>
                <X className="w-[18px] h-[18px]" strokeWidth={2.4} />
              </button>
            </div>

            <form
              onSubmit={submit}
              onChange={() => setSaved(false)}
              onInvalidCapture={(e) => {
                // A required field on a hidden tab: open that tab so the message can show.
                const tab = (e.target as HTMLElement).closest('[data-tab]')?.getAttribute('data-tab')
                if (tab) setActiveTab(tab)
              }}
            >
              <input type="hidden" name="doctorId" value={doctor.id} />
              <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] border-t border-[#EEF2F7]">
                <nav aria-label="Doctor details" className="bg-[#F7F9FC] lg:border-r border-b lg:border-b-0 border-[#EEF2F7] py-3 lg:py-[18px]">
                  <p className="hidden lg:block px-6 pb-2.5 text-[11.5px] font-extrabold tracking-[0.08em] text-[#8A94A6]">DOCTOR DETAILS</p>
                  <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible">
                    {tabs.map((t) => {
                      const on = t.id === activeTab
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveTab(t.id)}
                          aria-current={on ? 'page' : undefined}
                          className={`shrink-0 text-left px-5 lg:px-6 py-3 lg:py-[13px] transition-colors ${on ? 'bg-white shadow-[inset_3px_0_0_#2A4DD0]' : 'hover:bg-[#F0F3F9]'}`}
                        >
                          <span className={`block text-[14.5px] ${on ? 'font-extrabold text-[#2A4DD0]' : 'font-bold text-[#27324A]'}`}>{t.label}</span>
                          <span className="hidden lg:block mt-0.5 text-[12.5px] text-[#5B667A]">{t.sub}</span>
                        </button>
                      )
                    })}
                  </div>
                </nav>

                <div className="px-4 sm:px-[30px] py-[26px] lg:min-h-[560px] min-w-0">
                  <h3 className="text-[18px] font-extrabold">{current.label}</h3>
                  <p className="mt-1 mb-[22px] text-[13.5px] text-[#5B667A]">
                    {current.sub} for {title}.
                  </p>

                  <div data-tab="basic" className={panel('basic')}>
                    <div className="flex items-center gap-3.5">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" className="w-14 h-14 shrink-0 rounded-full object-cover bg-[#EEF3FF]" />
                      ) : (
                        <span aria-hidden className="w-14 h-14 shrink-0 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[18px] font-extrabold">
                          {doctor.name.replace(/^Dr\.?\s*/i, '').slice(0, 2).toUpperCase() || 'DR'}
                        </span>
                      )}
                      <div className="min-w-0">
                        <span className={`${label} !mb-0`}>Profile photo</span>
                        <span className={hint}>JPG, PNG or WebP, up to 5 MB. Patients see this when they book, and the Verified badge needs it.</span>
                        <button type="button" onClick={() => photoInput.current?.click()} disabled={photoPending} className={`${btnLine} mt-2.5`}>
                          {photoPending && <LoaderCircle className="w-4 h-4 animate-spin" />}
                          {photoPending ? 'Uploading…' : 'Upload photo'}
                        </button>
                        {/* No name: the Save form never sends it. */}
                        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhoto} />
                        {photoError && (
                          <span role="alert" className="block mt-1.5 text-[12.5px] font-bold text-[#B42318]">
                            {photoError}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] items-start">
                      <label className="block min-w-0">
                        <span className={label}>
                          Full name
                          <Req />
                        </span>
                        <input name="fullName" required minLength={2} maxLength={120} defaultValue={doctor.name} className={input} />
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>Mobile number</span>
                        <input name="phone" type="tel" inputMode="tel" maxLength={30} defaultValue={doctor.phone ?? ''} className={input} />
                      </label>
                    </div>
                  </div>

                  <div data-tab="clinic" className={panel('clinic')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] items-start">
                      <label className="block min-w-0">
                        <span className={label}>
                          Speciality
                          <Req />
                        </span>
                        <input name="specialty" required list="hospital-departments-edit" maxLength={80} defaultValue={doctor.specialty ?? ''} className={input} />
                        <datalist id="hospital-departments-edit">
                          {departments.map((d) => (
                            <option key={d} value={d} />
                          ))}
                        </datalist>
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>
                          Years of experience
                          <Req />
                        </span>
                        <input name="experience" type="number" inputMode="numeric" min={0} max={70} required defaultValue={doctor.experience ?? ''} className={input} />
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>
                          Consultation fee
                          <Req />
                        </span>
                        <Rupee>
                          <input name="fee" type="number" inputMode="numeric" min={1} required defaultValue={doctor.fee ?? ''} aria-label="Consultation fee in rupees" className={bareInput} />
                        </Rupee>
                        <span className={hint}>Collected at your counter for each visit.</span>
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>Room or cabin</span>
                        <input name="address" maxLength={200} defaultValue={doctor.address ?? ''} className={input} />
                        <span className={hint}>Shown on the confirmation slip.</span>
                      </label>
                    </div>
                  </div>

                  <div data-tab="qualifications" className={panel('qualifications')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] items-start">
                      <label className="block min-w-0 sm:col-span-2">
                        <span className={label}>Qualifications</span>
                        <input name="qualifications" maxLength={200} defaultValue={doctor.qualifications ?? ''} className={input} />
                        <span className={hint}>For example MBBS, MS (Ortho).</span>
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>Medical registration number</span>
                        <input name="registrationNumber" maxLength={40} defaultValue={doctor.registrationNumber ?? ''} autoComplete="off" className={input} />
                        <span className={hint}>Needed for the Verified badge.</span>
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>Medical council</span>
                        <CouncilSelect defaultValue={doctor.registrationCouncil} />
                      </label>
                    </div>
                  </div>

                  <div data-tab="schedule" className={panel('schedule')}>
                    <p className="text-[14px] leading-[1.5] text-[#27324A]">Patients can book only the slots you publish. Add or remove slots for this doctor on their schedule page, and answer their leave requests.</p>
                    <div className="flex flex-wrap gap-2.5">
                      <Link href={`/hospital/doctors/${doctor.id}/schedule`} className={btnBlue}>
                        Open schedule <ExternalLink className="w-4 h-4" />
                      </Link>
                      <Link href="/hospital/doctors/leave" className={btnLine}>
                        Leave requests
                      </Link>
                    </div>
                  </div>

                  <div data-tab="account" className={panel('account')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] items-start">
                      <label className="block min-w-0">
                        <span className={label}>Staff ID</span>
                        <input readOnly value={doctor.staffId || '—'} className={`${input} font-mono`} />
                        <span className={hint}>Used to sign in to the doctor portal. It can’t be changed.</span>
                      </label>
                      <label className="block min-w-0">
                        <span className={label}>Sign-in email</span>
                        <input readOnly value={doctor.email || '—'} className={input} />
                      </label>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-[18px] border-t border-[#EEF2F7]">
                      <div className="min-w-0">
                        <span className={`${label} !mb-0`}>Password</span>
                        <span className={hint}>We email the doctor a link to set a new password. You never see the link.</span>
                        {resetSent && (
                          <span role="status" className="block mt-1.5 text-[12.5px] font-extrabold text-[#067647]">
                            Sent to {resetSent}
                          </span>
                        )}
                        {resetError && (
                          <span role="alert" className="block mt-1.5 text-[12.5px] font-bold text-[#B42318]">
                            {resetError}
                          </span>
                        )}
                      </div>
                      <button type="button" onClick={sendReset} disabled={resetPending} className={`${btnLine} shrink-0`}>
                        {resetPending && <LoaderCircle className="w-4 h-4 animate-spin" />}
                        Send password reset link
                      </button>
                    </div>
                    {doctor.paused !== undefined && (
                      <div className="flex items-center justify-between gap-4 pt-[18px] border-t border-[#EEF2F7]">
                        <div className="min-w-0">
                          <span className={`${label} !mb-0`}>Account status</span>
                          <span className="block mt-1 text-[14px] font-extrabold" style={{ color: paused ? '#B54708' : '#067647' }}>
                            {paused ? 'Paused · hidden from patients' : 'Active · listed for booking'}
                          </span>
                          <span className={hint}>
                            Paused doctors don’t show in search or on your hospital page and can’t be booked. Bookings already made stay.
                            {paused && doctor.pausedBy === 'doctor' ? ' Paused by the doctor.' : ''}
                            {!doctor.pauseReady ? ' Opens after the next update.' : ''}
                          </span>
                          {pauseError && (
                            <span role="alert" className="block mt-1.5 text-[12.5px] font-bold text-[#B42318]">
                              {pauseError}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!paused}
                          aria-label="Taking bookings"
                          disabled={!doctor.pauseReady || pausePending}
                          onClick={togglePause}
                          className="relative shrink-0 w-11 h-[26px] rounded-full transition-colors disabled:opacity-60"
                          style={{ background: paused ? '#C9D2E0' : '#2A4DD0' }}
                        >
                          <span className="absolute top-0.5 w-[22px] h-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(11,27,63,0.25)] transition-all" style={{ left: paused ? 2 : 18 }} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div data-tab="about" className={panel('about')}>
                    <label className="block">
                      <span className="flex items-center justify-between">
                        <span className={label}>About the doctor</span>
                        <span className="mb-1.5 text-[12px] text-[#8A94A6]">{bioText.length}/500</span>
                      </span>
                      <textarea
                        name="bio"
                        rows={5}
                        maxLength={500}
                        value={bioText}
                        onChange={(e) => setBioText(e.target.value)}
                        placeholder="What patients should know about this doctor"
                        className={`${input} !h-auto py-3 resize-none`}
                      />
                    </label>
                    <Link href={`/doctors/${doctor.id}`} className="inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#2A4DD0] hover:underline">
                      View public profile <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>

                  {error && (
                    <p role="alert" className="mt-[18px] p-3.5 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13.5px] font-bold">
                      {error}
                    </p>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 sm:gap-4 px-4 sm:px-7 py-4 bg-white border-t border-[#E6EAF0]">
                <button type="button" onClick={handleDelete} disabled={pending} className="inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#B42318] hover:underline disabled:opacity-60">
                  <Trash2 className="w-4 h-4" /> Remove doctor
                </button>
                <span className="flex flex-wrap items-center gap-2.5 ml-auto">
                  {saved && (
                    <span role="status" className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-[#067647]">
                      <Check className="w-4 h-4" strokeWidth={3} /> Changes saved
                    </span>
                  )}
                  <button type="button" onClick={() => setOpen(false)} className={btnLine}>
                    {saved ? 'Close' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={pending} className={btnBlue}>
                    {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
                    Save changes
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
