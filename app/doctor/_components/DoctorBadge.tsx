'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, CheckCircle2, CircleCheck, CircleDashed, CircleX, Loader2 } from 'lucide-react'
import { cancelBadgeRequest, startDoctorBadge } from '@/app/actions/badges'
import { formatINR } from '@/components/patient/format'
import { RadioCard, choicePill } from '@/components/portal/form-ui'
import type { BadgePlan, Requirement } from '@/lib/badges'
import { startPurchase } from '@/lib/purchase-client'
import { Panel, PanelHead, Verified, btnOutline, btnPrimary } from './doc-ui'

type State = {
  liveUntil: string | null
  inReview: boolean
  askedHospital: { id: string; plan: BadgePlan } | null
  rejected: string | null
  canBuy: boolean
}

const initials = (name: string) =>
  name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

/** The DeskDocBadge page body: a preview of the profile line, the plan and payment, and what the badge means. */
export function DoctorBadge({
  ready,
  doctor,
  prices,
  state,
  requirements,
  payer,
}: {
  ready: boolean
  doctor: { name: string; image: string | null; line: string; fee: number | null; rating: number | null; reviews: number; hospital: string | null }
  prices: Record<BadgePlan, number>
  state: State
  requirements: Requirement[]
  payer: { name: string; email: string | null; phone: string | null }
}) {
  const router = useRouter()
  const [plan, setPlan] = useState<BadgePlan>('monthly')
  const [payBy, setPayBy] = useState<'self' | 'hospital'>('self')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const price = prices[plan]
  const saving = prices.monthly * 12 - prices.yearly
  const status = state.liveUntil ? { label: 'Active', cls: 'bg-[#EEF3FF] text-[#2A4DD0]' } : state.inReview || state.askedHospital ? { label: state.inReview ? 'Being checked' : 'Waiting for hospital', cls: 'bg-[#FFF6E8] text-[#B54708]' } : { label: 'Not active', cls: 'bg-[#F1F4F9] text-[#5B667A]' }

  const buy = async () => {
    setBusy(true)
    setMessage(null)
    const started = await startDoctorBadge(plan, payBy)
    if (!started.ok) {
      setMessage({ ok: false, text: started.error })
      setBusy(false)
      return
    }
    if (!started.paymentId) {
      setBusy(false)
      setMessage({ ok: true, text: `Sent to ${doctor.hospital ?? 'your hospital'}. Their admin pays for it from their Verified badges page.` })
      router.refresh()
      return
    }
    const paid = await startPurchase({ kind: 'badge', id: started.paymentId, description: `Verified badge, ${plan}`, ...payer })
    setBusy(false)
    setMessage(paid.ok ? { ok: true, text: 'Paid. Our team checks your registration and photo ID; the blue tick shows once it’s approved.' } : { ok: false, text: paid.error })
    router.refresh()
  }

  const withdraw = async (id: string) => {
    setBusy(true)
    const res = await cancelBadgeRequest(id)
    setBusy(false)
    if (!res.ok) setMessage({ ok: false, text: res.error })
    router.refresh()
  }

  return (
    <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
      <Panel>
        <PanelHead
          title="Your verified badge"
          sub="Show patients your profile has been checked"
          right={<span className={`inline-flex items-center h-[26px] px-2.5 rounded-full text-[12px] font-extrabold whitespace-nowrap ${status.cls}`}>{status.label}</span>}
        />
        <div className="flex items-center gap-4 p-4 lg:p-[18px] rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0,0_8px_20px_rgba(11,27,63,0.06)]">
          {doctor.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doctor.image} alt="" className="w-14 h-14 rounded-full object-cover shrink-0 bg-[#EEF2F7]" />
          ) : (
            <span className="w-14 h-14 shrink-0 rounded-full bg-[#2A4DD0] text-white flex items-center justify-center text-[18px] font-extrabold">{initials(doctor.name)}</span>
          )}
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5 text-[16px] lg:text-[17px] font-extrabold">
              <span className="truncate">{doctor.name}</span>
              <Verified size={19} />
            </span>
            <span className="block text-[13px] text-[#5B667A] truncate">{doctor.line}</span>
            <span className="inline-flex mt-1.5 px-[9px] py-[3px] rounded-full bg-[#EAF5FE] text-[#0B6FB8] text-[11.5px] font-extrabold">Verified by Consult your Doctor</span>
          </span>
          <span className="hidden sm:block text-right shrink-0">
            {doctor.fee != null && <span className="block text-[16px] font-extrabold">{formatINR(doctor.fee)}</span>}
            {doctor.rating != null && (
              <span className="block text-[12px] text-[#5B667A]">
                {doctor.rating.toFixed(1)} ★ · {doctor.reviews} {doctor.reviews === 1 ? 'review' : 'reviews'}
              </span>
            )}
          </span>
        </div>
        <p className="mt-2 text-[12px] text-[#5B667A]">How your name shows with the badge.</p>

        {message && <p className={`mt-4 p-3 rounded-xl text-[13px] font-bold ${message.ok ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#FEF3F2] text-[#B42318]'}`}>{message.text}</p>}

        {state.liveUntil && (
          <div className="flex items-center gap-3.5 mt-5 p-4 lg:p-[18px] rounded-[14px] bg-[#F5F8FF] shadow-[inset_0_0_0_1px_#DCE5FF]">
            <BadgeCheck className="w-7 h-7 text-[#2A4DD0] shrink-0" />
            <span className="flex-1">
              <span className="block text-[15.5px] font-extrabold">Your verified badge is active</span>
              <span className="block mt-0.5 text-[13px] text-[#27324A]">Until {state.liveUntil}. It doesn’t renew by itself; you can renew it here in its last 7 days.</span>
            </span>
          </div>
        )}
        {state.inReview && (
          <div className="mt-5 p-4 rounded-[14px] bg-[#FFF6E8] text-[13.5px] text-[#7A2E0E]">
            <strong className="block text-[15px]">Paid · being checked</strong>
            Our team is checking your registration and photo ID. The blue tick shows on your profile once it’s approved; if it isn’t, you’re refunded.
          </div>
        )}
        {state.askedHospital && !state.inReview && (
          <div className="mt-5 p-4 rounded-[14px] bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0] text-[13.5px] text-[#27324A]">
            <strong className="block text-[15px]">Waiting for {doctor.hospital ?? 'your hospital'} to pay</strong>
            You asked your hospital to pay for a {state.askedHospital.plan} badge. Their admin sees it on their Verified badges page.
            <button type="button" disabled={busy} onClick={() => withdraw(state.askedHospital!.id)} className={`${btnOutline} lg:border mt-3 !h-[38px]`}>
              Withdraw the request
            </button>
          </div>
        )}
        {state.rejected && (
          <div className="mt-5 p-4 rounded-[14px] bg-[#FEF3F2] text-[13.5px] text-[#7A271A]">
            <strong className="block text-[15px]">Not approved last time</strong>
            {state.rejected} Fix this and you can apply again; the earlier payment was refunded.
          </div>
        )}

        {state.canBuy && !state.askedHospital && (
          <>
            <h3 className="mt-6 mb-3 text-[15px] font-extrabold">{state.liveUntil ? 'Renew' : 'Choose a plan'}</h3>
            <div role="radiogroup" aria-label="Plan" className="grid gap-3 sm:grid-cols-2">
              <RadioCard on={plan === 'monthly'} onPick={() => setPlan('monthly')} title={`Monthly · ${formatINR(prices.monthly)}`} detail="per month" />
              <RadioCard on={plan === 'yearly'} onPick={() => setPlan('yearly')} title={`Yearly · ${formatINR(prices.yearly)}`} detail={saving > 0 ? `per year · save ${formatINR(saving)}` : 'per year'} />
            </div>
            <span className="block mt-[18px] mb-2 text-[13px] font-extrabold text-[#27324A]">Pay with</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={payBy === 'self'} onClick={() => setPayBy('self')} className={choicePill(payBy === 'self')}>
                UPI or card
              </button>
              {doctor.hospital && (
                <button type="button" aria-pressed={payBy === 'hospital'} onClick={() => setPayBy('hospital')} className={choicePill(payBy === 'hospital')}>
                  Ask my hospital to pay
                </button>
              )}
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4 mt-5 p-4 rounded-[14px] bg-[#F7F9FC] shadow-[inset_0_0_0_1px_#E6EAF0]">
              <span className="text-[12.5px] leading-[1.5] text-[#5B667A]">
                Collected by Consult your Doctor. Our team checks your registration and photo ID before the tick shows; if it isn’t approved, you’re refunded. No automatic renewal.
              </span>
              <button type="button" disabled={!ready || busy} onClick={buy} className={`${btnPrimary} shrink-0`}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {payBy === 'hospital' ? `Ask ${doctor.hospital ?? 'my hospital'} to pay` : `Pay ${formatINR(price)} and get verified`}
              </button>
            </div>
          </>
        )}
        {!state.canBuy && !state.liveUntil && !state.inReview && !state.askedHospital && (
          <p className="mt-5 p-3.5 rounded-xl bg-[#F7F9FC] text-[13px] text-[#27324A]">Meet the requirements on the right first, then you can get your badge here.</p>
        )}
      </Panel>

      <div className="flex flex-col gap-3.5 lg:gap-4">
        <Panel>
          <PanelHead title="What the badge gives you" />
          <ul className="grid gap-3">
            {[
              ['Blue tick', 'next to your name on your public profile, in search and in listings.'],
              ['More trust', 'with a “Verified by Consult your Doctor” label: our team has checked your registration and photo ID.'],
            ].map(([b, rest]) => (
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
          <PanelHead title="Requirements" />
          <ul className="grid gap-2.5">
            {requirements.map((r) => {
              const Icon = r.met === true ? CircleCheck : r.met === false ? CircleX : CircleDashed
              return (
                <li key={r.label} className="flex gap-2.5 text-[13.5px] text-[#27324A]">
                  <Icon className={`w-[18px] h-[18px] shrink-0 mt-px ${r.met === true ? 'text-[#067647]' : r.met === false ? 'text-[#B42318]' : 'text-[#5B667A]'}`} />
                  <span>
                    {r.label}
                    {r.note && <span className="block text-[12px] text-[#5B667A]">{r.note}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[12.5px] text-[#5B667A]">{requirements.every((r) => r.met !== false) ? 'You meet everything we can check here.' : 'Update your profile to meet the rest.'}</p>
        </Panel>
      </div>
    </div>
  )
}
