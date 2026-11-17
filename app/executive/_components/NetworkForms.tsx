'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, KeyRound, Plus, Trash2, UserCheck } from 'lucide-react'
import {
  DlgDone,
  DlgField,
  DlgForm,
  DlgGrid,
  DlgRupee,
  DlgSection,
  FormDialog,
  dlgBareInput,
  dlgBtnBlue,
  dlgBtnLine,
  dlgChip,
  dlgInput,
} from '@/components/portal/form-dialog'
import { SPECIALITIES } from '@/components/home/specialities'
import { addOrganizationLogin, createDiagnosticCenter, createDoctorAccount, createHospital } from '@/app/actions/network'

// The executive portal's "add to the network" dialogs: hospitals and diagnostic centres (each with its staff
// sign-in), doctor accounts at any hospital, and a sign-in for an older hospital or centre that has none. They use the
// same dialog as the hospital's Add doctor (components/portal/form-dialog.tsx).

const PASSWORD_RULE = 'At least 10 characters, with letters and numbers.'

/** A hospital or centre application (/signup/hospital, /signup/diagnostic-centre) to add to the network. */
export type ApplicationPrefill = { id: string; name: string; city: string; address: string | null; email: string; contactName: string }

function OpenButton({ children, onClick, approve = false }: { children: ReactNode; onClick: () => void; approve?: boolean }) {
  const Icon = approve ? UserCheck : Plus
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] text-[13.5px] font-extrabold whitespace-nowrap bg-[#2A4DD0] text-white shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#2443B8] active:scale-[0.98] transition-all"
    >
      <Icon className="w-4 h-4" /> {children}
    </button>
  )
}

/** A blue line with a tick: what happens after saving. */
function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-[18px] flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[#F5F8FF] text-[13px] leading-[1.45] text-[#27324A]">
      <CircleCheck className="w-[18px] h-[18px] shrink-0 text-[#2A4DD0] mt-px" />
      <span>{children}</span>
    </p>
  )
}

/** What the executive needs to hand over once an account exists: the IDs, the temporary password, and a note. */
function Handover({ rows, secret, note }: { rows: [string, string][]; secret?: string; note: string }) {
  const [shown, setShown] = useState(false)
  return (
    <>
      <dl className="w-full max-w-[560px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 p-4 rounded-2xl bg-[#F5F8FF] shadow-[0_0_0_1px_#DCE6FF] text-left text-[14px]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-bold text-[#5B667A]">{label}</dt>
            <dd className="font-mono font-extrabold text-[#2A4DD0] break-all">{value}</dd>
          </div>
        ))}
        {secret && (
          <div className="contents">
            <dt className="font-bold text-[#5B667A]">Temporary password</dt>
            <dd className="flex items-center gap-2 font-mono font-extrabold text-[#0B1B3F] break-all">
              {shown ? secret : '••••••••••••'}
              <button type="button" onClick={() => setShown((v) => !v)} className="font-sans text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                {shown ? 'Hide' : 'Show'}
              </button>
            </dd>
          </div>
        )}
      </dl>
      <p className="max-w-[560px] text-[14px] leading-[1.5] text-[#5B667A]">{note}</p>
    </>
  )
}

