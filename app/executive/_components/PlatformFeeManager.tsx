'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, IndianRupee, Info, Loader2, Save, ShieldAlert, Sparkles } from 'lucide-react'
import { updatePlatformFeesAction } from '@/app/actions/pricing'
import { formatINR } from '@/components/patient/format'

interface Props {
  initialFees: {
    consultation: number
    diagnostic: number
  }
}

export function PlatformFeeManager({ initialFees }: Props) {
  const [fees, setFees] = useState(initialFees)
  const [consultation, setConsultation] = useState(String(initialFees.consultation))
  const [diagnostic, setDiagnostic] = useState(String(initialFees.diagnostic))
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const c = parseFloat(consultation)
    const d = parseFloat(diagnostic)

    if (isNaN(c) || c < 0) {
      return setMessage({ type: 'error', text: 'Please enter a valid consultation platform fee.' })
    }
    if (isNaN(d) || d < 0) {
      return setMessage({ type: 'error', text: 'Please enter a valid diagnostic lab platform fee.' })
    }

    const formData = new FormData()
    formData.append('consultation', String(c))
    formData.append('diagnostic', String(d))

    startTransition(async () => {
      const res = await updatePlatformFeesAction(formData)
      if (res.success && res.fees) {
        setFees(res.fees)
        setConsultation(String(res.fees.consultation))
        setDiagnostic(String(res.fees.diagnostic))
        setMessage({ type: 'success', text: 'Platform fees updated and applied across online checkout.' })
        setTimeout(() => setMessage(null), 4000)
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to update platform fees.' })
      }
    })
  }

  const consultNum = parseFloat(consultation) || 0
  const diagNum = parseFloat(diagnostic) || 0

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066ff] border border-blue-100/60 flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4" />
            </span>
            <h2 className="text-base md:text-lg font-bold text-slate-900">Platform Fee Configuration</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global checkout fees applied to patient bookings. Hidden from doctor and hospital portals.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-semibold shrink-0">
          <Sparkles className="w-3.5 h-3.5" /> Executive Access Only
        </span>
      </div>

      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#0066ff] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">Doctor &amp; Hospital Confidentiality:</p>
          <p>
            Doctors and hospital administrators only see their own consultation fees (e.g. ₹500). Platform fees are
            collected at patient checkout and managed exclusively from this executive panel.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col gap-2">
            <label htmlFor="consultationFeeInput" className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Doctor Consultation Platform Fee (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
              <input
                id="consultationFeeInput"
                type="number"
                min="0"
                step="1"
                required
                value={consultation}
                onChange={(e) => setConsultation(e.target.value)}
                className="w-full pl-8 pr-4 py-2 text-sm bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] font-semibold text-slate-900"
                placeholder="49"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Added to online doctor appointments at checkout (Current: {formatINR(fees.consultation)}).
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col gap-2">
            <label htmlFor="diagnosticFeeInput" className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Diagnostic Lab Platform Fee (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
              <input
                id="diagnosticFeeInput"
                type="number"
                min="0"
                step="1"
                required
                value={diagnostic}
                onChange={(e) => setDiagnostic(e.target.value)}
                className="w-full pl-8 pr-4 py-2 text-sm bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] font-semibold text-slate-900"
                placeholder="29"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Added to online diagnostic lab test bookings at checkout (Current: {formatINR(fees.diagnostic)}).
            </p>
          </div>
        </div>

        {/* Live Calculation Preview */}
        <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-700">
            <span className="font-semibold text-slate-900">Checkout Preview: </span>
            A patient booking a ₹500 consultation will pay{' '}
            <strong className="text-blue-700">₹500 + ₹{consultNum} = ₹{500 + consultNum}</strong> online.
          </div>
          <div className="text-slate-500 sm:text-right">
            Hospital / Doctor payout: <strong className="text-slate-800">₹500</strong>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg bg-[#0066ff] hover:bg-[#0050cb] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Save Platform Fees
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
