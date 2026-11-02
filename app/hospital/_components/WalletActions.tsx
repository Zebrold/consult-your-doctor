'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { cancelHospitalPayout, requestHospitalPayout, saveHospitalPayoutAccount } from '@/app/actions/wallet'
import { formatINR } from '@/components/patient/format'
import { btnOutline, btnPrimary } from './hos-ui'

const input = 'w-full h-11 rounded-xl bg-[#F6F8FC] border border-[#E2E7F0] px-3.5 text-[14px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2A4DD0]/20 focus:border-[#2A4DD0]'

type Account = { name: string; accountNumber: string | null; ifsc: string | null; upiId: string | null }

function Notice({ text, tone }: { text: string; tone: 'ok' | 'error' }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`mt-3 p-3 rounded-xl text-[13px] font-bold ${tone === 'error' ? 'bg-[#FEF3F2] text-[#B42318]' : 'bg-[#ECFDF3] text-[#067647]'}`}>
      {text}
    </p>
  )
}

/** Ask for a withdrawal of the available balance, or cancel the one waiting. */
export function WithdrawForm({ available, minimum, hasAccount, waiting }: { available: number; minimum: number; hasAccount: boolean; waiting: { id: string; amount: number } | null }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)
  const [amount, setAmount] = useState(available >= minimum ? String(Math.floor(available)) : '')

  if (waiting) {
    return (
      <div>
        <p className="text-[14px]">
          <b>{formatINR(waiting.amount)}</b> is waiting to be paid to your account. The Consult your Doctor team pays it and marks it paid here.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await cancelHospitalPayout(waiting.id)
              setNote(res.ok ? { text: 'Withdrawal cancelled; the amount is back in your balance.', tone: 'ok' } : { text: res.error, tone: 'error' })
              router.refresh()
            })
          }
          className={`${btnOutline} mt-3`}
        >
          {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Cancel withdrawal
        </button>
        {note && <Notice {...note} />}
      </div>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    start(async () => {
      const res = await requestHospitalPayout(Number(amount))
      setNote(res.ok ? { text: res.message ?? 'Withdrawal requested.', tone: 'ok' } : { text: res.error, tone: 'error' })
      if (res.ok) router.refresh()
    })
  }

  const blocked = !hasAccount ? 'Add your bank account or UPI ID below first.' : available < minimum ? `You can withdraw once your balance is at least ${formatINR(minimum)}.` : null
  return (
    <form onSubmit={submit}>
      <label className="block text-[12.5px] font-bold text-[#5B667A] mb-1.5" htmlFor="withdraw-amount">
        Amount (up to {formatINR(available)})
      </label>
      <div className="flex gap-2.5">
        <input id="withdraw-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} disabled={!!blocked} className={input} placeholder="Amount in ₹" />
        <button type="submit" disabled={pending || !!blocked || !amount} className={`${btnPrimary} shrink-0`}>
          {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Withdraw
        </button>
      </div>
      {blocked && <p className="mt-2 text-[12.5px] text-[#5B667A]">{blocked}</p>}
      {note && <Notice {...note} />}
    </form>
  )
}

/** The bank account or UPI ID withdrawals are paid to. */
export function PayoutAccountForm({ account }: { account: Account | null }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    start(async () => {
      const res = await saveHospitalPayoutAccount({
        name: String(form.get('name') || ''),
        accountNumber: String(form.get('accountNumber') || ''),
        ifsc: String(form.get('ifsc') || ''),
        upiId: String(form.get('upiId') || ''),
      })
      setNote(res.ok ? { text: 'Saved. Withdrawals are paid here from now on.', tone: 'ok' } : { text: res.error, tone: 'error' })
      if (res.ok) router.refresh()
    })
  }

  const field = (name: string, label: string, value: string | null, extra: Record<string, string> = {}) => (
    <label className="block">
      <span className="block text-[12.5px] font-bold text-[#5B667A] mb-1.5">{label}</span>
      <input name={name} defaultValue={value ?? ''} className={input} autoComplete="off" {...extra} />
    </label>
  )

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">{field('name', 'Account holder name', account?.name ?? null, { required: 'true' })}</div>
      {field('accountNumber', 'Account number', account?.accountNumber ?? null, { inputMode: 'numeric' })}
      {field('ifsc', 'IFSC', account?.ifsc ?? null, { placeholder: 'HDFC0001234' })}
      <div className="sm:col-span-2">{field('upiId', 'UPI ID (optional if you gave a bank account)', account?.upiId ?? null, { placeholder: 'hospital@icici' })}</div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Save account
        </button>
        <span className="text-[12px] text-[#5B667A]">A waiting withdrawal keeps the account it was asked to.</span>
      </div>
      {note && (
        <div className="sm:col-span-2">
          <Notice {...note} />
        </div>
      )}
    </form>
  )
}
