import type { Metadata } from 'next'
import { istDateKey } from '@/components/patient/format'
import { ReportDownloads, type ReportFile } from '@/components/portal/ReportDownloads'
import { countDelta, monthName, monthSoFar, monthsEnding, noShowRate, pointsDelta, prevMonth } from '@/lib/report-stats'
import { LAB_STATUS_LABELS, APPOINTMENT_STATUS_LABELS, currentTime, loadAppointments, loadLabBookings, requireExecutivePage } from '../_lib/ops'
import { Card, ExePage, Line, Stat, Stats, Table, count, td, th, type Delta } from '../_components/ui'
import { MonthlyEmail } from '../_components/MonthlyEmail'

export const metadata: Metadata = { title: 'Reports' }
export const dynamic = 'force-dynamic'


function Change({ d, vs }: { d?: Delta; vs: string }) {
  if (!d) return <span>No {vs} to compare</span>
  return (
    <span>
      <span className={`font-extrabold ${d.dir === 'flat' ? 'text-[#5B667A]' : d.good ? 'text-[#067647]' : 'text-[#B42318]'}`}>
        {d.dir === 'up' ? '↑' : d.dir === 'down' ? '↓' : ''} {d.text.replace(/^[+-]/, '')}
      </span>{' '}
      vs {vs}
    </span>
  )
}

