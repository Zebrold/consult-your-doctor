'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, KeyRound, Plus, Trash2, UserCheck } from 'lucide-react'
import { DeskDialog, ErrorNote, Field, PrimaryButton, QuietButton, deskInput } from '@/components/portal/desk'
import { addOrganizationLogin, createDiagnosticCenter, createDoctorAccount, createHospital } from '@/app/actions/network'

// The executive portal's "add to the network" dialogs: hospitals and diagnostic centres (each with its staff
// sign-in), doctor accounts at any hospital, and a sign-in for an older hospital or centre that has none.

const PASSWORD_HINT = 'At least 10 characters, with letters and numbers. Share it privately, never by email or chat.'

/** A hospital or centre application (/signup/hospital, /signup/diagnostic-centre) to add to the network. */
export type ApplicationPrefill = { id: string; name: string; city: string; address: string | null; email: string; contactName: string }

function OpenButton({ children, onClick, approve = false }: { children: ReactNode; onClick: () => void; approve?: boolean }) {
  if (approve) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-[13px] font-bold shadow-sm transition-colors"
      >
        <UserCheck className="w-4 h-4" /> {children}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-sm font-bold shadow-sm transition-colors"
    >
      <Plus className="w-4 h-4" /> {children}
    </button>
  )
}

/** What the executive needs to hand over once an account exists. */
function Created({ title, rows, note, onClose }: { title: string; rows: [string, string][]; note: string; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
          <CircleCheck className="w-6 h-6" />
        </span>
        <p className="font-semibold text-indigo-gray-900">{title}</p>
      </div>
      <dl className="rounded-xl bg-surface-container-low p-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-indigo-gray-600">{label}</dt>
            <dd className="font-mono font-semibold text-indigo-gray-900 break-all">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-indigo-gray-600">{note}</p>
      <div className="flex justify-end">
        <PrimaryButton type="button" onClick={onClose}>Done</PrimaryButton>
      </div>
    </div>
  )
}

/** Name, city, address, contact email, and the staff sign-in fields shared by hospitals and centres. */
function OrgFields({ kind, prefill }: { kind: 'hospital' | 'lab'; prefill?: ApplicationPrefill }) {
  const noun = kind === 'hospital' ? 'hospital' : 'centre'
  return (
    <>
      {prefill && <input type="hidden" name="applicationId" value={prefill.id} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={kind === 'hospital' ? 'Hospital name' : 'Centre name'} className="sm:col-span-2">
          <input name="name" required minLength={2} maxLength={160} defaultValue={prefill?.name} className={deskInput} autoComplete="organization" />
        </Field>
        <Field label="City">
          <input name="city" required minLength={2} maxLength={80} defaultValue={prefill?.city} className={deskInput} autoComplete="address-level2" />
        </Field>
        <Field label="Contact email" hint="Optional">
          <input name="contactEmail" type="email" maxLength={160} defaultValue={prefill?.email} className={deskInput} autoComplete="email" />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <input name="address" maxLength={300} defaultValue={prefill?.address ?? undefined} className={deskInput} autoComplete="street-address" />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-3 rounded-xl border border-outline-variant/50 p-4">
        <legend className="px-1 text-sm font-semibold text-indigo-gray-900">Staff sign-in for this {noun}</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Account name" hint={`Optional. Defaults to "<name> Admin".`}>
            <input name="adminName" maxLength={120} defaultValue={prefill?.contactName} className={deskInput} />
          </Field>
          <Field label="Staff ID" hint="Optional. Leave blank to generate one.">
            <input name="staffId" maxLength={24} pattern="[A-Za-z0-9-]{4,24}" className={`${deskInput} uppercase`} autoCapitalize="characters" />
          </Field>
          <Field label="Password" hint={PASSWORD_HINT} className="sm:col-span-2">
            <input name="password" type="password" required minLength={10} maxLength={128} className={deskInput} autoComplete="new-password" />
          </Field>
        </div>
      </fieldset>
    </>
  )
}

function useSubmit<T extends { success: true } | { success: false; error: string }>(action: (form: FormData) => Promise<T>) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [done, setDone] = useState<Extract<T, { success: true }> | null>(null)
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
  return { pending, error, done, submit, reset: () => { setError(''); setDone(null) } }
}

const APPLICANT_NOTE = ' The applicant has been emailed their staff ID; give them the password privately.'

