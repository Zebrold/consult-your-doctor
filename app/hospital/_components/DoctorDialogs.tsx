'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  CalendarDays, CheckCircle2, ChevronDown, CircleCheck, GraduationCap,
  Hospital, Info, KeyRound, LoaderCircle, Lock, Mail, MapPin, Monitor,
  Pencil, Phone, Plus, RefreshCw, Send, ShieldCheck, Stethoscope, Trash2,
  Upload, User, X, Briefcase, FileText, Globe
} from 'lucide-react'
import { createHospitalDoctor, updateHospitalDoctor, deleteHospitalDoctor } from '@/app/actions/hospital'
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
}

const inputClass =
  'w-full rounded-xl bg-gray-50/80 hover:bg-gray-50 border border-gray-200/90 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all'

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

/** Registers a new doctor at this hospital with the layout matching Image 5 */
export function AddDoctorButton({
  departments,
  className,
  label = 'Add Doctor',
}: {
  departments: string[]
  className: string
  label?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<string | null>(null)
  const [activationLink, setActivationLink] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
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
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={close}
          />

          {/* Modal Container (Matches Image 5) */}
          <div className="relative w-full max-w-3xl my-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92dvh]">
            
            {/* Header */}
            <div className="p-6 sm:p-7 border-b border-gray-100 flex items-start justify-between gap-4 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/60">
                  <Image
                    src="/logo-icon.png"
                    alt="Logo"
                    width={26}
                    height={26}
                    className="w-6.5 h-6.5 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Add Doctor
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Create a doctor profile, assign access, and send a secure invitation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="bg-gray-50/70 border-b border-gray-100 px-6 sm:px-8 py-3.5">
              <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-lg mx-auto">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0066ff] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                    1
                  </span>
                  <span className="text-xs font-bold text-[#0066ff] whitespace-nowrap">
                    Doctor profile
                  </span>
                </div>
                <div className="h-[2px] w-8 sm:w-16 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                    Clinic details
                  </span>
                </div>
                <div className="h-[2px] w-8 sm:w-16 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                    Account access
                  </span>
                </div>
              </div>
            </div>

            {/* Form Body (Scrollable) */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              {created !== null ? (
                <div className="flex flex-col gap-5 py-4">
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-base">Doctor Profile &amp; Credentials Created</h4>
                      <p className="text-sm mt-1">
                        Doctor Staff ID: <span className="font-mono font-bold text-[#0066ff] bg-white px-2 py-0.5 rounded border border-emerald-200">{created}</span>
                      </p>
                      {inviteEmail && (
                        <p className="mt-2 text-xs text-emerald-800">
                          An official setup &amp; activation email was sent to <span className="font-bold">{inviteEmail}</span>.
                        </p>
                      )}
                    </div>
                  </div>

                  {activationLink && (
                    <div className="p-4 rounded-2xl bg-[#f0f7ff] border border-blue-200 flex flex-col gap-2">
                      <span className="text-xs font-bold text-blue-900">Direct Activation Link:</span>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={activationLink}
                          className="flex-1 text-xs bg-white px-3 py-2 rounded-xl border border-blue-200 font-mono text-gray-700 truncate"
                        />
                        <button
                          type="button"
                          onClick={copyLink}
                          className="px-4 py-2 rounded-xl bg-[#0066ff] text-white text-xs font-bold hover:bg-[#0050cb] transition-colors shrink-0"
                        >
                          {copiedLink ? 'Copied!' : 'Copy Link'}
                        </button>
                      </div>
                      <span className="text-[11px] text-blue-700">The clinician can click this link anytime to set their password.</span>
                    </div>
                  )}

                  {created && password && (
                    <WelcomeLetterButton
                      username={created}
                      password={password}
                      className="w-full py-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-[#0066ff] text-sm font-bold inline-flex items-center justify-center gap-2 border border-blue-200 transition-colors"
                    />
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={close}
                      className="px-6 py-2.5 rounded-xl bg-[#0066ff] text-white text-sm font-bold hover:bg-[#0050cb]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="flex flex-col gap-6">
                  
                  {/* Card 1: 1. DOCTOR PROFILE */}
                  <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0066ff] flex items-center justify-center shrink-0 border border-blue-100">
                        <User className="w-4 h-4 text-[#0066ff]" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                          1. Doctor Profile
                        </h3>
                        <p className="text-[11.5px] text-gray-500">
                          Basic details about the doctor.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Full name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                          <input
                            name="fullName"
                            required
                            minLength={2}
                            placeholder="Dr. Ananya Rao"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Specialty / department <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Stethoscope className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="specialty"
                            required
                            list="hospital-departments"
                            defaultValue="Cardiology"
                            placeholder="Cardiology"
                            className={`${inputClass} pl-9`}
                          />
                          <datalist id="hospital-departments">
                            {departments.map((d) => (
                              <option key={d} value={d} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Years of experience <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="experienceYears"
                            type="number"
                            min={0}
                            max={70}
                            defaultValue={0}
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Medical registration number
                        </label>
                        <div className="relative">
                          <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="registrationNumber"
                            placeholder="Enter registration number"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: 2. CLINIC & CONSULTATION */}
                  <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0066ff] flex items-center justify-center shrink-0 border border-blue-100">
                        <Hospital className="w-4 h-4 text-[#0066ff]" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                          2. Clinic &amp; Consultation
                        </h3>
                        <p className="text-[11.5px] text-gray-500">
                          Assign the doctor to a clinic and set consultation details.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Clinic / hospital <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Hospital className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="hospitalName"
                            defaultValue="ABC Hospital"
                            placeholder="ABC Hospital"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Consultation fee (₹) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="text-gray-500 font-bold absolute left-3.5 top-2.5">₹</span>
                          <input
                            name="consultationFee"
                            type="number"
                            min={1}
                            required
                            defaultValue={500}
                            placeholder="Enter amount"
                            className={`${inputClass} pl-8`}
                          />
                        </div>
                        <span className="text-[10.5px] text-gray-400 mt-1 block">
                          Per booked doctor consultation.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Availability
                        </label>
                        <div className="relative">
                          <CalendarDays className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <select
                            name="availability"
                            defaultValue="set_after"
                            className={`${inputClass} pl-9 appearance-none pr-8 cursor-pointer`}
                          >
                            <option value="set_after">Set after invitation</option>
                            <option value="full_time">Full Time (Mon - Sat)</option>
                            <option value="morning">Morning Shift (9 AM - 1 PM)</option>
                            <option value="evening">Evening Shift (4 PM - 8 PM)</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: 3. ACCOUNT ACCESS */}
                  <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0066ff] flex items-center justify-center shrink-0 border border-blue-100">
                        <Lock className="w-4 h-4 text-[#0066ff]" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                          3. Account Access
                        </h3>
                        <p className="text-[11.5px] text-gray-500">
                          Send an invitation to the doctor or set a password manually.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Doctor's email (Account Invitation) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="email"
                            type="email"
                            required
                            placeholder="doctor@example.com"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                        <span className="text-[10.5px] text-gray-400 mt-1 block">
                          A secure activation link will be sent to this address; the doctor creates their own password.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Manual password (optional)
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="password"
                            type="password"
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="Leave blank for email invitation"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                        <span className="text-[10.5px] text-gray-400 mt-1 block">
                          Use at least 8 characters if setting a password manually.
                        </span>
                      </div>
                    </div>

                    {/* Blue check banner */}
                    <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-100/80 flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#0066ff] text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs text-blue-950 font-medium">
                        A unique staff ID will be generated automatically. Invitation status will appear in the doctor directory.
                      </span>
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="p-3.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
                      {error}
                    </p>
                  )}

                  {/* Footer buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={close}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="px-6 py-2.5 rounded-xl bg-[#0066ff] hover:bg-[#0050cb] text-white text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                    >
                      {pending ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Add Doctor &amp; Send Invite
                    </button>
                  </div>

                </form>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}

/** Edits doctor profile with layout matching Image 3 */
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
  const [pending, start] = useTransition()
  const [languages, setLanguages] = useState<string[]>(['English', 'Hindi'])
  const [bioText, setBioText] = useState(doctor.bio || '')

  const removeLang = (lang: string) => {
    setLanguages((prev) => prev.filter((l) => l !== lang))
  }

  const addLang = (lang: string) => {
    if (lang && !languages.includes(lang)) {
      setLanguages((prev) => [...prev, lang])
    }
  }

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

  const handleDelete = () => {
    if (!window.confirm(`Are you sure you want to remove Dr. ${doctor.name} from the hospital directory?`)) {
      return
    }
    const form = new FormData()
    form.append('doctorId', doctor.id)
    start(async () => {
      const res = await deleteHospitalDoctor(form)
      if (!res.success) return setError(res.error || 'Failed to delete')
      setOpen(false)
      setError(null)
      router.refresh()
    })
  }

  const tabs = [
    { id: 'basic', label: 'Basic Information', sub: 'Profile details', icon: User },
    { id: 'clinic', label: 'Clinic & Consultation', sub: 'Practice details', icon: Briefcase },
    { id: 'qualifications', label: 'Qualifications', sub: 'Education & certifications', icon: FileText },
    { id: 'schedule', label: 'Schedule', sub: 'Availability & working hours', icon: CalendarDays },
    { id: 'account', label: 'Account Access', sub: 'Doctor ID, email & security', icon: KeyRound },
    { id: 'about', label: 'About', sub: 'Bio, languages and more', icon: Info },
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        title={`Edit ${doctor.name}`}
        aria-label={iconOnly ? `Edit ${doctor.name}` : undefined}
      >
        <Pencil className="w-4 h-4" />
        {!iconOnly && 'Edit'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
          />

          {/* Modal Card (Matches Image 3) */}
          <div className="relative w-full max-w-4xl my-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92dvh]">
            
            {/* Header */}
            <div className="p-6 sm:p-7 border-b border-gray-100 flex items-start justify-between gap-4 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/60">
                  <Image
                    src="/logo-icon.png"
                    alt="Logo"
                    width={26}
                    height={26}
                    className="w-6.5 h-6.5 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Edit {doctor.name.startsWith('Dr') ? doctor.name : `Dr. ${doctor.name}`}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Update the doctor's details, clinic information and account settings.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Form Content with Sidebar and Form Panels */}
            <form onSubmit={submit} className="flex-1 overflow-y-auto flex flex-col">
              <input type="hidden" name="doctorId" value={doctor.id} />

              <div className="grid grid-cols-1 md:grid-cols-12 flex-1">
                
                {/* Left Sidebar Navigation Tabs */}
                <div className="md:col-span-4 border-r border-gray-100 p-4 sm:p-5 bg-gray-50/50 flex flex-col gap-1.5">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    const active = activeTab === tab.id
                    return (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id)
                          const el = document.getElementById(`section-${tab.id}`)
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        className={`flex items-start gap-3 p-3 rounded-2xl text-left transition-all ${
                          active
                            ? 'bg-white text-[#0066ff] shadow-sm border border-blue-100'
                            : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          active ? 'bg-blue-50 text-[#0066ff]' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className={`block text-xs font-bold leading-tight ${active ? 'text-[#0066ff]' : 'text-gray-900'}`}>
                            {tab.label}
                          </span>
                          <span className="block text-[11px] text-gray-400 mt-0.5 leading-tight truncate">
                            {tab.sub}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Right Form Fields Area */}
                <div className="md:col-span-8 p-6 sm:p-8 flex flex-col gap-8">
                  
                  {/* Section 1: Profile Information */}
                  <div id="section-basic" className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Profile Information
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          These details are visible to patients when they book an appointment.
                        </p>
                      </div>

                      {/* Photo Upload Widget */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066ff] shrink-0 font-bold text-sm">
                          {doctor.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-xl border border-blue-200 text-[#0066ff] bg-blue-50/60 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" /> Upload Photo
                          </button>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            JPG, PNG (Max 2 MB)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Full name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="fullName"
                            required
                            defaultValue={doctor.name}
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Display name (as shown to patients) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="displayName"
                            required
                            defaultValue={doctor.name.startsWith('Dr') ? doctor.name : `Dr. ${doctor.name}`}
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Gender
                        </label>
                        <div className="relative">
                          <select
                            name="gender"
                            defaultValue="female"
                            className={`${inputClass} appearance-none pr-8 cursor-pointer`}
                          >
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Mobile number
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="phone"
                            type="tel"
                            defaultValue={doctor.phone ?? ''}
                            placeholder="+91 98765 43210"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Email address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="email"
                            type="email"
                            defaultValue={doctor.email ?? ''}
                            placeholder="ananya.pandey@hospital.com"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Doctor ID (Staff ID) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            readOnly
                            defaultValue={doctor.staffId || `DR${doctor.id.slice(0, 5).toUpperCase()}`}
                            className={`${inputClass} font-mono bg-gray-100 pr-9`}
                          />
                          <button
                            type="button"
                            title="Auto-generated unique ID"
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10.5px] text-gray-400 mt-1 block">
                          Unique ID used for login and internal reference.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Specialization & Experience */}
                  <div id="section-clinic" className="flex flex-col gap-4">
                    <h3 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
                      Specialization &amp; Experience
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Speciality / department <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Stethoscope className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="specialty"
                            required
                            list="hospital-departments-edit"
                            defaultValue={doctor.specialty ?? 'Pediatrics'}
                            className={`${inputClass} pl-9`}
                          />
                          <datalist id="hospital-departments-edit">
                            {departments.map((d) => (
                              <option key={d} value={d} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Years of experience <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="experience"
                            type="number"
                            min={0}
                            max={70}
                            required
                            defaultValue={doctor.experience ?? 4}
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Consultation fee (₹) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="text-gray-500 font-bold absolute left-3.5 top-2.5">₹</span>
                          <input
                            name="fee"
                            type="number"
                            min={1}
                            required
                            defaultValue={doctor.fee ?? 500}
                            className={`${inputClass} pl-8`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Qualifications & Registration */}
                  <div id="section-qualifications" className="flex flex-col gap-4">
                    <h3 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
                      Qualifications &amp; Registration
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Qualifications <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <GraduationCap className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="qualifications"
                            defaultValue={doctor.qualifications ?? 'MBBS, MD'}
                            placeholder="MBBS, MD"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Medical registration number
                        </label>
                        <div className="relative">
                          <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="registrationNumber"
                            defaultValue="APMC12345"
                            placeholder="APMC12345"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Registration council
                        </label>
                        <div className="relative">
                          <select
                            name="registrationCouncil"
                            defaultValue="Andhra Pradesh Medical Council"
                            className={`${inputClass} appearance-none pr-8 cursor-pointer`}
                          >
                            {councilsList.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Clinic & Room Details */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
                      Clinic &amp; Room Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Clinic / hospital <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Hospital className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="clinic"
                            defaultValue={doctor.hospitalName || 'ABC Hospital'}
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Room / location
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="address"
                            defaultValue={doctor.address ?? 'OPD Block B, Room 204'}
                            placeholder="OPD Block B, Room 204"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Consultation type
                        </label>
                        <div className="relative">
                          <Monitor className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <select
                            name="consultationType"
                            defaultValue="both"
                            className={`${inputClass} pl-9 appearance-none pr-8 cursor-pointer`}
                          >
                            <option value="both">Both (Online &amp; In-person)</option>
                            <option value="in_person">In-person only</option>
                            <option value="online">Online consultation only</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Account Access & Additional Information (2 Columns) */}
                  <div id="section-account" className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    
                    {/* Left Box: Account Access */}
                    <div className="rounded-2xl border border-gray-200/90 p-4.5 bg-gray-50/40 flex flex-col gap-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                          Account Access
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Manage login access for the doctor.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2.5 mt-1">
                        <div>
                          <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                            Account email
                          </span>
                          <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs">
                            <span className="truncate font-medium text-gray-700">
                              {doctor.email || 'ananya.pandey@hospital.com'}
                            </span>
                            <button
                              type="button"
                              onClick={() => alert(`Email change link dispatched for ${doctor.email}`)}
                              className="text-xs font-bold text-[#0066ff] hover:underline shrink-0"
                            >
                              Change Email
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                            Password
                          </span>
                          <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs">
                            <span className="font-mono text-gray-500 tracking-widest">
                              ••••••••
                            </span>
                            <button
                              type="button"
                              onClick={() => alert(`Password reset instructions sent to ${doctor.email || 'registered doctor email'}`)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0066ff] text-[11px] font-bold hover:bg-blue-100 transition-colors shrink-0"
                            >
                              Reset Password
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Box: Additional Information */}
                    <div id="section-about" className="rounded-2xl border border-gray-200/90 p-4.5 bg-gray-50/40 flex flex-col gap-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                          Additional Information
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Languages spoken and patient biography.
                        </p>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                          Languages spoken
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white rounded-xl border border-gray-200 min-h-[38px]">
                          {languages.map((lang) => (
                            <span
                              key={lang}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0066ff] text-xs font-semibold"
                            >
                              {lang}
                              <button
                                type="button"
                                onClick={() => removeLang(lang)}
                                className="hover:text-blue-900"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const next = prompt('Enter language to add (e.g. Telugu, Tamil, Marathi):')
                              if (next) addLang(next.trim())
                            }}
                            className="text-[11px] font-bold text-gray-400 hover:text-[#0066ff] px-2 py-0.5"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-gray-500">
                            About (visible to patients)
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {bioText.length}/500
                          </span>
                        </div>
                        <textarea
                          name="bio"
                          rows={2}
                          maxLength={500}
                          value={bioText}
                          onChange={(e) => setBioText(e.target.value)}
                          placeholder="Experienced Pediatrician with 4+ years of experience in child healthcare, growth and development..."
                          className={`${inputClass} text-xs resize-none`}
                        />
                      </div>
                    </div>

                  </div>

                  {error && (
                    <p role="alert" className="p-3.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
                      {error}
                    </p>
                  )}

                </div>
              </div>

              {/* Modal Footer (Matches Image 3) */}
              <div className="p-5 sm:p-6 border-t border-gray-100 flex items-center justify-between gap-4 bg-white sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="px-4 py-2.5 rounded-xl bg-red-50/70 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Doctor
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="px-6 py-2.5 rounded-xl bg-[#0066ff] hover:bg-[#0050cb] text-white text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                  >
                    {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  )
}
