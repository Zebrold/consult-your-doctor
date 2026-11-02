import type { Metadata } from 'next'
import { Banknote, Building2, Hourglass, Scale, Wallet } from 'lucide-react'
import { formatINR, formatShortDate } from '@/components/patient/format'
import { loadWalletBalances, toAccount } from '@/lib/wallet'
import { requireExecutive } from '../_lib/ops'
import { Chip, EmptyState, MetricCard, PageHeader, Panel } from '../_components/ui'
import { AdjustmentForm, PayoutReview } from '../_components/WalletDesk'

export const metadata: Metadata = { title: 'Hospital Wallets' }
export const dynamic = 'force-dynamic'

type HospitalRow = { id: string; name: string | null; city: string | null }
type PayoutRow = { id: string; hospital_id: string; amount: number | string; status: string; account: unknown; reference: string | null; note: string | null; created_at: string; processed_at: string | null }

export default async function ExecutiveWalletsPage() {
  const { admin } = await requireExecutive()
  const [{ data: hospitals }, balances, waitingRes, recentRes] = await Promise.all([
    admin.from('hospitals').select('id, name, city').order('name'),
    loadWalletBalances(admin),
    admin.from('hospital_payouts').select('*').eq('status', 'requested').order('created_at', { ascending: true }),
    admin.from('hospital_payouts').select('*').neq('status', 'requested').order('processed_at', { ascending: false }).limit(20),
  ])

  const byId = new Map(((hospitals ?? []) as HospitalRow[]).map((h) => [h.id, h]))
  const nameOf = (id: string) => byId.get(id)?.name || 'Hospital'
  const waiting = (waitingRes.data ?? []) as PayoutRow[]
  const recent = (recentRes.data ?? []) as PayoutRow[]

  const rows = ((hospitals ?? []) as HospitalRow[])
    .map((h) => ({ ...h, ...(balances?.get(h.id) ?? { balance: 0, waiting: 0 }) }))
    .sort((a, b) => a.balance - b.balance)
  const owed = rows.filter((r) => r.balance < 0).reduce((s, r) => s - r.balance, 0)
  const held = rows.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0)
  const waitingTotal = waiting.reduce((s, p) => s + (Number(p.amount) || 0), 0)

  return (
    <>
      <PageHeader
        eyebrow="Wallets"
        title="Hospital Wallets & Withdrawals"
        description="What Consult your Doctor holds for each hospital (UPI taken at their desks) and what hospitals owe it (booking fees on cash they kept). Pay withdrawals here once the transfer is made."
      />

      {!balances ? (
        <Panel title="Wallets aren't switched on yet" icon={Wallet}>
          <EmptyState icon={Wallet}>Run supabase/migrations/20261102_hospital_wallets.sql to start hospital wallets.</EmptyState>
        </Panel>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
            <MetricCard label="Held for hospitals" value={formatINR(held)} icon={Banknote} tone="teal" footer={<span>Positive balances, ready to withdraw</span>} />
            <MetricCard label="Owed by hospitals" value={formatINR(owed)} icon={Scale} tone="coral" footer={<span>Booking fees on cash payments</span>} />
            <MetricCard label="Withdrawals waiting" value={formatINR(waitingTotal)} icon={Hourglass} tone="blue" footer={<span>{waiting.length} to pay</span>} />
          </section>

          <Panel title="Withdrawals to pay" icon={Hourglass} description="Send the money to the account shown, then mark it paid with the transfer reference.">
            {waiting.length === 0 ? (
              <EmptyState icon={Hourglass}>No withdrawals waiting.</EmptyState>
            ) : (
              <ul className="flex flex-col divide-y divide-outline-variant/30">
                {waiting.map((p) => {
                  const account = toAccount(p.account)
                  return (
                    <li key={p.id} className="py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
                      <div className="min-w-0 lg:w-[320px]">
                        <p className="font-bold text-indigo-gray-900">{nameOf(p.hospital_id)} · {formatINR(Number(p.amount) || 0)}</p>
                        <p className="text-sm text-indigo-gray-600">
                          Asked {formatShortDate(p.created_at)} · to {account?.name ?? 'Unknown'}
                          {account?.accountNumber ? `, A/c ${account.accountNumber}, IFSC ${account.ifsc}` : ''}
                          {account?.upiId ? `, UPI ${account.upiId}` : ''}
                        </p>
                      </div>
                      <div className="flex-1">
                        <PayoutReview payoutId={p.id} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Balances" icon={Building2} description="Below zero: the hospital owes Consult your Doctor. Record what they pay in below.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-indigo-gray-600">
                    <th className="py-2 pr-4 font-bold">Hospital</th>
                    <th className="py-2 pr-4 font-bold text-right">Balance</th>
                    <th className="py-2 font-bold text-right">Waiting</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-outline-variant/30">
                      <td className="py-2.5 pr-4">
                        <span className="font-bold text-indigo-gray-900">{r.name || 'Hospital'}</span>
                        {r.city && <span className="text-indigo-gray-600"> · {r.city}</span>}
                      </td>
                      <td className={`py-2.5 pr-4 text-right font-bold ${r.balance < 0 ? 'text-error' : 'text-indigo-gray-900'}`}>
                        {r.balance < 0 ? `owes ${formatINR(-r.balance)}` : formatINR(r.balance)}
                      </td>
                      <td className="py-2.5 text-right">{r.waiting ? <Chip tone="blue">{formatINR(r.waiting)}</Chip> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Record a payment in or a correction" icon={Scale} description="Positive: the hospital paid what it owed. Negative: a correction out of its wallet.">
            <AdjustmentForm hospitals={rows.map((r) => ({ id: r.id, name: r.name || 'Hospital' }))} />
          </Panel>

          <Panel title="Recently paid or rejected" icon={Banknote}>
            {recent.length === 0 ? (
              <EmptyState icon={Banknote}>Nothing yet.</EmptyState>
            ) : (
              <ul className="flex flex-col divide-y divide-outline-variant/30">
                {recent.map((p) => (
                  <li key={p.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                    <span className="min-w-0">
                      <span className="font-bold text-indigo-gray-900">{nameOf(p.hospital_id)} · {formatINR(Number(p.amount) || 0)}</span>
                      <span className="block text-indigo-gray-600 truncate">
                        {p.processed_at ? formatShortDate(p.processed_at) : ''}
                        {p.reference ? ` · Ref ${p.reference}` : ''}
                        {p.note ? ` · ${p.note}` : ''}
                      </span>
                    </span>
                    <Chip tone={p.status === 'paid' ? 'teal' : 'neutral'}>{p.status === 'paid' ? 'Paid' : 'Rejected'}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </>
  )
}
