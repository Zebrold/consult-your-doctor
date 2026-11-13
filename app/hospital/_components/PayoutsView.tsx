import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { IST, formatINR, formatShortDate, formatTime, istDateKey } from '@/components/patient/format'
import { entryLabel, maskAccount, MIN_PAYOUT, type HospitalWallet, type PayoutAccount, type WalletEntry } from '@/lib/wallet'
import { shiftDay } from '../_lib/hospital'
import { DeskHead, EmptyLine, HosBackHeader, HosBody, Panel, btnOutline, card } from './hos-ui'
import { PayoutAccounts, WithdrawCard, type PayoutDest } from './WalletActions'
import { isOnlineGateway } from '@/lib/payment-gateways'

// Payouts (the hospital's wallet, lib/wallet.ts), after the user's HosPayouts / DeskHosPayouts designs. Everything is
// worked out from the wallet's own lines: what was added from UPI taken at the desk, the booking fees on cash payments
// taken off, the team's adjustments, and withdrawals.

const signed = (n: number) => `${n < 0 ? '−' : '+'} ${formatINR(Math.abs(n))}`
const sum = (list: { amount: number }[]) => Math.round(list.reduce((t, e) => t + e.amount, 0) * 100) / 100
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Where a withdrawal goes: "HDFC •••• 8821" style for a bank account, the UPI ID otherwise. */
function sentTo(a: PayoutAccount) {
  const bank = a.accountNumber ? `Bank account ${maskAccount(a.accountNumber)}` : null
  const upi = a.upiId ? `UPI ${a.upiId}` : null
  return [bank, upi].filter(Boolean).join(' or ') || a.name
}

const STATUS = {
  paid: { label: 'Paid', color: '#2A4DD0' },
  requested: { label: 'Waiting', color: '#B54708' },
  rejected: { label: 'Not paid', color: '#5B667A' },
} as const

