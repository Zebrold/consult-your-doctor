'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Banknote, Check, CircleAlert, CreditCard, LoaderCircle, QrCode, X, type LucideIcon } from 'lucide-react'
import { formatINR } from '@/components/patient/format'
import { startPayuPayment } from '@/lib/payu-client'
import { bmiCategory, bmiOf } from '@/lib/vitals'
import type { DeskPayment, DeskResult } from './desk-types'

// Building blocks for the hospital and diagnostic centre desk dialogs: registering a patient, taking payment and
// recording health details.

export const deskInput =
  'w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 text-[15px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 disabled:opacity-60'

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="font-label-sm text-label-sm text-indigo-gray-600">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-indigo-gray-600">{hint}</span>}
    </label>
  )
}

export function DeskDialog({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-xl'} max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-title-md text-title-md font-bold text-indigo-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-indigo-gray-600">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** The numbered steps across the top of a desk dialog. */
export function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" aria-label="Progress">
      {labels.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex items-center gap-1.5 shrink-0" aria-current={active ? 'step' : undefined}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                done ? 'bg-fresh-teal text-white' : active ? 'bg-vibrant-blue text-on-primary' : 'bg-surface-container text-indigo-gray-600'
              }`}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </span>
            <span className={`text-[12px] font-semibold ${active ? 'text-indigo-gray-900' : 'text-indigo-gray-600'}`}>{label}</span>
            {i < labels.length - 1 && <span className="w-5 h-px bg-outline-variant mx-0.5" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-error-container/60 text-on-error-container text-sm">
      <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" /> {children}
    </p>
  )
}

export function PrimaryButton({ pending, children, type = 'submit', onClick, disabled }: { pending?: boolean; children: ReactNode; type?: 'submit' | 'button'; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending || disabled}
      className="px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}

export function QuietButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="px-4 py-2.5 rounded-full text-sm font-semibold text-indigo-gray-600 hover:bg-surface-container">
      {children}
    </button>
  )
}

type Method = 'payu' | 'upi_qr' | 'cash'

const METHODS: { key: Method; label: string; detail: string; icon: LucideIcon }[] = [
  { key: 'payu', label: 'PayU', detail: 'Card, UPI or netbanking', icon: CreditCard },
  { key: 'upi_qr', label: 'Scanner', detail: 'UPI QR code', icon: QrCode },
  { key: 'cash', label: 'Cash', detail: 'Paid at the desk', icon: Banknote },
]

/**
 * Takes payment for one booking: PayU opens the hosted checkout on this screen (the callback records it and returns
 * here), the scanner shows a UPI QR code for the exact amount, and cash is recorded straight away.
 */
export function PaymentPanel({
  payment,
  onRecord,
  onPaid,
}: {
  payment: DeskPayment
  onRecord: (method: 'upi_qr' | 'cash', reference: string) => Promise<DeskResult>
  onPaid: () => void
}) {
  const [method, setMethod] = useState<Method>(payment.upi ? 'upi_qr' : 'payu')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const record = (m: 'upi_qr' | 'cash') =>
    start(async () => {
      const res = await onRecord(m, reference)
      if (!res.ok) return setError(res.error)
      setError(null)
      onPaid()
    })

  const payu = () =>
    start(async () => {
      const payuKey = payment.payuKey
      if (!payuKey) return setError('PayU isn’t set up for this site yet.')
      const problem = await startPayuPayment({
        txnid: payment.id,
        productinfo: payment.kind === 'appointment' ? 'Consultation' : 'Diagnostic',
        firstname: payment.patient.name,
        email: payment.patient.email || 'patients@consultyourdoctor.de',
        phone: payment.patient.phone || '',
        payuKey,
      })
      if (problem) setError(problem)
    })

  return (
    <div className="flex flex-col gap-4">
      <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-indigo-gray-900 truncate">{payment.patient.name}</p>
          <p className="text-[12px] text-indigo-gray-600 truncate">
            {payment.what} • #{payment.code}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-headline-lg text-[22px] font-bold text-indigo-gray-900">{formatINR(method === 'payu' ? payment.amounts.online : payment.amounts.desk)}</p>
          <p className="text-[11px] text-indigo-gray-600">{method === 'payu' ? `incl. ${formatINR(payment.amounts.platformFee)} platform fee` : 'to collect'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
        {METHODS.map(({ key, label, detail, icon: Icon }) => {
          const active = key === method
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setMethod(key)
                setError(null)
              }}
              className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-colors ${active ? 'border-vibrant-blue bg-primary-fixed/40' : 'border-outline-variant/60 hover:border-vibrant-blue/50'}`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-vibrant-blue' : 'text-indigo-gray-600'}`} />
              <span className="text-[14px] font-bold text-indigo-gray-900">{label}</span>
              <span className="text-[11px] text-indigo-gray-600 leading-tight">{detail}</span>
            </button>
          )
        })}
      </div>

      {method === 'payu' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-indigo-gray-600">PayU’s secure checkout opens on this screen for the patient to pay by card, UPI or netbanking. You’ll come back here once it’s done, and the booking is confirmed automatically.</p>
          <PrimaryButton type="button" pending={pending} onClick={payu}>
            <CreditCard className="w-4 h-4" /> Pay {formatINR(payment.amounts.online)} with PayU
          </PrimaryButton>
        </div>
      )}

      {method === 'upi_qr' &&
        (payment.upi ? (
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- a generated data URL */}
            <img src={payment.upi.image} alt={`UPI QR code to pay ${formatINR(payment.amounts.desk)}`} className="w-44 h-44 rounded-xl border border-outline-variant/60 bg-white p-2 shrink-0" />
            <div className="flex-1 w-full flex flex-col gap-3">
              <p className="text-sm text-indigo-gray-600">
                Ask the patient to scan this with any UPI app (GPay, PhonePe, Paytm, BHIM). It fills in <span className="font-semibold text-indigo-gray-900">{formatINR(payment.amounts.desk)}</span> to{' '}
                <span className="font-mono text-indigo-gray-900">{payment.upi.vpa}</span>.
              </p>
              <Field label="UPI reference (UTR)" hint="The 12-digit number in the patient’s app once the payment succeeds.">
                <input value={reference} onChange={(e) => setReference(e.target.value)} inputMode="text" autoComplete="off" placeholder="e.g. 428193760512" className={deskInput} />
              </Field>
              <PrimaryButton type="button" pending={pending} onClick={() => record('upi_qr')}>
                <Check className="w-4 h-4" /> Payment received
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <p className="p-3 rounded-lg bg-surface-container-low text-sm text-indigo-gray-600">
            The scanner isn’t set up yet: the site needs the UPI ID that receives payments (UPI_VPA). Use PayU or cash meanwhile.
          </p>
        ))}

      {method === 'cash' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-indigo-gray-600">
            Collect <span className="font-semibold text-indigo-gray-900">{formatINR(payment.amounts.desk)}</span> in cash, then record it here.
          </p>
          <PrimaryButton type="button" pending={pending} onClick={() => record('cash')}>
            <Banknote className="w-4 h-4" /> Cash received
          </PrimaryButton>
        </div>
      )}

      <ErrorNote>{error}</ErrorNote>
    </div>
  )
}

