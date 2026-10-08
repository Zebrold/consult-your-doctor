import type { Metadata } from 'next'
import Link from 'next/link'
import { CircleDollarSign, Clock, CreditCard, FlaskConical, IndianRupee, Wallet } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatINR, istDateKey } from '@/components/patient/format'
import { Avatar, Card, CardHeader, Chip, EmptyState, StatCard } from '@/components/portal/ui'
import { CONSULTATION_PLATFORM_FEE } from '@/lib/pricing'
import { dayOf, hospitalShare, isPaidVisit, loadHospitalDoctors, loadHospitalVisits, requireHospital } from '../_lib/hospital'
import { FinanceLedger, type LedgerRow } from '../_components/FinanceLedger'

export const metadata: Metadata = { title: 'Finance | Hospital Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000

export default async function HospitalFinancePage() {
  const { admin, hospital } = await requireHospital()
  const now = currentTime()
  const today = istDateKey(now)
  const month = today.slice(0, 7)
  const lastMonth = istDateKey(Date.parse(`${month}-01T12:00:00+05:30`) - DAY).slice(0, 7)

  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const visits = await loadHospitalVisits(admin, hospital.id, doctors.map((d) => d.id))
  const doctorById = new Map(doctors.map((d) => [d.id, d]))
  const testCharges = hospital.tests.filter((t): t is { name: string; price: number } => !!t.price)

  // A row per payment, plus seen patients with no payment recorded (e.g. walk-ins added by a doctor)
  const ledger: LedgerRow[] = visits
    .filter((v) => v.payment || v.status === 'visited' || v.status === 'completed')
    .map((v) => {
      const doc = v.doctorId ? doctorById.get(v.doctorId) : undefined
      const date = v.payment?.createdAt ?? v.start ?? v.createdAt
      const gateway = v.payment?.gateway
      return {
        id: v.id,
        code: v.code,
        date,
        day: dayOf(date)!,
        patientName: v.patient?.name ?? 'Patient',
        doctor: doc ? doctorName(doc.name) : 'Doctor',
        department: doc?.department ?? 'Other',
        paid: v.payment ? v.payment.amount : null,
        share: v.payment ? hospitalShare(v.payment) : null,
        method: v.payment ? (gateway === 'payu' ? 'online' : gateway === 'cash' ? 'cash' : 'other') : null,
      } satisfies LedgerRow
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const sum = (rows: LedgerRow[]) => rows.reduce((s, r) => s + (r.share ?? 0), 0)
  const todayRows = ledger.filter((r) => r.day === today && r.paid != null)
  const monthRows = ledger.filter((r) => r.day.startsWith(month) && r.paid != null)
  const lastRows = ledger.filter((r) => r.day.startsWith(lastMonth) && r.paid != null)
  const online = monthRows.filter((r) => r.method === 'online')
  const desk = monthRows.filter((r) => r.method !== 'online')
  const monthTotal = sum(monthRows)
  const lastTotal = sum(lastRows)
  const change = lastTotal ? Math.round(((monthTotal - lastTotal) / lastTotal) * 100) : null
  const unrecorded = ledger.filter((r) => r.paid == null && r.day.startsWith(month)).length

  const awaiting = visits.filter((v) => v.status === 'pending_payment' && v.start && Date.parse(v.start) > now)
  const awaitingValue = awaiting.reduce((s, v) => s + ((v.doctorId && doctorById.get(v.doctorId)?.fee) || 0), 0)

  const byDept = new Map<string, number>()
  for (const r of monthRows) byDept.set(r.department, (byDept.get(r.department) ?? 0) + (r.share ?? 0))
  const departments = Array.from(byDept.entries()).sort((a, b) => b[1] - a[1])
  const deptMax = Math.max(1, ...departments.map(([, v]) => v))

  const feeCard = [...doctors].filter((d) => d.fee != null).sort((a, b) => a.department.localeCompare(b.department) || (b.fee ?? 0) - (a.fee ?? 0))
  const onlinePct = monthTotal ? Math.round((sum(online) / monthTotal) * 100) : 0
  const paidVisitsThisMonth = visits.filter((v) => isPaidVisit(v) && dayOf(v.start ?? v.createdAt)?.startsWith(month)).length

  return (
    <>
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">Payments &amp; revenue</span>
          </div>
          <h1 className="font-headline-lg text-[24px] md:text-headline-lg text-indigo-gray-900 font-bold tracking-tight">Finance &amp; Revenue</h1>
          <p className="text-sm md:text-body-md text-indigo-gray-600 max-w-3xl">
            Consultation fees collected for your doctors, online through PayU or in cash at your desk.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-gutter">
        <StatCard
          label="Collected Today"
          value={formatINR(sum(todayRows))}
          icon={Wallet}
          tone="blue"
          footer={<span className="text-[11px] text-indigo-gray-600">{todayRows.length} {todayRows.length === 1 ? 'payment' : 'payments'}</span>}
        />
        <StatCard
          label="This Month"
          value={formatINR(monthTotal)}
          note={change != null ? `${change >= 0 ? '+' : ''}${change}%` : undefined}
          noteTone={change != null && change < 0 ? 'coral' : 'teal'}
          icon={IndianRupee}
          tone="teal"
          footer={<span className="text-[11px] text-indigo-gray-600">Last month: {formatINR(lastTotal)}</span>}
        />
        <StatCard
          label="Paid Online"
          value={`${onlinePct}%`}
          note="this month"
          noteTone="neutral"
          icon={CreditCard}
          tone="neutral"
          footer={<span className="text-[11px] text-indigo-gray-600">{formatINR(sum(online))} online • {formatINR(sum(desk))} at desk</span>}
        />
        <StatCard
          label="Awaiting Payment"
          value={awaiting.length}
          note={awaiting.length ? formatINR(awaitingValue) : undefined}
          noteTone="coral"
          icon={Clock}
          tone="coral"
          footer={<span className="text-[11px] text-indigo-gray-600">Upcoming bookings not paid yet</span>}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-gutter items-start">
        <div className="lg:col-span-8 flex flex-col gap-4 md:gap-gutter">
          <FinanceLedger rows={ledger} today={today} month={month} lastMonth={lastMonth} />
          {unrecorded > 0 && (
            <p className="text-[12px] text-indigo-gray-600 px-1">
              {unrecorded} {unrecorded === 1 ? 'consultation' : 'consultations'} this month {unrecorded === 1 ? 'has' : 'have'} no payment recorded (for example walk-ins a doctor added themselves), so they aren’t counted above.
            </p>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4 md:gap-gutter">
          <Card>
            <CardHeader title="Payment Method Share" subtitle="This month’s collections" />
            {monthTotal === 0 ? (
              <EmptyState icon={CircleDollarSign}>No payments this month yet.</EmptyState>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="h-3 w-full rounded-full bg-surface-container-low flex overflow-hidden">
                  <div className="bg-vibrant-blue h-full" style={{ width: `${onlinePct}%` }} />
                  <div className="bg-fresh-teal h-full" style={{ width: `${100 - onlinePct}%` }} />
                </div>
                {[
                  { label: 'Online (PayU)', sub: `Your fee; patients also pay ₹${CONSULTATION_PLATFORM_FEE} platform fee`, value: sum(online), count: online.length, dot: 'bg-vibrant-blue' },
                  { label: 'Cash at desk', sub: 'Recorded by your front desk', value: sum(desk), count: desk.length, dot: 'bg-fresh-teal' },
                ].map((m) => (
                  <div key={m.label} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${m.dot}`} />
                      <div className="min-w-0">
                        <span className="block text-[13px] font-semibold text-indigo-gray-900">{m.label}</span>
                        <span className="block text-[11px] text-indigo-gray-600 truncate">{m.sub}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-title-md text-[14px] font-bold text-indigo-gray-900">{formatINR(m.value)}</span>
                      <span className="block text-[11px] text-indigo-gray-600">{m.count} paid</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Revenue by Department" subtitle={`This month • ${paidVisitsThisMonth} paid consultations`} />
            {departments.length === 0 ? (
              <EmptyState icon={IndianRupee}>No revenue recorded this month yet.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-3">
                {departments.map(([dept, value]) => (
                  <li key={dept} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="font-semibold text-indigo-gray-900 truncate">{dept}</span>
                      <span className="font-bold text-indigo-gray-900 shrink-0">{formatINR(value)}</span>
                    </div>
                    <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${(value / deptMax) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Consultation Fee Card" subtitle="What each doctor charges per visit" action={<Chip tone="neutral">{feeCard.length}</Chip>} />
            {feeCard.length === 0 ? (
              <EmptyState icon={IndianRupee}>No doctors yet.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {feeCard.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2 px-2.5 rounded-lg hover:bg-surface-container-low">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={d.name} image={d.image} className="w-8 h-8 text-[11px]" />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold text-indigo-gray-900 truncate">{doctorName(d.name)}</span>
                        <span className="block text-[11px] text-indigo-gray-600 truncate">{d.department}</span>
                      </span>
                    </span>
                    <span className="font-title-md text-[14px] font-bold text-vibrant-blue shrink-0">{formatINR(d.fee ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-indigo-gray-600 mt-3">Change a fee from the doctor’s card on the Roster.</p>
          </Card>

          {/* Test-wise amount: the hospital's own test charges */}
          <Card>
            <CardHeader
              title="Test Charges"
              subtitle="Amount for each test at your hospital"
              action={
                <Link href="/hospital/profile#tests" className="font-label-sm text-label-sm text-primary font-semibold hover:underline shrink-0">
                  Edit
                </Link>
              }
            />
            {testCharges.length === 0 ? (
              <EmptyState icon={FlaskConical}>No test charges yet. Add them on your hospital profile.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {testCharges.map((t) => (
                  <li key={t.name} className="flex items-center justify-between gap-3 py-2 px-2.5 rounded-lg hover:bg-surface-container-low">
                    <span className="text-[14px] font-semibold text-indigo-gray-900 min-w-0 truncate">{t.name}</span>
                    <span className="font-title-md text-[14px] font-bold text-vibrant-blue shrink-0">{formatINR(t.price)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </>
  )
}
