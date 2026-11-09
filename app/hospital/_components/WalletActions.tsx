'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Landmark, LoaderCircle, Smartphone } from 'lucide-react'
import { cancelHospitalPayout, requestHospitalPayout, saveHospitalPayoutAccount } from '@/app/actions/wallet'
import { formatINR } from '@/components/patient/format'
import { btnOutline, btnPrimary } from './hos-ui'

// The Payouts page's controls (after the HosPayouts / DeskHosPayouts designs): withdrawing the balance to the saved
// bank account or UPI ID, and keeping those details. The display strings come from the server page.

const input =
  'w-full h-[46px] rounded-xl bg-white border border-[#D6DDE8] px-3.5 text-[14.5px] text-[#0B1B3F] placeholder:text-[#8A94A6] focus:outline-none focus:ring-2 focus:ring-[#2A4DD0]/20 focus:border-[#2A4DD0]'

type Note = { text: string; tone: 'ok' | 'error' }

function Notice({ text, tone }: Note) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`mt-3 p-3 rounded-xl text-[13px] font-bold ${tone === 'error' ? 'bg-[#FEF3F2] text-[#B42318]' : 'bg-[#ECFDF3] text-[#067647]'}`}>
      {text}
    </p>
  )
}

export type PayoutDest = { key: 'bank' | 'upi'; label: string; detail: string }

