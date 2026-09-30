import type { Metadata } from 'next'
import { Building2, CircleCheck, Hourglass, IndianRupee, PieChart, ReceiptText, Stethoscope, Wallet } from 'lucide-react'
import { buildLedger, currentTime, formatINR, loadAppointments, loadLabBookings, loadPayments, requireExecutive } from '../_lib/ops'
import { BarList, MetricCard, PageHeader, Panel } from '../_components/ui'
import { RevenueLedger } from '../_components/RevenueLedger'

export const metadata: Metadata = { title: 'Revenue & Billing' }

export default async function ExecutiveRevenuePage() {
  const { admin } = await requireExecutive()
  const [appointments, labBookings, payments] = await Promise.all([loadAppointments(admin), loadLabBookings(admin), loadPayments(admin)])
  const now = currentTime()

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const tomorrow = today.getTime() + 86_400_000
  const monthAgo = now - 30 * 86_400_000
  const inToday = (iso: string | null) => Boolean(iso) && new Date(iso!).getTime() >= today.getTime() && new Date(iso!).getTime() < tomorrow

  const ledger = buildLedger(appointments, labBookings, payments)
  const paidToday = ledger.filter((r) => inToday(r.createdAt))
  const revenueToday = paidToday.reduce((s, r) => s + r.amount, 0)

  const consultsToday = appointments.filter((a) => inToday(a.startTime) && a.status !== 'cancelled')
  const completedToday = consultsToday.filter((a) => a.status === 'visited' || a.status === 'completed').length

  const unpaidConsults = appointments.filter((a) => a.status === 'pending_payment')
  const unpaidLabs = labBookings.filter((b) => b.status === 'pending_payment')
  const unpaidValue = unpaidConsults.reduce((s, a) => s + (a.doctor?.fee ?? 0), 0) + unpaidLabs.reduce((s, b) => s + (b.price ?? 0), 0)

  const last30 = ledger.filter((r) => new Date(r.createdAt).getTime() >= monthAgo)
  const consultRevenue = last30.filter((r) => r.kind === 'consultation').reduce((s, r) => s + r.amount, 0)
  const labRevenue = last30.filter((r) => r.kind === 'diagnostic').reduce((s, r) => s + r.amount, 0)
  const total30 = consultRevenue + labRevenue
  const consultShare = total30 ? (consultRevenue / total30) * 100 : 0

  const byProvider = new Map<string, number>()
  for (const r of last30) {
    const name = r.kind === 'consultation' ? r.provider.split(' · ').pop() || 'Unknown hospital' : r.provider
    byProvider.set(name, (byProvider.get(name) ?? 0) + r.amount)
  }
  const topProviders = Array.from(byProvider.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value, display: formatINR(value) }))

  return (
    <>
      <PageHeader
        eyebrow="Revenue"
        title="Revenue & Patient Billing"
        description="Collected revenue from paid consultations and lab tests, valued at the recorded payment or the listed fee, with bookings still awaiting payment."
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-gutter">
        <MetricCard label="Consultations today" value={consultsToday.length} icon={Stethoscope} tone="blue" footer={<span>Scheduled for today</span>} />
        <MetricCard
          label="Seen today"
          value={completedToday}
          icon={CircleCheck}
          tone="teal"
          progress={consultsToday.length ? (completedToday / consultsToday.length) * 100 : 0}
          footer={<span>Checked in or completed</span>}
        />
        <MetricCard label="Paid bookings today" value={paidToday.length} icon={ReceiptText} tone="neutral" footer={<span>Consultations &amp; lab tests</span>} />
        <MetricCard label="Revenue today" value={formatINR(revenueToday)} icon={IndianRupee} tone="primary" footer={<span>{formatINR(total30)} in the last 30 days</span>} />
        <MetricCard
          label="Awaiting payment"
          value={formatINR(unpaidValue)}
          icon={Hourglass}
          tone="coral"
          footer={<span>{unpaidConsults.length + unpaidLabs.length} unpaid bookings</span>}
        />
      </section>

      <Panel
        title="Revenue Ledger"
        icon={Wallet}
        description="Every paid consultation and lab test, newest first. The payment method comes from the recorded payment where one exists."
      >
        <RevenueLedger rows={ledger} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-md">
        <Panel title="Revenue by Channel" icon={PieChart} description={`Last 30 days: ${formatINR(total30)} collected.`}>
          <div className="flex flex-col gap-2">
            <div className="h-6 w-full rounded-full bg-surface-container-low flex overflow-hidden p-0.5">
              <div className="bg-vibrant-blue h-full rounded-l-full" style={{ width: `${consultShare}%` }} title="Consultations" />
              <div className="bg-fresh-teal h-full rounded-r-full" style={{ width: `${total30 ? 100 - consultShare : 0}%` }} title="Diagnostics" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 font-label-sm text-[12px] px-1">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-vibrant-blue" />
                <span className="text-indigo-gray-600">Consultations ({Math.round(consultShare)}%):</span>
                <strong className="text-indigo-gray-900">{formatINR(consultRevenue)}</strong>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-fresh-teal" />
                <span className="text-indigo-gray-600">Diagnostics ({total30 ? Math.round(100 - consultShare) : 0}%):</span>
                <strong className="text-indigo-gray-900">{formatINR(labRevenue)}</strong>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-surface-container-low">
              <span className="font-label-sm text-[10px] uppercase font-bold text-indigo-gray-600">Paid consultations</span>
              <p className="font-title-md text-base font-bold text-indigo-gray-900 mt-1">{last30.filter((r) => r.kind === 'consultation').length}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-low">
              <span className="font-label-sm text-[10px] uppercase font-bold text-indigo-gray-600">Paid lab tests</span>
              <p className="font-title-md text-base font-bold text-indigo-gray-900 mt-1">{last30.filter((r) => r.kind === 'diagnostic').length}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Top Hospitals & Labs" icon={Building2} description="Highest collected revenue in the last 30 days.">
          {topProviders.length === 0 ? <p className="text-sm text-indigo-gray-600">No paid bookings in the last 30 days.</p> : <BarList rows={topProviders} />}
        </Panel>
      </div>
    </>
  )
}
