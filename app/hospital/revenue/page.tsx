import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { IST, doctorName, formatINR, istDateKey } from '@/components/patient/format'
import { loadBookingFees } from '@/lib/booking-fees'
import { dayOf, hospitalShare, isPaidVisit, loadHospitalDoctors, loadHospitalVisits, requireHospital, shiftDay } from '../_lib/hospital'
import { ExportLedgerButton, FinanceLedger, type LedgerRow } from '../_components/FinanceLedger'
import { METHOD_LABEL, type LedgerMethod } from '../_lib/ledger'
import { BarChart, DeskHead, EmptyLine, HosBackHeader, HosBody, Initials, Meter, MoreLink, Panel, PanelHead, PhoneStats, StatCard, btnOutline, delta, plural } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Finance | Hospital Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const METHOD: Record<string, LedgerMethod> = { payu: 'online', upi_qr: 'upi', cash: 'cash' }
const monthName = (key: string, month: 'long' | 'short' = 'long') => new Date(`${key}-15T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: IST, month })

export default async function HospitalFinancePage() {
  const { admin, hospital } = await requireHospital()
  const now = currentTime()
  const today = istDateKey(now)
  const month = today.slice(0, 7)
  const lastMonth = istDateKey(Date.parse(`${month}-01T12:00:00+05:30`) - DAY).slice(0, 7)

  const [doctors, fees] = await Promise.all([loadHospitalDoctors(admin, hospital.id), loadBookingFees()])
  const visits = await loadHospitalVisits(admin, hospital.id, doctors.map((d) => d.id))
  const doctorById = new Map(doctors.map((d) => [d.id, d]))
  const testCharges = hospital.tests.filter((t): t is { name: string; price: number } => !!t.price)

  // A row per payment, plus seen patients with no payment recorded (e.g. walk-ins added by a doctor)
  const ledger: LedgerRow[] = visits
    .filter((v) => v.payment || v.status === 'visited' || v.status === 'completed')
    .map((v) => {
      const doc = v.doctorId ? doctorById.get(v.doctorId) : undefined
      const date = v.payment?.createdAt ?? v.start ?? v.createdAt
      // An online payment is the patient's booking fee to Consult your Doctor; the hospital sees what it takes at its
      // counter, the consultation fee.
      const share = v.payment ? hospitalShare(v.payment, doc?.fee) : null
      return {
        id: v.id,
        code: v.code,
        date,
        day: dayOf(date)!,
        patientName: v.patient?.name ?? 'Patient',
        doctor: doc ? doctorName(doc.name) : 'Doctor',
        department: doc?.department ?? 'Other',
        paid: share,
        share,
        method: v.payment ? (METHOD[v.payment.gateway ?? ''] ?? 'other') : null,
      } satisfies LedgerRow
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const paidRows = ledger.filter((r) => r.paid != null)
  const sum = (rows: LedgerRow[]) => rows.reduce((s, r) => s + (r.share ?? 0), 0)
  const onDay = (key: string) => sum(paidRows.filter((r) => r.day === key))
  const todayRows = paidRows.filter((r) => r.day === today)
  const monthRows = paidRows.filter((r) => r.day.startsWith(month))
  const lastRows = paidRows.filter((r) => r.day.startsWith(lastMonth))
  const monthTotal = sum(monthRows)
  const lastTotal = sum(lastRows)
  const monthChange = delta(monthTotal, lastTotal, { percent: true })
  const lastWeek = shiftDay(today, -7)
  const weekday = new Date(now).toLocaleDateString('en-US', { timeZone: IST, weekday: 'short' })
  const unrecorded = ledger.filter((r) => r.paid == null && r.day.startsWith(month)).length

  const awaiting = visits.filter((v) => v.status === 'pending_payment' && v.start && Date.parse(v.start) > now)
  const awaitingValue = awaiting.reduce((s, v) => s + ((v.doctorId && doctorById.get(v.doctorId)?.fee) || 0), 0)

  const online = monthRows.filter((r) => r.method === 'online')
  const onlinePct = monthTotal ? Math.round((sum(online) / monthTotal) * 100) : 0
  const methods = (['online', 'upi', 'cash', 'other'] as const)
    .map((m) => {
      const rows = monthRows.filter((r) => r.method === m)
      return { key: m, label: METHOD_LABEL[m], value: sum(rows), count: rows.length }
    })
    .filter((m) => m.count || m.key !== 'other')

  // The last two weeks, day by day
  const days = Array.from({ length: 14 }, (_, i) => shiftDay(today, i - 13))
  const dailyBars = days.map((k) => ({ label: String(Number(k.slice(8))), value: onDay(k), active: k === today }))

  const byDept = new Map<string, number>()
  for (const r of monthRows) byDept.set(r.department, (byDept.get(r.department) ?? 0) + (r.share ?? 0))
  const departments = Array.from(byDept.entries()).sort((a, b) => b[1] - a[1])
  const deptMax = Math.max(1, ...departments.map(([, v]) => v))
  const paidVisitsThisMonth = visits.filter((v) => isPaidVisit(v) && dayOf(v.start ?? v.createdAt)?.startsWith(month)).length
  const feeCard = [...doctors].filter((d) => d.fee != null).sort((a, b) => a.department.localeCompare(b.department) || (b.fee ?? 0) - (a.fee ?? 0))

  const monthLabel = new Date(`${month}-15T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: IST, month: 'long', year: 'numeric' })
  const subtitle = `Consultation fees collected at your counter. Booking fees (${formatINR(fees.consultation)} general, ${formatINR(fees.fastTrack)} fast track) are collected by Consult your Doctor in the app.`
  const changePct = lastTotal > 0 ? Math.round(((monthTotal - lastTotal) / lastTotal) * 100) : null
  const changeLine =
    changePct != null
      ? `${changePct >= 0 ? '+' : ''}${changePct}% vs ${monthName(lastMonth)}`
      : lastTotal > 0
        ? `+100% vs ${monthName(lastMonth)}`
        : monthTotal > 0
          ? `+100% vs ${monthName(lastMonth)}`
          : `0% vs ${monthName(lastMonth)}`

  const methodsPanel = (
    <Panel>
      <PanelHead title="Payment methods" sub="This month" />
      {monthTotal === 0 ? (
        <EmptyLine>No payments this month yet.</EmptyLine>
      ) : (
        methods.map((m) => (
          <div key={m.key} className="py-2">
            <div className="flex justify-between gap-3 mb-1.5 text-[13px]">
              <span className="font-extrabold truncate">{m.label}</span>
              <span className="font-bold text-[#5B667A] shrink-0">
                {formatINR(m.value)} · {Math.round((m.value / monthTotal) * 100)}%
              </span>
            </div>
            <Meter pct={(m.value / monthTotal) * 100} label={`${m.label}: ${formatINR(m.value)}`} />
          </div>
        ))
      )}
    </Panel>
  )

  const extras = (
    <>
      <Panel>
        <PanelHead title="Revenue by department" sub={`This month · ${plural(paidVisitsThisMonth, 'paid consultation')}`} />
        {departments.length === 0 ? (
          <EmptyLine>No revenue recorded this month yet.</EmptyLine>
        ) : (
          departments.map(([dept, value]) => (
            <div key={dept} className="py-2">
              <div className="flex justify-between gap-3 mb-1.5 text-[13px]">
                <span className="font-extrabold truncate">{dept}</span>
                <span className="font-bold text-[#5B667A] shrink-0">{formatINR(value)}</span>
              </div>
              <Meter pct={(value / deptMax) * 100} label={`${dept}: ${formatINR(value)}`} />
            </div>
          ))
        )}
      </Panel>
      <Panel>
        <PanelHead title="Consultation fee card" sub="What each doctor charges per visit" right={<MoreLink href="/hospital/doctors">Edit on roster</MoreLink>} />
        {feeCard.length === 0 ? (
          <EmptyLine>No doctors yet.</EmptyLine>
        ) : (
          <ul>
            {feeCard.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7]">
                <span className="flex items-center gap-2.5 min-w-0">
                  <Initials name={d.name} image={d.image} className="w-8 h-8 text-[11px]" />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-extrabold truncate">{doctorName(d.name)}</span>
                    <span className="block text-[12px] text-[#5B667A] truncate">{d.department}</span>
                  </span>
                </span>
                <span className="text-[14px] font-extrabold text-[#2A4DD0] shrink-0">{formatINR(d.fee ?? 0)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel>
        <PanelHead title="Test charges" sub="Amount for each test at your hospital" right={<MoreLink href="/hospital/profile#tests">Edit</MoreLink>} />
        {testCharges.length === 0 ? (
          <EmptyLine>No test charges yet. Add them on your hospital profile.</EmptyLine>
        ) : (
          <ul>
            {testCharges.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7]">
                <span className="text-[13.5px] font-bold min-w-0 truncate">{t.name}</span>
                <span className="text-[14px] font-extrabold text-[#2A4DD0] shrink-0">{formatINR(t.price)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )

  return (
    <>
      <HosBackHeader backHref="/hospital/more" backLabel="Back to more" title="Finance & revenue">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle}</p>
        <div className="mt-4 mx-1.5">
          <span className="block text-[12px] font-bold text-[#CFDCFF]">Collected this month</span>
          <span className="block text-[32px] font-extrabold tracking-[-0.02em]">{formatINR(monthTotal)}</span>
          <span className="block text-[12.5px] font-bold">{changeLine}</span>
        </div>
      </HosBackHeader>
      <HosBody>
        <DeskHead
          title="Finance & revenue"
          subtitle={subtitle}
          actions={
            <>
              <span className="px-1.5 text-[14.5px] font-extrabold whitespace-nowrap">{monthLabel}</span>
              <ExportLedgerButton rows={ledger.filter((r) => r.day.startsWith(month))} name={`hospital-payments-${month}.csv`} className={btnOutline} />
            </>
          }
        />

        <PhoneStats
          className="mb-3.5"
          stats={[
            { label: 'Collected today', value: formatINR(sum(todayRows)), note: plural(todayRows.length, 'payment') },
            { label: 'Booked online', value: `${onlinePct}%`, note: `${formatINR(sum(online))} this month`, color: '#2A4DD0' },
            { label: 'Awaiting payment', value: awaiting.length, note: `${formatINR(awaitingValue)} in fees`, color: '#B54708' },
            { label: monthName(lastMonth), value: formatINR(lastTotal), note: plural(lastRows.length, 'payment') },
          ]}
        />

        <section className="hidden lg:grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Collected this month" value={formatINR(monthTotal)} change={lastTotal ? monthChange : undefined} note={`vs ${monthName(lastMonth, 'short')}`} series={days.map(onDay)} />
          <StatCard label="Collected today" value={formatINR(sum(todayRows))} change={delta(sum(todayRows), onDay(lastWeek), { percent: true })} note={`vs last ${weekday}`} />
          <StatCard label="Booked online" value={`${onlinePct}%`} note={`${formatINR(sum(online))} from app bookings`} />
          <StatCard label="Awaiting payment" value={formatINR(awaitingValue)} note={`${plural(awaiting.length, 'upcoming booking')} not paid`} />
        </section>

        <div className="hidden lg:grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-5 mb-5 items-start">
          <Panel>
            <PanelHead title="Daily collections" sub="Last 14 days · consultation fees" />
            {days.every((k) => onDay(k) === 0) ? <EmptyLine>No payments in the last 14 days.</EmptyLine> : <BarChart bars={dailyBars} label="Collections each day, last 14 days" width={560} height={200} />}
          </Panel>
          {methodsPanel}
        </div>

        <FinanceLedger rows={ledger} today={today} month={month} lastMonth={lastMonth} />
        {unrecorded > 0 && (
          <p className="mt-2.5 px-1 text-[12.5px] text-[#5B667A]">
            {plural(unrecorded, 'consultation')} this month {unrecorded === 1 ? 'has' : 'have'} no payment recorded (for example walk-ins a doctor added themselves), so{' '}
            {unrecorded === 1 ? 'it isn’t' : 'they aren’t'} counted above.
          </p>
        )}

        <div className="flex flex-col gap-3.5 mt-3.5 lg:hidden">
          {methodsPanel}
          {extras}
        </div>
        <section className="hidden lg:grid grid-cols-3 gap-5 mt-5 items-start">{extras}</section>
      </HosBody>
    </>
  )
}
