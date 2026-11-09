'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, CircleCheck, CreditCard, HeartPulse, LoaderCircle, Plus, UserPlus, X } from 'lucide-react'
import { formatDayLabel, formatINR, formatTime, initials, istDateKey, visitToken } from '@/components/patient/format'
import { DeskDialog, ErrorNote, HealthRecordFields, PaymentPanel, PrimaryButton, QuietButton } from '@/components/portal/desk'
import type { DeskPayment } from '@/components/portal/desk-types'
import {
  hospitalOpenSlots,
  hospitalPaymentInfo,
  recordHospitalPayment,
  registerHospitalPatient,
  saveHospitalHealthRecord,
  sendHospitalPatientOtp,
  verifyHospitalPatient,
} from '@/app/actions/hospital-desk'

export type DeskDoctor = { id: string; name: string; department: string; fee: number | null; /** Today's visits still to be seen. */ queue: number }
/** Today's booking fees: `fastTrack` is null where fast track isn't switched on. */
export type DeskFees = { general: number; fastTrack: number | null }

// The Add patient dialog, after the user's DeskHosAddPatient design: confirm the patient's number with a one-time
// code, pick the doctor, the queue and the time, note the desk's vitals, then take the payment by the UPI scanner or
// in cash. The visit is confirmed (and the slip sent) once the payment is recorded.

const label = 'block mb-1.5 text-[13px] font-extrabold text-[#27324A]'
const input =
  'block w-full h-[46px] px-3.5 rounded-xl border border-[#D6DDE8] bg-white text-[14.5px] text-[#0B1B3F] placeholder:text-[#8A94A6] outline-none focus:border-[#2A4DD0] focus:ring-2 focus:ring-[#2A4DD0]/15 read-only:bg-[#F7F9FC] transition-shadow'
const hint = 'block mt-1.5 text-[12.5px] leading-[1.45] text-[#5B667A]'
const btn = 'inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] text-[13.5px] font-extrabold whitespace-nowrap transition-colors disabled:opacity-60'
const btnBlue = `${btn} bg-[#2A4DD0] text-white shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#2443B8]`
const btnLine = `${btn} border border-[#D6DDE8] bg-white text-[#27324A] hover:bg-[#F4F6FA]`

const chip = (on: boolean, off = false) =>
  `inline-flex items-center justify-center gap-1.5 h-[46px] px-3.5 rounded-[10px] border text-[13.5px] font-extrabold whitespace-nowrap transition-colors ${
    off ? 'border-[#EEF2F7] bg-[#F7F9FC] text-[#A3ACBC] line-through cursor-not-allowed' : on ? 'border-[#2A4DD0] bg-[#2A4DD0] text-white' : 'border-[#D6DDE8] bg-white text-[#27324A] hover:border-[#A9BCEF]'
  }`

type Slot = { id: string; start: string; end: string | null; taken: boolean }
type Booked = { appointmentId: string; visitCode: string; patientName: string; doctorName: string; fee: number; fastTrack: boolean; start: string; payment: DeskPayment | null; walkIn: boolean }

export function AddPatientButton({
  doctors,
  fees,
  className,
  label: text = 'Add patient',
  defaultOpen = false,
}: {
  doctors: DeskDoctor[]
  fees: DeskFees
  className?: string
  label?: string
  /** Open the dialog straight away (the dashboard's Walk-in patient link). */
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  // A new round starts the dialog afresh ("Add another patient").
  const [round, setRound] = useState(0)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? btnBlue}>
        <Plus className="w-4 h-4" strokeWidth={2.6} /> {text}
      </button>
      {open && <AddPatientDialog key={round} doctors={doctors} fees={fees} onClose={() => setOpen(false)} onAnother={() => setRound((r) => r + 1)} />}
    </>
  )
}

function Section({ n, title, sub, badge, children }: { n: number; title: string; sub: string; badge?: string; children: ReactNode }) {
  return (
    <section className="px-4 py-[18px] sm:px-6 sm:py-[22px] rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0]">
      <div className="flex items-start justify-between gap-3 mb-[18px]">
        <div className="flex gap-3 items-start">
          <span className="shrink-0 w-7 h-7 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[13px] font-extrabold">{n}</span>
          <div>
            <h3 className="text-[15.5px] font-extrabold">{title}</h3>
            <p className="mt-0.5 text-[13px] text-[#5B667A]">{sub}</p>
          </div>
        </div>
        {badge && <span className="shrink-0 inline-flex items-center h-[26px] px-2.5 rounded-full bg-[#F4F6FA] text-[#5B667A] text-[12px] font-extrabold">{badge}</span>}
      </div>
      {children}
    </section>
  )
}

