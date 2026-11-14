import { IST, istDateKey } from '@/components/patient/format'
import { ReportDownloads, type ReportFile } from '@/components/portal/ReportDownloads'
import { complaintsIn, count, countDelta, monthName, monthSoFar, monthsEnding, noShowRate, pointsDelta, topComplaints } from '@/lib/report-stats'
import { bookingCode, patientCode, type Visit } from '../_lib/doctor'
import { BarChart, DeskHead, DocBackHeader, DocBody, EmptyLine, Meter, Panel, PanelHead, Row, Sparkline, StatCard, card, visitStatus } from './doc-ui'

const DAY = 86_400_000
const plural = (n: number, one: string) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : `${one}s`}`
const seen = (v: Visit) => v.status === 'visited' || v.status === 'completed'
const isRx = (r: Visit['records'][number]) => r.type === 'prescription'
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit' })

/**
 * Reports, after the DeskDocReports export: this month's consultations, new patients, prescriptions and no-shows
 * against the same days last month; consultations by month; the commonest complaints; new and returning patients;
 * and CSV downloads. Visits count on their slot's day.
 */
export function DoctorReports({ doctor, visits: all, now }: { doctor: { hospital: { name: string } | null }; visits: Visit[]; now: number }) {
  const today = istDateKey(now)
  const { month, last, lastSpan, inThis, inLastSoFar } = monthSoFar(today)

  const visits = all.filter((v) => v.status !== 'cancelled' && v.status !== 'pending_payment')
  const dayOf = (v: Visit) => (v.start ? istDateKey(v.start) : istDateKey(v.createdAt))
  const consults = visits.filter(seen)
  const thisMonth = consults.filter((v) => inThis(dayOf(v)))
  const lastSoFar = consults.filter((v) => inLastSoFar(dayOf(v)))
  const months = monthsEnding(month, 6)
  const perMonth = (list: Visit[]) => months.map((k) => list.filter((v) => dayOf(v).startsWith(k)).length)

  // New patients: their first visit with you
  const first = new Map<string, string>()
  for (const v of [...consults].sort((a, b) => dayOf(a).localeCompare(dayOf(b)))) if (v.patient && !first.has(v.patient.id)) first.set(v.patient.id, v.id)
  const isNew = (v: Visit) => !!v.patient && first.get(v.patient.id) === v.id
  const firsts = consults.filter(isNew)
  const newThis = thisMonth.filter(isNew).length
  const newLast = lastSoFar.filter(isNew).length

  // Prescriptions, on the day of the visit they were written for
  const rxCount = (list: Visit[]) => list.reduce((n, v) => n + v.records.filter(isRx).length, 0)
  const rxThis = rxCount(visits.filter((v) => inThis(dayOf(v))))
  const rxLast = rxCount(visits.filter((v) => inLastSoFar(dayOf(v))))

  const slotDay = (v: Visit) => (v.start ? istDateKey(v.end ?? v.start) : null)
  const noShowThis = noShowRate(visits.filter((v) => inThis(slotDay(v))), now)
  const noShowLast = noShowRate(visits.filter((v) => inLastSoFar(slotDay(v))), now)

  // Commonest complaints on the last 90 days' prescriptions
  const since = istDateKey(now - 90 * DAY)
  const rxNotes = visits.filter((v) => dayOf(v) >= since).flatMap((v) => v.records.filter(isRx).map((r) => r.notes))
  const reasons = topComplaints(rxNotes)
  const reasonMax = Math.max(1, ...reasons.map((r) => r.count))

  const returning = thisMonth.length - newThis
  const freeFollowUps = thisMonth.filter((v) => v.followUpOf).length
  const pct = (n: number) => (thisMonth.length ? ` · ${Math.round((n / thisMonth.length) * 100)}%` : '')

  // Downloads
  const consultRows = (list: Visit[]) => [
    ['Date', 'Time', 'Booking ID', 'Patient', 'Patient ID', 'Visit', 'Status', 'Prescription'],
    ...list.map((v) => [
      dayOf(v),
      v.start ? time(v.start) : '',
      bookingCode(v.id),
      v.patient?.name ?? 'Patient',
      v.patient ? patientCode(v.patient.id) : '',
      v.followUpOf ? 'Free follow-up' : v.fastTrack ? 'Fast track' : isNew(v) ? 'New patient' : 'Returning patient',
      visitStatus(v.status).label,
      v.records.some(isRx) ? 'Yes' : 'No',
    ]),
  ]
  const lastMonthVisits = consults.filter((v) => dayOf(v).startsWith(last))
  const files: ReportFile[] = [
    { title: 'Consultations', sub: `${monthName(last, 'year')} · CSV for Excel`, filename: `consultations-${last}.csv`, rows: consultRows(lastMonthVisits) },
    { title: 'Consultations this month', sub: `${monthName(month, 'year')} so far · CSV for Excel`, filename: `consultations-${month}.csv`, rows: consultRows(thisMonth) },
    {
      title: 'Prescriptions written',
      sub: `${monthName(last, 'year')} · CSV for Excel`,
      filename: `prescriptions-${last}.csv`,
      rows: [
        ['Date', 'Booking ID', 'Patient', 'Patient ID', 'Complaints'],
        ...visits
          .filter((v) => dayOf(v).startsWith(last))
          .flatMap((v) => v.records.filter(isRx).map((r) => [dayOf(v), bookingCode(v.id), v.patient?.name ?? 'Patient', v.patient ? patientCode(v.patient.id) : '', complaintsIn(r.notes).join(', ')])),
      ],
    },
  ]

  const vs = `vs ${lastSpan}`
  const subtitle = 'How your practice is doing on Consult your Doctor'
  const bars = perMonth(consults)

  const phoneStats = [
    { label: 'Consultations', value: count(thisMonth.length), note: `vs ${count(lastSoFar.length)} on ${lastSpan}` },
    { label: 'New patients', value: count(newThis), note: `vs ${count(newLast)} on ${lastSpan}` },
    { label: 'Prescriptions', value: count(rxThis), note: `vs ${count(rxLast)} on ${lastSpan}` },
    { label: 'No-show rate', value: noShowThis.rate == null ? '—' : `${noShowThis.rate.toFixed(1)}%`, note: plural(noShowThis.missed, 'missed visit') },
  ]

  return (
    <>
      <DocBackHeader backHref="/doctor/profile" backLabel="Back to profile" title="Reports">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle} · {monthName(month)} so far</p>
      </DocBackHeader>
      <DocBody>
        <DeskHead title="Reports" subtitle={subtitle} />

        <section className="grid grid-cols-2 gap-2.5 mb-3.5 lg:hidden">
          {phoneStats.map((s) => (
            <div key={s.label} className={`${card} px-3.5 py-3 min-w-0`}>
              <span className="block text-[12px] font-bold text-[#5B667A] truncate">{s.label}</span>
              <span className="block mt-0.5 text-[22px] font-extrabold tracking-[-0.02em] tabular-nums">{s.value}</span>
              <span className="block text-[11.5px] text-[#5B667A] truncate">{s.note}</span>
            </div>
          ))}
        </section>

        <section className="hidden lg:grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Consultations" value={count(thisMonth.length)} change={countDelta(thisMonth.length, lastSoFar.length)} note={vs} extra={<Sparkline values={bars} width={80} />} />
          <StatCard label="New patients" value={count(newThis)} change={countDelta(newThis, newLast)} note={vs} extra={<Sparkline values={perMonth(firsts)} width={80} />} />
          <StatCard label="Prescriptions" value={count(rxThis)} change={countDelta(rxThis, rxLast)} note={vs} extra={<Sparkline values={months.map((k) => rxCount(visits.filter((v) => dayOf(v).startsWith(k))))} width={80} />} />
          <StatCard
            label="No-show rate"
            value={noShowThis.rate == null ? '—' : `${noShowThis.rate.toFixed(1)}%`}
            change={pointsDelta(noShowThis.rate, noShowLast.rate, { unit: '%', higherIsGood: false })}
            note={noShowThis.rate == null ? 'No past slots this month' : vs}
          />
        </section>

        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-5 lg:items-start">
          <Panel>
            <PanelHead title="Consultations by month" sub={`Last 6 months${doctor.hospital ? ` · ${doctor.hospital.name}` : ''}`} />
            {bars.every((n) => n === 0) ? (
              <EmptyLine>No consultations in the last 6 months.</EmptyLine>
            ) : (
              <BarChart bars={months.map((k, i) => ({ label: monthName(k, 'short'), value: bars[i], active: k === month }))} label="Consultations each month, last 6 months" width={620} height={200} />
            )}
          </Panel>
          <Panel>
            <PanelHead title="Top reasons for visits" sub="Last 90 days · from the complaints on your prescriptions" />
            {reasons.length === 0 ? (
              <EmptyLine>No complaints written on prescriptions in the last 90 days.</EmptyLine>
            ) : (
              reasons.map((r) => (
                <div key={r.label} className="py-[9px] border-t border-[#EEF2F7]">
                  <div className="flex justify-between gap-3 mb-[7px] text-[13.5px]">
                    <span className="font-extrabold truncate">{r.label}</span>
                    <span className="font-bold text-[#5B667A] shrink-0 tabular-nums">{count(r.count)}</span>
                  </div>
                  <Meter pct={(r.count / reasonMax) * 100} label={`${r.label}: ${r.count}`} />
                </div>
              ))
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-3.5 mt-3.5 lg:grid lg:grid-cols-2 lg:gap-5 lg:mt-5 lg:items-start">
          <Panel>
            <PanelHead title="New and returning patients" sub={`${monthName(month)} so far · ${plural(thisMonth.length, 'consultation')}`} />
            <Row label="New patients">
              {count(newThis)}
              {pct(newThis)}
            </Row>
            <Row label="Returning patients">
              {count(returning)}
              {pct(returning)}
            </Row>
            <Row label="Free follow-ups within 12 days">{count(freeFollowUps)}</Row>
          </Panel>
          <ReportDownloads files={files} />
        </div>
      </DocBody>
    </>
  )
}
