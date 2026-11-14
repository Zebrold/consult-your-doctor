import type { Metadata } from 'next'
import { Wallet } from 'lucide-react'
import { formatINR, formatShortDate } from '@/components/patient/format'
import { loadWalletBalances, toAccount } from '@/lib/wallet'
import { requireExecutivePage } from '../_lib/ops'
import { Card, Chip, EmptyState, ExePage, Stat, Stats, Status, plural } from '../_components/ui'
import { AdjustmentForm, PayoutReview } from '../_components/WalletDesk'

export const metadata: Metadata = { title: 'Wallets' }
export const dynamic = 'force-dynamic'

type HospitalRow = { id: string; name: string | null; city: string | null }
type PayoutRow = { id: string; hospital_id: string; amount: number | string; status: string; account: unknown; reference: string | null; note: string | null; created_at: string; processed_at: string | null }

/**
 * Wallets after DeskExeWallets: what Consult your Doctor holds for each hospital (UPI taken at their desks) and what
 * hospitals owe it (booking fees on cash they kept), withdrawals to pay, and payments in or corrections.
 */
export default async function ExecutiveWalletsPage() {
  const { admin, profile } = await requireExecutivePage('wallets')
  const [{ data: hospitals }, balances, waitingRes, recentRes] = await Promise.all([
    admin.from('hospitals').select('id, name, city').order('name'),
    loadWalletBalances(admin),
    admin.from('hospital_payouts').select('*').eq('status', 'requested').order('created_at', { ascending: true }),
    admin.from('hospital_payouts').select('*').neq('status', 'requested').order('processed_at', { ascending: false }).limit(20),
  ])

  const byId = new Map(((hospitals ?? []) as HospitalRow[]).map((h) => [h.id, h]))
  const nameOf = (id: string) => byId.get(id)?.name || 'Hospital'
  const cityOf = (id: string) => byId.get(id)?.city || ''
  const waiting = (waitingRes.data ?? []) as PayoutRow[]
  const recent = (recentRes.data ?? []) as PayoutRow[]

  const rows = ((hospitals ?? []) as HospitalRow[])
    .map((h) => ({ ...h, ...(balances?.get(h.id) ?? { balance: 0, waiting: 0 }) }))
    .sort((a, b) => b.balance - a.balance)
  const owed = rows.filter((r) => r.balance < 0).reduce((s, r) => s - r.balance, 0)
  const held = rows.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0)
  const waitingTotal = waiting.reduce((s, p) => s + (Number(p.amount) || 0), 0)

  return (
    <ExePage name={profile.fullName} title="Wallets" subtitle="What Consult your Doctor holds for each hospital and what hospitals owe on cash bookings">
      {!balances ? (
        <Card title="Wallets aren’t switched on yet">
          <EmptyState icon={Wallet}>Run supabase/migrations/20261102_hospital_wallets.sql to start hospital wallets.</EmptyState>
        </Card>
      ) : (
        <>
          <Stats cols={3}>
            <Stat label="Held for hospitals" value={formatINR(held)} note="Ready to withdraw" />
            <Stat label="Owed by hospitals" value={formatINR(owed)} note="Booking fees on cash payments" tone={owed ? 'high' : undefined} />
            <Stat label="Withdrawals waiting" value={formatINR(waitingTotal)} note={`${waiting.length} to pay`} tone={waiting.length ? 'warn' : undefined} />
          </Stats>

          <Card
            title="Withdrawals to pay"
            sub="Send the money, then mark it paid with the transfer reference"
            right={waiting.length ? <Chip tone="amber">{plural(waiting.length, 'left', 'left')}</Chip> : undefined}
          >
            {waiting.length === 0 ? (
              <EmptyState icon={Wallet}>No withdrawals waiting.</EmptyState>
            ) : (
              <ul>
                {waiting.map((p) => {
                  const account = toAccount(p.account)
                  const to = [account?.name, account?.accountNumber ? `A/c ${account.accountNumber} · IFSC ${account.ifsc}` : null, account?.upiId ? `UPI ${account.upiId}` : null].filter(Boolean).join(' · ')
                  return (
                    <li
                      key={p.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.3fr)_120px_minmax(0,1.2fr)_minmax(0,1fr)_150px] gap-x-4 gap-y-2 items-center py-3.5 border-t border-[#EEF2F7] text-[13.5px]"
                    >
                      <span className="min-w-0">
                        <span className="block font-extrabold truncate">{nameOf(p.hospital_id)}</span>
                        <span className="block text-[12px] text-[#5B667A] truncate">
                          {[cityOf(p.hospital_id), `asked ${formatShortDate(p.created_at)}`].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="text-[16px] font-extrabold tabular-nums text-right lg:text-left">{formatINR(Number(p.amount) || 0)}</span>
                      <span className="col-span-2 lg:col-span-1 text-[#27324A] break-words">{to || 'No account on file'}</span>
                      <PayoutReview payoutId={p.id} />
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3.5 lg:gap-5 items-start">
            <Card title="Balances" sub="Below zero means the hospital owes Consult your Doctor">
              <div className="hidden sm:grid grid-cols-[minmax(0,1.6fr)_140px_minmax(0,1fr)] gap-4 px-3.5 py-2.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">
                <span>Hospital</span>
                <span className="text-right">Balance</span>
                <span>Status</span>
              </div>
              {rows.length === 0 ? (
                <EmptyState icon={Wallet}>No hospitals yet.</EmptyState>
              ) : (
                <ul>
                  {rows.map((r) => (
                    <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1.3fr)_110px_minmax(0,1.3fr)] gap-x-4 gap-y-1 items-center py-3 sm:px-3.5 border-b border-[#EEF2F7] text-[13.5px]">
                      <span className="min-w-0">
                        <span className="block font-extrabold truncate">{r.name || 'Hospital'}</span>
                        {r.city && <span className="block text-[12px] text-[#5B667A] truncate">{r.city}</span>}
                      </span>
                      <span className={`text-right font-extrabold tabular-nums ${r.balance < 0 ? 'text-[#B42318]' : ''}`}>{r.balance < 0 ? `− ${formatINR(-r.balance)}` : formatINR(r.balance)}</span>
                      <span className="col-span-2 sm:col-span-1">
                        {r.waiting ? (
                          <Status label="Withdrawal requested" color="#B54708" />
                        ) : r.balance < 0 ? (
                          <Status label="Owes booking fees on cash" color="#B42318" />
                        ) : (
                          <span className="text-[#98A2B3]">—</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
              <Card title="Recently paid or rejected">
                {recent.length === 0 ? (
                  <EmptyState icon={Wallet}>Nothing yet.</EmptyState>
                ) : (
                  <ul>
                    {recent.map((p) => (
                      <li key={p.id} className="flex items-start justify-between gap-3 py-3 border-t border-[#EEF2F7] first:border-t-0 first:pt-0 text-[13.5px]">
                        <span className="min-w-0">
                          <span className="block font-extrabold truncate">{nameOf(p.hospital_id)}</span>
                          <span className="block text-[12px] text-[#5B667A] break-words">
                            {[p.status === 'paid' ? 'Paid' : 'Rejected', p.processed_at ? formatShortDate(p.processed_at) : null, p.reference ? `ref ${p.reference}` : null, p.note].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span className={`shrink-0 font-extrabold tabular-nums ${p.status === 'paid' ? '' : 'text-[#98A2B3] line-through'}`}>{formatINR(Number(p.amount) || 0)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <Card title="Record a payment in or a correction" sub="Positive: the hospital paid what it owed. Negative: a correction out of its wallet.">
            <AdjustmentForm hospitals={rows.map((r) => ({ id: r.id, name: r.name || 'Hospital' }))} />
          </Card>
        </>
      )}
    </ExePage>
  )
}
