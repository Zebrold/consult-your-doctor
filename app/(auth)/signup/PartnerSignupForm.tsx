'use client'

import { useActionState, useState } from 'react'
import { Building2, FlaskConical } from 'lucide-react'
import { submitPartnerApplication } from '@/app/actions/partnerSignup'
import { APPLICATION_DOCS } from '@/lib/application-documents'
import {
  CALL_TIMES,
  HOSPITAL_ACCREDITATIONS,
  HOSPITAL_DEPARTMENTS,
  HOSPITAL_FACILITIES,
  HOSPITAL_TYPES,
  INDIAN_STATES,
  LAB_SERVICES,
  LAB_TYPES,
  OWNERSHIP_TYPES,
  REPORT_FORMATS,
  REPORT_TIMES,
  WEEKDAYS,
  type PartnerKind,
} from '@/lib/partner-applications'
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
  RadioGroup,
  SelectBox,
  SendRow,
  StandardsCard,
  StepStrip,
  inputCls,
  useJoinForm,
} from './join-ui'

// The "Join as a partner hospital" and "Join as a diagnostic centre" forms, after the user's designs. Applications go
// to the executive portal (Hospitals or Diagnostics → Applications), where approving one adds the organisation and
// its staff sign-in.

const COPY = {
  hospital: {
    crumb: 'Hospitals',
    icon: Building2,
    title: 'Join as a partner hospital',
    intro:
      'List your hospital on Consult your Doctor so patients can find your doctors, see their open slots and book and pay online. Our operations team checks every application before a hospital goes live.',
    noun: 'hospital',
    steps: ['Hospital details', 'Registration', 'Facilities', 'Bank & payouts', 'Contact & declarations'],
    verification: 'We confirm your clinical establishment registration, accreditation and bank details.',
    perks: [
      'Each doctor’s slots open for online booking',
      'Walk-ins and fast track in one queue',
      'Wards, beds and admissions',
      'A public hospital page with your facilities',
      'Your share of each booking, withdrawn to your bank or UPI',
    ],
    keepReady: [
      'Clinical establishment registration',
      'NABH or JCI certificate, if accredited',
      'Biomedical waste authorisation',
      'Hospital PAN and GSTIN',
      'Cancelled cheque or bank letter',
    ],
    standards: [
      { href: '/legal/telemedicine-standard-operating-procedure', label: 'Telemedicine standard operating procedure' },
      { href: '/legal/adverse-event-and-error-reporting', label: 'Adverse event and error reporting' },
      { href: '/legal/information-security-and-access-control', label: 'Information security and access control' },
    ],
    signIn: { href: '/login/hospital', label: 'Sign in to the hospital portal' },
  },
  diagnostic_center: {
    crumb: 'Diagnostic centres',
    icon: FlaskConical,
    title: 'Join as a diagnostic centre',
    intro:
      'List your lab or imaging centre on Consult your Doctor so patients can book your priced tests online and receive their reports in their account. Every centre is checked before it is shown to patients.',
    noun: 'centre',
    steps: ['Centre details', 'Registration', 'Tests & reports', 'Bank & payouts', 'Contact & declarations'],
    verification: 'We confirm your registration, accreditation, bank details and the professionals who sign your reports.',
    perks: ['Your test menu and prices, bookable online', 'Walk-in and phone bookings at the desk', 'Reports uploaded straight to the patient', 'Bookings and amounts per test, by month'],
    keepReady: [
      'Clinical establishment registration',
      'NABL certificate, if accredited',
      'PCPNDT and AERB licences, if applicable',
      'Biomedical waste authorisation',
      'Your test menu with prices',
      'Cancelled cheque or bank letter',
    ],
    standards: [
      { href: '/legal/diagnostic-centre-checks', label: 'Diagnostic centre checks: registration and accreditation' },
      { href: '/legal/adverse-event-and-error-reporting', label: 'Adverse event and error reporting' },
      { href: '/legal/information-security-and-access-control', label: 'Information security and access control' },
    ],
    signIn: { href: '/login/diagnostic', label: 'Sign in to the diagnostic portal' },
  },
} as const

const SECTIONS = ['organisation', 'registration', 'offer', 'bank', 'contact']

const today = () => new Date().toISOString().slice(0, 10)
const thisYear = new Date().getFullYear()

