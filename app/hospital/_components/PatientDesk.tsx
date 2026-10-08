'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, CreditCard, HeartPulse, LoaderCircle, Send, UserPlus } from 'lucide-react'
import { formatDayLabel, formatINR, formatTime, istDateKey } from '@/components/patient/format'
import { DeskDialog, ErrorNote, Field, HealthRecordFields, PaymentPanel, PrimaryButton, QuietButton, Steps, deskInput } from '@/components/portal/desk'
import type { DeskPayment } from '@/components/portal/desk-types'
import {
  createHospitalVisit,
  hospitalOpenSlots,
  hospitalPaymentInfo,
  recordHospitalPayment,
  saveHospitalHealthRecord,
  sendHospitalPatientOtp,
  verifyHospitalPatient,
} from '@/app/actions/hospital-desk'

export type DeskDoctor = { id: string; name: string; department: string; fee: number | null }

const STEPS = ['Patient', 'Verify', 'Doctor', 'Payment', 'Health data']

/** Registers a patient at the desk: one-time code, doctor and time, payment, then health details. */
export function AddPatientButton({ doctors }: { doctors: DeskDoctor[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const [details, setDetails] = useState({ name: '', phone: '', email: '' })
  const [code, setCode] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [token, setToken] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [doctorId, setDoctorId] = useState('')
  const [slots, setSlots] = useState<{ id: string; start: string; end: string | null }[] | null>(null)
  // When the slots were loaded, for the day labels ("Today", "Tomorrow").
  const [slotsAt, setSlotsAt] = useState(0)
  const [slotId, setSlotId] = useState('now')
  const [payment, setPayment] = useState<DeskPayment | null>(null)
  const [paid, setPaid] = useState(false)
  const [healthSaved, setHealthSaved] = useState(false)
  const [changed, setChanged] = useState(false)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const reset = () => {
    setStep(0)
    setError(null)
    setDetails({ name: '', phone: '', email: '' })
    setCode('')
    setToken('')
    setDoctorId('')
    setSlots(null)
    setSlotId('now')
    setPayment(null)
    setPaid(false)
    setHealthSaved(false)
  }
  const close = () => {
    setOpen(false)
    if (changed) router.refresh()
    setChanged(false)
    reset()
  }

  const sendCode = () =>
    start(async () => {
      const res = await sendHospitalPatientOtp(details.phone)
      if (!res.ok) return setError(res.error)
      setError(null)
      setCode('')
      setResendIn(30)
      setStep(1)
    })

  const verify = (e: FormEvent) => {
    e.preventDefault()
    start(async () => {
      const res = await verifyHospitalPatient({ ...details, code })
      if (!res.ok) return setError(res.error)
      setError(null)
      setToken(res.token)
      setIsNew(res.patient.created)
      setDetails((d) => ({ ...d, name: res.patient.name }))
      setStep(2)
    })
  }

  const pickDoctor = (id: string) => {
    setDoctorId(id)
    setSlotId('now')
    setSlots(null)
    if (!id) return
    start(async () => {
      const res = await hospitalOpenSlots(id)
      if (!res.ok) return setError(res.error)
      setError(null)
      setSlotsAt(Date.now())
      setSlots(res.slots)
    })
  }

  const book = (e: FormEvent) => {
    e.preventDefault()
    if (!doctorId) return setError('Choose a doctor.')
    start(async () => {
      const res = await createHospitalVisit({ token, doctorId, scheduleId: slotId })
      if (!res.ok) return setError(res.error)
      setError(null)
      setChanged(true)
      setPayment(res.payment)
      setStep(3)
    })
  }

  const saveHealth = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!payment) return
    const form = new FormData(e.currentTarget)
    form.set('appointmentId', payment.id)
    start(async () => {
      const res = await saveHospitalHealthRecord(form)
      if (!res.ok) return setError(res.error)
      setError(null)
      setHealthSaved(true)
      setStep(5)
    })
  }

  const doctor = doctors.find((d) => d.id === doctorId)
  const byDay = new Map<string, typeof slots>()
  for (const s of slots ?? []) {
    const key = istDateKey(s.start)
    byDay.set(key, [...(byDay.get(key) ?? []), s])
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start lg:self-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-sm text-label-sm shadow-md"
      >
        <UserPlus className="w-[18px] h-[18px]" /> Add Patient
      </button>

      {open && (
        <DeskDialog title="Add Patient" subtitle="Register the patient, book their doctor and take payment." onClose={close} wide>
          {step < 5 && <Steps labels={STEPS} current={step} />}

          {step === 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendCode()
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Full name" className="sm:col-span-2">
                  <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} required minLength={2} placeholder="Priya Sharma" autoComplete="off" className={deskInput} />
                </Field>
                <Field label="Mobile number" hint="We text a one-time code to this number.">
                  <input value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} required inputMode="tel" placeholder="98204 77210" autoComplete="off" className={deskInput} />
                </Field>
                <Field label="Email (optional)" hint="Reports and prescriptions are emailed here.">
                  <input value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} type="email" placeholder="priya@example.com" autoComplete="off" className={deskInput} />
                </Field>
              </div>
              <ErrorNote>{error}</ErrorNote>
              <div className="flex justify-end gap-2">
                <QuietButton onClick={close}>Cancel</QuietButton>
                <PrimaryButton pending={pending}>
                  <Send className="w-4 h-4" /> Send code
                </PrimaryButton>
              </div>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={verify} className="flex flex-col gap-4">
              <p className="text-sm text-indigo-gray-600">
                We texted a code to <span className="font-semibold text-indigo-gray-900">{details.phone}</span>. Ask the patient to read it out.
              </p>
              <Field label="One-time code">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  className={`${deskInput} tracking-[0.4em] font-mono text-lg`}
                />
              </Field>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                <button type="button" disabled={resendIn > 0 || pending} onClick={sendCode} className="font-semibold text-vibrant-blue disabled:text-indigo-gray-600">
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
                <button type="button" onClick={() => setStep(0)} className="font-semibold text-vibrant-blue">
                  Change number
                </button>
              </div>
              <ErrorNote>{error}</ErrorNote>
              <div className="flex justify-end gap-2">
                <QuietButton onClick={close}>Cancel</QuietButton>
                <PrimaryButton pending={pending}>Verify</PrimaryButton>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={book} className="flex flex-col gap-4">
              <p className="p-3 rounded-lg bg-secondary-container/40 text-on-secondary-container text-sm flex items-center gap-2">
                <CircleCheck className="w-4 h-4 shrink-0" /> {details.name} is verified{isNew ? ' and their account was created' : ''}.
              </p>
              <Field label="Doctor">
                <select value={doctorId} onChange={(e) => pickDoctor(e.target.value)} required className={deskInput}>
                  <option value="">Choose a doctor…</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id} disabled={!d.fee}>
                      {d.name} • {d.department}
                      {d.fee ? ` • ${formatINR(d.fee)}` : ' • fee not set'}
                    </option>
                  ))}
                </select>
              </Field>
              {doctorId && (
                <div className="flex flex-col gap-2">
                  <span className="font-label-sm text-label-sm text-indigo-gray-600">Time</span>
                  {slots === null ? (
                    <span className="text-sm text-indigo-gray-600 flex items-center gap-2">
                      <LoaderCircle className="w-4 h-4 animate-spin" /> Loading open slots…
                    </span>
                  ) : (
                    <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-1">
                      <SlotChip active={slotId === 'now'} onClick={() => setSlotId('now')}>
                        Walk-in: see now
                      </SlotChip>
                      {Array.from(byDay.entries()).map(([day, list]) => (
                        <div key={day} className="flex flex-col gap-1.5">
                          <span className="text-[12px] font-semibold text-indigo-gray-600">{formatDayLabel(list![0].start, slotsAt)}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {list!.map((s) => (
                              <SlotChip key={s.id} active={slotId === s.id} onClick={() => setSlotId(s.id)}>
                                {formatTime(s.start)}
                              </SlotChip>
                            ))}
                          </div>
                        </div>
                      ))}
                      {slots.length === 0 && <span className="text-[12px] text-indigo-gray-600">No published slots in the next 7 days; book as a walk-in.</span>}
                    </div>
                  )}
                </div>
              )}
              <ErrorNote>{error}</ErrorNote>
              <div className="flex justify-end gap-2">
                <QuietButton onClick={close}>Cancel</QuietButton>
                <PrimaryButton pending={pending} disabled={!doctor?.fee}>
                  Book {doctor?.fee ? `• ${formatINR(doctor.fee)}` : ''}
                </PrimaryButton>
              </div>
            </form>
          )}

          {step === 3 && payment && (
            <div className="flex flex-col gap-3">
              <PaymentPanel
                payment={payment}
                onRecord={(method, reference) => recordHospitalPayment({ appointmentId: payment.id, method, reference })}
                onPaid={() => {
                  setPaid(true)
                  setStep(4)
                }}
              />
              <div className="flex justify-end">
                <QuietButton onClick={() => setStep(4)}>Collect later</QuietButton>
              </div>
            </div>
          )}

          {step === 4 && (
            <form onSubmit={saveHealth} className="flex flex-col gap-4">
              <p className="text-sm text-indigo-gray-600">Record what you measured. It goes into {details.name}’s profile and to {doctor?.name ?? 'the doctor'} for the visit.</p>
              <HealthRecordFields />
              <ErrorNote>{error}</ErrorNote>
              <div className="flex justify-end gap-2">
                <QuietButton onClick={() => setStep(5)}>Skip</QuietButton>
                <PrimaryButton pending={pending}>Save health data</PrimaryButton>
              </div>
            </form>
          )}

          {step === 5 && payment && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-secondary-container/50 text-on-secondary-container flex items-start gap-3">
                <CircleCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm flex flex-col gap-1">
                  <p className="font-bold">
                    {details.name} is booked with {doctor?.name ?? 'the doctor'}. Booking ID #{payment.code}.
                  </p>
                  <p>{paid ? 'Payment received; the patient has been sent a confirmation.' : 'Payment is still due: collect it from the Unpaid list.'}</p>
                  {healthSaved && <p>Health data saved to their profile and shared with the doctor.</p>}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <QuietButton onClick={reset}>Add another patient</QuietButton>
                <PrimaryButton type="button" onClick={close}>
                  Done
                </PrimaryButton>
              </div>
            </div>
          )}
        </DeskDialog>
      )}
    </>
  )
}

function SlotChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`self-start px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${active ? 'bg-vibrant-blue text-on-primary border-vibrant-blue' : 'bg-surface-container-lowest text-indigo-gray-900 border-outline-variant/60 hover:border-vibrant-blue/60'}`}
    >
      {children}
    </button>
  )
}

/** Takes payment for an unpaid visit from the patients list. */
export function TakePaymentButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter()
  const [payment, setPayment] = useState<DeskPayment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const open = () =>
    start(async () => {
      const res = await hospitalPaymentInfo(appointmentId)
      if (!res.ok) return setError(res.error)
      setError(null)
      setPayment(res.payment)
    })

  return (
    <>
      <button type="button" onClick={open} disabled={pending} title={error ?? undefined} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vibrant-blue text-on-primary text-[12px] font-bold disabled:opacity-60">
        {pending ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />} Take payment
      </button>
      {payment && (
        <DeskDialog title="Take payment" subtitle="PayU, the UPI scanner or cash." onClose={() => setPayment(null)}>
          <PaymentPanel
            payment={payment}
            onRecord={(method, reference) => recordHospitalPayment({ appointmentId, method, reference })}
            onPaid={() => {
              setPayment(null)
              router.refresh()
            }}
          />
        </DeskDialog>
      )}
    </>
  )
}

