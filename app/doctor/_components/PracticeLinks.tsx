'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Hospital, Loader2 } from 'lucide-react'
import { endPractice, respondToPractice } from '@/app/actions/practices'
import { PRACTICE_STATUS, type PracticeStatus } from '@/lib/practices'
import { Panel, PanelHead, btnOutline, btnPrimary, card } from '@/components/portal/workspace-ui'

export type DoctorLink = { id: string; hospitalId: string; hospital: string; city: string | null; status: PracticeStatus; note: string | null; openSlots: number; slots: number }

function useRun() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Something went wrong.')
      router.refresh()
    })
  return { pending, error, run }
}

/**
 * The hospitals the doctor visits once the Consult your Doctor team has confirmed the link, as cards for the practice
 * grid (after the doctor's own hospital). Each publishes the doctor's slots at its own address.
 */
export function VisitingCards({ links }: { links: DoctorLink[] }) {
  const { pending, error, run } = useRun()
  const others = links.filter((l) => l.status === 'accepted' || l.status === 'confirmed')
  if (!others.length) return null
  return (
    <>
      {others.map((l) => (
        <article key={l.id} className={`${card} p-4 lg:p-[22px]`}>
          <div className="flex justify-between gap-2">
            <span className="w-11 h-11 rounded-xl bg-[#F4F6FA] flex items-center justify-center shrink-0">
              <Hospital className="w-[22px] h-[22px] text-[#2A4DD0]" strokeWidth={2} aria-hidden />
            </span>
            <span className="inline-flex items-center h-6 px-[9px] rounded-full bg-[#F4F6FA] text-[11.5px] font-extrabold whitespace-nowrap" style={{ color: PRACTICE_STATUS[l.status].color }}>
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
          {error && <p className="mt-2.5 text-[13px] font-bold text-[#B42318]">{error}</p>}
        </article>
      ))}
    </>
  )
}

/** Invitations to consult at another hospital (accept or decline). Always shown, with a line when there are none. */
export function Invitations({ links }: { links: DoctorLink[] }) {
  const { pending, error, run } = useRun()
  const invites = links.filter((l) => l.status === 'invited')
  return (
    <Panel className="mt-3.5 lg:mt-5">
      <PanelHead
        title="Invitations"
        sub={
          <>
            <span className="lg:hidden">Hospitals that want you to consult with them</span>
            <span className="hidden lg:inline">Hospitals on Consult your Doctor that want you to consult with them</span>
          </>
        }
      />
      {invites.length === 0 ? (
        <p className="py-3 text-[13.5px] text-[#5B667A]">No open invitations.</p>
      ) : (
        <>
          {invites.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-2.5 py-3 border-t border-[#EEF2F7]">
              <div className="min-w-0 flex-1 basis-[200px]">
                <span className="block text-[14.5px] font-extrabold">{l.hospital}</span>
                <span className="block text-[13px] text-[#5B667A]">{[l.city, l.note ? `Their note: “${l.note}”` : null].filter(Boolean).join(' · ') || 'Invites you to consult there too'}</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" disabled={pending} onClick={() => run(() => respondToPractice(l.id, false))} className={`${btnOutline} lg:border !h-[38px]`}>
                  Decline
                </button>
                <button type="button" disabled={pending} onClick={() => run(() => respondToPractice(l.id, true))} className={`${btnPrimary} !h-[38px]`}>
                  {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Accept
                </button>
              </div>
            </div>
          ))}
          <p className="mt-1 text-[12.5px] leading-[1.5] text-[#5B667A]">If you accept, our team confirms it, and the hospital publishes your slots at its address. Your own hospital’s slots don’t change.</p>
        </>
      )}
      {error && <p className="mt-2.5 text-[13px] font-bold text-[#B42318]">{error}</p>}
    </Panel>
  )
}
