'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setMyBookingsPaused } from '@/app/actions/doctor-pause'

/**
 * The doctor's own "Taking bookings" switch (DocHome on phones, DeskDocHome on desktops). Pausing hides the doctor from
 * patients and stops new online bookings; bookings already made stay. A pause the hospital set can only be lifted by it.
 */
export function BookingSwitch({
  paused,
  by,
  ready,
  variant,
}: {
  paused: boolean
  by: 'doctor' | 'hospital' | null
  /** False until migration 20261118 has run. */
  ready: boolean
  variant: 'header' | 'desk'
}) {
  const router = useRouter()
  const [off, setOff] = useState(paused)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const byHospital = off && by === 'hospital'
  const disabled = pending || !ready || byHospital

  const toggle = () => {
    const next = !off
    setError(null)
    setOff(next) // optimistic; reverted if the server refuses
    start(async () => {
      const res = await setMyBookingsPaused(next)
      if (!res.ok) {
        setOff(!next)
        return setError(res.error)
      }
      router.refresh()
    })
  }

  const note = !ready ? 'Opens after the next update' : byHospital ? 'Paused by your hospital' : null

  if (variant === 'header') {
    return (
      <div className="mt-3.5">
        <button
          type="button"
          role="switch"
          aria-checked={!off}
          onClick={toggle}
          disabled={disabled}
          className="flex items-center justify-between gap-3 w-full px-3.5 py-3 rounded-[14px] border border-white/30 bg-transparent text-white text-left disabled:opacity-70"
        >
          <span className="min-w-0">
            <span className="block text-[14px] font-extrabold">{off ? 'Not taking bookings' : 'Available for bookings'}</span>
            <span className="block text-[12px] text-[#CFDCFF]">{note ?? (off ? 'New bookings are paused' : 'Patients can book your open slots')}</span>
          </span>
          <span aria-hidden className={`relative shrink-0 w-11 h-[26px] rounded-full ${off ? 'bg-white/25' : 'bg-white'}`}>
            <span className={`absolute top-[3px] w-5 h-5 rounded-full transition-all ${off ? 'left-[3px] bg-white' : 'left-[21px] bg-[#2A4DD0]'}`} />
          </span>
        </button>
        {error && (
          <p role="alert" className="mt-2 text-[12.5px] font-bold text-[#FFE1DD]">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-2.5">
      {(error || note) && (
        <span role={error ? 'alert' : undefined} className={`text-[12.5px] font-bold ${error ? 'text-[#B42318]' : 'text-[#5B667A]'}`}>
          {error ?? note}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={!off}
        onClick={toggle}
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] border border-[#D6DDE8] bg-white text-[#27324A] text-[13.5px] font-extrabold whitespace-nowrap hover:bg-[#F4F6FA] disabled:opacity-60"
      >
        <span aria-hidden className={`relative w-9 h-5 rounded-full ${off ? 'bg-[#C9D3E6]' : 'bg-[#067647]'}`}>
          <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white transition-all ${off ? 'left-[3px]' : 'left-[19px]'}`} />
        </span>
        {off ? 'Bookings paused' : 'Taking bookings'}
      </button>
    </span>
  )
}
