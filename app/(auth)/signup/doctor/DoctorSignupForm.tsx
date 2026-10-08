'use client'

import { startTransition, useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  CircleCheck,
  IdCard,
  Info,
  Loader2,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { submitDoctorSignup } from '@/app/actions/doctorAuth'
import { COUNTRY_CODES } from '@/lib/countryCodes'

const countryCodes = [...COUNTRY_CODES].sort((a, b) => a.code.localeCompare(b.code))

const councils = [
  'National Medical Commission (NMC India)',
  'State Medical Council (India)',
  'General Medical Council (GMC UK)',
  'US State Medical Board (NPI)',
  'Irish Medical Council (IMC)',
  'AHPRA Medical Board of Australia',
  'Dubai Health Authority (DHA / MOHAP)',
  'German State Medical Chamber (Ärztekammer)',
  'Other',
]

// Values are stored as the doctor's specialty and department name, so they must stay in sync with existing data.
const specialties = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Oncology',
  'Dermatology',
  'General Practice',
  'Psychiatry',
  'Internal Medicine',
]

const steps = [
  { section: 'identity', title: 'Identity & Contact' },
  { section: 'license', title: 'License & Medical Board' },
  { section: 'practice', title: 'Practice & Declarations' },
]

const inputClass =
  'w-full bg-surface-container-lowest text-indigo-gray-900 rounded-lg border border-outline-variant/60 p-2.5 text-sm outline-none focus:border-vibrant-blue focus:ring-2 focus:ring-vibrant-blue/20 placeholder:text-indigo-gray-600/50 transition-all'
const selectClass = `${inputClass} appearance-none pr-9 cursor-pointer`

function Field({
  label,
  htmlFor,
  hint,
  className = '',
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="font-label-sm text-label-sm text-indigo-gray-600" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="text-[11px] text-indigo-gray-600">{hint}</span>}
    </div>
  )
}

function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-600 pointer-events-none" />
    </div>
  )
}