/** Adds a hospital; with `fromApplication`, approves that application by adding it pre-filled. */
export function AddHospitalButton({ fromApplication }: { fromApplication?: ApplicationPrefill } = {}) {
  const [open, setOpen] = useState(false)
  const { pending, error, done, submit, reset } = useSubmit(createHospital)
  const close = () => { setOpen(false); reset() }
  return (
    <>
      <OpenButton onClick={() => setOpen(true)} approve={!!fromApplication}>{fromApplication ? 'Approve & add' : 'Add hospital'}</OpenButton>
      {open && (
        <DeskDialog
          title={fromApplication ? `Approve ${fromApplication.name}` : 'Add a hospital'}
          subtitle={fromApplication ? 'Check the details from the application, then set the staff sign-in. It is listed for booking straight away.' : 'It is listed for booking straight away, and its staff sign in with the ID below.'}
          onClose={close}
          wide
        >
          {done ? (
            <Created
              title="Hospital added"
              rows={[['Hospital ID', done.code], ['Staff ID', done.staffId]]}
              note={`Give the hospital's staff their staff ID and the password you set. They sign in at Login → Hospitals and can add their doctors and slots.${fromApplication ? APPLICANT_NOTE : ''}`}
              onClose={close}
            />
          ) : (
            <form onSubmit={(e) => submit(e)} className="flex flex-col gap-4">
              <OrgFields kind="hospital" prefill={fromApplication} />
              <ErrorNote>{error}</ErrorNote>
              <div className="flex justify-end gap-2">
                <QuietButton onClick={close}>Cancel</QuietButton>
                <PrimaryButton pending={pending}>{fromApplication ? 'Approve & add hospital' : 'Add hospital'}</PrimaryButton>
              </div>
            </form>
          )}
        </DeskDialog>
      )}
    </>
  )
}

const STARTER_TESTS = ['Complete Blood Count (CBC)', 'Thyroid Profile', 'Lipid Profile', 'X-Ray', 'Ultrasound', 'ECG']

/** Adds a diagnostic centre; with `fromApplication`, approves that application by adding it pre-filled. */
export function AddDiagnosticCenterButton({ fromApplication }: { fromApplication?: ApplicationPrefill } = {}) {
  const [open, setOpen] = useState(false)
  const [tests, setTests] = useState(() => STARTER_TESTS.map((name) => ({ name, price: '' })))
  const { pending, error, done, submit, reset } = useSubmit(createDiagnosticCenter)
  const close = () => { setOpen(false); reset(); setTests(STARTER_TESTS.map((name) => ({ name, price: '' }))) }
  const priced = tests.filter((t) => t.name.trim() && t.price !== '')
  return (
    <>
      <OpenButton onClick={() => setOpen(true)} approve={!!fromApplication}>{fromApplication ? 'Approve & add' : 'Add diagnostic centre'}</OpenButton>
      {open && (
        <DeskDialog
          title={fromApplication ? `Approve ${fromApplication.name}` : 'Add a diagnostic centre'}
          subtitle={fromApplication ? 'Check the details from the application, then set the staff sign-in. Patients can book its priced tests straight away.' : 'Patients can book its priced tests straight away; the centre can edit its menu later.'}
          onClose={close}
          wide
        >
          {done ? (
            <Created
              title="Diagnostic centre added"
              rows={[['Centre ID', done.code], ['Staff ID', done.staffId]]}
              note={`Give the centre's staff their staff ID and the password you set. They sign in at Login → Diagnostic centres and manage tests, bookings and reports.${fromApplication ? APPLICANT_NOTE : ''}`}
              onClose={close}
            />
          ) : (
            <form
              onSubmit={(e) => submit(e, (form) => form.set('tests', JSON.stringify(priced.map((t) => ({ name: t.name.trim(), price: Number(t.price) })))))}
              className="flex flex-col gap-4"
            >
              <OrgFields kind="lab" prefill={fromApplication} />
              <fieldset className="flex flex-col gap-2 rounded-xl border border-outline-variant/50 p-4">
                <legend className="px-1 text-sm font-semibold text-indigo-gray-900">Starting price list</legend>
                <p className="text-[12px] text-indigo-gray-600">Only tests with a price are listed. Leave this empty if the centre will add its own.</p>
                {tests.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      aria-label="Test name"
                      value={t.name}
                      onChange={(e) => setTests((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      maxLength={80}
                      className={`${deskInput} flex-1 min-w-0`}
                    />
                    <span className="relative w-28 shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-gray-600 text-sm">₹</span>
                      <input
                        aria-label={`Price for ${t.name || 'this test'}`}
                        value={t.price}
                        onChange={(e) => setTests((list) => list.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^\d.]/g, '') } : x)))}
                        inputMode="decimal"
                        placeholder="Price"
                        className={`${deskInput} pl-7`}
                      />
                    </span>
                    <button type="button" aria-label={`Remove ${t.name || 'test'}`} onClick={() => setTests((list) => list.filter((_, j) => j !== i))} className="w-10 h-10 rounded-full flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setTests((list) => [...list, { name: '', price: '' }])} className="self-start inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold text-vibrant-blue hover:bg-primary-fixed/50">
                  <Plus className="w-4 h-4" /> Add a test
                </button>
              </fieldset>
              <ErrorNote>{error}</ErrorNote>
              <div className="flex justify-end gap-2">
                <QuietButton onClick={close}>Cancel</QuietButton>
                <PrimaryButton pending={pending}>{fromApplication ? 'Approve & add centre' : 'Add centre'}</PrimaryButton>
              </div>
            </form>
          )}
        </DeskDialog>
      )}
    </>
  )
}

