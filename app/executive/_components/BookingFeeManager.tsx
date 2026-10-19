'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, FlaskConical, IndianRupee, Info, Loader2, Percent, Save, ShieldAlert, Sparkles, Stethoscope } from 'lucide-react'
import { updateBookingFeesAction } from '@/app/actions/pricing'
import { formatPercent, labTestBookingFee, type BookingFees } from '@/lib/pricing'
import { formatINR } from '@/components/patient/format'

const input =
  'w-full pl-7 pr-3 py-2 text-sm bg-white rounded-lg border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff]'

/** The two online booking fees: a flat one per doctor booking and a percentage of the lab's test prices. */
export function BookingFeeManager({ initialFees }: { initialFees: BookingFees }) {
  const [consultation, setConsultation] = useState(String(initialFees.consultation))
  const [percent, setPercent] = useState(String(initialFees.diagnosticPercent))
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const consultationFee = Number(consultation)
  const diagnosticPercent = Number(percent)
  const previewReady = consultation.trim() !== '' && percent.trim() !== '' && Number.isFinite(consultationFee) && Number.isFinite(diagnosticPercent)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const res = await updateBookingFeesAction({ consultation: consultationFee, diagnosticPercent })
      if (res.success && res.fees) {
        setConsultation(String(res.fees.consultation))
        setPercent(String(res.fees.diagnosticPercent))
        setMessage({ type: 'success', text: 'Booking fees saved. Every booking page, checkout and PayU payment now uses them.' })
      } else {
        setMessage({ type: 'error', text: res.error || 'Could not save the booking fees.' })
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066ff] border border-blue-100/60 flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4" />
            </span>
            <h2 className="text-base md:text-lg font-bold text-slate-900">Online Booking Fees</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">The only amounts patients pay online through PayU.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-semibold shrink-0">
          <Sparkles className="w-3.5 h-3.5" /> Executive Access Only
        </span>
      </div>

      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#0066ff] shrink-0 mt-0.5" />
        <p>
          The doctor&apos;s consultation fee is set by the hospital and paid at the hospital counter, and lab test prices are paid
          at the lab. Neither is ever collected online or added to a checkout total.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeeCard
            badge={<><Stethoscope className="w-3 h-3" /> Doctor Booking</>}
            tone="bg-blue-50 text-blue-700 border-blue-200/70"
            id="fee-consultation"
            label="Booking fee per appointment (₹)"
            hint="Charged once per doctor appointment."
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
            <input id="fee-consultation" type="number" min="0" step="1" required value={consultation} onChange={(e) => setConsultation(e.target.value)} className={input} />
          </FeeCard>
          <FeeCard
            badge={<><FlaskConical className="w-3 h-3" /> Lab Booking</>}
            tone="bg-emerald-50 text-emerald-700 border-emerald-200/70"
            id="fee-diagnostic"
            label="Booking fee (% of test price)"
            hint="Worked out on each booked test, to the paisa."
          >
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input id="fee-diagnostic" type="number" min="0" max="100" step="0.01" required value={percent} onChange={(e) => setPercent(e.target.value)} className={input} />
          </FeeCard>
        </div>

        {previewReady && (
          <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/50 flex flex-col gap-1 text-xs text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Doctor booking: </span>
              the patient pays <strong className="text-blue-700">{formatINR(consultationFee)}</strong> online; the consultation fee is paid at the hospital counter.
            </div>
            <div>
              <span className="font-semibold text-slate-900">Lab booking: </span>
              a ₹350 test costs <strong className="text-emerald-700">{formatINR(labTestBookingFee(350, diagnosticPercent))}</strong> online ({formatPercent(diagnosticPercent)}); the ₹350 is paid at the lab.
            </div>
          </div>
        )}

        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg bg-[#0066ff] hover:bg-[#0050cb] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Save Booking Fees</>}
          </button>
        </div>
      </form>
    </div>
  )
}

function FeeCard({ badge, tone, id, label, hint, children }: { badge: React.ReactNode; tone: string; id: string; label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/40 flex flex-col gap-3 shadow-xs">
      <span className={`self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${tone}`}>{badge}</span>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wider text-slate-700">{label}</label>
        <div className="relative">{children}</div>
        <span className="text-[11px] text-slate-400">{hint}</span>
      </div>
    </div>
  )
}