/** The hospital's or centre's details and its staff sign-in: the first two sections of Add hospital / centre. */
function OrgSections({ kind, prefill }: { kind: 'hospital' | 'lab'; prefill?: ApplicationPrefill }) {
  const noun = kind === 'hospital' ? 'hospital' : 'centre'
  return (
    <>
      {prefill && <input type="hidden" name="applicationId" value={prefill.id} />}
      <DlgSection n={1} title={kind === 'hospital' ? 'Hospital details' : 'Centre details'} sub={`What patients see on the ${noun}’s page.`}>
        <DlgGrid>
          <DlgField label={kind === 'hospital' ? 'Hospital name' : 'Centre name'} required className="sm:col-span-2">
            <input name="name" required minLength={2} maxLength={160} defaultValue={prefill?.name} className={dlgInput} autoComplete="organization" />
          </DlgField>
          <DlgField label="City" required>
            <input name="city" required minLength={2} maxLength={80} defaultValue={prefill?.city} className={dlgInput} autoComplete="address-level2" />
          </DlgField>
          <DlgField label="Contact email" hint="We email the user ID and password here.">
            <input name="contactEmail" type="email" maxLength={160} defaultValue={prefill?.email} className={dlgInput} autoComplete="email" />
          </DlgField>
          <DlgField label="Address" className="sm:col-span-2">
            <input name="address" maxLength={300} defaultValue={prefill?.address ?? undefined} className={dlgInput} autoComplete="street-address" />
          </DlgField>
        </DlgGrid>
      </DlgSection>

      <DlgSection n={2} title="Staff login" sub={`How the ${noun}’s staff sign in to the ${noun} portal.`}>
        <DlgGrid>
          <DlgField label="Account name" hint={`Leave blank for the ${noun} name plus “Admin”.`}>
            <input name="adminName" maxLength={120} defaultValue={prefill?.contactName} className={dlgInput} />
          </DlgField>
          <DlgField label="Staff ID" hint="Leave blank to make one.">
            <input name="staffId" maxLength={24} pattern="[A-Za-z0-9-]{4,24}" className={`${dlgInput} uppercase`} autoCapitalize="characters" />
          </DlgField>
          <DlgField
            label="Password"
            hint={`Leave blank and we make a temporary one (the contact email is then needed). Or type one: ${PASSWORD_RULE.toLowerCase()}`}
            className="sm:col-span-2"
          >
            <input name="password" type="password" maxLength={128} className={dlgInput} autoComplete="new-password" placeholder="Leave blank to create one automatically" />
          </DlgField>
        </DlgGrid>
        <InfoNote>We email the user ID (staff ID) and password to the contact email. With no contact email, you hand them over yourself.</InfoNote>
      </DlgSection>
    </>
  )
}

function useSubmit<T extends { success: true } | { success: false; error: string }>(action: (form: FormData) => Promise<T>) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [done, setDone] = useState<Extract<T, { success: true }> | null>(null)
  const [round, setRound] = useState(0)
  const submit = (e: FormEvent<HTMLFormElement>, extra?: (form: FormData) => void) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    extra?.(form)
    setError('')
    start(async () => {
      const result = await action(form)
      if (!result.success) return setError(result.error)
      setDone(result as Extract<T, { success: true }>)
      router.refresh()
    })
  }
  const reset = () => {
    setError('')
    setDone(null)
  }
  // A fresh, empty form for the next one.
  const another = () => {
    reset()
    setRound((r) => r + 1)
  }
  return { pending, error, done, submit, reset, another, round }
}

/** What to tell the executive after adding a hospital or centre: whether the user ID and password were emailed. */
function handOver(done: { temporaryPassword?: string; emailedTo?: string | null }, where: string) {
  if (done.emailedTo) return `We emailed ${done.emailedTo} their user ID (staff ID) and password. They log in at ${where}.`
  return done.temporaryPassword
    ? `The email couldn’t be sent. Share the staff ID and temporary password privately; they log in at ${where} and can change the password in their account.`
    : `No email was sent (there is no contact email). Give their staff the staff ID and the password you set. They log in at ${where}.`
}

const ORG_STEPS = (noun: string) => [
  { label: `${noun} details`, sub: 'Name and place' },
  { label: 'Staff login', sub: 'User ID and password' },
]

/** Adds a hospital; with `fromApplication`, approves that application by adding it pre-filled. */
export function AddHospitalButton({ fromApplication }: { fromApplication?: ApplicationPrefill } = {}) {
  const [open, setOpen] = useState(false)
  const { pending, error, done, submit, reset, another, round } = useSubmit(createHospital)
  const close = () => {
    setOpen(false)
    reset()
  }
  return (
    <>
      <OpenButton onClick={() => setOpen(true)} approve={!!fromApplication}>
        {fromApplication ? 'Approve & add' : 'Add hospital'}
      </OpenButton>
      {open && (
        <FormDialog
          title={fromApplication ? `Approve ${fromApplication.name}` : 'Add hospital'}
          subtitle={
            fromApplication
              ? 'Check the details from the application, then set the staff login. It is listed for booking straight away.'
              : 'It is listed for booking straight away, and its staff log in with the user ID below.'
          }
          steps={ORG_STEPS('Hospital')}
          done={!!done}
          onClose={close}
        >
          {done ? (
            <DlgDone
              title={fromApplication ? 'Application approved' : 'Hospital added'}
              actions={
                <>
                  {!fromApplication && (
                    <button type="button" onClick={another} className={dlgBtnLine}>
                      <Plus className="w-4 h-4" strokeWidth={2.6} /> Add another hospital
                    </button>
                  )}
                  <button type="button" onClick={close} className={dlgBtnBlue}>
                    Done
                  </button>
                </>
              }
            >
              <Handover
                rows={[['Hospital ID', done.code], ['Staff ID', done.staffId]]}
                secret={done.temporaryPassword}
                note={`${handOver(done, 'Login → Hospitals')} They can then add their doctors and slots.`}
              />
            </DlgDone>
          ) : (
            <DlgForm
              key={round}
              onSubmit={(e) => submit(e)}
              onCancel={close}
              pending={pending}
              error={error}
              submitLabel={fromApplication ? 'Approve & add hospital' : 'Add hospital'}
              submitIcon={<Plus className="w-4 h-4" strokeWidth={2.6} />}
            >
              <OrgSections kind="hospital" prefill={fromApplication} />
            </DlgForm>
          )}
        </FormDialog>
      )}
    </>
  )
}

