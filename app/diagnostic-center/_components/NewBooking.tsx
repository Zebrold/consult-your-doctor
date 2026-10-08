'use client'

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, KeyRound, Plus, Printer, Search, Send, X } from 'lucide-react'
import { registerLabPatient, recordLabPayment, resetLabPatientPassword, sendLabPatientOtp } from '@/app/actions/lab-desk'
import { formatINR } from '@/components/patient/format'
import { ErrorNote, PaymentPanel, PrimaryButton, QuietButton, Steps } from '@/components/portal/desk'
import type { DeskPayment } from '@/components/portal/desk-types'

export type BookingFormProps = {
  /** Tests the lab prices, in menu order. */
  tests: { name: string; price: number }[]
  minDate: string
  maxDate: string
  defaultDate: string
}

type Credentials = { patientCode: string; password: string | null }

const input =
  'w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 text-sm text-indigo-gray-900 placeholder:text-outline border border-transparent focus:outline-none focus:border-vibrant-blue focus:bg-surface-container-lowest'

const STEPS = ['Details', 'Verify', 'Payment']

/** A small slip with the patient's sign-in details, printed for them to keep. */
function printSlip(name: string, credentials: Credentials) {
  const w = window.open('', '_blank', 'width=420,height=520')
  if (!w) return
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  w.document.write(`<!doctype html><title>Patient login</title><body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a">
<h2 style="margin:0 0 4px;color:#0066ff">Consult Your Doctor</h2><p style="margin:0 0 18px;color:#475569">Your patient account</p>
<p style="margin:6px 0">Name: <b>${esc(name)}</b></p><p style="margin:6px 0">Patient ID: <b style="font-family:monospace;font-size:18px">${esc(credentials.patientCode)}</b></p>
${credentials.password ? `<p style="margin:6px 0">Password: <b style="font-family:monospace;font-size:18px">${esc(credentials.password)}</b></p>` : ''}
<p style="margin:18px 0 0;font-size:13px;color:#475569">Sign in at consultyourdoctor.de/login/patient with your Patient ID and password, or with your mobile number and a one-time code. Your reports appear in your account. Keep this slip private.</p>
<script>window.onload=()=>{window.print()}</script></body>`)
  w.document.close()
}

/**
 * Books tests for a walk-in or phone patient: the patient confirms their mobile number with a one-time code (which
 * gives them an account with a Patient ID and password), then the desk takes payment by PayU, the UPI scanner or cash.
 */