function Unit({ name, text, unit, wide = false }: { name: string; text: string; unit: string; wide?: boolean }) {
  return (
    <label className={`block min-w-0 ${wide ? 'col-span-2' : ''}`}>
      <span className={label}>{text}</span>
      <span className="flex h-[46px] rounded-xl border border-[#D6DDE8] overflow-hidden focus-within:border-[#2A4DD0] focus-within:ring-2 focus-within:ring-[#2A4DD0]/15">
        <input name={name} inputMode="decimal" aria-label={text} className="flex-1 min-w-0 border-0 outline-none px-3.5 text-[14.5px] text-[#0B1B3F]" />
        <span className="shrink-0 flex items-center px-3 bg-[#F7F9FC] border-l border-[#D6DDE8] text-[12.5px] font-extrabold text-[#5B667A]">{unit}</span>
      </span>
    </label>
  )
}

function AddPatientDialog({ doctors, fees, onClose, onAnother }: { doctors: DeskDoctor[]; fees: DeskFees; onClose: () => void; onAnother: () => void }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [verified, setVerified] = useState<{ token: string; name: string; created: boolean } | null>(null)
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')

  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? '')
  const [priority, setPriority] = useState<'general' | 'fast_track'>('general')
  const [method, setMethod] = useState<'upi_qr' | 'cash'>('upi_qr')
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [pickedDay, setDay] = useState('')
  const [slotId, setSlotId] = useState('now')

  const [booked, setBooked] = useState<Booked | null>(null)
  const [paid, setPaid] = useState(false)

  const doctor = doctors.find((d) => d.id === doctorId) ?? null
  // The dialog's clock, fixed when it opens.
  const [now] = useState(() => Date.now())
  const today = istDateKey(now)

  const pickDoctor = (id: string) => {
    if (id === doctorId) return
    setDoctorId(id)
    setSlots(null)
    setSlotId('now')
    setDay('')
  }

  // The chosen doctor's slots for the coming week.
  useEffect(() => {
    if (!doctorId) return
    let live = true
    hospitalOpenSlots(doctorId).then((res) => {
      if (live) setSlots(res.ok ? res.slots : [])
    })
    return () => {
      live = false
    }
  }, [doctorId])

  // Close on Escape, unless a visit was just booked (its payment is still open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !booked && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [booked, onClose])

  const sendCode = () => {
    setError(null)
    start(async () => {
      const res = await sendHospitalPatientOtp(phone)
      if (!res.ok) return setError(res.error)
      setSent(true)
    })
  }

  const verify = () => {
    setError(null)
    start(async () => {
      const res = await verifyHospitalPatient({ name, phone, email, code })
      if (!res.ok) return setError(res.error)
      setVerified({ token: res.token, name: res.patient.name, created: res.patient.created })
    })
  }

  const changeNumber = () => {
    setVerified(null)
    setSent(false)
    setCode('')
    setError(null)
  }

  const days = Array.from(new Set([today, ...(slots ?? []).map((s) => istDateKey(s.start))])).sort()
  const day = pickedDay || today
  const daySlots = (slots ?? []).filter((s) => istDateKey(s.start) === day)
  const chosen = slotId === 'now' ? null : (slots ?? []).find((s) => s.id === slotId) ?? null
  const slotText = chosen ? `${formatDayLabel(chosen.start, now)}, ${formatTime(chosen.start)}` : 'Walk-in, seen now'
  const fast = priority === 'fast_track' && fees.fastTrack != null
  const canAdd = !!verified && !!doctor?.fee
  const blocker = !verified ? 'Confirm the mobile number to continue' : !doctor?.fee ? 'Set this doctor’s fee on the Roster first' : null

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canAdd || !verified || !doctor) return setError(blocker ?? 'Choose the attending doctor.')
    const form = new FormData(e.currentTarget)
    form.set('token', verified.token)
    form.set('fullName', verified.name)
    form.set('doctorId', doctor.id)
    form.set('scheduleId', slotId)
    form.set('bookingType', fast ? 'fast_track' : 'general')
    form.set('gender', gender)
    form.set('age', age)
    setError(null)
    start(async () => {
      const res = await registerHospitalPatient(form)
      if (!res.ok) return setError(res.error)
      setBooked({
        appointmentId: res.appointmentId,
        visitCode: res.visitCode,
        patientName: res.patientName,
        doctorName: res.doctorName,
        fee: res.fee,
        fastTrack: res.fastTrack,
        start: res.start,
        payment: res.payment,
        walkIn: slotId === 'now',
      })
      router.refresh()
    })
  }

  const steps = [
    { n: 1, label: 'Patient profile', sub: verified ? 'Number confirmed' : 'Confirm mobile', done: !!verified, on: !verified },
    { n: 2, label: 'Doctor & visit', sub: verified && doctor ? doctor.name : 'Next', done: false, on: !!verified },
    { n: 3, label: 'Triage & vitals', sub: 'Optional', done: false, on: false },
  ]

  return (
    <div role="dialog" aria-modal="true" aria-label="Add patient" className="fixed inset-0 z-[100] overflow-y-auto bg-[rgba(11,27,63,0.55)] backdrop-blur-[3px] font-(family-name:--font-manrope) text-[#0B1B3F]">
      <div className="relative min-h-full sm:min-h-0 w-full sm:w-[min(920px,calc(100%-32px))] sm:my-10 sm:mx-auto sm:rounded-[20px] bg-white shadow-[0_24px_60px_rgba(11,27,63,0.28),0_0_0_1px_rgba(11,27,63,0.06)] overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-4 sm:px-7 pt-[22px] sm:pt-[26px] pb-5">
          <div>
            <h2 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em]">Add patient</h2>
            <p className="mt-[5px] text-[13.5px] sm:text-[14px] text-[#5B667A]">Register a walk-in, assign the attending doctor and add them to the queue.</p>
          </div>
          <button type="button" onClick={booked ? () => (router.refresh(), onClose()) : onClose} aria-label="Close" className="shrink-0 w-[38px] h-[38px] rounded-[11px] bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] flex items-center justify-center text-[#27324A] hover:bg-[#EEF2F8]">
            <X className="w-[18px] h-[18px]" strokeWidth={2.4} />
          </button>
        </div>

        {booked ? (
          <Done booked={booked} paid={paid} method={method} onPaid={() => (setPaid(true), router.refresh())} onAnother={onAnother} onClose={onClose} now={now} />
        ) : (
          <form ref={formRef} onSubmit={submit}>
            <ol aria-label="Progress" className="flex items-center justify-center gap-3 sm:gap-3.5 px-4 sm:px-7 py-4 bg-[#F7F9FC] border-y border-[#EEF2F7]">
              {steps.map((s) => (
                <li key={s.n} className="flex items-center gap-2.5" aria-current={s.on ? 'step' : undefined}>
                  <span
                    className={`shrink-0 w-[30px] h-[30px] rounded-full border-[1.5px] flex items-center justify-center text-[13px] font-extrabold ${
                      s.done || s.on ? 'border-[#2A4DD0] bg-[#2A4DD0] text-white' : 'border-[#C9D2E0] bg-white text-[#5B667A]'
                    }`}
                  >
                    {s.done ? <Check className="w-[15px] h-[15px]" strokeWidth={3} /> : s.n}
                  </span>
                  <span className="hidden sm:block">
                    <span className={`block text-[13.5px] font-extrabold ${s.done || s.on ? 'text-[#0B1B3F]' : 'text-[#5B667A]'}`}>{s.label}</span>
                    <span className="block text-[11.5px] text-[#5B667A] max-w-[140px] truncate">{s.sub}</span>
                  </span>
                  {s.n < 3 && <span aria-hidden className="w-6 sm:w-16 h-0.5 ml-1 rounded-sm bg-[#D6DDE8]" />}
                </li>
              ))}
            </ol>

            <div className="flex flex-col gap-[18px] px-3 sm:px-7 py-5 sm:py-6">
              <Section n={1} title="Patient profile" sub="Basic details and contact information.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] items-start">
                  <label className="block min-w-0">
                    <span className={label}>
                      Full name<span className="text-[#B42318]"> *</span>
                    </span>
                    <input value={verified ? verified.name : name} onChange={(e) => setName(e.target.value)} readOnly={!!verified} required minLength={2} maxLength={120} autoComplete="off" className={input} />
                  </label>
                  <div className="min-w-0">
                    <span className={label}>
                      Mobile number<span className="text-[#B42318]"> *</span>
                    </span>
                    <div className="flex h-[46px] rounded-xl border border-[#D6DDE8] overflow-hidden focus-within:border-[#2A4DD0] focus-within:ring-2 focus-within:ring-[#2A4DD0]/15">
                      <span className="shrink-0 flex items-center px-3 bg-[#F7F9FC] border-r border-[#D6DDE8] text-[14px] font-extrabold text-[#27324A]">+91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        aria-label="Mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                        readOnly={sent}
                        maxLength={14}
                        className="flex-1 min-w-0 border-0 outline-none px-3.5 text-[14.5px] text-[#0B1B3F] read-only:bg-[#F7F9FC]"
                      />
                    </div>
                    <div className="flex gap-2.5 mt-2.5">
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        aria-label="6-digit code"
                        placeholder="6-digit code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        readOnly={!sent || !!verified}
                        className={`${input} flex-1 tracking-[0.08em]`}
                      />
                      {!sent && (
                        <button type="button" onClick={sendCode} disabled={pending || phone.replace(/\D/g, '').length < 10} className={`${btnLine} !h-[46px] !border-[#2A4DD0] !text-[#2A4DD0]`}>
                          {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Send code
                        </button>
                      )}
                      {sent && !verified && (
                        <button type="button" onClick={verify} disabled={pending || code.length !== 6 || name.trim().length < 2} className={`${btnBlue} !h-[46px]`}>
                          {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Verify
                        </button>
                      )}
                      {verified && (
                        <span className="shrink-0 inline-flex items-center gap-1.5 h-[46px] px-3.5 rounded-xl bg-[#EEF3FF] text-[#2A4DD0] text-[13.5px] font-extrabold">
                          <Check className="w-4 h-4" strokeWidth={3} /> Confirmed
                        </span>
                      )}
                    </div>
                    <span className={hint}>
                      {!sent && 'Send the patient a code first. The visit is booked only once they confirm their number.'}
                      {sent && !verified && (
                        <>
                          Code sent by WhatsApp or text. Ask the patient to read it out.{' '}
                          <button type="button" onClick={sendCode} disabled={pending} className="font-extrabold text-[#2A4DD0]">
                            Resend
                          </button>
                          {' · '}
                          <button type="button" onClick={changeNumber} className="font-extrabold text-[#2A4DD0]">
                            Change number
                          </button>
                        </>
                      )}
                      {verified && (
                        <>
                          Number confirmed. {verified.created ? 'A new patient account was opened for it.' : `Already registered as ${verified.name}.`} The slip goes to this number.{' '}
                          <button type="button" onClick={changeNumber} className="font-extrabold text-[#2A4DD0]">
                            Change
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                  <label className="block min-w-0">
                    <span className={label}>
                      Email address <span className="font-bold text-[#8A94A6]">(optional)</span>
                    </span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={!!verified} maxLength={200} autoComplete="off" className={input} />
                  </label>
                  <div className="grid grid-cols-[minmax(0,1fr)_96px] sm:grid-cols-[minmax(0,1fr)_110px] gap-3">
                    <div className="min-w-0">
                      <span className={label}>Gender</span>
                      <div role="radiogroup" aria-label="Gender" className="flex gap-2">
                        {['Female', 'Male', 'Other'].map((g) => (
                          <button key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => setGender(gender === g ? '' : g)} className={`${chip(gender === g)} flex-1 !px-2`}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="block min-w-0">
                      <span className={label}>Age</span>
                      <input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} className={input} />
                    </label>
                  </div>
                </div>
              </Section>

              <Section n={2} title="Attending doctor & consultation" sub="Pick the doctor, the queue and how the fee is paid.">
                <span className={label}>
                  Attending doctor<span className="text-[#B42318]"> *</span>
                </span>
                {doctors.length === 0 ? (
                  <p className="p-3.5 rounded-xl bg-[#F7F9FC] text-[13.5px] text-[#5B667A]">Add a doctor on the Roster first.</p>
                ) : (
                  <div role="radiogroup" aria-label="Attending doctor" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {doctors.map((d) => {
                      const on = d.id === doctorId
                      return (
                        <button
                          key={d.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => pickDoctor(d.id)}
                          className={`flex items-center gap-3 p-3.5 rounded-[14px] text-left transition-colors ${on ? 'border-2 border-[#2A4DD0] bg-[#F5F8FF]' : 'border border-[#E1E7F0] bg-white hover:border-[#C9D5F2]'}`}
                        >
                          <span className="shrink-0 w-10 h-10 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[13px] font-extrabold">{initials(d.name)}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14px] font-extrabold truncate">{d.name}</span>
                            <span className="block text-[12.5px] text-[#5B667A] truncate">
                              {d.department} · {d.fee ? formatINR(d.fee) : 'Fee not set'}
                            </span>
                            <span className="block mt-0.5 text-[12px] font-bold text-[#5B667A]">{d.queue ? `${d.queue} in today’s queue` : 'No one waiting today'}</span>
                          </span>
                          <span className={`shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${on ? 'border-[#2A4DD0]' : 'border-[#C9D2E0]'}`}>
                            <span className={`w-2 h-2 rounded-full ${on ? 'bg-[#2A4DD0]' : 'bg-white'}`} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-[18px] mt-[18px] items-start">
                  <div>
                    <span className={label}>Consultation fee (₹)</span>
                    <div className="flex items-center h-[46px] px-3.5 rounded-xl border border-[#E1E7F0] bg-[#F7F9FC] text-[15px] font-extrabold">{doctor?.fee ? `₹ ${doctor.fee}` : '—'}</div>
                    <span className={hint}>{doctor?.fee ? `${doctor.name}’s fee, set on the Roster. Paid at your desk.` : 'Set this doctor’s consultation fee on the Roster first.'}</span>
                  </div>
                  <div>
                    <span className={label}>Visit priority</span>
                    <div role="radiogroup" aria-label="Visit priority" className="flex flex-wrap gap-2">
                      <button type="button" role="radio" aria-checked={!fast} onClick={() => setPriority('general')} className={chip(!fast)}>
                        General queue
                      </button>
                      {fees.fastTrack != null && (
                        <button type="button" role="radio" aria-checked={fast} onClick={() => setPriority('fast_track')} className={chip(fast)}>
                          Fast track
                        </button>
                      )}
                    </div>
                    <span className={hint}>
                      {fast
                        ? `Seen ahead of general patients once checked in. Booking fee ${formatINR(fees.fastTrack ?? 0)} instead of ${formatINR(fees.general)}.`
                        : `Booking fee ${formatINR(fees.general)}, or none on a free follow-up with this doctor.`}
                    </span>
                  </div>
                </div>

                <div className="mt-[18px]">
                  <span className={label}>Payment</span>
                  <div role="radiogroup" aria-label="Payment" className="flex flex-wrap gap-2">
                    <button type="button" role="radio" aria-checked={method === 'upi_qr'} onClick={() => setMethod('upi_qr')} className={chip(method === 'upi_qr')}>
                      UPI scanner
                    </button>
                    <button type="button" role="radio" aria-checked={method === 'cash'} onClick={() => setMethod('cash')} className={chip(method === 'cash')}>
                      Cash at the desk
                    </button>
                  </div>
                  <span className={hint}>
                    {method === 'upi_qr'
                      ? 'After booking, the patient scans a UPI code for the exact amount: the booking fee, consultation fee and any services.'
                      : 'After booking, collect the amount in cash and record it. The booking fee in it is taken from your wallet.'}
                  </span>
                </div>

                <div className="h-px bg-[#EEF2F7] mt-5 mb-[18px]" />

                <div className="flex flex-wrap justify-between items-baseline gap-2 mb-2.5">
                  <span className={`${label} !mb-0`}>Appointment slot</span>
                  <span className="text-[12.5px] font-bold text-[#5B667A]">{chosen ? `Booked for ${slotText}` : 'Booked as a walk-in, seen now'}</span>
                </div>
                {days.length > 1 && (
                  <div role="tablist" aria-label="Day" className="flex gap-1.5 mb-2.5 overflow-x-auto no-scrollbar">
                    {days.map((k) => (
                      <button
                        key={k}
                        type="button"
                        role="tab"
                        aria-selected={k === day}
                        onClick={() => setDay(k)}
                        className={`shrink-0 h-[34px] px-3 rounded-full text-[12.5px] font-extrabold transition-colors ${k === day ? 'bg-[#0B1B3F] text-white' : 'bg-[#F4F6FA] text-[#27324A] hover:bg-[#EEF2F8]'}`}
                      >
                        {formatDayLabel(`${k}T12:00:00+05:30`, now)}
                      </button>
                    ))}
                  </div>
                )}
                <div role="radiogroup" aria-label="Appointment slot" className="flex flex-wrap gap-2">
                  {day === today && (
                    <button type="button" role="radio" aria-checked={slotId === 'now'} onClick={() => setSlotId('now')} className={`${chip(slotId === 'now')} !h-[38px]`}>
                      Walk-in: see now
                    </button>
                  )}
                  {slots === null ? (
                    <span className="inline-flex items-center gap-2 h-[38px] text-[13px] text-[#5B667A]">
                      <LoaderCircle className="w-4 h-4 animate-spin" /> Loading slots
                    </span>
                  ) : (
                    daySlots.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={slotId === s.id}
                        aria-disabled={s.taken}
                        onClick={() => !s.taken && setSlotId(s.id)}
                        className={`${chip(slotId === s.id, s.taken)} !h-[38px]`}
                      >
                        {formatTime(s.start)}
                      </button>
                    ))
                  )}
                </div>
                <span className={hint}>{slots && slots.length === 0 ? 'No published slots this week; the patient can be seen now as a walk-in.' : 'Crossed-out times are already booked.'}</span>
              </Section>

              <Section n={3} title="Initial vitals & health triage" sub="Recorded at the desk for the attending doctor." badge="Optional">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5">
                  <Unit name="bp" text="Blood pressure" unit="mmHg" wide />
                  <Unit name="hr" text="Pulse" unit="bpm" />
                  <Unit name="temp" text="Temperature" unit="°F" />
                  <Unit name="spo2" text="SpO₂" unit="%" />
                  <Unit name="weight" text="Weight" unit="kg" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-[18px] mt-4">
                  <label className="block">
                    <span className={label}>Reason for visit</span>
                    <textarea name="complaint" maxLength={1000} className={`${input} !h-auto min-h-[92px] py-3 resize-y leading-[1.5]`} />
                  </label>
                  <label className="block">
                    <span className={label}>Known allergies</span>
                    <textarea name="allergies" maxLength={500} className={`${input} !h-auto min-h-[92px] py-3 resize-y leading-[1.5]`} />
                  </label>
                </div>
              </Section>

              {error && (
                <p role="alert" className="p-3.5 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13.5px] font-bold">
                  {error}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-7 py-4 bg-white border-t border-[#E6EAF0]">
              <span className="min-w-0">
                <span className="block text-[11.5px] font-extrabold tracking-[0.06em] text-[#5B667A]">VISIT</span>
                <span className="block text-[14px] font-extrabold truncate">
                  {doctor ? `${doctor.name} · ${slotText}${doctor.fee ? ` · ${formatINR(doctor.fee)} consultation` : ''}${fast ? ' · Fast track' : ''}` : 'Choose the attending doctor'}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-3">
                {blocker && <span className="text-[12.5px] font-bold text-[#5B667A]">{blocker}</span>}
                <span className="flex gap-2.5 ml-auto">
                  <button type="button" onClick={onClose} className={btnLine}>
                    Cancel
                  </button>
                  <button type="submit" disabled={pending} aria-disabled={!canAdd} className={`${btn} text-white ${canAdd ? 'bg-[#2A4DD0] shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#2443B8]' : 'bg-[#AFC0EE]'}`}>
                    {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" strokeWidth={2.6} />} Add to queue
                  </button>
                </span>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Done({ booked, paid, method, onPaid, onAnother, onClose, now }: { booked: Booked; paid: boolean; method: 'upi_qr' | 'cash'; onPaid: () => void; onAnother: () => void; onClose: () => void; now: number }) {
  const when = booked.walkIn ? 'Walk-in, seen now' : `${formatDayLabel(booked.start, now)}, ${formatTime(booked.start)}`
  const today = istDateKey(booked.start) === istDateKey(now)
  const rows: [string, string][] = [
    ['Patient', booked.patientName],
    ['Doctor', booked.doctorName],
    ['When', when],
    ['Visit', `${booked.fastTrack ? 'Fast track' : 'General queue'} · Booking ${booked.visitCode}`],
  ]

  return (
    <div className="px-4 sm:px-7 pt-2 pb-[30px]">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-[22px] sm:items-stretch p-4 sm:p-6 rounded-2xl bg-[#F5F8FF] shadow-[inset_0_0_0_1px_#DCE5FF]">
        <div className="shrink-0 sm:w-[150px] rounded-[14px] bg-[#2A4DD0] text-white flex flex-col items-center justify-center py-4">
          <span className="text-[11.5px] font-extrabold tracking-[0.1em] text-[#CFDCFF]">{booked.fastTrack ? 'FAST TRACK TOKEN' : 'TOKEN'}</span>
          <span className="text-[40px] font-extrabold tracking-[-0.02em] leading-[1.1]">{visitToken(booked.appointmentId)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] sm:text-[18px] font-extrabold">{paid ? (today ? 'Patient added to today’s queue' : 'Visit booked and paid') : 'Booked. Take the payment to confirm it'}</h3>
          <p className="mt-1 mb-3 text-[13.5px] text-[#5B667A]">
            {paid
              ? 'The booking slip has been sent to the patient on WhatsApp and by text message.'
              : 'Collect the amount below. Once it is recorded, the booking slip goes to the patient on WhatsApp and by text message.'}
          </p>
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-[11px] border-t border-[#E3E9F7] text-[13.5px]">
              <span className="text-[#5B667A]">{k}</span>
              <span className="font-extrabold text-right min-w-0 break-words">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {booked.payment && !paid && (
        <div className="mt-[18px] p-4 sm:p-5 rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0]">
          <h4 className="flex items-center gap-2 mb-3.5 text-[15px] font-extrabold">
            <CreditCard className="w-[18px] h-[18px] text-[#2A4DD0]" /> Take payment
          </h4>
          <PaymentPanel
            payment={booked.payment}
            initialMethod={method}
            onRecord={(m, reference) => recordHospitalPayment({ appointmentId: booked.appointmentId, method: m, reference })}
            onPaid={onPaid}
          />
        </div>
      )}
      {!booked.payment && !paid && (
        <p className="mt-[18px] p-3.5 rounded-xl bg-[#FFF6E8] text-[#B54708] text-[13.5px] font-bold">The visit was booked, but its payment couldn’t be loaded. Take it from the Unpaid list.</p>
      )}

      <div className="flex flex-wrap justify-end gap-2.5 mt-[18px]">
        <button type="button" onClick={onAnother} className={btnLine}>
          <UserPlus className="w-4 h-4" /> Add another patient
        </button>
        {paid && (
          <Link href={`/book/confirmation/${booked.appointmentId}`} target="_blank" className={btnLine}>
            Print slip
          </Link>
        )}
        <button type="button" onClick={onClose} className={btnBlue}>
          Done
        </button>
      </div>
    </div>
  )
}

/** Takes payment for an unpaid visit from the patients list. */
export function TakePaymentButton({ appointmentId, className }: { appointmentId: string; className?: string }) {
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
      <button
        type="button"
        onClick={open}
        disabled={pending}
        title={error ?? undefined}
        className={className ?? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0066ff] text-white text-[12px] font-bold disabled:opacity-60 shadow-xs hover:bg-[#0050cb] transition-colors'}
      >
        {pending ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />} Take payment
      </button>
      {payment && (
        <DeskDialog title="Take payment" subtitle="The UPI scanner or cash." onClose={() => setPayment(null)}>
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
export function HealthRecordButton({ appointmentId, patientName, className }: { appointmentId: string; patientName: string; className?: string }) {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-[12px] font-semibold text-gray-800 transition-colors'}
      >
        <HeartPulse className="w-3.5 h-3.5" /> Health data
      </button>
      {open && (
        <DeskDialog title="Health data" subtitle={`For ${patientName}’s visit. The patient and their doctor can see it.`} onClose={close}>
          {saved ? (
            <div className="flex flex-col gap-4">
              <p className="p-4 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-sm flex items-start gap-3">
                <CircleCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" /> Saved to {patientName}’s profile and shared with their doctor.
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
