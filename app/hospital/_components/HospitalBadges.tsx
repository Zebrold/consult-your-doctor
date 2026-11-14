'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BadgeCheck, CheckCircle2, CircleCheck, Loader2 } from 'lucide-react'
import { startHospitalBadges } from '@/app/actions/badges'
import { formatINR } from '@/components/patient/format'
import { startPurchase } from '@/lib/purchase-client'
import { Panel, PanelHead, Verified, btnPrimary, card } from './hos-ui'

export type HospitalBadgeState = {
  /** Listed on Consult your Doctor (a badge needs that first). */
  live: boolean
  activeUntil: string | null
  renewedUntil: string | null
  inReview: boolean
  rejected: string | null
  canRenew: boolean
}

export type BadgeDoctorRow = {
  id: string
  name: string
  specialty: string
  state: 'live' | 'review' | 'asked' | 'none'
  note: string
  warn: boolean
  selectable: boolean
  price: number
  askedId: string | null
}

const STATE_PILL: Record<BadgeDoctorRow['state'], { label: string; cls: string }> = {
  live: { label: 'Active', cls: 'bg-[#EEF3FF] text-[#2A4DD0]' },
  review: { label: 'Being checked', cls: 'bg-[#FFF6E8] text-[#B54708]' },
  asked: { label: 'Asked by doctor', cls: 'bg-[#FFF6E8] text-[#B54708]' },
  none: { label: 'Not active', cls: 'bg-[#F1F4F9] text-[#5B667A]' },
}

const initials = (name: string) =>
  name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

const GIVES = [
  ['Blue tick', 'beside the name on the public profile, in search and in listings.'],
  ['Checked by our team', '— registration and photo ID — so patients know who they are booking.'],
  ['Refunded if not approved', 'if a badge doesn’t pass our checks.'],
]

