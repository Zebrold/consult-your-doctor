'use client'

import { startTransition, useActionState, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  CircleCheck,
  FileText,
  FlaskConical,
  IdCard,
  Info,
  Loader2,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { submitPartnerApplication } from '@/app/actions/partnerSignup'
import { COUNTRY_CODES } from '@/lib/countryCodes'
import { HOSPITAL_ACCREDITATIONS, HOSPITAL_TYPES, LAB_SERVICES, type PartnerKind } from '@/lib/partner-applications'

// The "Join as a hospital" and "Join as a diagnostic centre" forms. Applications go to the executive portal
// (Hospitals or Diagnostics → Applications), where approving one adds the organisation and its staff sign-in.

const countryCodes = [...COUNTRY_CODES].sort((a, b) => a.code.localeCompare(b.code))

const steps = [
  { section: 'organisation', title: 'Organisation' },
  { section: 'registration', title: 'Registration & Accreditation' },
  { section: 'contact', title: 'Contact & Declarations' },
]

const COPY = {
  hospital: {
    heading: 'Join as a Partner Hospital',
    intro: 'List your hospital on Consult Your Doctor so patients can find your doctors, see their open slots and book and pay online. Our operations team checks every application before a hospital goes live.',
    nameLabel: 'Hospital name',
    namePlaceholder: 'e.g. City Care Multi-speciality Hospital',
    icon: Building2,
    signIn: '/login/hospital',
    signInLabel: 'Log in to the Hospital Portal',
    perks: [
      'Publish each doctor’s slots for online booking',
      'Register walk-in patients and take PayU, UPI or cash',
      'Manage wards, beds and admissions',
      'A public hospital page with your facilities and accreditations',
    ],
    checks: 'We confirm your clinical establishment registration and any accreditation you list.',
  },
  diagnostic_center: {
    heading: 'Join as a Diagnostic Centre',
    intro: 'List your lab or imaging centre on Consult Your Doctor so patients can book your priced tests online and receive their reports in their account. Every centre is checked before it is shown to patients.',
    nameLabel: 'Centre name',
    namePlaceholder: 'e.g. Precision Diagnostics',
    icon: FlaskConical,
    signIn: '/login/diagnostic',
    signInLabel: 'Log in to the Diagnostic Portal',
    perks: [
      'Your test menu and prices, bookable online',
      'Fast booking for walk-in and phone patients',
      'Upload reports straight to the patient’s account',
      'Bookings and amounts per test, by month',
    ],
    checks: 'We confirm your registration, accreditation and the registration of the professional who signs your reports.',
  },
} as const

const inputClass =
  'w-full bg-surface-container-lowest text-indigo-gray-900 rounded-lg border border-outline-variant/60 p-2.5 text-sm outline-none focus:border-vibrant-blue focus:ring-2 focus:ring-vibrant-blue/20 placeholder:text-indigo-gray-600/50 transition-all'
const selectClass = `${inputClass} appearance-none pr-9 cursor-pointer`

function Field({ label, htmlFor, hint, className = '', children }: { label: string; htmlFor: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="font-label-sm text-label-sm text-indigo-gray-600" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="text-[11px] text-indigo-gray-600">{hint}</span>}
    </div>
  )
}

function SelectWrap({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-600 pointer-events-none" />
    </div>
  )
}

function SectionTitle({ icon: Icon, children, badge }: { icon: typeof Building2; children: ReactNode; badge?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
      <span className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-vibrant-blue" />
        <span className="font-title-md text-title-md text-indigo-gray-900 font-bold">{children}</span>
      </span>
      {badge && <span className="text-xs px-2.5 py-0.5 rounded-full bg-vibrant-blue/10 text-vibrant-blue font-label-sm font-semibold">{badge}</span>}
    </div>
  )
}