/** "Withdraw money": the amount, where it goes, and the request; or the withdrawal that is waiting, which can be cancelled. */
export function WithdrawCard({
  available,
  minimum,
  owes,
  dests,
  waiting,
}: {
  available: number
  minimum: number
  owes: boolean
  dests: PayoutDest[]
  waiting: { id: string; amount: number; to: string; requested: string } | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState<Note | null>(null)
  const [amount, setAmount] = useState(available >= minimum ? String(available) : '')
  const [via, setVia] = useState<PayoutDest['key'] | undefined>(dests[0]?.key)

  if (waiting) {
    return (
      <div>
        <div className="mt-3.5 p-4 lg:p-[18px] rounded-[14px] bg-[#F5F8FF] shadow-[inset_0_0_0_1px_#DCE5FF]">
          <span className="flex w-10 h-10 rounded-full bg-[#2A4DD0] items-center justify-center">
            <Check className="w-5 h-5 text-white" strokeWidth={3} />
          </span>
          <span className="block mt-3 text-[15px] lg:text-[16px] font-extrabold">Withdrawal requested</span>
          <span className="block mt-1 text-[13px] leading-[1.5] text-[#27324A]">
            {formatINR(waiting.amount)} is waiting to be paid to {waiting.to}. You asked on {waiting.requested}; the Consult your Doctor team pays it and marks it paid here.
          </span>
        </div>
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
          className={`${btnOutline} w-full mt-3`}
        >
          {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Cancel withdrawal
        </button>
        {note && <Notice {...note} />}
      </div>
    )
  }

  if (!dests.length) {
    return (
      <div>
        <p className="mt-1 mb-3.5 text-[13px] text-[#5B667A]">Add the bank account or UPI ID your withdrawals are paid to.</p>
        <a href="#payout-accounts" className={`${btnPrimary} w-full`}>
          Add payout account
        </a>
        {note && <Notice {...note} />}
      </div>
    )
  }

  const blocked = owes
    ? 'Nothing to withdraw while you owe Consult your Doctor.'
    : available < minimum
      ? `You can withdraw once your balance is at least ${formatINR(minimum)}.`
      : null
  const value = Number(amount)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    start(async () => {
      const res = await requestHospitalPayout(value, via)
      setNote(res.ok ? { text: res.message ?? 'Withdrawal requested.', tone: 'ok' } : { text: res.error, tone: 'error' })
      if (res.ok) router.refresh()
    })
  }

  return (
    <form onSubmit={submit}>
      <p className="mt-1 mb-4 text-[13px] text-[#5B667A] hidden lg:block">Send your available balance to your bank account or UPI ID.</p>
      <label htmlFor="withdraw-amount" className="block mt-3 lg:mt-0 mb-1.5 text-[13px] font-extrabold text-[#27324A]">
        Amount
      </label>
      <div className="flex items-center gap-1 h-[50px] lg:h-[52px] px-3.5 rounded-xl border border-[#D6DDE8] focus-within:border-[#2A4DD0] focus-within:ring-2 focus-within:ring-[#2A4DD0]/20">
        <span className="text-[19px] lg:text-[20px] font-extrabold">₹</span>
        <input
          id="withdraw-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          disabled={!!blocked}
          placeholder="0"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[19px] lg:text-[20px] font-extrabold disabled:text-[#8A94A6]"
        />
        <button type="button" disabled={!!blocked} onClick={() => setAmount(String(available))} className="shrink-0 text-[12px] lg:text-[12.5px] font-extrabold text-[#2A4DD0] disabled:text-[#8A94A6]">
          Full balance
        </button>
      </div>
      {blocked && <p className="mt-2 text-[12.5px] text-[#5B667A]">{blocked}</p>}

      <span className="block mt-3.5 lg:mt-4 mb-2 text-[13px] font-extrabold text-[#27324A]">Send to</span>
      <div role="radiogroup" aria-label="Send to" className="grid gap-2.5">
        {dests.map((d) => {
          const on = d.key === via
          const Icon = d.key === 'bank' ? Landmark : Smartphone
          return (
            <button
              key={d.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setVia(d.key)}
              className={`flex items-center gap-3 px-3 lg:px-3.5 py-[11px] lg:py-3 rounded-[14px] text-left transition-colors ${on ? 'border-2 border-[#2A4DD0] bg-[#F5F8FF]' : 'border border-[#E1E7F0] bg-white hover:border-[#C9D5F2]'}`}
            >
              <span className="shrink-0 w-[38px] h-[38px] rounded-[11px] bg-[#EEF3FF] flex items-center justify-center">
                <Icon className="w-[19px] h-[19px] text-[#2A4DD0]" strokeWidth={2} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-extrabold">{d.label}</span>
                <span className="block text-[12.5px] text-[#5B667A] truncate">{d.detail}</span>
              </span>
              <span className={`shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${on ? 'border-[#2A4DD0]' : 'border-[#C9D2E0]'}`}>
                <span className={`w-2 h-2 rounded-full ${on ? 'bg-[#2A4DD0]' : 'bg-white'}`} />
              </span>
            </button>
          )
        })}
      </div>

      <button type="submit" disabled={pending || !!blocked || !(value >= minimum)} className={`${btnPrimary} w-full !h-[50px] mt-3.5 lg:mt-4 !text-[14.5px] disabled:opacity-60`}>
        {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Withdraw {value > 0 ? formatINR(value) : ''}
      </button>
      <p className="mt-2.5 text-[12px] leading-[1.5] text-[#5B667A]">Withdrawals are paid by the Consult your Doctor team to the account you choose. The smallest is {formatINR(minimum)}.</p>
      {note && <Notice {...note} />}
    </form>
  )
}

type Account = { name: string; accountNumber: string | null; ifsc: string | null; upiId: string | null }
type AccountRow = { title: string; detail: string }

/** "Payout accounts": the saved bank account and UPI ID, and the form to add or change them. */
export function PayoutAccounts({ account, bank, upi }: { account: Account | null; bank: AccountRow | null; upi: AccountRow | null }) {
  const [editing, setEditing] = useState(!account)

  return (
    <>
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-[16px] font-extrabold">Payout accounts</h2>
        {account && (
          <button type="button" onClick={() => setEditing(!editing)} className="text-[13px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
            {editing ? 'Close' : 'Change'}
          </button>
        )}
      </div>
      {bank && (
        <div className="flex items-center gap-3 py-3 lg:py-3.5 border-b border-[#EEF2F7]">
          <span className="shrink-0 w-9 h-9 lg:w-[38px] lg:h-[38px] rounded-[10px] lg:rounded-[11px] bg-[#EEF3FF] flex items-center justify-center">
            <Landmark className="w-[18px] h-[18px] lg:w-[19px] lg:h-[19px] text-[#2A4DD0]" strokeWidth={2} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-extrabold truncate">{bank.title}</span>
            <span className="block text-[12px] lg:text-[12.5px] text-[#5B667A] truncate">{bank.detail}</span>
          </span>
          <span className="shrink-0 text-[12px] font-extrabold text-[#2A4DD0]">Saved</span>
        </div>
      )}
      {upi && (
        <div className="flex items-center gap-3 py-3 lg:py-3.5 border-b border-[#EEF2F7]">
          <span className="shrink-0 w-9 h-9 lg:w-[38px] lg:h-[38px] rounded-[10px] lg:rounded-[11px] bg-[#EEF3FF] flex items-center justify-center">
            <Smartphone className="w-[18px] h-[18px] lg:w-[19px] lg:h-[19px] text-[#2A4DD0]" strokeWidth={2} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-extrabold truncate">{upi.title}</span>
            <span className="block text-[12px] lg:text-[12.5px] text-[#5B667A] truncate">{upi.detail}</span>
          </span>
          <span className="shrink-0 text-[12px] font-extrabold text-[#2A4DD0]">Saved</span>
        </div>
      )}
      {editing ? (
        <div className="pt-3">
          {!account && <p className="mb-3 text-[13px] text-[#5B667A]">Add the bank account or UPI ID withdrawals are paid to. Only the Consult your Doctor team sees the full number.</p>}
          <PayoutAccountForm account={account} onSaved={() => setEditing(false)} />
        </div>
      ) : (
        <p className="pt-3 text-[12.5px] leading-[1.45] text-[#5B667A]">Kept private: only the Consult your Doctor team sees the full number. A waiting withdrawal is paid to the account it was asked to.</p>
      )}
    </>
  )
}

/** The bank account or UPI ID withdrawals are paid to. */
function PayoutAccountForm({ account, onSaved }: { account: Account | null; onSaved: () => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState<Note | null>(null)

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
      if (res.ok) {
        router.refresh()
        onSaved()
      }
    })
  }

  const field = (name: string, label: string, value: string | null, extra: Record<string, string> = {}) => (
    <label className="block">
      <span className="block mb-1.5 text-[13px] font-extrabold text-[#27324A]">{label}</span>
      <input name={name} defaultValue={value ?? ''} className={input} autoComplete="off" {...extra} />
    </label>
  )

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3">
      {field('name', 'Account holder name', account?.name ?? null, { required: 'true' })}
      {field('accountNumber', 'Account number', account?.accountNumber ?? null, { inputMode: 'numeric' })}
      {field('ifsc', 'IFSC', account?.ifsc ?? null, { placeholder: 'HDFC0001234' })}
      {field('upiId', 'UPI ID (optional with a bank account)', account?.upiId ?? null, { placeholder: 'hospital@icici' })}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending && <LoaderCircle className="w-4 h-4 animate-spin" />} Save account
      </button>
      {note && <Notice {...note} />}
    </form>
  )
}