export function NewBookingForm({ tests, minDate, maxDate, defaultDate, onDone }: BookingFormProps & { onDone?: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<'details' | 'verify' | 'pay' | 'done'>('details')
  const [details, setDetails] = useState({ name: '', phone: '', email: '', date: defaultDate })
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [code, setCode] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [token, setToken] = useState('')
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [payment, setPayment] = useState<DeskPayment | null>(null)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? tests.filter((t) => t.name.toLowerCase().includes(q)) : tests
  }, [tests, query])
  const total = tests.filter((t) => selected.includes(t.name)).reduce((s, t) => s + t.price, 0)
  const toggle = (name: string) => setSelected((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]))

  const reset = () => {
    setStep('details')
    setDetails({ name: '', phone: '', email: '', date: defaultDate })
    setSelected([])
    setQuery('')
    setCode('')
    setToken('')
    setCredentials(null)
    setPayment(null)
    setPaid(false)
    setError(null)
  }

  const sendCode = () => {
    if (selected.length === 0) return setError('Select at least one test.')
    start(async () => {
      const res = await sendLabPatientOtp(details.phone)
      if (!res.ok) return setError(res.error)
      setError(null)
      setCode('')
      setResendIn(30)
      setStep('verify')
    })
  }

  const verify = (e: FormEvent) => {
    e.preventDefault()
    start(async () => {
      const res = await registerLabPatient({ ...details, tests: selected, code })
      if (!res.ok) return setError(res.error)
      setError(null)
      setToken(res.token)
      setCredentials(res.credentials)
      setPayment(res.payment)
      setStep('pay')
      router.refresh()
    })
  }

  const resetPassword = () =>
    start(async () => {
      const res = await resetLabPatientPassword(token)
      if (!res.ok) return setError(res.error)
      setError(null)
      setCredentials(res.credentials)
    })

  if (tests.length === 0) {
    return <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600">Add tests with prices to your test menu before booking patients.</p>
  }

  const credentialCard = credentials && (
    <div className="p-3.5 rounded-xl bg-primary-fixed/40 border border-vibrant-blue/20 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold text-indigo-gray-900">
          <KeyRound className="w-4 h-4 text-vibrant-blue" /> Patient login
        </span>
        <button type="button" onClick={() => printSlip(details.name, credentials)} className="inline-flex items-center gap-1 text-[12px] font-bold text-vibrant-blue">
          <Printer className="w-3.5 h-3.5" /> Print slip
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <span className="text-indigo-gray-600">Patient ID</span>
        <span className="font-mono font-bold text-indigo-gray-900 text-right">{credentials.patientCode}</span>
        <span className="text-indigo-gray-600">Password</span>
        <span className="font-mono font-bold text-indigo-gray-900 text-right">{credentials.password ?? 'Unchanged'}</span>
      </div>
      <p className="text-[11px] text-indigo-gray-600">
        {credentials.password
          ? 'Also sent to the patient on WhatsApp and email (when set up). Hand them the slip if they need it.'
          : 'This patient already has a login. '}
        {!credentials.password && (
          <button type="button" onClick={resetPassword} disabled={pending} className="font-bold text-vibrant-blue">
            Create a new password
          </button>
        )}
      </p>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {step !== 'done' && <Steps labels={STEPS} current={step === 'details' ? 0 : step === 'verify' ? 1 : 2} />}

      {step === 'details' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendCode()
          }}
          className="flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm text-indigo-gray-600">Patient full name</span>
            <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} required minLength={2} autoComplete="off" placeholder="e.g. Priya Sundaram" className={input} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-indigo-gray-600">Mobile number</span>
              <span className="flex items-center rounded-xl bg-surface-container-low border border-transparent focus-within:border-vibrant-blue focus-within:bg-surface-container-lowest">
                <span className="pl-3.5 text-sm font-semibold text-indigo-gray-600">+91</span>
                <input value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} type="tel" required inputMode="tel" autoComplete="off" placeholder="98765 43210" className="w-full bg-transparent px-2 py-2.5 text-sm text-indigo-gray-900 placeholder:text-outline focus:outline-none" />
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-indigo-gray-600">Date</span>
              <input value={details.date} onChange={(e) => setDetails({ ...details, date: e.target.value })} type="date" required min={minDate} max={maxDate} className={input} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm text-indigo-gray-600">Email (optional, for the report)</span>
            <input value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} type="email" autoComplete="off" placeholder="priya@example.com" className={input} />
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="font-label-sm text-label-sm text-indigo-gray-600 mb-1 flex w-full items-center justify-between">
              <span>Tests</span>
              {selected.length > 0 && <span className="text-vibrant-blue">{selected.length} selected</span>}
            </legend>
            {tests.length > 8 && (
              <span className="relative">
                <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a test" aria-label="Find a test" className={`${input} pl-9 py-2`} />
              </span>
            )}
            <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
              {shown.map((t) => {
                const on = selected.includes(t.name)
                return (
                  <label
                    key={t.name}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl cursor-pointer border text-sm transition-colors ${
                      on ? 'border-vibrant-blue bg-vibrant-blue/5 text-indigo-gray-900' : 'border-transparent bg-surface-container-low text-indigo-gray-900 hover:bg-surface-container'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <input type="checkbox" checked={on} onChange={() => toggle(t.name)} className="w-4 h-4 accent-vibrant-blue shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </span>
                    <span className="font-semibold shrink-0">{formatINR(t.price)}</span>
                  </label>
                )
              })}
              {shown.length === 0 && <p className="text-xs text-indigo-gray-600 px-1">No test matches “{query}”.</p>}
            </div>
          </fieldset>

          <div className="flex items-center justify-between px-1 text-sm">
            <span className="text-indigo-gray-600">To collect</span>
            <span className="font-title-md text-[18px] font-bold text-indigo-gray-900">{formatINR(total)}</span>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <PrimaryButton pending={pending}>
            <Send className="w-4 h-4" /> Send code to patient
          </PrimaryButton>
          <p className="text-[11px] text-indigo-gray-600 text-center">The patient confirms their number with a one-time code before you take payment. New patients get a Patient ID and password.</p>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={verify} className="flex flex-col gap-3">
          <p className="text-sm text-indigo-gray-600">
            We texted a code to <span className="font-semibold text-indigo-gray-900">+91 {details.phone}</span>. Ask {details.name || 'the patient'} to read it out.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            aria-label="One-time code"
            className={`${input} tracking-[0.4em] font-mono text-lg`}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <button type="button" disabled={resendIn > 0 || pending} onClick={sendCode} className="font-semibold text-vibrant-blue disabled:text-indigo-gray-600">
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
            <button type="button" onClick={() => setStep('details')} className="font-semibold text-vibrant-blue">
              Edit details
            </button>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <PrimaryButton pending={pending}>Verify &amp; book {formatINR(total)}</PrimaryButton>
        </form>
      )}

      {step === 'pay' && payment && (
        <div className="flex flex-col gap-3">
          {credentialCard}
          <PaymentPanel
            payment={payment}
            onRecord={(method, reference) => recordLabPayment({ bookingId: payment.id, method, reference })}
            onPaid={() => {
              setPaid(true)
              setStep('done')
              router.refresh()
            }}
          />
          <div className="flex justify-end">
            <QuietButton onClick={() => setStep('done')}>Collect later</QuietButton>
          </div>
        </div>
      )}

      {step === 'done' && payment && (
        <div className="flex flex-col gap-3">
          <p role="status" className="p-3.5 rounded-xl bg-secondary-container/60 text-on-secondary-container text-sm flex items-start gap-2">
            <CircleCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {details.name} is booked for {payment.what} (#{payment.code}). {paid ? 'Payment received; the patient has been sent a confirmation.' : 'Payment is still due: take it from the booking before collecting the sample.'}
            </span>
          </p>
          {credentialCard}
          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end gap-2">
            <QuietButton
              onClick={() => {
                reset()
                onDone?.()
              }}
            >
              Done
            </QuietButton>
            <PrimaryButton type="button" onClick={reset}>
              <Plus className="w-4 h-4" /> New booking
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  )
}

export function NewBookingButton({ className, label = 'New Booking', ...props }: BookingFormProps & { className: string; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Plus className="w-[18px] h-[18px]" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="New booking">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">New Booking</h3>
                <p className="text-sm text-indigo-gray-600">For a walk-in or phone patient: verify, book and take payment.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <NewBookingForm {...props} onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
