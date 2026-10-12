'use client'

import { useState, useTransition, type FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Activity, Calendar, CalendarDays, CheckCircle2, ChevronDown, CreditCard,
  FileText, HeartPulse, Hospital, LoaderCircle, Mail, Phone, Plus, Send,
  ShieldCheck, Stethoscope, User, UserCheck, UserPlus, X
} from 'lucide-react'
import { CircleCheck } from 'lucide-react'
import { formatDayLabel, formatINR, formatTime, istDateKey } from '@/components/patient/format'
import { DeskDialog, ErrorNote, HealthRecordFields, PaymentPanel, PrimaryButton, QuietButton } from '@/components/portal/desk'
import type { DeskPayment } from '@/components/portal/desk-types'
import {
  hospitalOpenSlots,
  hospitalPaymentInfo,
  recordHospitalPayment,
  registerHospitalPatient,
  saveHospitalHealthRecord,
} from '@/app/actions/hospital-desk'

export type DeskDoctor = { id: string; name: string; department: string; fee: number | null }

const inputClass =
  'w-full rounded-xl bg-gray-50/80 hover:bg-gray-50 border border-gray-200/90 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all'

export function AddPatientButton({
  doctors,
  className,
  label = 'Add Patient',
}: {
  doctors: DeskDoctor[]
  className?: string
  label?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  // Selected Doctor & Slots
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id ?? '')
  const [selectedFee, setSelectedFee] = useState<number>(doctors[0]?.fee ?? 500)
  const [slots, setSlots] = useState<{ id: string; start: string; end: string | null }[] | null>(null)
  const [slotsAt, setSlotsAt] = useState<number>(0)
  const [selectedSlotId, setSelectedSlotId] = useState<string>('now')

  // Success State
  const [createdResult, setCreatedResult] = useState<{
    patientId: string
    appointmentId: string
    visitCode: string
    patientName: string
    doctorName: string
    fee: number
    payment: DeskPayment | null
  } | null>(null)
  const [paid, setPaid] = useState(false)

  // Update fee when doctor changes
  useEffect(() => {
    const doc = doctors.find((d) => d.id === selectedDoctorId)
    if (doc) {
      if (doc.fee) setSelectedFee(doc.fee)
      // Load slots for chosen doctor
      start(async () => {
        const res = await hospitalOpenSlots(doc.id)
        if (res.ok) {
          setSlots(res.slots)
          setSlotsAt(Date.now())
        } else {
          setSlots([])
        }
      })
    }
  }, [selectedDoctorId, doctors])

  const close = () => {
    setOpen(false)
    setError(null)
    setCreatedResult(null)
    setPaid(false)
    setSelectedSlotId('now')
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    form.set('doctorId', selectedDoctorId)
    form.set('scheduleId', selectedSlotId)
    form.set('consultationFee', String(selectedFee))

    start(async () => {
      const res = await registerHospitalPatient(form)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setError(null)
      setCreatedResult({
        patientId: res.patientId,
        appointmentId: res.appointmentId,
        visitCode: res.visitCode,
        patientName: res.patientName,
        doctorName: res.doctorName,
        fee: res.fee,
        payment: res.payment,
      })
      router.refresh()
    })
  }

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId)
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
        className={
          className ??
          'flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0066ff] hover:bg-[#0050cb] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all'
        }
      >
        <UserPlus className="w-[18px] h-[18px]" /> {label}
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

          {/* Modal Container (Matches Add Doctor - Image 3) */}
          <div className="relative w-full max-w-3xl my-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92dvh]">
            
            {/* Header */}
            <div className="p-6 sm:p-7 border-b border-gray-100 flex items-start justify-between gap-4 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/60">
                  <UserPlus className="w-6 h-6 text-[#0066ff]" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Add Patient
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Register a patient, assign an attending doctor, and set up consultation records.
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
                    Patient profile
                  </span>
                </div>
                <div className="h-[2px] w-8 sm:w-16 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                    Doctor &amp; Visit
                  </span>
                </div>
                <div className="h-[2px] w-8 sm:w-16 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                    Triage &amp; Vitals
                  </span>
                </div>
              </div>
            </div>

            {/* Form Body (Scrollable) */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              {createdResult !== null ? (
                <div className="flex flex-col gap-5 py-2">
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-base">Patient Registered &amp; Visit Scheduled</h4>
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <span className="text-xs text-emerald-800">
                          Visit Code: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-[#0066ff]">{createdResult.visitCode}</strong>
                        </span>
                        <span className="text-xs text-emerald-800">
                          Attending Doctor: <strong>{createdResult.doctorName}</strong>
                        </span>
                        <span className="text-xs text-emerald-800">
                          Patient: <strong>{createdResult.patientName}</strong>
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-emerald-700">
                        The patient profile has been synchronized with the hospital database and queue.
                      </p>
                    </div>
                  </div>

                  {createdResult.payment && (
                    <div className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4.5 h-4.5 text-[#0066ff]" />
                          <h3 className="text-sm font-bold text-gray-900">Desk Payment Collection</h3>
                        </div>
                        {paid && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                            Paid &amp; Confirmed
                          </span>
                        )}
                      </div>

                      <PaymentPanel
                        payment={createdResult.payment}
                        onRecord={(method, reference) =>
                          recordHospitalPayment({
                            appointmentId: createdResult.appointmentId,
                            method,
                            reference,
                          })
                        }
                        onPaid={() => setPaid(true)}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={close}
                      className="px-6 py-2.5 rounded-xl bg-[#0066ff] text-white text-sm font-bold hover:bg-[#0050cb] shadow-md transition-all"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="flex flex-col gap-6">
                  
                  {/* Card 1: 1. PATIENT PROFILE */}
                  <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0066ff] flex items-center justify-center shrink-0 border border-blue-100">
                        <User className="w-4 h-4 text-[#0066ff]" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                          1. Patient Profile
                        </h3>
                        <p className="text-[11.5px] text-gray-500">
                          Basic details and contact information.
                        </p>
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
                            minLength={2}
                            placeholder="Priya Sharma"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Mobile number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="phone"
                            type="tel"
                            required
                            placeholder="98204 77210"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Email address (optional)
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="email"
                            type="email"
                            placeholder="priya@example.com"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
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
                            Age
                          </label>
                          <div className="relative">
                            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                            <input
                              name="age"
                              type="number"
                              min={1}
                              max={120}
                              placeholder="28"
                              className={`${inputClass} pl-9`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: 2. ATTENDING DOCTOR & CONSULTATION */}
                  <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0066ff] flex items-center justify-center shrink-0 border border-blue-100">
                        <Hospital className="w-4 h-4 text-[#0066ff]" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                          2. Attending Doctor &amp; Consultation
                        </h3>
                        <p className="text-[11.5px] text-gray-500">
                          Assign the doctor and schedule consultation details.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Attending doctor <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Stethoscope className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <select
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                            required
                            className={`${inputClass} pl-9 appearance-none pr-8 cursor-pointer`}
                          >
                            {doctors.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} • {d.department}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Consultation fee (₹) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="text-gray-500 font-bold absolute left-3.5 top-2.5">₹</span>
                          <input
                            name="feeInput"
                            type="number"
                            min={0}
                            required
                            value={selectedFee}
                            onChange={(e) => setSelectedFee(parseFloat(e.target.value) || 0)}
                            className={`${inputClass} pl-8`}
                          />
                        </div>
                        <span className="text-[10.5px] text-gray-400 mt-1 block">
                          Standard OPD consultation rate.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Visit priority
                        </label>
                        <div className="relative">
                          <CalendarDays className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <select
                            name="visitPriority"
                            defaultValue="walkin"
                            className={`${inputClass} pl-9 appearance-none pr-8 cursor-pointer`}
                          >
                            <option value="walkin">Walk-in (Immediate queue)</option>
                            <option value="scheduled">Scheduled consultation</option>
                            <option value="followup">Follow-up check</option>
                            <option value="emergency">Emergency triage</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Time Slot selection */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700">Appointment Slot</span>
                        <span className="text-[11px] text-gray-400">
                          {selectedSlotId === 'now' ? 'Walk-in assigned immediately' : 'Specific scheduled time'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedSlotId('now')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            selectedSlotId === 'now'
                              ? 'bg-[#0066ff] text-white border-[#0066ff] shadow-xs'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          ⚡ Walk-in: see now
                        </button>

                        {Array.from(byDay.entries()).map(([day, list]) =>
                          list?.slice(0, 3).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedSlotId(s.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                selectedSlotId === s.id
                                  ? 'bg-[#0066ff] text-white border-[#0066ff] shadow-xs'
                                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            >
                              {formatTime(s.start)}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: 3. INITIAL VITALS & HEALTH TRIAGE */}
                  <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0066ff] flex items-center justify-center shrink-0 border border-blue-100">
                        <HeartPulse className="w-4 h-4 text-[#0066ff]" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                          3. Initial Vitals &amp; Health Triage (Optional)
                        </h3>
                        <p className="text-[11.5px] text-gray-500">
                          Record preliminary vitals for the attending doctor.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Blood pressure
                        </label>
                        <div className="relative">
                          <Activity className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="bp"
                            placeholder="e.g. 120/80 mmHg"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Pulse / Heart rate (bpm)
                        </label>
                        <div className="relative">
                          <HeartPulse className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="hr"
                            placeholder="e.g. 76 bpm"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Temperature (°F)
                        </label>
                        <div className="relative">
                          <Activity className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="temp"
                            placeholder="e.g. 98.6 °F"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Chief complaint / Symptoms
                        </label>
                        <div className="relative">
                          <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                          <input
                            name="complaint"
                            placeholder="e.g. Viral fever and mild cough"
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Blue check banner */}
                    <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-100/80 flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#0066ff] text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs text-blue-950 font-medium">
                        A unique Patient Hospital ID (UHID) and consultation booking will be generated automatically.
                      </span>
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="p-3.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
                      {error}
                    </p>
                  )}

                  {/* Footer buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
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
                      Add Patient &amp; Create Visit
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
      <button
        type="button"
        onClick={open}
        disabled={pending}
        title={error ?? undefined}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0066ff] text-white text-[12px] font-bold disabled:opacity-60 shadow-xs hover:bg-[#0050cb] transition-colors"
      >
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-[12px] font-semibold text-gray-800 transition-colors"
      >
        <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Health data
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
