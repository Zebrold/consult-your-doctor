import type { Metadata } from 'next'
import { AlertTriangle, Building2, CircleCheck, FileCheck, FlaskConical, GitBranch, Microscope, Phone, Receipt, Wallet } from 'lucide-react'
import {
  LAB_STATUS_LABELS,
  buildAttentionItems,
  currentTime,
  loadLabBookings,
  loadLabs,
  requireExecutive,
} from '../_lib/ops'
import { BarList, Chip, EmptyState, MetricCard, PageHeader, Panel } from '../_components/ui'

export const metadata: Metadata = { title: 'Diagnostic Centers & Lab Operations' }

export default async function ExecutiveDiagnosticsPage() {
  const { admin } = await requireExecutive()
  const [labs, bookings] = await Promise.all([loadLabs(admin), loadLabBookings(admin)])
  const now = currentTime()

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const todayKey = today.toDateString()

  const activeLabs = labs.filter((l) => l.status === 'active')
  const cities = new Set(activeLabs.map((l) => l.city).filter(Boolean))
  const visitsToday = bookings.filter((b) => b.preferredDate && new Date(b.preferredDate).toDateString() === todayKey && b.status !== 'cancelled')
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
      return { test, labs: prices.length, min, max, median, spread: max - min, spreadPct: min ? ((max - min) / min) * 100 : 0, booked: bookingsByTest.get(test) ?? 0 }
    })
    .sort((a, b) => b.booked - a.booked || b.labs - a.labs || a.test.localeCompare(b.test))
    .slice(0, 20)

  return (
    <>
      <PageHeader
        eyebrow="Lab Operations"
        title="Diagnostic Centers & Lab Operations"
        description="Partner labs, today's lab visits, bookings that need follow-up, and how test prices compare across labs."
        actions={<Chip tone="teal" dot>{activeLabs.length} active labs in {cities.size} cities</Chip>}
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <MetricCard label="Partner labs" value={activeLabs.length} icon={Building2} tone="primary" footer={<span>{labs.length - activeLabs.length} inactive or pending</span>} />
        <MetricCard label="Lab visits today" value={visitsToday.length} icon={Microscope} tone="blue" footer={<span>{bookings.length} bookings all time</span>} />
        <MetricCard
          label="Awaiting payment"
          value={awaitingPayment.length}
          icon={Wallet}
          tone="coral"
          footer={<span>{attention.filter((a) => a.status === 'Awaiting payment').length} unpaid for over a day</span>}
        />
        <MetricCard
          label="Reports sent"
          value={reportsSent.length}
          icon={FileCheck}
          tone="teal"
          progress={collected.length ? (reportsSent.length / collected.length) * 100 : 0}
          footer={<span>Of {collected.length} samples collected</span>}
        />
      </section>

      <Panel
        title="Bookings Needing Follow-up"
        icon={AlertTriangle}
        description="Unpaid for over a day, visit date passed, or report not sent two days after collection."
        aside={<Chip tone={attention.length ? 'coral' : 'teal'} dot>{attention.length} open</Chip>}
      >
        {attention.length === 0 ? (
          <EmptyState icon={CircleCheck}>All lab bookings are on track.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="text-indigo-gray-600 font-label-sm text-label-sm bg-surface-container-low">
                  <th className="py-3 px-4 rounded-l-lg font-semibold">Patient</th>
                  <th className="py-3 px-4 font-semibold">Test &amp; Lab</th>
                  <th className="py-3 px-4 font-semibold">Issue</th>
                  <th className="py-3 px-4 font-semibold">Since</th>
                  <th className="py-3 px-4 text-right rounded-r-lg font-semibold">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {attention.slice(0, 15).map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-on-surface text-sm">{item.who}</td>
                    <td className="py-3.5 px-4 text-sm text-indigo-gray-600">{item.detail}</td>
                    <td className="py-3.5 px-4"><Chip tone={item.severity === 'high' ? 'coral' : 'primary'}>{item.status}</Chip></td>
                    <td className="py-3.5 px-4 font-mono text-sm text-soft-coral">{item.sinceLabel}</td>
                    <td className="py-3.5 px-4 text-right">
                      {item.phone ? (
                        <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vibrant-blue text-on-primary hover:bg-primary font-label-sm text-label-sm shadow-sm">
                          <Phone className="w-3.5 h-3.5" /> Call patient
                        </a>
                      ) : (
                        <span className="text-xs text-indigo-gray-600">No phone on file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <Panel className="lg:col-span-7" title="Partner Lab Network" icon={FlaskConical} description="Tests offered and booking volume per lab.">
          {labStats.length === 0 ? (
            <EmptyState icon={Building2}>No diagnostic centers are registered yet.</EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {labStats.slice(0, 8).map((lab) => (
                <div key={lab.id} className="p-4 rounded-xl bg-surface-container-low/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-11 h-11 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shrink-0">
                      <Microscope className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-title-md text-base font-bold text-on-surface">{lab.name}</span>
                        <Chip tone={lab.status === 'active' ? 'teal' : 'neutral'}>{lab.status === 'active' ? 'Active' : lab.status ?? 'Unknown'}</Chip>
                      </div>
                      <div className="font-label-sm text-label-sm text-indigo-gray-600 mt-0.5">
                        {lab.city ?? 'City not set'} • {lab.tests.length} tests offered
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <Chip tone="primary">{lab.total} bookings</Chip>
                    <span className="font-label-sm text-[11px] text-indigo-gray-600">
                      {lab.pending} in progress • {lab.reports} reports sent
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="lg:col-span-5" title="Booking Pipeline" icon={GitBranch} description="Where every diagnostic booking currently stands.">
          {pipeline.length === 0 ? <p className="text-sm text-indigo-gray-600">No bookings yet.</p> : <BarList rows={pipeline} tone="teal" />}
        </Panel>
      </div>

      <Panel
        title="Test Catalog & Tariff Comparison"
        icon={Receipt}
        description="Listed prices for the same test across active partner labs (₹). A wide spread means the same test costs patients very different amounts depending on the lab."
      >
        {tariffs.length === 0 ? (
          <EmptyState icon={Receipt}>No lab has published test prices yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="text-indigo-gray-600 font-label-sm text-label-sm bg-surface-container-low">
                  <th className="py-3 px-4 rounded-l-lg font-semibold">Test</th>
                  <th className="py-3 px-4 font-semibold">Labs offering</th>
                  <th className="py-3 px-4 font-semibold">Lowest</th>
                  <th className="py-3 px-4 font-semibold">Median</th>
                  <th className="py-3 px-4 font-semibold">Highest</th>
                  <th className="py-3 px-4 font-semibold">Price spread</th>
                  <th className="py-3 px-4 rounded-r-lg font-semibold">Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-sm">
                {tariffs.map((t) => (
                  <tr key={t.test} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-on-surface">{t.test}</td>
                    <td className="py-3 px-4 text-indigo-gray-600">{t.labs}</td>
                    <td className="py-3 px-4 font-mono">₹{t.min.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono">₹{t.median.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono">₹{t.max.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      {t.labs < 2 ? (
                        <Chip>Single lab</Chip>
                      ) : t.spreadPct > 25 ? (
                        <Chip tone="coral">+₹{t.spread.toLocaleString('en-IN')} ({Math.round(t.spreadPct)}%)</Chip>
                      ) : (
                        <Chip tone="teal">Consistent</Chip>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-indigo-gray-600">{t.booked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}