/** Reports after DeskExeReports: how the whole platform is doing this month and over six, and the files to download. */
export default async function ExecutiveReportsPage() {
  const { admin, profile, user } = await requireExecutivePage('reports')
  const [subRes, { data: me }] = await Promise.all([
    admin.from('report_subscriptions').select('email, active').eq('profile_id', user.id).maybeSingle(),
    admin.from('profiles').select('email').eq('id', user.id).maybeSingle(),
  ])
  const sub = subRes.error ? null : (subRes.data as { email: string; active: boolean } | null)
  const myEmail = (me as { email?: string | null } | null)?.email ?? ''
  const now = currentTime()
  const today = istDateKey(now)
  const span = monthSoFar(today)
  const monthStart = new Date(`${span.month}-01T00:00:00+05:30`).toISOString()
  const lastFull = prevMonth(span.month)
  const lastStart = new Date(`${lastFull}-01T00:00:00+05:30`).toISOString()

  const [appointments, labBookings, paymentsRes, reviewsRes, patientsRes, doctorsRes, hospitalsRes, badgesRes, ordersRes, payoutsRes, ticketsRes, { data: hospitalNames }] = await Promise.all([
    loadAppointments(admin),
    loadLabBookings(admin),
    admin.from('payments').select('transaction_id, amount, gateway, status, created_at, refund_amount').gte('created_at', lastStart).limit(20000),
    admin.from('doctor_reviews').select('rating, created_at').eq('is_published', true).gte('created_at', lastStart).limit(20000),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'patient').gte('created_at', monthStart),
    admin.from('doctors').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    admin.from('hospitals').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    admin.from('verified_badges').select('id', { count: 'exact', head: true }).in('status', ['in_review', 'active']).gte('created_at', monthStart),
    admin.from('equipment_orders').select('id', { count: 'exact', head: true }).not('paid_at', 'is', null).gte('paid_at', monthStart),
    admin.from('hospital_payouts').select('hospital_id, amount, status, reference, created_at, processed_at').gte('created_at', lastStart).lt('created_at', monthStart).limit(5000),
    admin.from('tickets').select('ticket_code, requester_role, category, subject, priority, status, created_at').gte('created_at', lastStart).lt('created_at', monthStart).limit(5000),
    admin.from('hospitals').select('id, name'),
  ])
  const monthOf = (iso: string | null) => (iso ? istDateKey(iso).slice(0, 7) : '')
  const booked = (s: string) => s !== 'pending_payment' && s !== 'cancelled'

  // Bookings by month: consultations and lab visits booked (paid, not cancelled), and the check-in rate of the
  // consultations whose slot fell in that month.
  const months = monthsEnding(span.month, 6)
    .reverse()
    .map((k) => {
      const consults = appointments.filter((a) => booked(a.status) && monthOf(a.createdAt) === k).length
      const labs = labBookings.filter((b) => booked(b.status) && monthOf(b.createdAt) === k).length
      const visits = appointments.filter((a) => monthOf(a.startTime) === k).map((a) => ({ status: a.status, start: a.startTime, end: a.startTime }))
      const ns = noShowRate(visits, now)
      return { key: k, consults, labs, checkIn: ns.rate == null ? null : 100 - ns.rate }
    })

  // This month so far against the same days of last month.
  const inThis = (iso: string | null) => !!iso && span.inThis(istDateKey(iso))
  const inLast = (iso: string | null) => !!iso && span.inLastSoFar(istDateKey(iso))
  const bookingsNow = appointments.filter((a) => booked(a.status) && inThis(a.createdAt)).length + labBookings.filter((b) => booked(b.status) && inThis(b.createdAt)).length
  const bookingsBefore = appointments.filter((a) => booked(a.status) && inLast(a.createdAt)).length + labBookings.filter((b) => booked(b.status) && inLast(b.createdAt)).length
  const checkInNow = months[0].checkIn
  const checkInBefore = months[1]?.checkIn ?? null

  type Pay = { transaction_id: string | null; amount: number | string; gateway: string; status: string; created_at: string; refund_amount: number | string | null }
  const pays = (paymentsRes.data ?? []) as Pay[]
  const refundRate = (rows: Pay[]) => {
    const settled = rows.filter((p) => p.status === 'success' || p.status === 'refunded')
    return settled.length ? (settled.filter((p) => p.status === 'refunded').length / settled.length) * 100 : null
  }
  const refundNow = refundRate(pays.filter((p) => inThis(p.created_at)))
  const refundBefore = refundRate(pays.filter((p) => inLast(p.created_at)))

  const ratings = (reviewsRes.data ?? []) as { rating: number; created_at: string }[]
  const avg = (rows: { rating: number }[]) => (rows.length ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10 : null)
  const ratingNow = avg(ratings.filter((r) => inThis(r.created_at)))
  const ratingBefore = avg(ratings.filter((r) => inLast(r.created_at)))

  const growth = [
    { label: 'New patients', value: patientsRes.count },
    { label: 'New doctors', value: doctorsRes.count },
    { label: 'New hospitals and branches', value: hospitalsRes.count },
    ...(badgesRes.error ? [] : [{ label: 'Badge sign-ups', value: badgesRes.count }]),
    ...(ordersRes.error ? [] : [{ label: 'Equipment orders', value: ordersRes.count }]),
  ]

  // Last month's files, made in the browser from what's loaded here.
  const lastName = monthName(lastFull, 'year')
  const inLastFull = (iso: string | null) => monthOf(iso) === lastFull
  const nameOf = new Map(((hospitalNames ?? []) as { id: string; name: string | null }[]).map((h) => [h.id, h.name ?? 'Hospital']))
  const files: ReportFile[] = [
    {
      title: 'All bookings',
      sub: `${lastName} · Excel (CSV)`,
      filename: `bookings-${lastFull}.csv`,
      rows: [
        ['Booked on', 'Type', 'Patient', 'Doctor or test', 'Hospital or lab', 'Status'],
        ...appointments
          .filter((a) => inLastFull(a.createdAt))
          .map((a) => [istDateKey(a.createdAt), 'Consultation', a.patient?.name ?? '', a.doctor?.name ?? '', a.hospital?.name ?? '', APPOINTMENT_STATUS_LABELS[a.status] ?? a.status]),
        ...labBookings.filter((b) => inLastFull(b.createdAt)).map((b) => [istDateKey(b.createdAt), 'Lab test', b.patient?.name ?? '', b.testName, b.center?.name ?? '', LAB_STATUS_LABELS[b.status] ?? b.status]),
      ],
    },
    {
      title: 'Payments and refunds',
      sub: `${lastName} · Excel (CSV)`,
      filename: `payments-${lastFull}.csv`,
      rows: [['Date', 'Transaction', 'Method', 'Amount (INR)', 'Status', 'Refunded (INR)'], ...pays.filter((p) => inLastFull(p.created_at)).map((p) => [istDateKey(p.created_at), p.transaction_id, p.gateway, Number(p.amount) || 0, p.status, p.refund_amount == null ? '' : Number(p.refund_amount)])],
    },
    ...(payoutsRes.error
      ? []
      : [
          {
            title: 'Hospital withdrawals',
            sub: `${lastName} · Excel (CSV)`,
            filename: `withdrawals-${lastFull}.csv`,
            rows: [
              ['Asked on', 'Hospital', 'Amount (INR)', 'Status', 'Reference', 'Done on'],
              ...((payoutsRes.data ?? []) as { hospital_id: string; amount: number | string; status: string; reference: string | null; created_at: string; processed_at: string | null }[]).map((p) => [
                istDateKey(p.created_at),
                nameOf.get(p.hospital_id) ?? 'Hospital',
                Number(p.amount) || 0,
                p.status,
                p.reference,
                p.processed_at ? istDateKey(p.processed_at) : '',
              ]),
            ],
          } satisfies ReportFile,
        ]),
    {
      title: 'Support tickets',
      sub: `${lastName} · Excel (CSV)`,
      filename: `tickets-${lastFull}.csv`,
      rows: [
        ['Raised on', 'Ticket', 'From', 'Category', 'Subject', 'Priority', 'Status'],
        ...((ticketsRes.data ?? []) as { ticket_code: string; requester_role: string; category: string; subject: string; priority: string; status: string; created_at: string }[]).map((t) => [
          istDateKey(t.created_at),
          t.ticket_code,
          t.requester_role,
          t.category,
          t.subject,
          t.priority,
          t.status,
        ]),
      ],
    },
  ]

  const vs = span.lastSpan
  return (
    <ExePage
      name={profile.fullName}
      title="Reports"
      subtitle="How the whole platform is doing"
      actions={subRes.error ? undefined : <MonthlyEmail current={sub?.active ? sub.email : null} suggested={myEmail.endsWith('.internal') ? '' : myEmail} />}
    >
      <Stats>
        <Stat label="Bookings this month" value={count(bookingsNow)} note={<Change d={countDelta(bookingsNow, bookingsBefore)} vs={vs} />} />
        <Stat label="Check-in rate" value={checkInNow == null ? '—' : `${Math.round(checkInNow)}%`} note={<Change d={pointsDelta(checkInNow, checkInBefore, { unit: '%', digits: 0 })} vs={monthName(prevMonth(span.month), 'short')} />} />
        <Stat label="Refund rate" value={refundNow == null ? '—' : `${refundNow.toFixed(1)}%`} note={<Change d={pointsDelta(refundNow, refundBefore, { unit: '%', higherIsGood: false })} vs={vs} />} />
        <Stat label="Average rating" value={ratingNow ?? '—'} note={<Change d={pointsDelta(ratingNow, ratingBefore)} vs={vs} />} />
      </Stats>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3.5 lg:gap-5 items-start">
        <Card title="Bookings by month" sub="Consultations and lab visits, paid and not cancelled">
          <Table min={520}>
            <thead>
              <tr>
                <th className={th}>Month</th>
                <th className={`${th} text-right`}>Consultations</th>
                <th className={`${th} text-right`}>Lab visits</th>
                <th className={`${th} text-right`}>Check-in rate</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.key}>
                  <td className={`${td} font-extrabold whitespace-nowrap`}>
                    {monthName(m.key, 'year')}
                    {m.key === span.month ? <span className="font-bold text-[#5B667A]"> (so far)</span> : ''}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{count(m.consults)}</td>
                  <td className={`${td} text-right tabular-nums`}>{count(m.labs)}</td>
                  <td className={`${td} text-right tabular-nums font-bold`}>{m.checkIn == null ? '—' : `${Math.round(m.checkIn)}%`}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <Card title="Growth this month" sub={`${monthName(span.month)} so far`}>
            <ul>
              {growth.map((g) => (
                <li key={g.label}>
                  <Line label={<span className="font-bold">{g.label}</span>} right={<strong className="tabular-nums">{g.value == null ? '—' : count(g.value)}</strong>} />
                </li>
              ))}
            </ul>
          </Card>
          <ReportDownloads files={files} />
        </div>
      </div>
    </ExePage>
  )
}