/** The DeskHosBadges page body: the hospital's badge across the top, doctors to pick on the left, what it means on the right. */
export function HospitalBadges({
  ready,
  hospital,
  doctors,
  payer,
}: {
  ready: boolean
  hospital: { name: string; price: number; state: HospitalBadgeState }
  doctors: BadgeDoctorRow[]
  payer: { name: string; email: string | null; phone: string | null }
}) {
  const router = useRouter()
  // Doctors who asked the hospital to pay start ticked.
  const [picked, setPicked] = useState<Set<string>>(() => new Set(doctors.filter((d) => d.selectable && d.state === 'asked').map((d) => d.id)))
  const [busy, setBusy] = useState<'hospital' | 'doctors' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const chosen = doctors.filter((d) => d.selectable && picked.has(d.id))
  const total = chosen.reduce((s, d) => s + d.price, 0)
  const h = hospital.state

  const pay = async (what: 'hospital' | 'doctors') => {
    setBusy(what)
    setError(null)
    setDone(null)
    const started = await startHospitalBadges(what === 'hospital' ? { hospital: true, doctorIds: [] } : { hospital: false, doctorIds: chosen.map((d) => d.id) })
    if (!started.ok || !started.paymentId) {
      setError(started.ok ? 'Could not start the payment.' : started.error)
      setBusy(null)
      return
    }
    const paid = await startPurchase({
      kind: 'badge',
      id: started.paymentId,
      description: what === 'hospital' ? 'Verified hospital badge' : `Verified badges for ${chosen.length} ${chosen.length === 1 ? 'doctor' : 'doctors'}`,
      ...payer,
    })
    setBusy(null)
    if (!paid.ok) {
      setError(paid.error)
      return
    }
    setPicked(new Set())
    setDone('Paid. Our team checks each badge; the blue tick shows once it’s approved.')
    router.refresh()
  }

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <>
      {(error || done) && (
        <p className={`mb-4 p-3.5 rounded-[14px] text-[13px] font-bold ${error ? 'bg-[#FEF3F2] text-[#B42318]' : 'bg-[#ECFDF3] text-[#067647]'}`}>{error ?? done}</p>
      )}

      <section className={`${card} flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-[22px] px-4 lg:px-6 py-4 lg:py-[22px] mb-3.5 lg:mb-5`}>
        <span className="w-14 h-14 lg:w-16 lg:h-16 shrink-0 rounded-2xl bg-[#2A4DD0] flex items-center justify-center">
          <BadgeCheck className="w-8 h-8 text-white" strokeWidth={2} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 text-[18px] font-extrabold">
            {hospital.name}
            {h.activeUntil && <Verified />}
          </span>
          <span className="block mt-0.5 text-[13.5px] text-[#5B667A]">A verified hospital badge shows a blue tick beside your hospital’s name on your hospital page and in search.</span>
        </span>
        <span className="lg:text-right shrink-0">
          {h.inReview ? (
            <>
              <span className="inline-flex items-center h-6 px-[9px] rounded-full bg-[#FFF6E8] text-[#B54708] text-[11.5px] font-extrabold">Being checked</span>
              <span className="block mt-1.5 text-[12.5px] text-[#5B667A]">Paid · our team is checking it</span>
            </>
          ) : h.activeUntil && !h.canRenew ? (
            <>
              <span className="inline-flex items-center h-6 px-[9px] rounded-full bg-[#EEF3FF] text-[#2A4DD0] text-[11.5px] font-extrabold">Active</span>
              <span className="block mt-1.5 text-[12.5px] text-[#5B667A]">Until {h.renewedUntil ?? h.activeUntil}</span>
            </>
          ) : (
            <>
              <span className="block text-[20px] font-extrabold">
                {formatINR(hospital.price)}
                <span className="text-[13px] font-semibold text-[#5B667A]"> / month</span>
              </span>
              {h.activeUntil && <span className="block text-[12.5px] text-[#5B667A]">Active until {h.activeUntil}</span>}
              {h.rejected && <span className="block max-w-[260px] text-[12.5px] text-[#B42318]">Not approved: {h.rejected}</span>}
              <button type="button" disabled={!ready || !h.live || !!busy} onClick={() => pay('hospital')} className={`${btnPrimary} mt-2`}>
                {busy === 'hospital' && <Loader2 className="w-4 h-4 animate-spin" />}
                {h.activeUntil ? 'Renew for a month' : 'Verify this hospital'}
              </button>
              {!h.live && <span className="block mt-1.5 text-[12px] text-[#B54708]">Your hospital needs to be live first.</span>}
            </>
          )}
        </span>
      </section>

      <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <Panel>
          <PanelHead title="Doctor badges" sub={`${formatINR(doctors[0]?.price ?? 499)} per doctor per month. Select the doctors you want to verify.`} />
          {doctors.length === 0 ? (
            <p className="py-3 text-[13px] text-[#5B667A] border-t border-[#EEF2F7]">No doctors on your roster yet.</p>
          ) : (
            <>
              <div className="hidden lg:grid grid-cols-[40px_minmax(0,1.6fr)_minmax(0,1fr)_130px_minmax(0,1.4fr)] gap-4 px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">
                <span />
                <span>Doctor</span>
                <span>Speciality</span>
                <span>Badge</span>
                <span>Status</span>
              </div>
              <ul>
                {doctors.map((d) => (
                  <li key={d.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] lg:grid-cols-[40px_minmax(0,1.6fr)_minmax(0,1fr)_130px_minmax(0,1.4fr)] gap-x-3 lg:gap-4 gap-y-1 items-center py-[13px] border-t lg:border-t-0 lg:border-b border-[#EEF2F7] text-[13.5px]">
                    <span>
                      {d.selectable && (
                        <input
                          type="checkbox"
                          checked={picked.has(d.id)}
                          onChange={() => toggle(d.id)}
                          aria-label={`Select ${d.name}`}
                          className="w-[18px] h-[18px] accent-[#2A4DD0]"
                        />
                      )}
                    </span>
                    <span className="flex items-center gap-3 min-w-0">
                      <span aria-hidden className="w-9 h-9 shrink-0 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[12px] font-extrabold">
                        {initials(d.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-extrabold">
                          <span className="truncate">{d.name}</span>
                          {d.state === 'live' && <Verified size={17} />}
                        </span>
                        <span className={`block lg:hidden text-[12px] truncate ${d.warn ? 'text-[#B54708]' : 'text-[#5B667A]'}`}>{d.note}</span>
                      </span>
                    </span>
                    <span className="hidden lg:block truncate">{d.specialty}</span>
                    <span>
                      <span className={`inline-flex items-center h-6 px-[9px] rounded-full text-[11.5px] font-extrabold whitespace-nowrap ${STATE_PILL[d.state].cls}`}>{STATE_PILL[d.state].label}</span>
                    </span>
                    <span className="hidden lg:flex items-center justify-between gap-2 min-w-0">
                      <span className={`text-[13px] truncate ${d.warn ? 'text-[#B54708]' : 'text-[#5B667A]'}`}>{d.note}</span>
                      <Link href="/hospital/doctors" className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
                        Manage
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4 mt-4 lg:mt-[18px] p-4 lg:px-[18px] rounded-[14px] bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0]">
                <span>
                  <span className="block text-[14.5px] font-extrabold">
                    {chosen.length} {chosen.length === 1 ? 'doctor' : 'doctors'} selected
                  </span>
                  <span className="block text-[12.5px] text-[#5B667A]">{formatINR(total)} · paid by the hospital · checked by our team before the tick shows</span>
                </span>
                <button type="button" disabled={!ready || !chosen.length || !!busy} onClick={() => pay('doctors')} className={btnPrimary}>
                  {busy === 'doctors' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Get badges for selected doctors
                </button>
              </div>
            </>
          )}
        </Panel>

        <div className="flex flex-col gap-3.5 lg:gap-4">
          <Panel>
            <PanelHead title="What a badge gives you" />
            <ul className="grid gap-3">
              {GIVES.map(([b, rest]) => (
                <li key={b} className="flex gap-2.5 items-start text-[13.5px] leading-[1.45] text-[#27324A]">
                  <CheckCircle2 className="w-[18px] h-[18px] mt-px text-[#2A4DD0] shrink-0" />
                  <span>
                    <strong>{b}</strong> {rest}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <PanelHead title="Requirements for each doctor" />
            <ul className="grid gap-2.5">
              {['Medical registration checked', 'Government photo ID checked', 'Profile photo added', 'Active on Consult your Doctor for 30 days'].map((r) => (
                <li key={r} className="flex gap-2.5 text-[13.5px] text-[#27324A]">
                  <CircleCheck className="w-[18px] h-[18px] text-[#067647] shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] leading-[1.5] text-[#5B667A]">
              Badges are paid online to Consult your Doctor by UPI or card, and run for the month (or year) paid for from approval. If our team can’t approve one, it’s
              refunded.
            </p>
          </Panel>
        </div>
      </div>
    </>
  )
}
