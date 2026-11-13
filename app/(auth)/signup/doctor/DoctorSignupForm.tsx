'use client'

import { useActionState } from 'react'
import { Stethoscope } from 'lucide-react'
import { submitDoctorSignup } from '@/app/actions/doctorAuth'
import { APPLICATION_DOCS } from '@/lib/application-documents'
import { DOCTOR_LANGUAGES, DOCTOR_SPECIALTIES, DOCTOR_TITLES, GENDERS, MEDICAL_COUNCILS, PRACTICE_TYPES, SLOT_MINUTES } from '@/lib/doctor-applications'
import { WEEKDAYS } from '@/lib/partner-applications'
import {
  AlreadyCard,
  CheckGroup,
  Declarations,
  Field,
  FileField,
  FormError,
  HowJoiningCard,
  JoinColumns,
  JoinHero,
  JoinSection,
  JoinSent,
  KeepReadyCard,
  PhoneInput,
  PrefixInput,
  SelectBox,
  SendRow,
  StepStrip,
  inputCls,
  textareaCls,
  useJoinForm,
} from '../join-ui'

// "Join as a doctor", after the user's design. Applications go to the executive portal (Doctors → Applications),
// where approving one creates the doctor's account at their hospital.

const SECTIONS = ['identity', 'licence', 'practice', 'profile', 'proof']
const STEPS = ['Identity & contact', 'Medical licence', 'Practice & timings', 'Patient profile', 'ID proof & declarations']
const docs = Object.fromEntries(APPLICATION_DOCS.doctor.map((d) => [d.key, d]))

const thisYear = new Date().getFullYear()
const today = () => new Date().toISOString().slice(0, 10)
/** The latest birth date of someone at least 21. */
const latestBirthDate = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 21)
  return d.toISOString().slice(0, 10)
}