export function PartnerSignupForm({ kind }: { kind: PartnerKind }) {
  const copy = COPY[kind]
  const hospital = kind === 'hospital'
  const [state, formAction, isPending] = useActionState(submitPartnerApplication.bind(null, kind), null)
  const formRef = useRef<HTMLFormElement>(null)
  const [sectionsDone, setSectionsDone] = useState<boolean[]>(steps.map(() => false))
  const [services, setServices] = useState<string[]>([])

  const submitted = Boolean(state?.success)
  const error = state && !state.success ? state.error : null
  const ultrasound = services.includes('Ultrasound')

  // A section is complete once every required field in it passes native validation (and, for centres, a service is ticked).
  const updateProgress = () => {
    const form = formRef.current
    if (!form) return
    setSectionsDone(
      steps.map(({ section }) =>
        Array.from(form.querySelectorAll<HTMLFieldSetElement>(`fieldset[data-section="${section}"]`)).every(
          (fieldset) =>
            Array.from(fieldset.elements).every((el) => !(el instanceof HTMLInputElement || el instanceof HTMLSelectElement) || el.checkValidity()) &&
            (fieldset.dataset.needsService !== 'true' || fieldset.querySelector('input[name="services"]:checked') !== null),
        ),
      ),
    )
  }

  const currentStep = submitted ? steps.length : sectionsDone.findIndex((done) => !done)
  const Icon = copy.icon

  return (
    <div className="w-full max-w-container-max mx-auto flex flex-col gap-6">
      {/* Header card */}
      <div className="relative w-full rounded-2xl bg-surface-container-lowest p-6 md:p-8 shadow-sm overflow-hidden">
        <div className="relative z-10 flex items-start gap-4 max-w-3xl">
          <span className="hidden sm:flex w-14 h-14 rounded-2xl bg-vibrant-blue/10 text-vibrant-blue items-center justify-center shrink-0">
            <Icon className="w-7 h-7" />
          </span>
          <div>
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-indigo-gray-900 tracking-tight mb-2">{copy.heading}</h1>
            <p className="font-body-md text-body-md text-indigo-gray-600">{copy.intro}</p>
          </div>
        </div>

        <ol className="relative z-10 mt-8 bg-surface-container-low/50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...steps.map((s) => s.title), 'Review by Our Team'].map((title, i) => {
            const isReview = i === steps.length
            const done = isReview ? false : submitted || sectionsDone[i]
            const current = i === currentStep
            const status = isReview ? (submitted ? 'Under Review' : 'After Submission') : done ? 'Complete' : current ? 'In Focus' : 'Next'
            return (
              <li
                key={title}
                aria-current={current ? 'step' : undefined}
                className={`flex items-center gap-3 p-3 rounded-lg ${current ? 'bg-vibrant-blue/5 shadow-sm' : done ? 'bg-surface-container-lowest shadow-sm' : 'bg-surface-container-lowest/60'}`}
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
                  <div className={`font-title-md text-sm truncate ${done || current ? 'font-bold text-indigo-gray-900' : 'font-semibold text-indigo-gray-600'}`}>{title}</div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        <div className="lg:col-span-8">
          {submitted ? (
            <div className="bg-surface-container-lowest rounded-2xl p-8 md:p-12 shadow-sm flex flex-col items-center text-center gap-4">
              <span className="w-16 h-16 rounded-full bg-fresh-teal/10 text-fresh-teal flex items-center justify-center">
                <CircleCheck className="w-9 h-9" />
              </span>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-indigo-gray-900">Application sent</h2>
              <p className="font-body-md text-body-md text-indigo-gray-600 max-w-lg">
                Thank you. We have emailed you a copy. Our operations team will check your details and contact you. Once your {hospital ? 'hospital' : 'centre'} is approved, we
                set up the staff login your team uses to manage the listing, bookings and payments.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
                <Link href="/" className="px-6 py-3 rounded-full bg-surface-container text-indigo-gray-900 font-semibold text-sm hover:bg-surface-container-high transition-colors text-center">
                  Back to home
                </Link>
                <Link href="/legal" className="px-6 py-3 rounded-full bg-vibrant-blue text-on-primary font-bold text-sm hover:bg-primary transition-colors text-center">
                  Read our policies
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
              {error && (
                <div role="alert" className="p-4 bg-error-container/60 text-on-error-container text-sm rounded-xl font-semibold">
                  {error}
                </div>
              )}

              {/* 1. Organisation */}
              <fieldset data-section="organisation" data-needs-service={hospital ? undefined : 'true'} className="flex flex-col gap-4 min-w-0">
                <legend className="sr-only">Organisation</legend>
                <SectionTitle icon={Icon}>1. {hospital ? 'Hospital' : 'Centre'} Details</SectionTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={copy.nameLabel} htmlFor="org-name" className={hospital ? '' : 'sm:col-span-2'}>
                    <input id="org-name" name="organizationName" required minLength={2} maxLength={160} autoComplete="organization" placeholder={copy.namePlaceholder} className={inputClass} />
                  </Field>
                  {hospital && (
                    <Field label="Type of facility" htmlFor="facility-type">
                      <SelectWrap>
                        <select id="facility-type" name="facilityType" required defaultValue="" className={selectClass}>
                          <option value="" disabled>Select type</option>
                          {HOSPITAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </SelectWrap>
                    </Field>
                  )}
                </div>

                {!hospital && (
                  <div className="flex flex-col gap-2">
                    <span className="font-label-sm text-label-sm text-indigo-gray-600">Services you offer</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {LAB_SERVICES.map((service) => {
                        const checked = services.includes(service)
                        return (
                          <label
                            key={service}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                              checked ? 'border-vibrant-blue bg-vibrant-blue/5 text-indigo-gray-900' : 'border-outline-variant/60 text-indigo-gray-900 hover:bg-surface-container-low'
                            }`}
                          >
                            <input
                              type="checkbox"
                              name="services"
                              value={service}
                              checked={checked}
                              onChange={(e) => setServices((list) => (e.target.checked ? [...list, service] : list.filter((s) => s !== service)))}
                              className="w-4 h-4 rounded accent-vibrant-blue cursor-pointer shrink-0"
                            />
                            {service}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                <Field label="Full address" htmlFor="org-address">
                  <input id="org-address" name="address" required minLength={5} maxLength={300} autoComplete="street-address" placeholder="Building, street and area" className={inputClass} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="City" htmlFor="org-city">
                    <input id="org-city" name="city" required minLength={2} maxLength={80} autoComplete="address-level2" className={inputClass} />
                  </Field>
                  <Field label="State (optional)" htmlFor="org-state">
                    <input id="org-state" name="state" maxLength={80} autoComplete="address-level1" className={inputClass} />
                  </Field>
                  <Field label="PIN code (optional)" htmlFor="org-pincode">
                    <input id="org-pincode" name="pincode" maxLength={12} pattern="[A-Za-z0-9 \-]{3,12}" autoComplete="postal-code" className={inputClass} />
                  </Field>
                </div>
                <Field label="Website (optional)" htmlFor="org-website">
                  <input id="org-website" name="website" type="url" maxLength={200} placeholder="https://" className={inputClass} />
                </Field>
              </fieldset>

              {/* 2. Registration and accreditation */}
              <fieldset data-section="registration" className="flex flex-col gap-4 bg-surface-container-low/40 rounded-xl p-4 min-w-0">
                <legend className="sr-only">Registration and accreditation</legend>
                <SectionTitle icon={BadgeCheck} badge="Required for Verification">2. Registration &amp; Accreditation</SectionTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Registration or licence number" htmlFor="reg-number" hint="Your clinical establishment registration, or the licence your state or country requires.">
                    <div className="relative">
                      <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-600/60 pointer-events-none" />
                      <input id="reg-number" name="registrationNumber" required minLength={2} maxLength={80} placeholder="As on your certificate" className={`${inputClass} pl-9 font-mono placeholder:font-sans`} />
                    </div>
                  </Field>
                  <Field label="Issuing authority (optional)" htmlFor="reg-authority">
                    <input id="reg-authority" name="registrationAuthority" maxLength={120} placeholder="e.g. State health department" className={inputClass} />
                  </Field>
                </div>

                {hospital ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Accreditation (optional)" htmlFor="accreditation">
                        <SelectWrap>
                          <select id="accreditation" name="accreditation" defaultValue="" className={selectClass}>
                            <option value="">Select accreditation</option>
                            {HOSPITAL_ACCREDITATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </SelectWrap>
                      </Field>
                      <Field label="Accreditation certificate number (optional)" htmlFor="accreditation-number">
                        <input id="accreditation-number" name="accreditationNumber" maxLength={80} className={`${inputClass} font-mono`} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field label="Beds (optional)" htmlFor="beds">
                        <input id="beds" name="beds" type="number" min={0} max={20000} placeholder="e.g. 120" className={inputClass} />
                      </Field>
                      <Field label="Main specialities (optional)" htmlFor="specialties" className="sm:col-span-2">
                        <input id="specialties" name="specialties" maxLength={400} placeholder="e.g. Cardiology, Orthopaedics, Paediatrics" className={inputClass} />
                      </Field>
                    </div>
                  </>
                ) : (
                  <>
                    <Field label="NABL accreditation number (if accredited)" htmlFor="nabl" hint="Accreditation to ISO 15189, or your country’s equivalent.">
                      <input id="nabl" name="nablNumber" maxLength={80} className={`${inputClass} font-mono`} />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Pathologist or radiologist who signs reports" htmlFor="responsible-name">
                        <input id="responsible-name" name="responsibleName" required minLength={2} maxLength={120} placeholder="e.g. Dr. Kavya Rao" className={inputClass} />
                      </Field>
                      <Field label="Their medical registration number" htmlFor="responsible-reg">
                        <input id="responsible-reg" name="responsibleRegistration" required minLength={2} maxLength={80} className={`${inputClass} font-mono`} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={ultrasound ? 'PCPNDT registration number' : 'PCPNDT registration (if you perform ultrasound)'} htmlFor="pcpndt" hint={ultrasound ? 'Required for centres that perform ultrasound in India.' : undefined}>
                        <input id="pcpndt" name="pcpndtNumber" required={ultrasound} maxLength={80} className={`${inputClass} font-mono`} />
                      </Field>
                      <Field label="Biomedical waste authorisation (optional)" htmlFor="bmw">
                        <input id="bmw" name="bmwAuthorisation" maxLength={80} className={`${inputClass} font-mono`} />
                      </Field>
                    </div>
                  </>
                )}
              </fieldset>

              {/* 3. Contact and declarations */}
              <fieldset data-section="contact" className="flex flex-col gap-4 min-w-0">
                <legend className="sr-only">Contact person and declarations</legend>
                <SectionTitle icon={UserRound}>3. Contact Person</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full name" htmlFor="contact-name">
                    <input id="contact-name" name="contactName" required minLength={2} maxLength={120} autoComplete="name" className={inputClass} />
                  </Field>
                  <Field label="Role" htmlFor="contact-role">
                    <input id="contact-role" name="contactRole" required minLength={2} maxLength={80} autoComplete="organization-title" placeholder={hospital ? 'e.g. Medical Superintendent' : 'e.g. Lab Director'} className={inputClass} />
                  </Field>
                  <Field label="Work email" htmlFor="contact-email" hint="We send updates about your application here.">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-600/60 pointer-events-none" />
                      <input id="contact-email" name="email" type="email" required maxLength={200} autoComplete="email" placeholder="name@organisation.in" className={`${inputClass} pl-9`} />
                    </div>
                  </Field>
                  <Field label="Phone" htmlFor="contact-phone">
                    <div className="flex gap-2">
                      <div className="relative w-28 shrink-0">
                        <select name="countryCode" aria-label="Country code" defaultValue="+91" className={selectClass}>
                          {countryCodes.map((c) => (
                            <option key={c.code} value={c.dialCode}>{c.code} {c.dialCode}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-gray-600 pointer-events-none" />
                      </div>
                      <input id="contact-phone" name="phone" type="tel" inputMode="numeric" required autoComplete="tel-national" pattern="[0-9 ]{6,15}" placeholder="98765 43210" className={`${inputClass} min-w-0`} />
                    </div>
                  </Field>
                </div>
              </fieldset>

              <fieldset data-section="contact" className="flex flex-col gap-3 bg-surface-container-low/40 rounded-xl p-4 min-w-0">
                <legend className="sr-only">Declarations</legend>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input name="authorised" type="checkbox" required className="mt-0.5 w-4 h-4 rounded accent-vibrant-blue cursor-pointer shrink-0" />
                  <span className="text-xs sm:text-sm text-indigo-gray-900 leading-snug">
                    I am authorised to apply on behalf of this {hospital ? 'hospital' : 'centre'}, and the registration and accreditation details I have given are accurate and current.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input name="consentVerification" type="checkbox" required className="mt-0.5 w-4 h-4 rounded accent-vibrant-blue cursor-pointer shrink-0" />
                  <span className="text-xs sm:text-sm text-indigo-gray-900 leading-snug">
                    I consent to Consult Your Doctor checking these details with the issuing authorities and processing my contact details to review this application.
                  </span>
                </label>
              </fieldset>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex flex-col gap-1.5">
                  <p className="flex items-center gap-2 text-indigo-gray-600 text-xs">
                    <ShieldCheck className="w-[18px] h-[18px] text-fresh-teal shrink-0" />
                    Every application is reviewed by our operations team before it goes live.
                  </p>
                  <p className="text-indigo-gray-600 text-xs">
                    By submitting, you agree to our{' '}
                    <Link className="text-primary hover:underline font-medium" href="/terms-of-use">Terms &amp; Conditions</Link>{' '}
                    (including the section for doctors and partners) and{' '}
                    <Link className="text-primary hover:underline font-medium" href="/privacy-policy">Privacy Policy</Link>.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:w-auto shrink-0 px-8 py-3.5 rounded-full bg-vibrant-blue text-on-primary font-title-md text-sm font-bold shadow-md hover:bg-primary active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-[18px] h-[18px] animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      Send Application <ArrowRight className="w-[18px] h-[18px]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-vibrant-blue text-on-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-title-md text-sm font-bold text-indigo-gray-900">How joining works</h2>
                  <p className="text-xs text-indigo-gray-600">Reviewed by our operations team</p>
                </div>
              </div>
              <ol className="flex flex-col gap-3">
                {[
                  { title: 'Send this application', desc: 'It goes straight to our operations team, and you get a copy by email.' },
                  { title: 'Verification', desc: copy.checks },
                  { title: 'Your staff login', desc: 'We create your listing and a staff ID for your team, and share the password with you privately.' },
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
              {copy.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2.5 text-xs text-indigo-gray-900">
                  <BadgeCheck className="w-[18px] h-[18px] text-fresh-teal shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col gap-3">
            <h2 className="font-title-md text-sm font-bold text-indigo-gray-900">Standards partners follow</h2>
            <ul className="flex flex-col gap-1">
              {(hospital
                ? [
                    { href: '/legal/telemedicine-standard-operating-procedure', label: 'Telemedicine Standard Operating Procedure' },
                    { href: '/legal/adverse-event-and-error-reporting', label: 'Adverse Event and Error Reporting' },
                    { href: '/legal/information-security-and-access-control', label: 'Information Security and Access Control' },
                  ]
                : [
                    { href: '/legal/diagnostic-centre-checks', label: 'Diagnostic Centre Checks: Registration and Accreditation' },
                    { href: '/legal/adverse-event-and-error-reporting', label: 'Adverse Event and Error Reporting' },
                    { href: '/legal/information-security-and-access-control', label: 'Information Security and Access Control' },
                  ]
              ).map((doc) => (
                <li key={doc.href}>
                  <Link href={doc.href} className="flex items-start gap-2 py-1.5 text-xs text-indigo-gray-900 hover:text-vibrant-blue">
                    <FileText className="w-4 h-4 text-vibrant-blue shrink-0 mt-px" />
                    {doc.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h2 className="font-title-md text-sm font-bold text-indigo-gray-900">Already a partner?</h2>
              <p className="text-xs text-indigo-gray-600 mt-1">Log in with the staff ID and password our team gave you.</p>
            </div>
            <Link href={copy.signIn} className="w-full py-2.5 rounded-full bg-surface-container text-primary font-semibold text-sm text-center hover:bg-surface-container-high transition-colors">
              {copy.signInLabel}
            </Link>
            <div className="bg-vibrant-blue/5 rounded-xl p-3.5 flex items-start gap-2.5">
              <Info className="w-[18px] h-[18px] text-vibrant-blue shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-gray-600 leading-relaxed">
                Questions before you apply?{' '}
                <Link href="/contact" className="text-vibrant-blue underline font-semibold">Contact our team</Link>.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