const STARTER_TESTS = ['Complete Blood Count (CBC)', 'Thyroid Profile', 'Lipid Profile', 'X-Ray', 'Ultrasound', 'ECG']
const starterTests = () => STARTER_TESTS.map((name) => ({ name, price: '' }))

/** Adds a diagnostic centre; with `fromApplication`, approves that application by adding it pre-filled. */
export function AddDiagnosticCenterButton({ fromApplication }: { fromApplication?: ApplicationPrefill } = {}) {
  const [open, setOpen] = useState(false)
  const [tests, setTests] = useState(starterTests)
  const { pending, error, done, submit, reset, another, round } = useSubmit(createDiagnosticCenter)
  const close = () => {
    setOpen(false)
    reset()
    setTests(starterTests())
  }
  const priced = tests.filter((t) => t.name.trim() && t.price !== '')
  return (
    <>
      <OpenButton onClick={() => setOpen(true)} approve={!!fromApplication}>
        {fromApplication ? 'Approve & add' : 'Add diagnostic centre'}
      </OpenButton>
      {open && (
        <FormDialog
          title={fromApplication ? `Approve ${fromApplication.name}` : 'Add diagnostic centre'}
          subtitle={
            fromApplication
              ? 'Check the details from the application, then set the staff login. Patients can book its priced tests straight away.'
              : 'Patients can book its priced tests straight away; the centre can edit its menu later.'
          }
          steps={[...ORG_STEPS('Centre'), { label: 'Price list', sub: 'Tests to start with' }]}
          done={!!done}
          onClose={close}
        >
          {done ? (
            <DlgDone
              title={fromApplication ? 'Application approved' : 'Diagnostic centre added'}
              actions={
                <>
                  {!fromApplication && (
                    <button
                      type="button"
                      onClick={() => {
                        another()
                        setTests(starterTests())
                      }}
                      className={dlgBtnLine}
                    >
                      <Plus className="w-4 h-4" strokeWidth={2.6} /> Add another centre
                    </button>
                  )}
                  <button type="button" onClick={close} className={dlgBtnBlue}>
                    Done
                  </button>
                </>
              }
            >
              <Handover
                rows={[['Centre ID', done.code], ['Staff ID', done.staffId]]}
                secret={done.temporaryPassword}
                note={`${handOver(done, 'Login → Diagnostic centres')} They manage tests, bookings and reports there.`}
              />
            </DlgDone>
          ) : (
            <DlgForm
              key={round}
              onSubmit={(e) => submit(e, (form) => form.set('tests', JSON.stringify(priced.map((t) => ({ name: t.name.trim(), price: Number(t.price) })))))}
              onCancel={close}
              pending={pending}
              error={error}
              submitLabel={fromApplication ? 'Approve & add centre' : 'Add centre'}
              submitIcon={<Plus className="w-4 h-4" strokeWidth={2.6} />}
            >
              <OrgSections kind="lab" prefill={fromApplication} />
              <DlgSection n={3} title="Starting price list" sub="Only tests with a price are listed. Leave it empty if the centre will add its own.">
                <div className="flex flex-col gap-2.5">
                  {tests.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        aria-label="Test name"
                        value={t.name}
                        onChange={(e) => setTests((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                        maxLength={80}
                        placeholder="Test name"
                        className={`${dlgInput} flex-1 min-w-0`}
                      />
                      <span className="w-32 shrink-0">
                        <DlgRupee>
                          <input
                            aria-label={`Price for ${t.name || 'this test'}`}
                            value={t.price}
                            onChange={(e) => setTests((list) => list.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^\d.]/g, '') } : x)))}
                            inputMode="decimal"
                            placeholder="Price"
                            className={dlgBareInput}
                          />
                        </DlgRupee>
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${t.name || 'test'}`}
                        onClick={() => setTests((list) => list.filter((_, j) => j !== i))}
                        className="shrink-0 w-[42px] h-[42px] rounded-[11px] flex items-center justify-center text-[#5B667A] hover:bg-[#FEF3F2] hover:text-[#B42318]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setTests((list) => [...list, { name: '', price: '' }])} className={`${dlgBtnLine} self-start`}>
                    <Plus className="w-4 h-4" strokeWidth={2.6} /> Add a test
                  </button>
                </div>
              </DlgSection>
            </DlgForm>
          )}
        </FormDialog>
      )}
    </>
  )
}

export type HospitalOption = { id: string; name: string; city: string | null }

const DOCTOR_STEPS = [
  { label: 'Doctor profile', sub: 'Name and speciality' },
  { label: 'Hospital and fee', sub: 'Where they consult' },
  { label: 'Account access', sub: 'Sign-in' },
]

export function AddDoctorButton({ hospitals }: { hospitals: HospitalOption[] }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'email' | 'manual'>('email')
  const { pending, error, done, submit, reset, another, round } = useSubmit(createDoctorAccount)
  const close = () => {
    setOpen(false)
    reset()
    setMode('email')
  }
  return (
    <>
      <OpenButton onClick={() => setOpen(true)}>Add doctor</OpenButton>
      {open && (
        <FormDialog
          title="Add doctor"
          subtitle="Create the doctor’s account at the hospital they practise in, and send them their login."
          steps={DOCTOR_STEPS}
          done={!!done}
          onClose={close}
        >
          {done ? (
            <DlgDone
              title="Doctor added"
              actions={
                <>
                  <button type="button" onClick={another} className={dlgBtnLine}>
                    <Plus className="w-4 h-4" strokeWidth={2.6} /> Add another doctor
                  </button>
                  <button type="button" onClick={close} className={dlgBtnBlue}>
                    Done
                  </button>
                </>
              }
            >
              <Handover
                rows={[['Staff ID', done.staffId], ...(done.email ? ([['Email', done.email]] as [string, string][]) : [])]}
                note={
                  done.email
                    ? done.invitationSent
                      ? `We emailed ${done.email} their user ID (staff ID) and password, with a link to set their own. They log in at Login → Doctors.`
                      : `The email couldn’t be sent. The doctor can use “Forgot password” on the doctor login page with ${done.email}.`
                    : 'Give the doctor their staff ID and the password you set. They log in at Login → Doctors.'
                }
              />
            </DlgDone>
          ) : hospitals.length === 0 ? (
            <div className="px-4 sm:px-7 py-9 text-center text-[14px] text-[#5B667A]">Add a hospital first; every doctor belongs to one.</div>
          ) : (
            <DlgForm
              key={round}
              onSubmit={(e) => submit(e)}
              onCancel={close}
              pending={pending}
              error={error}
              submitLabel={mode === 'email' ? 'Add doctor and email login' : 'Add doctor'}
              submitIcon={<Plus className="w-4 h-4" strokeWidth={2.6} />}
            >
              <DlgSection n={1} title="Doctor profile" sub="What patients see when they book this doctor.">
                <DlgGrid>
                  <DlgField label="Full name" required hint="As on the medical registration certificate.">
                    <input name="fullName" required minLength={2} maxLength={120} className={dlgInput} autoComplete="off" />
                  </DlgField>
                  <DlgField label="Speciality" required>
                    <input name="specialty" required minLength={2} maxLength={80} list="executive-specialities" className={dlgInput} placeholder="e.g. Cardiology" autoComplete="off" />
                    <datalist id="executive-specialities">
                      {SPECIALITIES.map((s) => (
                        <option key={s.slug} value={s.name} />
                      ))}
                    </datalist>
                  </DlgField>
                  <DlgField label="Years of experience">
                    <input name="experienceYears" type="number" inputMode="numeric" min={0} max={70} placeholder="0" className={dlgInput} />
                  </DlgField>
                </DlgGrid>
              </DlgSection>

              <DlgSection n={2} title="Hospital and fee" sub="Where patients book this doctor.">
                <DlgGrid>
                  <DlgField label="Hospital" required className="sm:col-span-2">
                    <select name="hospitalId" required defaultValue="" className={`${dlgInput} cursor-pointer`}>
                      <option value="" disabled>
                        Choose the hospital
                      </option>
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                          {h.city ? `, ${h.city}` : ''}
                        </option>
                      ))}
                    </select>
                  </DlgField>
                  <DlgField label="Consultation fee" required hint="Collected at the hospital counter for each visit.">
                    <DlgRupee>
                      <input name="consultationFee" type="number" inputMode="numeric" min={0} max={100000} required aria-label="Consultation fee in rupees" className={dlgBareInput} />
                    </DlgRupee>
                  </DlgField>
                </DlgGrid>
              </DlgSection>

              <DlgSection n={3} title="Account access" sub="How the doctor signs in to the doctor portal.">
                <div role="radiogroup" aria-label="Account access" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-[18px]">
                  <button type="button" role="radio" aria-checked={mode === 'email'} onClick={() => setMode('email')} className={dlgChip(mode === 'email')}>
                    Email their login details
                  </button>
                  <button type="button" role="radio" aria-checked={mode === 'manual'} onClick={() => setMode('manual')} className={dlgChip(mode === 'manual')}>
                    Set a password myself
                  </button>
                </div>
                <DlgGrid>
                  {mode === 'email' ? (
                    <DlgField label="Doctor’s email" required hint="We email the doctor their user ID (staff ID) and password, with a link to set their own.">
                      <input name="email" type="email" required maxLength={160} className={dlgInput} autoComplete="off" />
                    </DlgField>
                  ) : (
                    <DlgField label="Temporary password" required hint={`${PASSWORD_RULE} Give it to the doctor; they set their own when they first sign in.`}>
                      <input name="password" type="password" required minLength={10} maxLength={128} className={dlgInput} autoComplete="new-password" />
                    </DlgField>
                  )}
                </DlgGrid>
                <InfoNote>A Staff ID is made automatically. Patients can book the doctor once the hospital publishes their slots.</InfoNote>
              </DlgSection>
            </DlgForm>
          )}
        </FormDialog>
      )}
    </>
  )
}

/** For a hospital or centre that has no staff sign-in yet. */
export function AddLoginButton({ kind, id, name }: { kind: 'hospital' | 'lab'; id: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [staffId, setStaffId] = useState<string | null>(null)
  const close = () => {
    setOpen(false)
    setError('')
    setStaffId(null)
  }
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    start(async () => {
      const result = await addOrganizationLogin({ kind, id, password: String(form.get('password') ?? ''), staffId: String(form.get('staffId') ?? '') })
      if (!result.success) return setError(result.error)
      setStaffId(result.staffId)
      router.refresh()
    })
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 h-[34px] px-3 rounded-[10px] text-[12.5px] font-extrabold whitespace-nowrap border-[1.5px] border-[#2A4DD0] bg-white text-[#2A4DD0] hover:bg-[#EEF3FF] transition-all"
      >
        <KeyRound className="w-4 h-4" /> Create login
      </button>
      {open && (
        <FormDialog title={`Staff login for ${name}`} subtitle="This account manages the listing, doctors, bookings and payments." width={640} done={!!staffId} onClose={close}>
          {staffId ? (
            <DlgDone
              title="Login created"
              actions={
                <button type="button" onClick={close} className={dlgBtnBlue}>
                  Done
                </button>
              }
            >
              <Handover rows={[['Staff ID', staffId]]} note="Give the staff their staff ID and the password you set." />
            </DlgDone>
          ) : (
            <DlgForm onSubmit={submit} onCancel={close} pending={pending} error={error} submitLabel="Create login" submitIcon={<KeyRound className="w-4 h-4" />}>
              <DlgSection n={1} title="Staff login" sub={`How ${name}’s staff sign in.`}>
                <DlgGrid>
                  <DlgField label="Staff ID" hint="Leave blank to make one.">
                    <input name="staffId" maxLength={24} pattern="[A-Za-z0-9-]{4,24}" className={`${dlgInput} uppercase`} autoCapitalize="characters" />
                  </DlgField>
                  <DlgField label="Password" required hint={`${PASSWORD_RULE} Give it to the staff yourself.`}>
                    <input name="password" type="password" required minLength={10} maxLength={128} className={dlgInput} autoComplete="new-password" />
                  </DlgField>
                </DlgGrid>
              </DlgSection>
            </DlgForm>
          )}
        </FormDialog>
      )}
    </>
  )
}
