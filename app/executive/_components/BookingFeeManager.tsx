'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { updateBookingFeesAction } from '@/app/actions/pricing'
import { formatPercent, labTestBookingFee, onlinePayable, type BookingFees } from '@/lib/pricing'
import { formatINR } from '@/components/patient/format'
import { btnPrimary, card } from '@/components/portal/workspace-ui'

const box = 'flex-1 min-w-0 h-11 flex items-center gap-1 px-3.5 rounded-[10px] border border-[#D6DDE8] bg-white focus-within:border-[#2A4DD0] focus-within:shadow-[0_0_0_3px_rgba(42,77,208,0.12)]'
const field = 'w-full min-w-0 bg-transparent border-0 outline-none text-[18px] font-extrabold tabular-nums'
const step = 'shrink-0 w-[34px] h-[34px] rounded-[9px] border border-[#D6DDE8] bg-white text-[16px] font-extrabold text-[#27324A] hover:bg-[#F4F6FA]'
const tag = 'inline-flex items-center h-6 px-[9px] rounded-full bg-[#EEF3FF] text-[#2A4DD0] text-[11.5px] font-extrabold whitespace-nowrap'

/**
 * The online booking fees after DeskExePayments: flat ones per doctor booking (general and fast track), a percentage of
 * the lab's test prices, and the payment convenience fee added to every online payment (a percentage of the booking fee).
 */
