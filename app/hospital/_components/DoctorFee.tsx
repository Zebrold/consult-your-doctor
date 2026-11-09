'use client'

import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, X } from 'lucide-react'
import { setHospitalDoctorFee } from '@/app/actions/hospital'

// Setting a doctor's consultation fee straight from the roster. The fee is the hospital's: it shows on the doctor's
// profile page and is paid at the hospital counter, never online (lib/assistant/knowledge.ts).

const btn = 'inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] text-[13.5px] font-extrabold whitespace-nowrap transition-colors disabled:opacity-60'

export function DoctorFeeButton({ doctorId, doctorName, fee, className, children }: { doctorId: string; doctorName: string; fee: number | null; className: string; children: ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(fee ? String(fee) : '')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const close = () => {
    setOpen(false)
    setError(null)
    setValue(fee ? String(fee) : '')
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    start(async () => {
      const res = await setHospitalDoctorFee(doctorId, Number(value))
      if (!res.success) return setError(res.error)
      setOpen(false)
      setError(null)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} title={`Consultation fee for ${doctorName}`}>
        {children}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Consultation fee" className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 font-(family-name:--font-manrope) text-[#0B1B3F] text-left">
          <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 bg-[rgba(11,27,63,0.55)] backdrop-blur-[3px]" />
          <form onSubmit={submit} className="relative w-full sm:w-[420px] rounded-t-[22px] sm:rounded-[20px] bg-white p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-[0_24px_60px_rgba(11,27,63,0.28)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[19px] font-extrabold tracking-[-0.01em]">Consultation fee</h2>
                <p className="mt-1 text-[13.5px] leading-[1.5] text-[#5B667A]">{doctorName}’s fee. Patients see it on the doctor’s profile and pay it at your counter, never online.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="shrink-0 w-9 h-9 rounded-[10px] bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] flex items-center justify-center">
                <X className="w-4 h-4" strokeWidth={2.4} />
              </button>
            </div>
            <label className="block mt-5">
              <span className="block mb-1.5 text-[13px] font-extrabold text-[#27324A]">Fee per consultation</span>
              <span className="flex items-center gap-1.5 h-[52px] px-3.5 rounded-xl border border-[#D6DDE8] focus-within:border-[#2A4DD0] focus-within:ring-2 focus-within:ring-[#2A4DD0]/15">
                <span className="text-[19px] font-extrabold">₹</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="500"
                  aria-label="Fee per consultation in rupees"
                  className="flex-1 min-w-0 border-0 outline-none bg-transparent text-[19px] font-extrabold"
                />
              </span>
            </label>
            {error && (
              <p role="alert" className="mt-3 p-3 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13px] font-bold">
                {error}
              </p>
            )}
            <div className="flex gap-2.5 mt-5">
              <button type="button" onClick={close} className={`${btn} flex-1 border border-[#D6DDE8] bg-white text-[#27324A] hover:bg-[#F4F6FA]`}>
                Cancel
              </button>
              <button type="submit" disabled={pending || !value} className={`${btn} flex-1 bg-[#2A4DD0] text-white shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#2443B8]`}>
                {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Save fee
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