/** Vitals (BMI worked out as you type), notes and a document. Goes inside a form. */
export function HealthRecordFields() {
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const bmi = bmiOf(weight, height)
  const category = bmiCategory(bmi)

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Blood pressure (mmHg)">
          <input name="bp" placeholder="120/80" inputMode="numeric" className={deskInput} />
        </Field>
        <Field label="Pulse (bpm)">
          <input name="hr" placeholder="72" inputMode="numeric" className={deskInput} />
        </Field>
        <Field label="SpO2 (%)">
          <input name="spo2" placeholder="98" inputMode="numeric" className={deskInput} />
        </Field>
        <Field label="Temperature (°F)">
          <input name="temp" placeholder="98.6" inputMode="decimal" className={deskInput} />
        </Field>
        <Field label="Weight (kg)">
          <input name="weight" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="68" inputMode="decimal" className={deskInput} />
        </Field>
        <Field label="Height (cm)">
          <input name="height" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" inputMode="decimal" className={deskInput} />
        </Field>
      </div>
      <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3" aria-live="polite">
        <span className="text-sm text-indigo-gray-600">Body mass index (BMI)</span>
        <span className="text-sm font-bold text-indigo-gray-900">{bmi ? `${bmi} • ${category}` : 'Enter weight and height'}</span>
      </div>
      <Field label="Notes">
        <textarea name="notes" rows={3} placeholder="Symptoms, history, allergies, current medicines…" className={`${deskInput} resize-none`} />
      </Field>
      <Field label="Document (optional)" hint="Earlier reports, scans or referral letters: PDF, JPG, PNG or WebP, up to 5 MB.">
        <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="text-sm text-indigo-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-primary-fixed file:text-on-primary-fixed file:font-semibold" />
      </Field>
    </div>
  )
}
