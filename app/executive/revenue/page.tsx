import type { Metadata } from 'next'
import { istDateKey } from '@/components/patient/format'
import { gatewayKey } from '@/lib/payment-gateways'
import { PLATFORM_HELD } from '@/lib/wallet'
import { getBookingFees } from '@/lib/booking-fees'
import { splitBookingFees, type RevenueSplit, type SplitAppointment, type SplitPayment } from '@/lib/revenue-split'
import { countDelta, monthName, monthSoFar, monthsEnding, prevMonth } from '@/lib/report-stats'
import { buildLedger, currentTime, formatINR, loadAppointments, loadLabBookings, loadPayments, requireExecutivePage } from '../_lib/ops'
import { Card, ExePage, Meter, Stat, Stats, Table, count, plural, td, th, type Delta } from '../_components/ui'
import { RevenueLedger } from '../_components/RevenueLedger'

export const metadata: Metadata = { title: 'Revenue' }

function Change({ d }: { d?: Delta }) {
  if (!d) return <span className="text-[#98A2B3]">—</span>
  return <span className={`font-extrabold ${d.dir === 'flat' ? 'text-[#5B667A]' : d.good ? 'text-[#2A4DD0]' : 'text-[#B42318]'}`}>{d.text}</span>
}

/**
 * Revenue after DeskExeRevenue: what's collected, by month, by source and by partner, and the full ledger. Bookings are
 * valued at the money actually received: successful payments net of recorded refunds (buildLedger). "Where it comes
 * from" splits the booking fees into General, Fast track, lab and convenience fees (lib/revenue-split.ts).
 */