/** The Payouts page for one hospital's wallet (app/hospital/wallet/page.tsx loads it). */
export function PayoutsView({ wallet, now }: { wallet: HospitalWallet; now: number }) {
  const today = istDateKey(now)
  const month = today.slice(0, 7)
  const monthName = new Date(now).toLocaleDateString('en-GB', { timeZone: IST, month: 'long' })
  const monthShort = new Date(now).toLocaleDateString('en-GB', { timeZone: IST, month: 'short' })
  const owes = wallet.balance < 0
  const waiting = wallet.payouts.find((p) => p.status === 'requested') ?? null
  const paid = wallet.payouts.filter((p) => p.status === 'paid')
  const lastPaid = paid[0] ?? null
  const subtitle = 'Your share of every payment at your hospital, held by Consult your Doctor and paid out to you'

  const inMonth = (iso: string) => istDateKey(iso).slice(0, 7) === month
  const monthEntries = wallet.entries.filter((e) => e.kind !== 'payout' && inMonth(e.createdAt))
  const of = (test: (e: WalletEntry) => boolean) => monthEntries.filter(test)
  const groups = [
    { title: 'UPI at your desk', detail: 'Consultation fees and services', counts: 'Added', list: of((e) => e.kind === 'collection' && !isOnlineGateway(e.gateway)), always: true },
    { title: 'Paid online', detail: 'Your part of online payments', counts: 'Added', list: of((e) => e.kind === 'collection' && isOnlineGateway(e.gateway)), always: false },
    { title: 'Booking fees on cash payments', detail: 'Consult your Doctor’s fee in cash you kept', counts: 'Taken off', list: of((e) => e.kind === 'cash_booking_fee'), always: true },
    { title: 'Adjustments', detail: 'Recorded by the Consult your Doctor team', counts: 'Either way', list: of((e) => e.kind === 'adjustment'), always: false },
  ]
    .filter((g) => g.always || g.list.length > 0)
    .map((g) => ({ ...g, n: g.list.length, amount: sum(g.list) }))
  const monthNet = sum(monthEntries)
  const earned = of((e) => e.kind === 'collection')
  const withdrawnThisMonth = paid.filter((p) => inMonth(p.processedAt ?? p.createdAt))
  const firstPaid = paid[paid.length - 1] ?? null

  // What was added in each of the last five weeks (Monday to Sunday, India time).
  const dow = (new Date(`${today}T12:00:00+05:30`).getUTCDay() + 6) % 7
  const thisWeek = shiftDay(today, -dow)
  const weeks = [-4, -3, -2, -1, 0].map((i) => {
    const start = shiftDay(thisWeek, i * 7)
    const end = shiftDay(start, 6)
    const value = sum(wallet.entries.filter((e) => e.kind === 'collection' && istDateKey(e.createdAt) >= start && istDateKey(e.createdAt) <= end))
    return { start, value, label: new Date(`${start}T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: IST, day: 'numeric', month: 'short' }) }
  })
  const weekMax = Math.max(1, ...weeks.map((w) => w.value))
  const short = (v: number) => (v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : formatINR(v))

  const kpis = [
    { l: `Earned in ${monthName}`, ls: `Earned in ${monthShort}`, v: formatINR(sum(earned)), n: `${count(earned.length, 'payment')} added` },
    { l: `Withdrawn in ${monthName}`, ls: `Withdrawn in ${monthShort}`, v: formatINR(sum(withdrawnThisMonth)), n: count(withdrawnThisMonth.length, 'withdrawal') },
    { l: 'Paid out to date', v: formatINR(sum(paid)), n: firstPaid ? `since ${formatShortDate(firstPaid.createdAt)}` : 'No withdrawals yet' },
    { l: 'Waiting to be paid', v: formatINR(wallet.waiting), n: waiting ? `asked ${formatShortDate(waiting.createdAt)}` : 'Nothing waiting' },
  ]

  const account = wallet.account
  const hasBank = !!(account?.accountNumber && account.ifsc)
  const dests: PayoutDest[] = [
    ...(account && hasBank ? [{ key: 'bank' as const, label: 'Bank account', detail: `${maskAccount(account.accountNumber)} · ${account.ifsc}` }] : []),
    ...(account?.upiId ? [{ key: 'upi' as const, label: 'UPI ID', detail: account.upiId }] : []),
  ]

  const balanceLabel = owes ? 'You owe Consult your Doctor' : 'Available to withdraw'
  const balanceValue = formatINR(Math.abs(wallet.balance))
  const lastLine = lastPaid ? `Last payout ${formatINR(lastPaid.amount)} on ${formatShortDate(lastPaid.processedAt ?? lastPaid.createdAt)}` : 'No payouts yet'
  const recent = wallet.entries.slice(0, 8)

  return (
    <>
      <HosBackHeader backHref="/hospital/more" backLabel="Back to more" title="Payouts">
        <p className="mt-1 mx-1.5 text-[13px] leading-[1.45] text-[#DCE6FF]">Your share of every payment, paid out to you.</p>
        <div className="mt-4 p-4 rounded-2xl bg-white/[0.12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]">
          <span className="block text-[12.5px] font-bold text-[#CFDCFF]">{balanceLabel}</span>
          <span className="block mt-1 text-[32px] font-extrabold tracking-[-0.03em]">{balanceValue}</span>
          <span className="block mt-1.5 text-[12px] text-[#DCE6FF]">{waiting ? `${formatINR(waiting.amount)} waiting to be paid · ${lastLine}` : lastLine}</span>
        </div>
      </HosBackHeader>
      <HosBody>
        <DeskHead
          title="Payouts"
          subtitle={subtitle}
          actions={
            <Link href="/hospital/revenue" className={btnOutline}>
              View finance
            </Link>
          }
        />

        {!wallet.ready ? (
          <Panel>
            <EmptyLine>Payouts need the latest database update (supabase/migrations/20261102_hospital_wallets.sql). Ask your administrator to run it.</EmptyLine>
          </Panel>
        ) : (
          // Phones stack the cards in the HosPayouts order; desktops put the money on the left and withdrawing on the right.
          <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5 lg:items-start">
            <div className="contents lg:flex lg:flex-col lg:gap-5 min-w-0">
              <section className="hidden lg:block relative overflow-hidden px-7 py-[26px] rounded-[18px] bg-[#2A4DD0] text-white">
                <Wallet aria-hidden className="absolute -right-10 -top-[50px] w-[260px] h-[260px] text-white/[0.08]" strokeWidth={1.2} />
                <div className="relative flex items-end justify-between gap-6">
                  <div className="min-w-0">
                    <span className="block text-[13.5px] font-bold text-[#CFDCFF]">{balanceLabel}</span>
                    <span className="block mt-1.5 text-[42px] font-extrabold tracking-[-0.03em] leading-none">{balanceValue}</span>
                    <span className="block mt-2.5 text-[13.5px] text-[#DCE6FF]">After every payment, withdrawal and adjustment at your hospital</span>
                  </div>
                  <div className="flex gap-7 pl-7 border-l border-white/20 shrink-0">
                    <span>
                      <span className="block text-[12.5px] font-bold text-[#CFDCFF]">Last payout</span>
                      <span className="block mt-1 text-[17px] font-extrabold">{lastPaid ? formatINR(lastPaid.amount) : '—'}</span>
                      <span className="block text-[12px] text-[#CFDCFF]">{lastPaid ? formatShortDate(lastPaid.processedAt ?? lastPaid.createdAt) : 'None yet'}</span>
                    </span>
                    <span>
                      <span className="block text-[12.5px] font-bold text-[#CFDCFF]">Waiting to be paid</span>
                      <span className="block mt-1 text-[17px] font-extrabold">{formatINR(wallet.waiting)}</span>
                      <span className="block text-[12px] text-[#CFDCFF]">{waiting ? `asked ${formatShortDate(waiting.createdAt)}` : 'Nothing waiting'}</span>
                    </span>
                  </div>
                </div>
              </section>

              {owes && (
                <p role="status" className="order-1 p-3.5 rounded-2xl bg-[#FEF3F2] border border-[#FECDCA] text-[13.5px] leading-[1.5] text-[#B42318]">
                  <b>You owe {formatINR(-wallet.balance)}.</b> These are Consult your Doctor&apos;s booking fees on patients who paid you in cash. Pay it to the Consult your Doctor team;
                  they record it here. It is also settled by what patients pay through the UPI scanner at your desk.
                </p>
              )}

              <section className="order-2 grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4">
                {kpis.map((k) => (
                  <div key={k.l} className={`${card} p-3.5 lg:px-5 lg:py-[18px] min-w-0`}>
                    <span className="block text-[11.5px] lg:text-[13px] font-bold text-[#5B667A] truncate">
                      <span className="lg:hidden">{k.l}</span>
                      <span className="hidden lg:inline">{k.ls ?? k.l}</span>
                    </span>
                    <span className="block mt-1 lg:mt-1.5 text-[18px] lg:text-[24px] font-extrabold tracking-[-0.02em] tabular-nums truncate">{k.v}</span>
                    <span className="block mt-0.5 text-[11.5px] lg:text-[12.5px] lg:font-bold text-[#5B667A] truncate">{k.n}</span>
                  </div>
                ))}
              </section>

              <Panel className="order-4">
                <div className="flex items-baseline justify-between gap-3 mb-1 lg:mb-3.5">
                  <h2 className="text-[16px] font-extrabold">
                    <span className="lg:hidden">{monthName} earnings</span>
                    <span className="hidden lg:inline">How your {monthName} earnings add up</span>
                  </h2>
                  <span className="hidden lg:inline text-[12.5px] font-bold text-[#5B667A]">1 {monthName} to today</span>
                </div>
                <div className="hidden lg:grid grid-cols-[minmax(0,1.6fr)_140px_120px_140px] gap-4 px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] text-[#5B667A] uppercase">
                  <span>Type</span>
                  <span>In your wallet</span>
                  <span>Payments</span>
                  <span>Amount</span>
                </div>
                {groups.map((g) => (
                  <div key={g.title}>
                    <div className="hidden lg:grid grid-cols-[minmax(0,1.6fr)_140px_120px_140px] gap-4 items-center py-[13px] border-b border-[#EEF2F7] text-[13.5px]">
                      <span className="min-w-0">
                        <span className="block font-extrabold">{g.title}</span>
                        <span className="block text-[12px] text-[#5B667A]">{g.detail}</span>
                      </span>
                      <span className="font-bold">{g.counts}</span>
                      <span>{g.n}</span>
                      <span className="font-extrabold">{g.n ? signed(g.amount) : formatINR(0)}</span>
                    </div>
                    <div className="lg:hidden flex items-center gap-2.5 py-3 border-b border-[#EEF2F7]">
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-extrabold">{g.title}</span>
                        <span className="block text-[12px] text-[#5B667A]">
                          {g.detail} · {count(g.n, 'payment')}
                        </span>
                      </span>
                      <span className="shrink-0 text-[14px] font-extrabold">{g.n ? signed(g.amount) : formatINR(0)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between lg:grid lg:grid-cols-[minmax(0,1.6fr)_140px_120px_140px] gap-4 pt-3 lg:pt-3.5 text-[14.5px] font-extrabold">
                  <span>Net in {monthName}</span>
                  <span className="hidden lg:block" />
                  <span className="hidden lg:block">{monthEntries.length}</span>
                  <span className="text-[#2A4DD0]">{signed(monthNet)}</span>
                </div>
              </Panel>

              <Panel className="order-7">
                <h2 className="mb-1 lg:mb-3.5 text-[16px] font-extrabold">Payout history</h2>
                {wallet.payouts.length === 0 ? (
                  <EmptyLine>No withdrawals yet. They appear here once you ask for one.</EmptyLine>
                ) : (
                  <>
                    <div className="hidden lg:grid grid-cols-[110px_130px_minmax(0,1.6fr)_110px_100px] gap-4 px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] text-[#5B667A] uppercase">
                      <span>Date</span>
                      <span>Reference</span>
                      <span>Sent to</span>
                      <span>Amount</span>
                      <span>Status</span>
                    </div>
                    {wallet.payouts.map((p) => {
                      const s = STATUS[p.status] ?? STATUS.rejected
                      const status = (
                        <span className="inline-flex items-center gap-1.5 text-[12px] lg:text-[12.5px] font-extrabold" style={{ color: s.color }}>
                          <span className="w-[7px] h-[7px] rounded-full" style={{ background: s.color }} />
                          {s.label}
                        </span>
                      )
                      return (
                        <div key={p.id}>
                          <div className="hidden lg:grid grid-cols-[110px_130px_minmax(0,1.6fr)_110px_100px] gap-4 items-center py-[13px] border-b border-[#EEF2F7] text-[13.5px]">
                            <span>{formatShortDate(p.createdAt)}</span>
                            <span className="font-bold text-[#5B667A] truncate">{p.reference ?? '—'}</span>
                            <span className="min-w-0 truncate" title={p.note ?? undefined}>
                              {sentTo(p.account)}
                              {p.status === 'rejected' && p.note ? <span className="text-[#5B667A]"> · {p.note}</span> : null}
                            </span>
                            <span className="font-extrabold">{formatINR(p.amount)}</span>
                            {status}
                          </div>
                          <div className="lg:hidden flex items-center gap-2.5 py-3 border-b border-[#EEF2F7]">
                            <span className="flex-1 min-w-0">
                              <span className="block text-[14px] font-extrabold">{formatINR(p.amount)}</span>
                              <span className="block text-[12px] text-[#5B667A] truncate">
                                {formatShortDate(p.createdAt)} · {sentTo(p.account)}
                                {p.reference ? ` · Ref ${p.reference}` : ''}
                              </span>
                            </span>
                            {status}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </Panel>

              <Panel className="order-8">
                <h2 className="text-[16px] font-extrabold">Wallet activity</h2>
                <p className="mt-0.5 mb-2 lg:mb-3 text-[12.5px] lg:text-[13px] text-[#5B667A]">
                  Every payment, withdrawal and adjustment, newest first{wallet.entries.length > recent.length ? ` (the latest ${recent.length})` : ''}
                </p>
                {recent.length === 0 ? (
                  <EmptyLine>Nothing yet. Payments taken at your desk from now on appear here.</EmptyLine>
                ) : (
                  <ul>
                    {recent.map((e) => (
                      <li key={`${e.kind}-${e.id}`} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7]">
                        <span className="min-w-0">
                          <span className="block text-[13.5px] font-extrabold truncate">{entryLabel(e)}</span>
                          <span className="block text-[12px] text-[#5B667A] truncate">
                            {formatShortDate(e.createdAt)}, {formatTime(e.createdAt)}
                            {e.appointmentId && (
                              <>
                                {' · '}
                                <Link href={`/book/confirmation/${e.appointmentId}`} className="font-bold text-[#2A4DD0] hover:underline">
                                  Booking {e.appointmentId.slice(0, 8).toUpperCase()}
                                </Link>
                              </>
                            )}
                            {e.kind === 'payout' && e.reference ? ` · Ref ${e.reference}` : ''}
                            {e.note ? ` · ${e.note}` : ''}
                          </span>
                        </span>
                        <span className={`text-[14px] font-extrabold shrink-0 ${e.amount < 0 ? 'text-[#B42318]' : 'text-[#067647]'}`}>{signed(e.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="contents lg:flex lg:flex-col lg:gap-5 min-w-0">
              <Panel className="order-3">
                <h2 className="text-[16px] font-extrabold">Withdraw money</h2>
                <WithdrawCard
                  available={wallet.available}
                  minimum={MIN_PAYOUT}
                  owes={owes}
                  dests={dests}
                  waiting={waiting ? { id: waiting.id, amount: waiting.amount, to: sentTo(waiting.account), requested: formatShortDate(waiting.createdAt) } : null}
                />
              </Panel>

              <Panel className="order-5">
                <div className="flex items-baseline justify-between mb-3.5 lg:mb-4">
                  <h2 className="text-[16px] font-extrabold">Weekly earnings</h2>
                  <span className="text-[12.5px] font-bold text-[#5B667A]">Last 5 weeks</span>
                </div>
                <div className="flex items-end gap-2.5 lg:gap-3 h-[120px] lg:h-[150px] px-0 lg:px-1 bg-[repeating-linear-gradient(to_top,#EEF2F7_0_1px,transparent_1px_30px)] lg:bg-[repeating-linear-gradient(to_top,#EEF2F7_0_1px,transparent_1px_37px)]">
                  {weeks.map((w, i) => (
                    <span key={w.start} className="flex-1 h-full flex flex-col justify-end items-center gap-1 lg:gap-1.5">
                      <span className="text-[10px] lg:text-[11.5px] font-extrabold text-[#27324A] whitespace-nowrap">{short(w.value)}</span>
                      <span
                        className="block w-full rounded-[5px_5px_2px_2px] lg:rounded-[6px_6px_2px_2px]"
                        style={{ height: `${Math.max(w.value ? 4 : 1, Math.round((w.value / weekMax) * 82))}%`, background: i === weeks.length - 1 ? '#2A4DD0' : '#C7D5FB' }}
                      />
                    </span>
                  ))}
                </div>
                <div className="flex gap-2.5 lg:gap-3 pt-1.5 lg:pt-2 lg:px-1">
                  {weeks.map((w) => (
                    <span key={w.start} className="flex-1 text-center text-[10.5px] lg:text-[11.5px] font-bold text-[#5B667A] whitespace-nowrap">
                      {w.label}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[12px] text-[#5B667A]">What UPI and online payments added each week, Monday to Sunday.</p>
              </Panel>

              <Panel className="order-6" id="payout-accounts">
                <PayoutAccounts
                  account={account}
                  bank={account && hasBank ? { title: `Bank account ${maskAccount(account.accountNumber)}`, detail: `${account.name} · IFSC ${account.ifsc}` } : null}
                  upi={account?.upiId ? { title: account.upiId, detail: `UPI ID · ${account.name}` } : null}
                />
              </Panel>

              <p className="order-9 mx-1 text-[12px] lg:text-[12.5px] leading-[1.55] text-[#5B667A]">
                Patients pay the booking fee to Consult your Doctor online. At your desk, UPI scanner payments reach Consult your Doctor&apos;s account and your part (the
                consultation fee and services) is added here. Cash stays with you, so the booking fee in it is taken from this balance, which can go below zero. A refunded
                payment comes off again.
              </p>
            </div>
          </div>
        )}
      </HosBody>
    </>
  )
}
