'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Hospital, Loader2 } from 'lucide-react'
import { endPractice, respondToPractice } from '@/app/actions/practices'
import { PRACTICE_STATUS, type PracticeStatus } from '@/lib/practices'
import { btnOutline, btnPrimary, card } from '@/components/portal/workspace-ui'

export type DoctorLink = { id: string; hospitalId: string; hospital: string; city: string | null; status: PracticeStatus; note: string | null; openSlots: number; slots: number }

/**
 * Other hospitals: invitations to consult at another hospital (accept or decline), and the hospitals the doctor visits
 * once the Consult your Doctor team has confirmed the link. Each publishes the doctor's slots at its own address.
 */
export function PracticeLinks({ links }: { links: DoctorLink[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const invites = links.filter((l) => l.status === 'invited')
  const others = links.filter((l) => l.status === 'accepted' || l.status === 'confirmed')
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Something went wrong.')
      router.refresh()
    })

  if (!invites.length && !others.length) return null
  return (
    <section className="mt-3.5 lg:mt-5">
      <h2 className="mb-2.5 text-[16px] font-extrabold">Other hospitals</h2>
      <div className="grid gap-3.5 lg:gap-4 lg:grid-cols-3">
        {invites.map((l) => (
          <article key={l.id} className={`${card} p-4 lg:p-[22px]`}>
            <span className="inline-flex items-center h-6 px-[9px] rounded-full bg-[#FFF6E8] text-[#B54708] text-[11.5px] font-extrabold">Invitation</span>
            <span className="block mt-3 text-[17px] font-extrabold">{l.hospital}</span>
            <span className="block text-[13px] text-[#5B667A]">{l.city ?? ''}</span>
            <p className="mt-2 text-[13.5px] leading-[1.55]">
              {l.hospital} invites you to consult there too.{l.note ? ` Their note: “${l.note}”` : ''} If you accept, our team confirms it, and the hospital publishes your slots at its address. Your own hospital’s slots don’t change.
            </p>
            <div className="flex gap-2 mt-3.5">
              <button type="button" disabled={pending} onClick={() => run(() => respondToPractice(l.id, true))} className={`${btnPrimary} flex-1 !h-[38px]`}>
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                Accept
              </button>
              <button type="button" disabled={pending} onClick={() => run(() => respondToPractice(l.id, false))} className={`${btnOutline} lg:border !h-[38px]`}>
                Decline
              </button>
            </div>
          </article>
        ))}
        {others.map((l) => (
          <article key={l.id} className={`${card} p-4 lg:p-[22px]`}>
            <div className="flex justify-between gap-2">
              <span className="w-11 h-11 rounded-xl bg-[#F4F6FA] flex items-center justify-center shrink-0">
                <Hospital className="w-[22px] h-[22px] text-[#2A4DD0]" strokeWidth={2} aria-hidden />
              </span>
              <span className="text-[12.5px] font-extrabold" style={{ color: PRACTICE_STATUS[l.status].color }}>
                {l.status === 'confirmed' ? 'Visiting' : PRACTICE_STATUS[l.status].label}
              </span>
            </div>
            <span className="block mt-3.5 text-[17px] font-extrabold">{l.hospital}</span>
            <span className="block mb-3 text-[13px] text-[#5B667A]">{l.city ?? ''}</span>
            {l.status === 'confirmed' ? (
              <p className="text-[13.5px]">
                <strong>{l.slots}</strong> {l.slots === 1 ? 'slot' : 'slots'} published for the next 4 weeks · {l.openSlots} open
              </p>
            ) : (
              <p className="text-[13.5px] text-[#5B667A]">You accepted. Our team confirms the link, then the hospital can publish your slots.</p>
            )}
            <div className="flex gap-2 mt-3.5">
              <Link href={`/hospitals/${l.hospitalId}`} className={`${btnOutline} lg:border !h-[38px] flex-1`}>
                Hospital page
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => window.confirm(`Stop consulting at ${l.hospital}? Open slots there are taken down; booked visits stay.`) && run(() => endPractice(l.id))}
                className="text-[13px] font-extrabold text-[#B42318] hover:underline underline-offset-4 px-2"
              >
                Stop
              </button>
            </div>
          </article>
        ))}
      </div>
      {error && <p className="mt-2.5 text-[13px] font-bold text-[#B42318]">{error}</p>}
    </section>
  )
}