export default async function ExecutiveRevenuePage() {
  const { admin, profile } = await requireExecutivePage('revenue')
  const now = currentTime()
  const today = istDateKey(now)
  const span = monthSoFar(today)
  const monthStart = new Date(`${span.month}-01T00:00:00+05:30`).toISOString()

  const [appointments, labBookings, payments, badgesRes, ordersRes, payoutsRes, { data: hospitals }, sharesRes, costRes] = await Promise.all([
    loadAppointments(admin),
    loadLabBookings(admin),
    loadPayments(admin),
    admin.from('verified_badges').select('subject, amount, status, created_at').in('status', ['in_review', 'active']).neq('plan', 'welcome').gte('created_at', monthStart).limit(5000),
    admin.from('equipment_orders').select('total, status, paid_at').not('paid_at', 'is', null).gte('paid_at', monthStart).limit(5000),
    admin.from('hospital_payouts').select('hospital_id, amount, processed_at').eq('status', 'paid').gte('processed_at', monthStart).limit(5000),
    admin.from('hospitals').select('id, name'),
    // Whose money each payment is (20261102_hospital_wallets.sql): the booking fee is Consult your Doctor's part.
    admin.from('payments').select('gateway, status, amount, refund_amount, platform_share, hospital_share, hospital_id, appointment_id, diagnostic_booking_id').eq('status', 'success').gte('created_at', monthStart).limit(20000),
    // What paid orders cost from suppliers (20261115_executive_workspace.sql), for the commission.
    admin.from('equipment_orders').select('subtotal, cost_total, status').not('paid_at', 'is', null).gte('paid_at', monthStart).limit(5000),
  ])

  const ledger = buildLedger(appointments, labBookings, payments)
  const monthOf = (iso: string) => istDateKey(iso).slice(0, 7)
  const thisMonth = ledger.filter((r) => span.inThis(istDateKey(r.createdAt)))
  const lastSoFar = ledger.filter((r) => span.inLastSoFar(istDateKey(r.createdAt)))
  const sum = (rows: typeof ledger) => rows.reduce((s, r) => s + r.amount, 0)
  const revenueMonth = sum(thisMonth)
  const paidToday = ledger.filter((r) => istDateKey(r.createdAt) === today)

  // Hospitals' part of what Consult your Doctor collected (online and UPI at the desk; cash stays at the hospital), and
  // the platform's part of every payment.
  type Share = SplitPayment & { hospital_share: number | string | null; hospital_id: string | null }
  const shares = (sharesRes.error ? null : (sharesRes.data ?? [])) as Share[] | null

  // The booking-fee split (General, Fast track, convenience, lab) from this month's successful payments. Each payment's
  // fee is its appointment's booking fee and type, so the appointments are read in chunks. Null if anything can't be read.
  let split: RevenueSplit | null = null
  if (shares) {
    const apptIds = [...new Set(shares.map((p) => p.appointment_id).filter(Boolean) as string[])]
    const byId = new Map<string, SplitAppointment>()
    let readable = true
    for (let i = 0; i < apptIds.length && readable; i += 200) {
      const { data, error } = await admin.from('appointments').select('*').in('id', apptIds.slice(i, i + 200))
      if (error) readable = false
      for (const a of (data ?? []) as (SplitAppointment & { id: string })[]) byId.set(a.id, a)
    }
    if (readable) split = splitBookingFees(shares, byId, await getBookingFees())
  }
  const held = (g: string | null) => !!g && PLATFORM_HELD.includes(gatewayKey(g))
  const hospitalShare = shares ? shares.filter((p) => held(p.gateway)).reduce((s, p) => s + (Number(p.hospital_share) || 0), 0) : null
  const platformShare = shares ? shares.reduce((s, p) => s + (Number(p.platform_share) || 0), 0) : null
  const shareByHospital = new Map<string, number>()
  for (const p of shares ?? []) if (held(p.gateway) && p.hospital_id) shareByHospital.set(p.hospital_id, (shareByHospital.get(p.hospital_id) ?? 0) + (Number(p.hospital_share) || 0))

  // The commission on equipment: the price over what the team pays the supplier, for orders with cost prices.
  const costed = ((costRes.error ? [] : costRes.data) as { subtotal: number | string; cost_total: number | string | null; status: string }[] | null ?? []).filter((o) => o.status !== 'cancelled')
  const withCost = costed.filter((o) => o.cost_total != null)
  const commission = withCost.reduce((s, o) => s + (Number(o.subtotal) - Number(o.cost_total)), 0)


  // The last six months, this one so far compared with the same days of the last.
  const byMonth = new Map<string, { revenue: number; bookings: number }>()
  for (const r of ledger) {
    const k = monthOf(r.createdAt)
    const m = byMonth.get(k) ?? { revenue: 0, bookings: 0 }
    m.revenue += r.amount
    m.bookings++
    byMonth.set(k, m)
  }
  const months = monthsEnding(span.month, 6)
    .reverse()
    .map((k) => {
      const m = byMonth.get(k) ?? { revenue: 0, bookings: 0 }
      const before = k === span.month ? sum(lastSoFar) : byMonth.get(prevMonth(k))?.revenue ?? 0
      return { key: k, ...m, change: countDelta(m.revenue, before) }
    })

  type BadgeRow = { subject: string; amount: number | string }
  const badges = (badgesRes.error ? [] : (badgesRes.data ?? [])) as BadgeRow[]
  const badgeTotal = badges.reduce((s, b) => s + (Number(b.amount) || 0), 0)
  const orders = (ordersRes.error ? [] : (ordersRes.data ?? [])) as { total: number | string; status: string }[]
  const paidOrders = orders.filter((o) => o.status !== 'cancelled')
  const consults = thisMonth.filter((r) => r.kind === 'consultation')
  const labs = thisMonth.filter((r) => r.kind === 'diagnostic')
  const sources = [
    ...(split
      ? [
          { label: 'Doctor booking fees', value: split.general.amount, sub: plural(split.general.bookings, 'booking') },
          { label: 'Fast-track fees', value: split.fastTrack.amount, sub: plural(split.fastTrack.bookings, 'booking') },
          { label: 'Lab booking fees', value: split.lab.amount, sub: `${plural(split.lab.bookings, 'lab booking')} · convenience fee included` },
          { label: 'Convenience fees', value: split.convenience.amount, sub: `On ${plural(split.convenience.payments, 'online doctor payment')}` },
        ]
      : [
          { label: 'Doctor bookings', value: sum(consults), sub: plural(consults.length, 'paid consultation') },
          { label: 'Lab test bookings', value: sum(labs), sub: plural(labs.length, 'paid lab test') },
        ]),
    ...(badgesRes.error ? [] : [{ label: 'Verified badges', value: badgeTotal, sub: `${plural(badges.filter((b) => b.subject === 'doctor').length, 'doctor')}, ${plural(badges.filter((b) => b.subject === 'hospital').length, 'hospital')}` }]),
    ...(ordersRes.error ? [] : [{ label: 'Equipment orders', value: paidOrders.reduce((s, o) => s + (Number(o.total) || 0), 0), sub: `Order value of ${plural(paidOrders.length, 'paid order')}` }]),
    ...(costRes.error ? [] : [{ label: 'Equipment commission', value: commission, sub: withCost.length === costed.length ? 'Price over supplier cost' : `On ${withCost.length} of ${plural(costed.length, 'order')} with cost prices` }]),
  ]
  const sourceTotal = sources.reduce((s, x) => s + x.value, 0)
  const netPlatform =platformShare == null ? null : platformShare + badgeTotal + (costRes.error ? 0 : commission)

  // By partner: hospitals (consultations) and labs this month, with what each hospital withdrew.
  const nameOf = new Map(((hospitals ?? []) as { id: string; name: string | null }[]).map((h) => [h.id, h.name ?? 'Hospital']))
  const paidOut = new Map<string, number>()
  for (const p of (payoutsRes.error ? [] : (payoutsRes.data ?? [])) as { hospital_id: string; amount: number | string }[]) {
    paidOut.set(nameOf.get(p.hospital_id) ?? 'Hospital', (paidOut.get(nameOf.get(p.hospital_id) ?? 'Hospital') ?? 0) + (Number(p.amount) || 0))
  }
  const shareByName = new Map<string, number>()
  for (const [id, v] of shareByHospital) shareByName.set(nameOf.get(id) ?? 'Hospital', (shareByName.get(nameOf.get(id) ?? 'Hospital') ?? 0) + v)
  const partners = new Map<string, { kind: 'Hospital' | 'Lab'; revenue: number; bookings: number }>()
  for (const r of thisMonth) {
    const name = r.kind === 'consultation' ? r.provider.split(' · ').pop() || 'Unknown hospital' : r.provider
    const p = partners.get(name) ?? { kind: r.kind === 'consultation' ? 'Hospital' : 'Lab', revenue: 0, bookings: 0 }
    p.revenue += r.amount
    p.bookings++
    partners.set(name, p)
  }
  const partnerRows = Array.from(partners.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)

  return (
    <ExePage name={profile.fullName} title="Revenue" subtitle="What Consult your Doctor collects, by month, by source and by partner">
      <Stats>
        <Stat label="Revenue this month" value={formatINR(revenueMonth)} change={<Change d={countDelta(revenueMonth, sum(lastSoFar))} />} note={`vs ${span.lastSpan}`} />
        <Stat label="Revenue today" value={formatINR(sum(paidToday))} note={plural(paidToday.length, 'paid booking')} tone="blue" />
        <Stat label="Paid to hospitals" value={hospitalShare == null ? '—' : formatINR(hospitalShare)} note={hospitalShare == null ? 'Shares start with the wallet migration' : 'Their share of bookings, this month'} />
        <Stat
          label="Net platform revenue"
          value={netPlatform == null ? '—' : formatINR(netPlatform)}
          note={netPlatform == null ? 'Shares start with the wallet migration' : 'Fees, badges and commission'}
          tone="blue"
        />
      </Stats>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3.5 lg:gap-5 items-start">
        <Card title="Revenue by month" sub="Consultations and lab tests">
          <Table min={460}>
            <thead>
              <tr>
                <th className={th}>Month</th>
                <th className={`${th} text-right`}>Revenue</th>
                <th className={`${th} text-right`}>Bookings</th>
                <th className={`${th} text-right`}>Change</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.key}>
                  <td className={`${td} font-extrabold whitespace-nowrap`}>
                    {monthName(m.key, 'year')}
                    {m.key === span.month ? <span className="font-bold text-[#5B667A]"> (so far)</span> : ''}
                  </td>
                  <td className={`${td} text-right tabular-nums font-bold`}>{formatINR(m.revenue)}</td>
                  <td className={`${td} text-right tabular-nums`}>{count(m.bookings)}</td>
                  <td className={`${td} text-right`}>
                    <Change d={m.change} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card title="Where it comes from" sub={`${monthName(span.month)} so far`}>
          <ul>
            {sources.map((s) => {
              const pct = sourceTotal > 0 ? (s.value / sourceTotal) * 100 : 0
              return (
                <li key={s.label} className="py-3 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="block min-w-0 text-[13.5px] font-extrabold">{s.label}</span>
                    <span className="shrink-0 text-[14px] font-extrabold tabular-nums">{formatINR(s.value)}</span>
                  </div>
                  <span className="block text-[12px] text-[#5B667A]">{s.sub}</span>
                  <div className="mt-2">
                    <Meter pct={pct} label={`${s.label}: ${Math.round(pct)}% of the total`} />
                  </div>
                </li>
              )
            })}
          </ul>
          {split && <p className="mt-3 text-[12px] text-[#5B667A]">Lab booking fees include their convenience fee; the lab fee is not stored separately.</p>}
        </Card>
      </div>

      <Card title="By partner" sub={`${monthName(span.month)} so far`}>
        {partnerRows.length === 0 ? (
          <p className="text-[13px] text-[#5B667A]">No paid bookings this month yet.</p>
        ) : (
          <Table min={620}>
            <thead>
              <tr>
                <th className={th}>Partner</th>
                <th className={`${th} text-right`}>Revenue</th>
                <th className={`${th} text-right`}>Bookings</th>
                <th className={`${th} text-right`}>Hospital share</th>
                <th className={`${th} text-right`}>Withdrawals paid</th>
              </tr>
            </thead>
            <tbody>
              {partnerRows.map(([name, p]) => (
                <tr key={name}>
                  <td className={td}>
                    <span className="block font-extrabold">{name}</span>
                    <span className="block text-[12px] text-[#5B667A]">{p.kind}</span>
                  </td>
                  <td className={`${td} text-right tabular-nums font-bold`}>{formatINR(p.revenue)}</td>
                  <td className={`${td} text-right tabular-nums`}>{count(p.bookings)}</td>
                  <td className={`${td} text-right tabular-nums`}>{p.kind === 'Hospital' && shareByName.get(name) ? formatINR(shareByName.get(name)!) : <span className="text-[#98A2B3]">—</span>}</td>
                  <td className={`${td} text-right tabular-nums`}>{p.kind === 'Hospital' && paidOut.get(name) ? formatINR(paidOut.get(name)!) : <span className="text-[#98A2B3]">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <RevenueLedger rows={ledger} />
    </ExePage>
  )
}