export function DoctorSignupForm({ hospitals }: { hospitals: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(submitDoctorSignup, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [sectionsDone, setSectionsDone] = useState<boolean[]>(steps.map(() => false))

  const submitted = Boolean(state?.success)

  // A section counts as complete once every required field inside it passes native validation.
  const updateProgress = () => {
    const form = formRef.current
    if (!form) return
    setSectionsDone(
      steps.map(({ section }) =>
        Array.from(form.querySelectorAll<HTMLFieldSetElement>(`fieldset[data-section="${section}"]`)).every((fieldset) =>
          Array.from(fieldset.elements).every((el) => !(el instanceof HTMLInputElement || el instanceof HTMLSelectElement) || el.checkValidity())
        )
      )
    )
  }

  const currentStep = submitted ? steps.length : sectionsDone.findIndex((done) => !done)

  return (
    <div className="w-full max-w-container-max mx-auto flex flex-col gap-6">
      {/* Header card */}
      <div className="relative w-full rounded-2xl bg-surface-container-lowest p-6 md:p-8 shadow-sm overflow-hidden">
        <div aria-hidden className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute right-1/4 -bottom-16 w-48 h-48 rounded-full bg-fresh-teal/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-indigo-gray-900 tracking-tight mb-2">
            Create Your Doctor Account &amp; License Verification
          </h1>
          <p className="font-body-md text-body-md text-indigo-gray-600">
            Join our verified clinical network. Submit your medical registration details and our credentialing team will verify them before activating your tele-consultation privileges.
          </p>
        </div>

        {/* Progress */}
        <ol className="relative z-10 mt-8 bg-surface-container-low/50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...steps.map((s) => s.title), 'Credential Review'].map((title, i) => {
            const isReview = i === steps.length
            const done = isReview ? false : submitted || sectionsDone[i]
            const current = i === currentStep
            const status = isReview
              ? submitted ? 'Under Review' : 'After Submission'
              : done ? 'Complete' : current ? 'In Focus' : 'Next'

            return (
              <li
                key={title}
                aria-current={current ? 'step' : undefined}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  current ? 'bg-vibrant-blue/5 shadow-sm' : done ? 'bg-surface-container-lowest shadow-sm' : 'bg-surface-container-lowest/60'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    done ? 'bg-fresh-teal text-white' : current ? 'bg-vibrant-blue text-on-primary' : 'bg-surface-container text-indigo-gray-600'
                  }`}
                >
                  {done ? <Check className="w-4 h-4" strokeWidth={3} /> : String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <div className={`text-[11px] font-label-sm uppercase ${done ? 'text-fresh-teal' : current ? 'text-vibrant-blue font-bold' : 'text-indigo-gray-600'}`}>
                    Step {String(i + 1).padStart(2, '0')} • {status}
                  </div>
                  <div className={`font-title-md text-sm truncate ${done || current ? 'font-bold text-indigo-gray-900' : 'font-semibold text-indigo-gray-600'}`}>
                    {title}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Main form */}
        <div className="lg:col-span-8">
          {submitted ? (
            <div className="bg-surface-container-lowest rounded-2xl p-8 md:p-12 shadow-sm flex flex-col items-center text-center gap-4">
              <span className="w-16 h-16 rounded-full bg-fresh-teal/10 text-fresh-teal flex items-center justify-center">
                <CircleCheck className="w-9 h-9" />
              </span>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-indigo-gray-900">Application submitted</h2>
              <p className="font-body-md text-body-md text-indigo-gray-600 max-w-lg">
                Thank you. Your application is now with our credentialing team. Once your registration is verified, our team will share your Staff ID and password so you can sign in to the Clinician Portal.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
                <Link href="/" className="px-6 py-3 rounded-full bg-surface-container text-indigo-gray-900 font-semibold text-sm hover:bg-surface-container-high transition-colors text-center">
                  Back to home
                </Link>
                <Link href="/login/doctor" className="px-6 py-3 rounded-full bg-vibrant-blue text-on-primary font-bold text-sm hover:bg-primary transition-colors text-center">
                  Clinician sign in
                </Link>
              </div>
            </div>
          ) : (
            <form
              ref={formRef}
              onSubmit={(e) => {
                // Submit manually: a form `action` would reset every field when the server returns an error.
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                startTransition(() => formAction(formData))
              }}
              onInput={updateProgress}
              onChange={updateProgress}
              className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-8"
            >
              {state?.error && (
                <div role="alert" className="p-4 bg-error-container/60 text-on-error-container text-sm rounded-xl font-semibold">
                  {state.error}
                </div>
              )}

              {/* 1. Identity & contact */}
              <fieldset data-section="identity" className="flex flex-col gap-4 min-w-0">
                <legend className="sr-only">Practitioner identity and contact</legend>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                  <span className="flex items-center gap-2">
                    <UserRound className="w-5 h-5 text-vibrant-blue" />
                    <span className="font-title-md text-title-md text-indigo-gray-900 font-bold">1. Practitioner Identity &amp; Contact</span>
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-fresh-teal/10 text-secondary font-label-sm">Primary Verification Point</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <Field label="Title" htmlFor="doc-title" className="sm:col-span-3">
                    <SelectWrap>
                      <select id="doc-title" name="title" className={selectClass} defaultValue="Dr.">
                        <option value="Dr.">Dr.</option>
                        <option value="Prof.">Prof.</option>
                        <option value="Assoc. Prof.">Assoc. Prof.</option>
                        <option value="Mr.">Mr. (Consultant Surgeon)</option>
                        <option value="Ms.">Ms. (Consultant Surgeon)</option>
                      </select>
                    </SelectWrap>
                  </Field>
                  <Field label="Legal First Name" htmlFor="first-name" className="sm:col-span-4">
                    <input id="first-name" name="firstName" type="text" required autoComplete="given-name" placeholder="e.g. Ananya" className={inputClass} />
                  </Field>
                  <Field label="Legal Surname" htmlFor="last-name" className="sm:col-span-5">
                    <input id="last-name" name="lastName" type="text" required autoComplete="family-name" placeholder="e.g. Mehta" className={inputClass} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Clinical Email" htmlFor="work-email" hint="Your clinician account will be created with this email.">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-600/60 pointer-events-none" />
                      <input id="work-email" name="email" type="email" required autoComplete="email" placeholder="doctor.name@hospital.org" className={`${inputClass} pl-9`} />
                    </div>
                  </Field>
                  <Field label="Mobile Phone" htmlFor="mobile-phone" hint="Saved to your clinician profile.">
                    <div className="flex gap-2">
                      <div className="relative w-28 shrink-0">
                        <select name="countryCode" aria-label="Country code" defaultValue="+91" className={selectClass}>
                          {countryCodes.map((c) => (
                            <option key={c.code} value={c.dialCode}>{c.code} {c.dialCode}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-600 pointer-events-none" />
                      </div>
                      <input id="mobile-phone" name="phone" type="tel" inputMode="numeric" required autoComplete="tel-national" pattern="[0-9 ]{6,15}" placeholder="98765 43210" className={`${inputClass} min-w-0`} />
                    </div>
                  </Field>
                </div>
              </fieldset>

              {/* 2. Licensing */}
              <fieldset data-section="license" className="flex flex-col gap-4 bg-surface-container-low/40 rounded-xl p-4 min-w-0">
                <legend className="sr-only">Medical licensing</legend>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <span className="flex items-center gap-2">
                    <BadgeCheck className="w-5 h-5 text-vibrant-blue" />
                    <span className="font-title-md text-title-md text-indigo-gray-900 font-bold">2. Medical Licensing &amp; Statutory Registry</span>
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-vibrant-blue/10 text-vibrant-blue font-label-sm font-semibold">Required for Verification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Regulatory Medical Board" htmlFor="council">
                    <SelectWrap>
                      <select id="council" name="council" required defaultValue="" className={selectClass}>
                        <option value="" disabled>Select your medical council</option>
                        {councils.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </SelectWrap>
                  </Field>
                  <Field label="Registration / License Number" htmlFor="registration-number">
                    <div className="relative">
                      <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-600/60 pointer-events-none" />
                      <input id="registration-number" name="registrationNumber" type="text" required placeholder="As on your certificate" className={`${inputClass} pl-9 font-mono placeholder:font-sans`} />
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Primary Medical Qualification" htmlFor="qualifications" className="sm:col-span-2">
                    <input id="qualifications" name="qualifications" type="text" required placeholder="e.g. MBBS, MD (General Medicine)" className={inputClass} />
                  </Field>
                  <Field label="Years of Experience" htmlFor="experience">
                    <input id="experience" name="experience_years" type="number" required min={0} max={80} placeholder="e.g. 8" className={inputClass} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Primary Clinical Speciality" htmlFor="specialty">
                    <SelectWrap>
                      <select id="specialty" name="specialty" required defaultValue="" className={selectClass}>
                        <option value="" disabled>Select speciality</option>
                        {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </SelectWrap>
                  </Field>
                  <Field label="Sub-speciality & Clinical Focus (optional)" htmlFor="sub-specialty">
                    <input id="sub-specialty" name="subSpecialty" type="text" placeholder="e.g. Interventional Cardiology" className={inputClass} />
                  </Field>
                </div>
              </fieldset>

              {/* 3. Practice base */}
              <fieldset data-section="practice" className="flex flex-col gap-4 min-w-0">
                <legend className="sr-only">Practice base and consultation fee</legend>
                <div className="flex items-center gap-2 pb-2">
                  <Building2 className="w-5 h-5 text-vibrant-blue" />
                  <span className="font-title-md text-title-md text-indigo-gray-900 font-bold">3. Practice Base &amp; Consultation Fee</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field
                    label="Primary Hospital"
                    htmlFor="hospital"
                    className="sm:col-span-2"
                    hint={hospitals.length === 0 ? 'No partner hospitals are listed yet. Please contact us to register your hospital first.' : 'Select the partner hospital where you practise.'}
                  >
                    <SelectWrap>
                      <select id="hospital" name="hospitalId" required defaultValue="" className={selectClass}>
                        <option value="" disabled>Select a hospital</option>
                        {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </SelectWrap>
                  </Field>
                  <Field label="Consultation Fee (₹)" htmlFor="fee">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-indigo-gray-600/70 pointer-events-none">₹</span>
                      <input id="fee" name="consultation_fee" type="number" required min={0} placeholder="e.g. 500" className={`${inputClass} pl-7`} />
                    </div>
                  </Field>
                </div>
              </fieldset>

              {/* Declarations */}
              <fieldset data-section="practice" className="flex flex-col gap-3 bg-surface-container-low/40 rounded-xl p-4 min-w-0">
                <legend className="sr-only">Declarations</legend>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input name="confirmRegistration" type="checkbox" required className="mt-0.5 w-4 h-4 rounded accent-vibrant-blue cursor-pointer shrink-0" />
                  <span className="text-xs sm:text-sm text-indigo-gray-900 leading-snug">
                    I certify that I hold full, active registration with a licence to practise from the medical council named above, and that the information I have provided is accurate.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input name="consentVerification" type="checkbox" required className="mt-0.5 w-4 h-4 rounded accent-vibrant-blue cursor-pointer shrink-0" />
                  <span className="text-xs sm:text-sm text-indigo-gray-900 leading-snug">
                    I consent to Consult Your Doctor checking my registration with the relevant medical council and processing my details for credentialing purposes.
                  </span>
                </label>
              </fieldset>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex flex-col gap-1.5">
                  <p className="flex items-center gap-2 text-indigo-gray-600 text-xs">
                    <ShieldCheck className="w-[18px] h-[18px] text-fresh-teal shrink-0" />
                    Every application is reviewed by our credentialing team before activation.
                  </p>
                  <p className="text-indigo-gray-600 text-xs">
                    By submitting, you agree to our{' '}
                    <Link className="text-primary hover:underline font-medium" href="/terms-of-use">
                      Terms &amp; Conditions
                    </Link>{' '}
                    (including the section for doctors and partners) and{' '}
                    <Link className="text-primary hover:underline font-medium" href="/privacy-policy">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:w-auto shrink-0 px-8 py-3.5 rounded-full bg-vibrant-blue text-on-primary font-title-md text-sm font-bold shadow-md hover:bg-primary hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-[18px] h-[18px] animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application for Verification <ArrowRight className="w-[18px] h-[18px]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-vibrant-blue text-on-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-title-md text-sm font-bold text-indigo-gray-900">How verification works</h2>
                  <p className="text-xs text-indigo-gray-600">Reviewed by our credentialing team</p>
                </div>
              </div>
              <ol className="flex flex-col gap-3">
                {[
                  { title: 'Submit this application', desc: 'Your details go straight to our credentialing team.' },
                  { title: 'Registration check', desc: 'We confirm your medical council registration and hospital affiliation.' },
                  { title: 'Account activation', desc: 'You receive a Staff ID and password for the Clinician Portal.' },
                ].map((item, i) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-surface-container-lowest text-vibrant-blue text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-indigo-gray-900">{item.title}</p>
                      <p className="text-xs text-indigo-gray-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <ul className="flex flex-col gap-2 pt-1">
              {['Digital prescriptions for your patients', 'Appointment schedules you control', 'Patient records in one secure place'].map((perk) => (
                <li key={perk} className="flex items-center gap-2.5 text-xs text-indigo-gray-900">
                  <BadgeCheck className="w-[18px] h-[18px] text-fresh-teal shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h2 className="font-title-md text-sm font-bold text-indigo-gray-900">Already verified?</h2>
              <p className="text-xs text-indigo-gray-600 mt-1">Sign in with the Staff ID and password shared by our team.</p>
            </div>
            <Link
              href="/login/doctor"
              className="w-full py-2.5 rounded-full bg-surface-container text-primary font-semibold text-sm text-center hover:bg-surface-container-high transition-colors"
            >
              Sign in to Clinician Portal
            </Link>
            <div className="bg-vibrant-blue/5 rounded-xl p-3.5 flex items-start gap-2.5">
              <Info className="w-[18px] h-[18px] text-vibrant-blue shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-gray-600 leading-relaxed">
                Questions about your application?{' '}
                <Link href="/contact" className="text-vibrant-blue underline font-semibold">Contact our team</Link>.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
