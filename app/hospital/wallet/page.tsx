import type { Metadata } from 'next'
import Link from 'next/link'
import { formatINR, formatShortDate, formatTime } from '@/components/patient/format'
import { entryLabel, loadHospitalWallet, maskAccount, MIN_PAYOUT } from '@/lib/wallet'
import { requireHospital } from '../_lib/hospital'
import { DeskHead, EmptyLine, HosBackHeader, HosBody, Panel, PanelHead, PhoneStats, StatCard } from '../_components/hos-ui'
import { PayoutAccountForm, WithdrawForm } from '../_components/WalletActions'

export const metadata: Metadata = { title: 'Wallet | Hospital Portal' }
export const dynamic = 'force-dynamic'

const signed = (n: number) => `${n < 0 ? '−' : '+'}${formatINR(Math.abs(n))}`

export default async function HospitalWalletPage() {
  const { admin, hospital } = await requireHospital()
  const wallet = await loadHospitalWallet(admin, hospital.id)
  const waiting = wallet.payouts.find((p) => p.status === 'requested') ?? null
  const owes = wallet.balance < 0
  const subtitle = 'What Consult your Doctor holds for you and what you owe it, from every payment at your hospital.'

  const balanceTone = owes ? '#B42318' : '#067647'

  return (
    <>
      <HosBackHeader backHref="/hospital/more" backLabel="Back to more" title="Wallet">
        <div className="mt-4 mx-1.5">
          <span className="block text-[12px] font-bold text-[#CFDCFF]">{owes ? 'You owe Consult your Doctor' : 'Wallet balance'}</span>
          <span className="block text-[32px] font-extrabold tracking-[-0.02em]">{formatINR(Math.abs(wallet.balance))}</span>
          <span className="block text-[12.5px] font-bold">{waiting ? `${formatINR(waiting.amount)} waiting to be paid to you` : `Available to withdraw ${formatINR(wallet.available)}`}</span>
        </div>
      </HosBackHeader>
      <HosBody>
        <DeskHead title="Wallet" subtitle={subtitle} />

        {!wallet.ready ? (
          <Panel>
            <EmptyLine>The wallet needs the latest database update (supabase/migrations/20261102_hospital_wallets.sql). Ask your administrator to run it.</EmptyLine>
          </Panel>
        ) : (
          <>
            <PhoneStats
              className="mb-3.5"
              cols={2}
              stats={[
                { label: owes ? 'You owe' : 'Balance', value: formatINR(Math.abs(wallet.balance)), color: balanceTone },
                { label: 'Waiting to be paid', value: formatINR(wallet.waiting), note: waiting ? 'Withdrawal requested' : 'Nothing waiting' },
              ]}
            />
            <section className="hidden lg:grid grid-cols-3 gap-4 mb-5">
              <StatCard label={owes ? 'You owe Consult your Doctor' : 'Wallet balance'} value={<span style={{ color: balanceTone }}>{formatINR(Math.abs(wallet.balance))}</span>} note="After every payment, withdrawal and adjustment" />
              <StatCard label="Available to withdraw" value={formatINR(wallet.available)} note={`Smallest withdrawal ${formatINR(MIN_PAYOUT)}`} />
              <StatCard label="Waiting to be paid" value={formatINR(wallet.waiting)} note={waiting ? `Requested ${formatShortDate(waiting.createdAt)}` : 'No withdrawal waiting'} />
            </section>

            {owes && (
              <p role="status" className="mb-3.5 p-3.5 rounded-2xl bg-[#FEF3F2] border border-[#FECDCA] text-[13.5px] leading-[1.5] text-[#B42318]">
                <b>You owe {formatINR(-wallet.balance)}.</b> These are Consult your Doctor&apos;s booking fees on patients who paid you in cash. Pay it to the Consult your Doctor team;
                they record it here. It is also settled by what patients pay through the UPI scanner at your desk.
              </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3.5 lg:gap-5 mb-3.5 lg:mb-5 items-start">
              <Panel>
                <PanelHead title="Withdraw" sub="Sent to your bank account or UPI ID by the Consult your Doctor team" />
                <WithdrawForm available={wallet.available} minimum={MIN_PAYOUT} hasAccount={!!wallet.account} waiting={waiting ? { id: waiting.id, amount: waiting.amount } : null} />
                {wallet.account && (
                  <p className="mt-3 text-[12.5px] text-[#5B667A]">
                    Paid to <b className="text-[#0B1B3F]">{wallet.account.name}</b>
                    {wallet.account.accountNumber ? ` · ${maskAccount(wallet.account.accountNumber)} · ${wallet.account.ifsc}` : ''}
                    {wallet.account.upiId ? ` · UPI ${wallet.account.upiId}` : ''}
                  </p>
                )}
              </Panel>
              <Panel>
                <PanelHead title="How your wallet works" />
                <ul className="flex flex-col gap-2 text-[13.5px] leading-[1.5]">
                  <li><b>UPI at your desk</b> pays Consult your Doctor&apos;s account: the consultation fee and services are added to your wallet.</li>
                  <li><b>Cash at your desk</b> stays with you: the booking fee in it is Consult your Doctor&apos;s, so it is taken from your wallet. With nothing in the wallet the balance goes below zero.</li>
                  <li><b>Online booking fees</b> are Consult your Doctor&apos;s and don&apos;t change your wallet; the patient still pays the consultation fee at your counter.</li>
                  <li>A refunded payment comes off again.</li>
                </ul>
              </Panel>
            </div>

            <Panel className="mb-3.5 lg:mb-5">
              <PanelHead title="Bank account for withdrawals" sub="Kept private: only the Consult your Doctor team sees the full number" />
              <PayoutAccountForm account={wallet.account} />
            </Panel>

            <Panel className="mb-3.5 lg:mb-5">
              <PanelHead title="Wallet activity" sub="Newest first" />
              {wallet.entries.length === 0 ? (
                <EmptyLine>Nothing yet. Payments taken at your desk from now on appear here.</EmptyLine>
              ) : (
                <ul>
                  {wallet.entries.map((e) => (
                    <li key={`${e.kind}-${e.id}`} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7] first:border-t-0">
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

            <Panel>
              <PanelHead title="Withdrawals" />
              {wallet.payouts.length === 0 ? (
                <EmptyLine>No withdrawals yet.</EmptyLine>
              ) : (
                <ul>
                  {wallet.payouts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7] first:border-t-0">
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-extrabold">{formatINR(p.amount)}</span>
                        <span className="block text-[12px] text-[#5B667A] truncate">
                          Asked {formatShortDate(p.createdAt)}
                          {p.reference ? ` · Ref ${p.reference}` : ''}
                          {p.note ? ` · ${p.note}` : ''}
                        </span>
                      </span>
                      <span className={`text-[12.5px] font-extrabold shrink-0 ${p.status === 'paid' ? 'text-[#067647]' : p.status === 'requested' ? 'text-[#B54708]' : 'text-[#5B667A]'}`}>
                        {p.status === 'paid' ? 'Paid' : p.status === 'requested' ? 'Waiting' : 'Not paid'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        )}
      </HosBody>
    </>
  )
}