export type HospitalOption = { id: string; name: string; city: string | null }

export function AddDoctorButton({ hospitals }: { hospitals: HospitalOption[] }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const { pending, error, done, submit, reset } = useSubmit(createDoctorAccount)
  const close = () => { setOpen(false); reset(); setEmail('') }
  return (
    <>
      <OpenButton onClick={() => setOpen(true)}>Add doctor</OpenButton>
      {open && (
        <DeskDialog title="Add a doctor" subtitle="Creates the doctor's account at the hospital they practise in." onClose={close} wide>
          {done ? (
            <Created
              title="Doctor account created"
              rows={[['Staff ID', done.staffId], ...(done.email ? ([['Email', done.email]] as [string, string][]) : [])]}
              note={
                done.email
                  ? done.invitationSent
                    ? 'An activation email is on its way; the doctor sets their own password from it and signs in at Login → Doctors.'
                    : "The activation email couldn't be sent. The doctor can use \"Forgot password\" on the doctor sign-in page with this email."
                  : 'Give the doctor their staff ID and the password you set. They sign in at Login → Doctors.'
              }
              onClose={close}
            />
          ) : hospitals.length === 0 ? (
            <p className="text-sm text-indigo-gray-600">Add a hospital first; every doctor belongs to one.</p>
          ) : (
            <form onSubmit={(e) => submit(e)} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Hospital" className="sm:col-span-2">
                  <select name="hospitalId" required defaultValue="" className={deskInput}>
                    <option value="" disabled>Choose the hospital</option>
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}{h.city ? `, ${h.city}` : ''}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Doctor's full name">
                  <input name="fullName" required minLength={2} maxLength={120} className={deskInput} autoComplete="name" />
                </Field>
                <Field label="Specialty">
                  <input name="specialty" required minLength={2} maxLength={80} className={deskInput} placeholder="e.g. Cardiology" />
                </Field>
                <Field label="Experience (years)">
                  <input name="experienceYears" type="number" min={0} max={70} defaultValue={0} className={deskInput} />
                </Field>
                <Field label="Consultation fee (₹)">
                  <input name="consultationFee" type="number" min={0} max={100000} required className={deskInput} />
                </Field>
                <Field label="Email" hint="Recommended: the doctor gets an activation link and sets their own password." className="sm:col-span-2">
                  <input name="email" type="email" maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} className={deskInput} autoComplete="email" />
                </Field>
                {!email.trim() && (
                  <Field label="Password" hint={`Needed without an email. ${PASSWORD_HINT}`} className="sm:col-span-2">
                    <input name="password" type="password" required minLength={10} maxLength={128} className={deskInput} autoComplete="new-password" />
                  </Field>
                )}
              </div>
              <ErrorNote>{error}</ErrorNote>
              <div className="flex justify-end gap-2">
                <QuietButton onClick={close}>Cancel</QuietButton>
                <PrimaryButton pending={pending}>Create account</PrimaryButton>
              </div>
            </form>
          )}
        </DeskDialog>
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
  const close = () => { setOpen(false); setError(''); setStaffId(null) }
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
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-outline-variant text-[13px] font-semibold text-vibrant-blue hover:bg-primary-fixed/40 transition-colors">
        <KeyRound className="w-4 h-4" /> Create login
      </button>
      {open && (
        <DeskDialog title={`Staff sign-in for ${name}`} subtitle="This account manages the listing, doctors, bookings and payments." onClose={close}>
          {staffId ? (
            <Created title="Sign-in created" rows={[['Staff ID', staffId]]} note="Give the staff their staff ID and the password you set." onClose={close} />
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Field label="Staff ID" hint="Optional. Leave blank to generate one.">
                <input name="staffId" maxLength={24} pattern="[A-Za-z0-9-]{4,24}" className={`${deskInput} uppercase`} autoCapitalize="characters" />
              </Field>
              <Field label="Password" hint={PASSWORD_HINT}>
                <input name="password" type="password" required minLength={10} maxLength={128} className={deskInput} autoComplete="new-password" />
              </Field>
              <ErrorNote>{error}</ErrorNote>
              <div className="flex justify-end gap-2">
                <QuietButton onClick={close}>Cancel</QuietButton>
                <PrimaryButton pending={pending}>Create login</PrimaryButton>
              </div>
            </form>
          )}
        </DeskDialog>
      )}
    </>
  )
}
