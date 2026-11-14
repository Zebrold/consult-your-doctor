'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Check, Loader2, Plus } from 'lucide-react'
import { setBranchAccess, switchBranch } from '@/app/actions/branches'
import { btnOutline, btnPrimary } from './hos-ui'

export type BranchCard = {
  id: string
  name: string
  place: string
  code: string
  facts: string
  bookings: string
  status: string
  live: boolean
  current: boolean
}

const pill = (live: boolean) => `inline-flex items-center h-6 px-[9px] rounded-full text-[11.5px] font-extrabold whitespace-nowrap ${live ? 'bg-[#EEF3FF] text-[#2A4DD0]' : 'bg-[#FFF6E8] text-[#B54708]'}`

/** The branch cards after DeskHosAccounts: the one signed in to outlined in blue, a switch on the others. */
export function BranchCards({ cards, waiting, canAdd }: { cards: BranchCard[]; waiting: { id: string; name: string; place: string }[]; canAdd: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const go = async (id: string, then: string) => {
    setBusy(id)
    setError(null)
    const res = await switchBranch(id)
    if (!res.ok) {
      setError(res.error)
      setBusy(null)
      return
    }
    router.push(then)
    router.refresh()
  }

  return (
    <>
      {error && <p className="mb-3 p-3 rounded-xl bg-[#FEF3F2] text-[13px] font-bold text-[#B42318]">{error}</p>}
      <div className="grid gap-3.5 lg:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((b) => (
          <div key={b.id} className={`flex flex-col p-5 rounded-2xl bg-white ${b.current ? 'shadow-[0_0_0_2px_#2A4DD0]' : 'shadow-[0_0_0_1px_#E6EAF0]'}`}>
            <div className="flex justify-between gap-2">
              <span className="w-[42px] h-[42px] rounded-xl bg-[#F4F6FA] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#2A4DD0]" aria-hidden />
              </span>
              <span className={pill(b.live)}>{b.status}</span>
            </div>
            <span className="block mt-3.5 text-[16px] font-extrabold">{b.name}</span>
            <span className="block text-[13px] text-[#5B667A]">{b.place || 'Address not added'}</span>
            <span className="block mt-2.5 text-[12.5px] font-bold text-[#27324A]">
              {b.code} · {b.facts}
            </span>
            <span className="block mt-1 text-[12.5px] text-[#5B667A]">{b.bookings}</span>
            <div className="flex gap-2 mt-4">
              {b.current ? (
                <span className="flex-1 inline-flex items-center justify-center h-[38px] rounded-[11px] bg-[#EEF3FF] text-[#2A4DD0] text-[13.5px] font-extrabold">Signed in here</span>
              ) : (
                <button type="button" disabled={!!busy} onClick={() => go(b.id, '/hospital/dashboard')} className={`${btnPrimary} !h-[38px] flex-1`}>
                  {busy === b.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  Switch to this branch
                </button>
              )}
              {b.current ? (
                <Link href="/hospital/profile" className={`${btnOutline} lg:border !h-[38px]`}>
                  Manage
                </Link>
              ) : (
                <button type="button" disabled={!!busy} onClick={() => go(b.id, '/hospital/profile')} className={`${btnOutline} lg:border !h-[38px]`}>
                  Manage
                </button>
              )}
            </div>
          </div>
        ))}

        {waiting.map((w) => (
          <div key={w.id} className="flex flex-col p-5 rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0]">
            <div className="flex justify-between gap-2">
              <span className="w-[42px] h-[42px] rounded-xl bg-[#F4F6FA] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#98A2B3]" aria-hidden />
              </span>
              <span className={pill(false)}>Under review</span>
            </div>
            <span className="block mt-3.5 text-[16px] font-extrabold">{w.name}</span>
            <span className="block text-[13px] text-[#5B667A]">{w.place}</span>
            <span className="block mt-2.5 text-[12.5px] text-[#5B667A]">Goes live once our team checks its documents. You can switch to it then.</span>
          </div>
        ))}

        {canAdd && (
          <Link
            href="/hospital/branches/new"
            className="hidden lg:flex flex-col items-center justify-center gap-2 min-h-[230px] rounded-2xl border-[1.5px] border-dashed border-[#C9D2E0] bg-[#F9FBFE] text-[#2A4DD0] text-[14px] font-extrabold text-center hover:bg-[#F3F7FE] transition-colors"
          >
            <Plus className="w-6 h-6" strokeWidth={2.4} />
            Add a branch
            <span className="max-w-[220px] text-[12.5px] font-semibold text-[#5B667A]">Each branch gets its own listing, doctors and payouts, under one login.</span>
          </Link>
        )}
      </div>
    </>
  )
}

export type Person = { id: string; name: string; staffId: string | null; signedInTo: string | null; hospitalIds: string[] }

/** Each admin and the branches they can reach; ticking a branch gives them access to it. */
export function BranchPeople({ people, branches, me }: { people: Person[]; branches: { id: string; name: string }[]; me: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  if (!people.length) return <p className="py-3 text-[13px] text-[#5B667A] border-t border-[#EEF2F7]">No other admins yet. Add them from Staff &amp; access.</p>

  const toggle = (p: Person, branchId: string, on: boolean) => {
    setError(null)
    setBusy(`${p.id}:${branchId}`)
    start(async () => {
      const res = await setBranchAccess(p.id, branchId, on)
      setBusy(null)
      if (!res.ok) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <>
      {error && <p className="mb-2 p-2.5 rounded-lg bg-[#FEF3F2] text-[12.5px] font-bold text-[#B42318]">{error}</p>}
      <ul>
        {people.map((p) => {
          const mine = p.id === me
          const reach = branches.filter((b) => p.hospitalIds.includes(b.id))
          return (
            <li key={p.id} className="py-3 border-t border-[#EEF2F7]">
              <div className="flex items-center gap-3">
                <span aria-hidden className="w-9 h-9 shrink-0 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[12px] font-extrabold">
                  {p.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((x) => x[0]?.toUpperCase())
                    .join('')}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-extrabold truncate">{p.name}</span>
                  <span className="block text-[12.5px] text-[#5B667A] truncate">
                    {p.staffId ? `${p.staffId} · ` : ''}
                    {reach.length === branches.length && branches.length > 1 ? 'All branches' : reach.map((b) => b.name).join(', ') || 'No branch'}
                  </span>
                </span>
                {mine && <span className="inline-flex items-center h-6 px-[9px] rounded-full bg-[#EEF3FF] text-[#2A4DD0] text-[11.5px] font-extrabold">You</span>}
              </div>
              {!mine && branches.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5 ml-12">
                  {branches.map((b) => {
                    const on = p.hospitalIds.includes(b.id)
                    const here = p.signedInTo === b.id
                    return (
                      <button
                        key={b.id}
                        type="button"
                        aria-pressed={on}
                        disabled={pending || here}
                        title={here ? 'Signed in to this branch' : undefined}
                        onClick={() => toggle(p, b.id, !on)}
                        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12.5px] font-extrabold transition-colors disabled:opacity-70 ${
                          on ? 'border-[#2A4DD0] bg-[#F5F8FF] text-[#2A4DD0]' : 'border-[#D6DDE8] bg-white text-[#5B667A] hover:border-[#9DB4F5]'
                        }`}
                      >
                        {busy === `${p.id}:${b.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : on && <Check className="w-3.5 h-3.5" strokeWidth={2.8} />}
                        {b.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