/** Adds vitals, notes or a document to a visit, for the patient's profile and the doctor. */
export function HealthRecordButton({ appointmentId, patientName }: { appointmentId: string; patientName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const close = () => {
    setOpen(false)
    setSaved(false)
    setError(null)
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    form.set('appointmentId', appointmentId)
    start(async () => {
      const res = await saveHospitalHealthRecord(form)
      if (!res.ok) return setError(res.error)
      setError(null)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-[12px] font-semibold text-indigo-gray-900">
        <HeartPulse className="w-3.5 h-3.5 text-soft-coral" /> Health data
      </button>
      {open && (
        <DeskDialog title="Health data" subtitle={`For ${patientName}’s visit. The patient and their doctor can see it.`} onClose={close}>
          {saved ? (
            <div className="flex flex-col gap-4">
              <p className="p-4 rounded-xl bg-secondary-container/50 text-on-secondary-container text-sm flex items-start gap-3">
                <CircleCheck className="w-5 h-5 shrink-0" /> Saved to {patientName}’s profile and shared with their doctor.
              </p>
              <div className="flex justify-end">
                <PrimaryButton type="button" onClick={close}>
                  Done
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <HealthRecordFields />
              <ErrorNote>{error}</ErrorNote>
              <div className="flex justify-end gap-2">
                <QuietButton onClick={close}>Cancel</QuietButton>
                <PrimaryButton pending={pending}>Save health data</PrimaryButton>
              </div>
            </form>
          )}
        </DeskDialog>
      )}
    </>
  )
}