export function PartnerSignupForm({ kind, uploads }: { kind: PartnerKind; uploads: boolean }) {
  const copy = COPY[kind]
  const hospital = kind === 'hospital'
  const [state, formAction, pending] = useActionState(submitPartnerApplication.bind(null, kind), null)
  const { formRef, errorRef, onSubmit, updateProgress, done, step, submitted, error, busy } = useJoinForm({ kind, sections: SECTIONS, state, action: formAction, pending })
  const [services, setServices] = useState<string[]>([])
  const ultrasound = services.includes('Ultrasound')
  const docs = Object.fromEntries(APPLICATION_DOCS[kind].map((d) => [d.key, d]))

  const form = submitted ? (
    <JoinSent
      title="Application sent"
      text={`Thank you. We have emailed you to confirm it arrived. Our operations team will check your details and contact you. Once your ${copy.noun} is approved, we set up the staff login your team uses to manage the listing, bookings and payments.`}
      primary={{ href: '/legal', label: 'Read our policies' }}
    />
  ) : (
    <form ref={formRef} onSubmit={onSubmit} onInput={updateProgress} onChange={updateProgress} className="rounded-[20px] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06),0_8px_24px_-16px_rgba(11,27,63,0.16)] p-5 sm:p-7 md:p-9">
      <FormError error={error} errorRef={errorRef} />

      {/* 1. The hospital or centre */}
      <JoinSection n={1} section="organisation" title={hospital ? 'Hospital details' : 'Centre details'} sub={hospital ? 'How your hospital appears to patients.' : 'What you offer and where patients find you.'}>
        <Field label={hospital ? 'Hospital name' : 'Centre name'} htmlFor="org-name" required span={2}>
          <input id="org-name" name="organizationName" required minLength={2} maxLength={160} autoComplete="organization" className={inputCls} />
        </Field>
        <Field label={hospital ? 'Type of facility' : 'Type of centre'} htmlFor="org-type" required>
          <SelectBox id="org-type" name={hospital ? 'facilityType' : 'centreType'} required options={hospital ? HOSPITAL_TYPES : LAB_TYPES} />
        </Field>
        <Field label="Ownership" htmlFor="ownership" required>
          <SelectBox id="ownership" name="ownership" required options={OWNERSHIP_TYPES} />
        </Field>
        <Field label="Year established" htmlFor="year-established" optional>
          <input id="year-established" name="yearEstablished" type="number" inputMode="numeric" min={1800} max={thisYear} className={inputCls} />
        </Field>
        {hospital ? (
          <Field label="Doctors on staff" htmlFor="doctors-on-staff" required>
            <input id="doctors-on-staff" name="doctorsOnStaff" type="number" inputMode="numeric" required min={1} max={5000} className={inputCls} />
          </Field>
        ) : (
          <Field label="Branches" htmlFor="branches" optional hint="Number of centres you run.">
            <input id="branches" name="branches" type="number" inputMode="numeric" min={1} max={2000} className={inputCls} />
          </Field>
        )}
        {!hospital && <CheckGroup label="Services you offer" name="services" options={LAB_SERVICES} required variant="tile" onValuesChange={setServices} />}
        <Field label="Full address" htmlFor="org-address" required span={3}>
          <input id="org-address" name="address" required minLength={5} maxLength={300} autoComplete="street-address" className={inputCls} />
        </Field>
        <Field label="Landmark" htmlFor="landmark" optional span={3}>
          <input id="landmark" name="landmark" maxLength={120} className={inputCls} />
        </Field>
        <Field label="City" htmlFor="org-city" required>
          <input id="org-city" name="city" required minLength={2} maxLength={80} autoComplete="address-level2" className={inputCls} />
        </Field>
        <Field label="State" htmlFor="org-state" required>
          <SelectBox id="org-state" name="state" required options={INDIAN_STATES} autoComplete="address-level1" />
        </Field>
        <Field label="PIN code" htmlFor="org-pincode" required>
          <input id="org-pincode" name="pincode" required inputMode="numeric" maxLength={6} pattern="[1-9][0-9]{5}" title="The 6-digit PIN code." autoComplete="postal-code" className={inputCls} />
        </Field>
        <Field label={hospital ? 'Reception phone' : 'Centre phone'} htmlFor="org-phone" required>
          <input id="org-phone" name="orgPhone" type="tel" inputMode="tel" required pattern="[0-9 +\-]{6,16}" title="Digits only, with the area code." className={inputCls} />
        </Field>
        {hospital && (
          <Field label="Emergency phone" htmlFor="emergency-phone" optional>
            <input id="emergency-phone" name="emergencyPhone" type="tel" inputMode="tel" pattern="[0-9 +\-]{6,16}" title="Digits only, with the area code." className={inputCls} />
          </Field>
        )}
        <Field label={hospital ? 'Hospital email' : 'Centre email'} htmlFor="org-email" required>
          <input id="org-email" name="orgEmail" type="email" required maxLength={200} className={inputCls} />
        </Field>
        <Field label="Website" htmlFor="org-website" optional span={hospital ? 3 : 1}>
          <input id="org-website" name="website" type="url" maxLength={200} placeholder="https://" className={inputCls} />
        </Field>
        {!hospital && <OpeningHours label="Open on" />}
      </JoinSection>

      {/* 2. Registration and accreditation */}
      <JoinSection n={2} section="registration" title="Registration and accreditation" sub={`We verify these before your ${copy.noun} goes live.`} badge>
        <Field label="Registration or licence number" htmlFor="reg-number" required span={2} hint="Your clinical establishment registration, or the licence your state requires.">
          <input id="reg-number" name="registrationNumber" required minLength={2} maxLength={80} className={inputCls} />
        </Field>
        <Field label="Valid until" htmlFor="reg-valid" required>
          <input id="reg-valid" name="registrationValidUntil" type="date" required min={today()} className={inputCls} />
        </Field>
        <Field label="Issuing authority" htmlFor="reg-authority" required span={3} hint={hospital ? 'For example the District Registering Authority.' : undefined}>
          <input id="reg-authority" name="registrationAuthority" required minLength={2} maxLength={120} className={inputCls} />
        </Field>

        {hospital ? (
          <>
            <Field label="Accreditation" htmlFor="accreditation" required>
              <SelectBox id="accreditation" name="accreditation" required options={HOSPITAL_ACCREDITATIONS} />
            </Field>
            <Field label="Accreditation certificate number" htmlFor="accreditation-number" optional>
              <input id="accreditation-number" name="accreditationNumber" maxLength={80} className={inputCls} />
            </Field>
            <Field label="Valid until" htmlFor="accreditation-valid" optional>
              <input id="accreditation-valid" name="accreditationValidUntil" type="date" min={today()} className={inputCls} />
            </Field>
            <Field label="Fire safety NOC number" htmlFor="fire-noc" optional>
              <input id="fire-noc" name="fireNoc" maxLength={80} className={inputCls} />
            </Field>
            <Field label="Biomedical waste authorisation" htmlFor="bmw" required span={2}>
              <input id="bmw" name="bmwAuthorisation" required minLength={2} maxLength={80} className={inputCls} />
            </Field>
          </>
        ) : (
          <>
            <Field label="NABL accreditation number" htmlFor="nabl" optional span={2} hint="If your lab is accredited to ISO 15189.">
              <input id="nabl" name="nablNumber" maxLength={80} className={inputCls} />
            </Field>
            <Field label="Valid until" htmlFor="nabl-valid" optional>
              <input id="nabl-valid" name="nablValidUntil" type="date" min={today()} className={inputCls} />
            </Field>
            <Field label="Pathologist who signs reports" htmlFor="responsible-name" required span={2}>
              <input id="responsible-name" name="responsibleName" required minLength={2} maxLength={120} className={inputCls} />
            </Field>
            <Field label="Their medical registration number" htmlFor="responsible-reg" required>
              <input id="responsible-reg" name="responsibleRegistration" required minLength={2} maxLength={80} className={inputCls} />
            </Field>
            <Field label="Radiologist who signs reports" htmlFor="radiologist-name" optional span={2} hint="Needed if you offer imaging.">
              <input id="radiologist-name" name="radiologistName" maxLength={120} className={inputCls} />
            </Field>
            <Field label="Their medical registration number" htmlFor="radiologist-reg" optional>
              <input id="radiologist-reg" name="radiologistRegistration" maxLength={80} className={inputCls} />
            </Field>
            <Field label="PCPNDT registration" htmlFor="pcpndt" required={ultrasound} optional={!ultrasound} span={2} hint="Needed if you perform ultrasound.">
              <input id="pcpndt" name="pcpndtNumber" required={ultrasound} maxLength={80} className={inputCls} />
            </Field>
            <Field label="Valid until" htmlFor="pcpndt-valid" optional>
              <input id="pcpndt-valid" name="pcpndtValidUntil" type="date" min={today()} className={inputCls} />
            </Field>
            <Field label="AERB licence number" htmlFor="aerb" optional span={2} hint="Needed for X-ray and CT equipment.">
              <input id="aerb" name="aerbNumber" maxLength={80} className={inputCls} />
            </Field>
            <Field label="Biomedical waste authorisation" htmlFor="bmw" required>
              <input id="bmw" name="bmwAuthorisation" required minLength={2} maxLength={80} className={inputCls} />
            </Field>
          </>
        )}

        <Field label={hospital ? 'PAN of the hospital' : 'PAN of the centre'} htmlFor="pan" required>
          <input id="pan" name="pan" required maxLength={10} pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" title="10 characters, like ABCDE1234F." className={`${inputCls} uppercase`} />
        </Field>
        <Field label="GSTIN" htmlFor="gstin" optional span={2}>
          <input id="gstin" name="gstin" maxLength={15} pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z][Zz][0-9A-Za-z]" title="15 characters, like 22ABCDE1234F1Z5." className={`${inputCls} uppercase`} />
        </Field>
        <FileField doc={docs.registrationCertificate} uploads={uploads} />
        <FileField doc={hospital ? docs.accreditationCertificate : docs.licenceCertificates} uploads={uploads} />
      </JoinSection>

      {/* 3. What the hospital or centre offers */}
      {hospital ? (
        <JoinSection n={3} section="offer" title="Facilities and specialities" sub="What your hospital offers patients.">
          <Field label="Number of beds" htmlFor="beds" required>
            <input id="beds" name="beds" type="number" inputMode="numeric" required min={0} max={20000} className={inputCls} />
          </Field>
          <Field label="ICU beds" htmlFor="icu-beds" optional>
            <input id="icu-beds" name="icuBeds" type="number" inputMode="numeric" min={0} max={5000} className={inputCls} />
          </Field>
          <RadioGroup label="24-hour emergency" name="emergency24h" required options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
          <CheckGroup label="Departments" name="departments" options={HOSPITAL_DEPARTMENTS} required variant="tile" />
          <CheckGroup label="Facilities" name="facilities" options={HOSPITAL_FACILITIES} optional variant="tile" />
          <OpeningHours label="OPD days">
            <Field label="Insurance companies you accept" htmlFor="insurers" optional hint="Separate with commas.">
              <input id="insurers" name="insurers" maxLength={400} className={inputCls} />
            </Field>
          </OpeningHours>
        </JoinSection>
      ) : (
        <JoinSection n={3} section="offer" title="Tests and reports" sub="How patients book your tests.">
          <Field label="Number of tests offered" htmlFor="tests-offered" required>
            <input id="tests-offered" name="testsOffered" type="number" inputMode="numeric" required min={1} max={20000} className={inputCls} />
          </Field>
          <Field label="Usual report time" htmlFor="report-time" required>
            <SelectBox id="report-time" name="reportTime" required options={REPORT_TIMES} />
          </Field>
          <RadioGroup label="Reports shared as" name="reportFormat" required stack options={REPORT_FORMATS.map((f) => ({ value: f, label: f }))} />
          <FileField doc={docs.testMenu} uploads={uploads} />
        </JoinSection>
      )}

      {/* 4. Bank account */}
      <JoinSection n={4} section="bank" title="Bank and payouts" sub={`Where we pay the ${copy.noun}’s share of the payments we collect.`} badge>
        <Field label="Account holder name" htmlFor="bank-holder" required span={3} hint={`Must match the ${copy.noun} name on your PAN.`}>
          <input id="bank-holder" name="bankHolder" required minLength={2} maxLength={120} className={inputCls} />
        </Field>
        <Field label="Bank account number" htmlFor="bank-account" required span={2}>
          <input id="bank-account" name="bankAccount" required inputMode="numeric" pattern="[0-9]{9,18}" maxLength={18} title="9 to 18 digits." autoComplete="off" className={inputCls} />
        </Field>
        <Field label="IFSC code" htmlFor="bank-ifsc" required>
          <input id="bank-ifsc" name="bankIfsc" required maxLength={11} pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}" title="11 characters, like HDFC0001234." className={`${inputCls} uppercase`} />
        </Field>
        <Field label="UPI ID" htmlFor="upi" optional span={2} hint="If you would rather be paid by UPI.">
          <input id="upi" name="upiId" maxLength={120} pattern="[A-Za-z0-9.\-_]{2,}@[A-Za-z0-9]{2,}" title="Like name@bank." className={inputCls} />
        </Field>
        <FileField doc={docs.bankProof} uploads={uploads} />
      </JoinSection>

      {/* 5. Contact person */}
      <JoinSection n={5} section="contact" title="Contact person" sub="The person we speak to about this application.">
        <Field label="Full name" htmlFor="contact-name" required>
          <input id="contact-name" name="contactName" required minLength={2} maxLength={120} autoComplete="name" className={inputCls} />
        </Field>
        <Field label="Role" htmlFor="contact-role" required hint={hospital ? 'For example Medical Superintendent.' : 'For example Lab Director.'}>
          <input id="contact-role" name="contactRole" required minLength={2} maxLength={80} autoComplete="organization-title" className={inputCls} />
        </Field>
        <Field label="Phone" htmlFor="contact-phone" required>
          <PhoneInput id="contact-phone" name="phone" codeName="countryCode" required label="Phone" />
        </Field>
        <Field label="Work email" htmlFor="contact-email" required span={2} hint="We send updates about your application here.">
          <input id="contact-email" name="email" type="email" required maxLength={200} autoComplete="email" className={inputCls} />
        </Field>
        <Field label="Best time to call" htmlFor="call-time" optional>
          <SelectBox id="call-time" name="bestTimeToCall" options={CALL_TIMES} />
        </Field>
        <Field label="Second contact name" htmlFor="second-name" optional>
          <input id="second-name" name="secondName" maxLength={120} className={inputCls} />
        </Field>
        <Field label="Second contact phone" htmlFor="second-phone" optional>
          <PhoneInput id="second-phone" name="secondPhone" codeName="secondCountryCode" label="Second contact phone" autoComplete="off" />
        </Field>
        <Field label="Second contact email" htmlFor="second-email" optional>
          <input id="second-email" name="secondEmail" type="email" maxLength={200} className={inputCls} />
        </Field>
      </JoinSection>

      <Declarations
        section="contact"
        items={[
          {
            name: 'authorised',
            text: `I am authorised to apply on behalf of this ${copy.noun}, and the registration and accreditation details I have given are accurate and current.`,
          },
          hospital
            ? { name: 'keepUpdated', text: 'The hospital will keep its registration, accreditation and doctor details up to date on Consult your Doctor.' }
            : { name: 'reportsSigned', text: 'Reports shared through Consult your Doctor are signed by the registered professionals named above.' },
          { name: 'consentVerification', text: 'I agree to Consult your Doctor checking these details with the issuing authorities and using my contact details to review this application.' },
        ]}
      />
      <SendRow busy={busy} />
    </form>
  )

  return (
    <>
      <JoinHero crumb={copy.crumb} icon={copy.icon} title={copy.title} intro={copy.intro} />
      <div className="px-4 md:px-[max(24px,10%)]">
        <StepStrip steps={copy.steps.map((title) => ({ title }))} after="Review by our team" current={step} done={done} submitted={submitted} />
        <JoinColumns
          form={form}
          aside={
            <>
              <HowJoiningCard
                steps={[
                  { title: 'Send this application', text: 'It goes straight to our operations team, and we email you to confirm it arrived.' },
                  { title: 'Verification', text: copy.verification },
                  { title: 'Your staff login', text: 'We create your listing and a staff ID for your team, and share the password with you privately.' },
                ]}
                perks={[...copy.perks]}
              />
              <KeepReadyCard items={[...copy.keepReady]} />
              <StandardsCard docs={[...copy.standards]} />
              <AlreadyCard title="Already a partner?" href={copy.signIn.href} label={copy.signIn.label} />
            </>
          }
        />
      </div>
    </>
  )
}

/** Opening days and hours: day pills, then From and To, with room for one more field beside them. */
function OpeningHours({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <>
      <CheckGroup label={label} name="openDays" options={WEEKDAYS} required />
      <Field label="From" htmlFor="open-from" required>
        <input id="open-from" name="openFrom" type="time" required className={inputCls} />
      </Field>
      <Field label="To" htmlFor="open-to" required>
        <input id="open-to" name="openTo" type="time" required className={inputCls} />
      </Field>
      {children}
    </>
  )
}
