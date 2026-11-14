import type { Metadata } from 'next'
import { CircleCheck, FlaskConical, Receipt } from 'lucide-react'
import { istDateKey } from '@/components/patient/format'
import { LAB_STATUS_LABELS, buildAttentionItems, currentTime, loadLabBookings, loadLabs, loadPartnerApplications, requireExecutivePage, timeAgo } from '../_lib/ops'
import { Card, CallLink, EmptyState, ExePage, Line, Stat, Stats, Status, Table, count, plural, td, th } from '../_components/ui'
import { AddDiagnosticCenterButton, AddLoginButton } from '../_components/NetworkForms'
import { PartnerQueue } from '../_components/PartnerQueue'

export const metadata: Metadata = { title: 'Diagnostics' }

/** Diagnostics after DeskExeDiagnostics: partner labs, today's visits, bookings to follow up and test prices compared. */
export default async function ExecutiveDiagnosticsPage() {
  const { admin, profile } = await requireExecutivePage('diagnostics')
  const [labs, bookings, { data: labLogins }, applications] = await Promise.all([
    loadLabs(admin),
    loadLabBookings(admin),
    admin.from('profiles').select('diagnostic_center_id').eq('role', 'diagnostic_admin'),
    loadPartnerApplications(admin, 'diagnostic_center', { withDocuments: true }),
  ])
  const hasLogin = new Set(((labLogins ?? []) as { diagnostic_center_id: string | null }[]).map((p) => p.diagnostic_center_id))
  const labsWithoutLogin = labs.filter((l) => !hasLogin.has(l.id))
  const now = currentTime()
  // Oldest first, so the longest wait is reviewed first.
  const pendingApplications = applications.filter((a) => a.status === 'pending').reverse()
  const appliedLabels = Object.fromEntries(pendingApplications.map((a) => [a.id, timeAgo(a.createdAt, now)]))
  const todayKey = istDateKey(now)

  const activeLabs = labs.filter((l) => l.status === 'active')
  const cities = new Set(activeLabs.map((l) => l.city).filter(Boolean))
  const visitsToday = bookings.filter((b) => b.preferredDate && istDateKey(b.preferredDate) === todayKey && b.status !== 'cancelled')
  const awaitingPayment = bookings.filter((b) => b.status === 'pending_payment')
  const collected = bookings.filter((b) => b.status === 'visited' || b.status === 'report_sent')
  const reportsSent = bookings.filter((b) => b.status === 'report_sent')

  const attention = buildAttentionItems({ appointments: [], labBookings: bookings, applications: [] }, now)

  const pipeline = ['pending_payment', 'confirmed', 'visited', 'report_sent', 'cancelled']
    .map((status) => ({ label: LAB_STATUS_LABELS[status], value: bookings.filter((b) => b.status === status).length }))
    .filter((row) => row.value > 0)

  const labStats = labs
    .map((lab) => {
      const own = bookings.filter((b) => b.center?.id === lab.id)
      return {
        ...lab,
        total: own.length,
        pending: own.filter((b) => b.status === 'pending_payment' || b.status === 'confirmed').length,
        reports: own.filter((b) => b.status === 'report_sent').length,
      }
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))

  // Compare each test's listed price across the labs that offer it.
  const tariffMap = new Map<string, number[]>()
  for (const lab of activeLabs) {
    for (const [test, price] of Object.entries(lab.prices)) {
      const value = Number(price)
      if (!Number.isFinite(value) || value <= 0) continue
      tariffMap.set(test, [...(tariffMap.get(test) ?? []), value])
    }
  }
  const bookingsByTest = new Map<string, number>()
  for (const b of bookings) bookingsByTest.set(b.testName, (bookingsByTest.get(b.testName) ?? 0) + 1)

  const tariffs = Array.from(tariffMap.entries())
    .map(([test, prices]) => {
      const sorted = [...prices].sort((a, b) => a - b)
      const min = sorted[0]
      const max = sorted[sorted.length - 1]
      const median = sorted[Math.floor(sorted.length / 2)]
      return { test, labs: prices.length, min, max, median, spreadPct: min ? ((max - min) / min) * 100 : 0, booked: bookingsByTest.get(test) ?? 0 }
    })
    .sort((a, b) => b.booked - a.booked || b.labs - a.labs || a.test.localeCompare(b.test))
    .slice(0, 20)
  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

  return (
    <ExePage name={profile.fullName} title="Diagnostics" subtitle="Partner labs, today’s lab visits, bookings that need follow-up and test prices" actions={<AddDiagnosticCenterButton />}>
      <Stats>
        <Stat label="Partner labs" value={activeLabs.length} note={`In ${plural(cities.size, 'city', 'cities')}`} />
        <Stat label="Lab visits today" value={visitsToday.length} note={`${count(bookings.length)} bookings all time`} />
        <Stat label="Awaiting payment" value={awaitingPayment.length} note={`${attention.filter((a) => a.status === 'Awaiting payment').length} unpaid for over a day`} tone={awaitingPayment.length ? 'warn' : undefined} />
        <Stat label="Reports sent" value={count(reportsSent.length)} note={`Of ${count(collected.length)} samples collected`} />
      </Stats>

      {pendingApplications.length > 0 && (
        <Card id="applications" title="Diagnostic centre applications" sub="Approving adds the centre and its staff login, and emails the applicant their staff ID">
          <PartnerQueue applications={pendingApplications} submittedLabels={appliedLabels} />
        </Card>
      )}

      {labsWithoutLogin.length > 0 && (
        <Card title="Centres without a staff login" sub="They can’t manage their tests, bookings or reports until their staff have a login">
          <ul>
            {labsWithoutLogin.map((lab) => (
              <li key={lab.id}>
                <Line label={lab.name} sub={lab.city ?? undefined} right={<AddLoginButton kind="lab" id={lab.id} name={lab.name} />} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title="Bookings needing follow-up"
        sub="Unpaid for over a day, visit date passed, or report not sent two days after collection"
        right={<Status label={`${attention.length} open`} color={attention.length ? '#B42318' : '#067647'} />}
      >
        {attention.length === 0 ? (
          <EmptyState icon={CircleCheck}>All lab bookings are on track.</EmptyState>
        ) : (
          <Table min={720}>
            <thead>
              <tr>
                <th className={th}>Patient</th>
                <th className={th}>Test and lab</th>
                <th className={th}>Issue</th>
                <th className={th}>Since</th>
                <th className={th}>
                  <span className="sr-only">Contact</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {attention.slice(0, 15).map((item) => (
                <tr key={item.id}>
                  <td className={`${td} font-extrabold`}>{item.who}</td>
                  <td className={`${td} text-[#27324A]`}>{item.detail}</td>
                  <td className={td}>
                    <Status label={item.status} color={item.severity === 'high' ? '#B42318' : '#B54708'} />
                  </td>
                  <td className={`${td} text-[12.5px] text-[#5B667A] whitespace-nowrap`}>{item.sinceLabel}</td>
                  <td className={`${td} text-right`}>{item.phone ? <CallLink phone={item.phone} /> : <span className="text-[12px] text-[#5B667A]">No phone</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3.5 lg:gap-5 items-start">
        <Card title="Partner lab network" sub="Tests offered and bookings per lab">
          {labStats.length === 0 ? (
            <EmptyState icon={FlaskConical}>No diagnostic centres are registered yet.</EmptyState>
          ) : (
            <ul>
              {labStats.slice(0, 8).map((lab) => (
                <li key={lab.id} className="flex items-center justify-between gap-3 py-3 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[14px] font-extrabold">
                      <span className="truncate">{lab.name}</span>
                      {lab.status !== 'active' && <Status label="Not listed" color="#5B667A" />}
                    </span>
                    <span className="block text-[12.5px] text-[#5B667A]">
                      {lab.city ?? 'City not set'} · {plural(lab.tests.length, 'test')}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[14px] font-extrabold">{plural(lab.total, 'booking')}</span>
                    <span className="block text-[12px] text-[#5B667A]">
                      {lab.pending} in progress · {lab.reports} reports sent
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Booking pipeline" sub="Where every diagnostic booking stands">
          {pipeline.length === 0 ? (
            <p className="text-[13px] text-[#5B667A]">No bookings yet.</p>
          ) : (
            <ul>
              {pipeline.map((row) => (
                <li key={row.label}>
                  <Line label={<span className="font-bold">{row.label}</span>} right={<span className="font-extrabold tabular-nums">{count(row.value)}</span>} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Test catalogue and price comparison" sub="Listed prices for the same test across active labs">
        {tariffs.length === 0 ? (
          <EmptyState icon={Receipt}>No lab has published test prices yet.</EmptyState>
        ) : (
          <Table min={760}>
            <thead>
              <tr>
                <th className={th}>Test</th>
                <th className={th}>Labs</th>
                <th className={th}>Lowest</th>
                <th className={th}>Median</th>
                <th className={th}>Highest</th>
                <th className={th}>Price spread</th>
                <th className={th}>Bookings</th>
              </tr>
            </thead>
            <tbody>
              {tariffs.map((t) => (
                <tr key={t.test}>
                  <td className={`${td} font-extrabold`}>{t.test}</td>
                  <td className={`${td} tabular-nums`}>{t.labs}</td>
                  <td className={`${td} tabular-nums`}>{inr(t.min)}</td>
                  <td className={`${td} tabular-nums`}>{inr(t.median)}</td>
                  <td className={`${td} tabular-nums`}>{inr(t.max)}</td>
                  <td className={td}>
                    {t.labs < 2 ? <Status label="Single lab" color="#5B667A" /> : t.spreadPct > 25 ? <Status label={`Wide (${Math.round(t.spreadPct)}%)`} color="#B54708" /> : <Status label="Normal" color="#2A4DD0" />}
                  </td>
                  <td className={`${td} tabular-nums`}>{count(t.booked)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </ExePage>
  )
}