export function DoctorSignupForm({ hospitals, uploads }: { hospitals: { id: string; name: string }[]; uploads: boolean }) {
  const [state, formAction, pending] = useActionState(submitDoctorSignup, null)
  const { formRef, errorRef, onSubmit, updateProgress, done, step, submitted, error, busy } = useJoinForm({ kind: 'doctor', sections: SECTIONS, state, action: formAction, pending })

  const form = submitted ? (
    <JoinSent
      title="Application sent"
      text="Thank you. Your application is now with our credentialing team, and we have emailed you to confirm it arrived. Once your registration is verified, we share your staff ID and password so you can sign in to the doctor portal."
      primary={{ href: '/login/doctor', label: 'Doctor login' }}
    />
  ) : (
    <form ref={formRef} onSubmit={onSubmit} onInput={updateProgress} onChange={updateProgress} className="rounded-[20px] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06),0_8px_24px_-16px_rgba(11,27,63,0.16)] p-5 sm:p-7 md:p-9">
      <FormError error={error} errorRef={errorRef} />

      {/* 1. Identity and contact */}
      <JoinSection n={1} section="identity" title="Identity and contact" sub="How we reach you and set up your account.">
        <Field label="Title" htmlFor="doc-title" required>
          <SelectBox id="doc-title" name="title" required options={DOCTOR_TITLES} />
        </Field>
        <Field label="First name" htmlFor="first-name" required>
          <input id="first-name" name="firstName" required minLength={1} maxLength={60} autoComplete="given-name" className={inputCls} />
        </Field>
        <Field label="Surname" htmlFor="last-name" required>
          <input id="last-name" name="lastName" required minLength={1} maxLength={60} autoComplete="family-name" className={inputCls} />
        </Field>
        <Field label="Middle name" htmlFor="middle-name" optional>
          <input id="middle-name" name="middleName" maxLength={60} autoComplete="additional-name" className={inputCls} />
        </Field>
        <Field label="Gender" htmlFor="gender" required>
          <SelectBox id="gender" name="gender" required options={GENDERS} />
        </Field>
        <Field label="Date of birth" htmlFor="dob" required>
          <input id="dob" name="dateOfBirth" type="date" required min="1930-01-01" max={latestBirthDate()} autoComplete="bday" className={inputCls} />
        </Field>
        <Field label="Email address" htmlFor="work-email" required span={2} hint="Your doctor account is created with this email.">
          <input id="work-email" name="email" type="email" required maxLength={200} autoComplete="email" className={inputCls} />
        </Field>
        <Field label="Mobile number" htmlFor="mobile-phone" required hint="Saved to your doctor profile.">
          <PhoneInput id="mobile-phone" name="phone" codeName="countryCode" required label="Mobile number" />
        </Field>
        <CheckGroup label="Languages you consult in" name="languages" options={DOCTOR_LANGUAGES} required />
        <FileField doc={docs.photo} uploads={uploads} />
      </JoinSection>

      {/* 2. Medical licence */}
      <JoinSection n={2} section="licence" title="Medical licence" sub="We check these with your medical council." badge>
        <Field label="Medical council" htmlFor="council" required span={2}>
          <SelectBox id="council" name="council" required options={MEDICAL_COUNCILS} />
        </Field>
        <Field label="Registration number" htmlFor="registration-number" required hint="As printed on your certificate.">
          <input id="registration-number" name="registrationNumber" required minLength={2} maxLength={80} className={inputCls} />
        </Field>
        <Field label="Year of registration" htmlFor="registration-year" required>
          <input id="registration-year" name="registrationYear" type="number" inputMode="numeric" required min={1950} max={thisYear} className={inputCls} />
        </Field>
        <Field label="Valid until" htmlFor="registration-valid" optional>
          <input id="registration-valid" name="registrationValidUntil" type="date" min={today()} className={inputCls} />
        </Field>
        <Field label="Years of experience" htmlFor="experience" required>
          <input id="experience" name="experience_years" type="number" inputMode="numeric" required min={0} max={70} className={inputCls} />
        </Field>
        <Field label="Highest qualification" htmlFor="qualifications" required hint="For example MBBS, MD or MS.">
          <input id="qualifications" name="qualifications" required minLength={2} maxLength={120} className={inputCls} />
        </Field>
        <Field label="College or university" htmlFor="college" required>
          <input id="college" name="college" required minLength={2} maxLength={160} className={inputCls} />
        </Field>
        <Field label="Year of passing" htmlFor="passing-year" required>
          <input id="passing-year" name="passingYear" type="number" inputMode="numeric" required min={1950} max={thisYear} className={inputCls} />
        </Field>
        <Field label="Speciality" htmlFor="specialty" required>
          <SelectBox id="specialty" name="specialty" required options={DOCTOR_SPECIALTIES} />
        </Field>
        <Field label="Sub-speciality" htmlFor="sub-specialty" optional>
          <input id="sub-specialty" name="subSpecialty" maxLength={120} className={inputCls} />
        </Field>
        <Field label="Other qualifications or fellowships" htmlFor="other-qualifications" optional>
          <input id="other-qualifications" name="otherQualifications" maxLength={300} className={inputCls} />
        </Field>
        <FileField doc={docs.registrationCertificate} uploads={uploads} />
        <FileField doc={docs.degreeCertificate} uploads={uploads} />
      </JoinSection>

      {/* 3. Practice and timings */}
      <JoinSection n={3} section="practice" title="Practice and timings" sub="Where and when you see patients.">
        <Field label="How you practise" htmlFor="practice-type" required>
          <SelectBox id="practice-type" name="practiceType" required options={PRACTICE_TYPES} />
        </Field>
        <Field
          label="Primary hospital"
          htmlFor="hospital"
          required
          span={2}
          hint={hospitals.length === 0 ? 'No partner hospitals are listed yet. Please contact us first.' : 'The partner hospital where you consult.'}
        >
          <SelectBox id="hospital" name="hospitalId" required options={hospitals.map((h) => ({ value: h.id, label: h.name }))} />
        </Field>
        <Field label="Clinic name and address" htmlFor="clinic" optional span={3} hint="Only if you also see patients at your own clinic.">
          <input id="clinic" name="clinic" maxLength={300} className={inputCls} />
        </Field>
        <Field label="Consultation fee" htmlFor="fee" required hint="Patients pay this at the hospital.">
          <PrefixInput prefix="₹" id="fee" name="consultation_fee" type="number" inputMode="numeric" required min={0} max={100000} />
        </Field>
        <CheckGroup label="Days you consult" name="consultDays" options={WEEKDAYS} required hint="Your hospital publishes your slots from these." />
        <Field label="From" htmlFor="consult-from" required>
          <input id="consult-from" name="consultFrom" type="time" required className={inputCls} />
        </Field>
        <Field label="To" htmlFor="consult-to" required>
          <input id="consult-to" name="consultTo" type="time" required className={inputCls} />
        </Field>
        <Field label="Time per patient" htmlFor="slot-minutes" required>
          <SelectBox id="slot-minutes" name="slotMinutes" required options={SLOT_MINUTES.map((m) => ({ value: String(m), label: `${m} minutes` }))} />
        </Field>
      </JoinSection>

      {/* 4. Profile for patients */}
      <JoinSection n={4} section="profile" title="Your profile for patients" sub="What patients read before they book you.">
        <Field label="About you" htmlFor="bio" optional span={3}>
          <textarea id="bio" name="bio" maxLength={1500} rows={3} className={textareaCls} />
        </Field>
        <Field label="Conditions and treatments you handle" htmlFor="conditions" optional span={3} hint="For example knee replacement, sports injuries, back pain.">
          <input id="conditions" name="conditions" maxLength={400} className={inputCls} />
        </Field>
        <Field label="Awards and memberships" htmlFor="awards" optional span={3}>
          <input id="awards" name="awards" maxLength={400} className={inputCls} />
        </Field>
      </JoinSection>

      {/* 5. Proof of identity */}
      <JoinSection n={5} section="proof" title="Proof of identity" sub="We match these with your medical registration." badge>
        <Field label="PAN number" htmlFor="pan" required>
          <input id="pan" name="pan" required maxLength={10} pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" title="10 characters, like ABCDE1234F." className={`${inputCls} uppercase`} />
        </Field>
        <FileField doc={docs.panCard} uploads={uploads} span={2} />
        <FileField doc={docs.photoId} uploads={uploads} />
      </JoinSection>

      <Declarations
        section="proof"
        items={[
          { name: 'confirmRegistration', text: 'I hold a full, active registration with the medical council named above, and the details I have given are accurate.' },
          { name: 'noDisciplinary', text: 'No disciplinary action or investigation is pending against me with any medical council.' },
          { name: 'consentVerification', text: 'I agree to Consult your Doctor checking my registration with the medical council and using my details to review this application.' },
        ]}
      />
      <SendRow busy={busy} />
    </form>
  )

  return (
    <>
      <JoinHero
        crumb="Doctors"
        icon={Stethoscope}
        title="Join as a doctor"
        intro="Create your doctor account on Consult your Doctor. Share your medical registration details and our credentialing team verifies them before your profile goes live for bookings."
      />
      <div className="px-4 md:px-[max(24px,10%)]">
        <StepStrip steps={STEPS.map((title) => ({ title }))} after="Credential review" current={step} done={done} submitted={submitted} />
        <JoinColumns
          form={form}
          aside={
            <>
              <HowJoiningCard
                steps={[
                  { title: 'Send this application', text: 'It goes straight to our credentialing team, and we email you to confirm it arrived.' },
                  { title: 'Registration check', text: 'We confirm your medical council registration, degree and your hospital.' },
                  { title: 'Account activation', text: 'You receive a staff ID and password for the doctor portal, and your profile goes live.' },
                ]}
                perks={['Your schedule and waiting room, live', 'Digital prescriptions for every patient', 'Patient history before each consult', 'Your profile, fee and patient reviews']}
              />
              <KeepReadyCard items={['Medical registration certificate', 'Degree certificate', 'PAN card', 'Government photo ID', 'A recent profile photo']} />
              <AlreadyCard title="Already verified?" href="/login/doctor" label="Sign in to the doctor portal" />
            </>
          }
        />
      </div>
    </>
  )
}