export function BookingFeeManager({ initialFees }: { initialFees: BookingFees }) {
  const [consultation, setConsultation] = useState(String(initialFees.consultation))
  const [fastTrack, setFastTrack] = useState(String(initialFees.fastTrack))
  const [percent, setPercent] = useState(String(initialFees.diagnosticPercent))
  const [convenience, setConvenience] = useState(String(initialFees.conveniencePercent))
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const consultationFee = Number(consultation)
  const fastTrackFee = Number(fastTrack)
  const diagnosticPercent = Number(percent)
  const conveniencePercent = Number(convenience)
  const previewReady = [consultation, fastTrack, percent, convenience].every((v) => v.trim() !== '' && Number.isFinite(Number(v)))
  const total = (fee: number) => formatINR(onlinePayable(fee, conveniencePercent).total)
  const nudge = (value: string, set: (v: string) => void, by: number) => set(String(Math.max(0, Math.round((Number(value) || 0) + by))))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const res = await updateBookingFeesAction({ consultation: consultationFee, fastTrack: fastTrackFee, diagnosticPercent, conveniencePercent })
      if (res.success && res.fees) {
        setConsultation(String(res.fees.consultation))
        setFastTrack(String(res.fees.fastTrack))
        setPercent(String(res.fees.diagnosticPercent))
        setConvenience(String(res.fees.conveniencePercent))
        setMessage({ type: 'success', text: 'Booking fees saved. Every booking page, checkout and online payment now uses them.' })
      } else {
        setMessage({ type: 'error', text: res.error || 'Could not save the booking fees.' })
      }
    })
  }

  return (
    <section className={`${card} p-4 lg:p-[22px]`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3.5">
        <div>
          <h2 className="text-[16px] font-extrabold lg:tracking-[-0.01em]">Online booking fees</h2>
          <p className="mt-[3px] text-[13px] text-[#5B667A]">The only amounts patients pay online</p>
        </div>
        <span className={tag}>Executive access only</span>
      </div>
      <p className="mb-4 px-3.5 py-3 rounded-xl bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0] text-[13px] leading-normal text-[#27324A]">
        The doctor’s consultation fee is set by the hospital and paid at the hospital counter. Lab test prices are paid at the lab. Neither is ever collected online.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          <FeeCard badge="Doctor booking" id="fee-consultation" label="Booking fee per appointment" hint="Charged once per general appointment.">
            <button type="button" aria-label="Lower" onClick={() => nudge(consultation, setConsultation, -1)} className={step}>
              −
            </button>
            <span className={box}>
              <span className="text-[18px] font-extrabold">₹</span>
              <input id="fee-consultation" type="number" min="0" step="1" required value={consultation} onChange={(e) => setConsultation(e.target.value)} className={field} />
            </span>
            <button type="button" aria-label="Higher" onClick={() => nudge(consultation, setConsultation, 1)} className={step}>
              +
            </button>
          </FeeCard>
          <FeeCard badge="Fast track" id="fee-fast-track" label="Fast-track booking fee" hint="Charged instead of the booking fee.">
            <button type="button" aria-label="Lower" onClick={() => nudge(fastTrack, setFastTrack, -1)} className={step}>
              −
            </button>
            <span className={box}>
              <span className="text-[18px] font-extrabold">₹</span>
              <input id="fee-fast-track" type="number" min="0" step="1" required value={fastTrack} onChange={(e) => setFastTrack(e.target.value)} className={field} />
            </span>
            <button type="button" aria-label="Higher" onClick={() => nudge(fastTrack, setFastTrack, 1)} className={step}>
              +
            </button>
          </FeeCard>
          <FeeCard badge="Lab booking" id="fee-diagnostic" label="Booking fee, % of test price" hint="Worked out on each booked test.">
            <span className={box}>
              <input id="fee-diagnostic" type="number" min="0" max="100" step="0.01" required value={percent} onChange={(e) => setPercent(e.target.value)} className={field} />
              <span className="text-[18px] font-extrabold">%</span>
            </span>
          </FeeCard>
          <FeeCard badge="Online payment" id="fee-convenience" label="Convenience fee, % of booking fee" hint="Added to every online payment. 0 turns it off.">
            <span className={box}>
              <input id="fee-convenience" type="number" min="0" max="20" step="0.01" required value={convenience} onChange={(e) => setConvenience(e.target.value)} className={field} />
              <span className="text-[18px] font-extrabold">%</span>
            </span>
          </FeeCard>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5 mt-4 px-4 py-3.5 rounded-xl bg-[#F5F8FF] text-[13px] leading-relaxed text-[#27324A]">
          <span className="flex-1">
            {previewReady ? (
              <>
                <strong>Doctor booking:</strong> patient pays <strong className="text-[#2A4DD0]">{total(consultationFee)}</strong> online. <strong>Fast track:</strong>{' '}
                <strong className="text-[#2A4DD0]">{total(fastTrackFee)}</strong>. <strong>Lab booking:</strong> a ₹350 test costs{' '}
                <strong className="text-[#2A4DD0]">{total(labTestBookingFee(350, diagnosticPercent))}</strong> online ({formatPercent(diagnosticPercent)} and the convenience fee); ₹350 is paid at the lab.
              </>
            ) : (
              'Fill in every fee to see what patients pay.'
            )}
          </span>
          <button type="submit" disabled={isPending} className={`${btnPrimary} shrink-0`}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'Saving…' : 'Save booking fees'}
          </button>
        </div>

        {message && (
          <p role="status" className={`mt-3 px-3.5 py-2.5 rounded-xl text-[13px] font-bold ${message.type === 'success' ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#FEF3F2] text-[#B42318]'}`}>
            {message.text}
          </p>
        )}
      </form>
    </section>
  )
}

function FeeCard({ badge, id, label, hint, children }: { badge: string; id: string; label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="p-4 lg:p-[18px] rounded-[14px] shadow-[inset_0_0_0_1px_#E6EAF0] min-w-0">
      <span className={tag}>{badge}</span>
      <label htmlFor={id} className="block mt-3 text-[12px] font-extrabold tracking-[0.06em] uppercase text-[#5B667A]">
        {label}
      </label>
      <div className="flex items-center gap-2.5 mt-2">{children}</div>
      <span className="block mt-2 text-[12px] leading-snug text-[#5B667A]">{hint}</span>
    </div>
  )
}
