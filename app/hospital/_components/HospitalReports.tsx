import { doctorName, istDateKey } from '@/components/patient/format'
import { RangeMenu } from '@/components/portal/RangeMenu'
import { ReportDownloads, type ReportFile } from '@/components/portal/ReportDownloads'
import { count, countDelta, monthName, monthSoFar, monthsEnding, noShowRate, pointsDelta } from '@/lib/report-stats'
import { summarize, type Review } from '@/lib/reviews'
import type { HospitalDoctor, HospitalVisit } from '../_lib/hospital'
import { BarChart, DeskHead, EmptyLine, HosBackHeader, HosBody, Meter, Panel, PanelHead, PhoneStats, Sparkline, StatCard, plural, visitStatus } from './hos-ui'

const DAY = 86_400_000
export const RANGES = [3, 6, 12] as const

type Source = 'online' | 'desk' | 'fast' | 'followup'
const SOURCE_LABEL: Record<Source, string> = {
  online: 'Booked online in the app',
  desk: 'Walk-ins at the desk',
  fast: 'Fast track',
  followup: 'Free follow-ups',
}

/**
 * Where a booking came from: the front desk (an executive booked it, or no booking fee was paid online), a free
 * follow-up, a fast-track booking or a general booking made in the app.
 */
function sourceOf(v: HospitalVisit): Source {
  if (v.executiveId) return 'desk'
  if (v.followUpOf) return 'followup'
  if (!v.bookedOnline) return 'desk'
  return v.fastTrack ? 'fast' : 'online'
}

/**
 * Reports, after the DeskHosReports export: this month's bookings, new patients, no-shows and rating against the same
 * days last month; bookings by month; where bookings come from; each doctor's last 90 days; and CSV downloads.
 * A booking counts once it's confirmed (paid or booked at the desk), on the day it was made.
 */
export function HospitalReports({ hospital, doctors, visits, reviews, now, range }: { hospital: { name: string }; doctors: HospitalDoctor[]; visits: HospitalVisit[]; reviews: Review[]; now: number; range: number }) {
  const today = istDateKey(now)
  const { month, last, lastSpan, inThis, inLastSoFar } = monthSoFar(today)
  const doctorById = new Map(doctors.map((d) => [d.id, d]))

  const booked = visits.filter((v) => v.status !== 'pending_payment')
  const madeOn = (v: HospitalVisit) => istDateKey(v.createdAt)
  const slotDay = (v: HospitalVisit) => (v.start ? istDateKey(v.end ?? v.start) : null)

  // Bookings, by the day they were made
  const thisMonth = booked.filter((v) => inThis(madeOn(v)))
  const lastSoFar = booked.filter((v) => inLastSoFar(madeOn(v)))
  const chartMonths = monthsEnding(month, range)
  const sparkMonths = monthsEnding(month, 6)
  const perMonth = (keys: string[], list: HospitalVisit[]) => keys.map((k) => list.filter((v) => madeOn(v).startsWith(k)).length)

  // New patients: a first booking at this hospital
  const firstBooking = new Map<string, string>()
  for (const v of [...booked].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (v.patient && !firstBooking.has(v.patient.id)) firstBooking.set(v.patient.id, v.id)
  }
  const firsts = booked.filter((v) => v.patient && firstBooking.get(v.patient.id) === v.id)
  const newThis = firsts.filter((v) => inThis(madeOn(v))).length
  const newLast = firsts.filter((v) => inLastSoFar(madeOn(v))).length

  // No-shows: bookings whose slot ended without a check-in, by the slot's day
  const noShowThis = noShowRate(booked.filter((v) => inThis(slotDay(v))), now)
  const noShowLast = noShowRate(booked.filter((v) => inLastSoFar(slotDay(v))), now)
  const noShowSeries = sparkMonths.map((k) => noShowRate(booked.filter((v) => slotDay(v)?.startsWith(k)), now).rate ?? 0)

  // Rating: every review of the hospital and its doctors, against the rating before this month
  const rating = summarize(reviews.map((r) => r.rating))
  const ratingBefore = summarize(reviews.filter((r) => istDateKey(r.createdAt) < `${month}-01`).map((r) => r.rating))

  // Where this month's bookings come from
  const sources = (['online', 'desk', 'fast', 'followup'] as Source[])
    .map((s) => ({ key: s, label: SOURCE_LABEL[s], value: thisMonth.filter((v) => sourceOf(v) === s).length }))
    .filter((s) => s.value || s.key !== 'followup')

  // Each doctor's last 90 days
  const since = istDateKey(now - 90 * DAY)
  const recent = booked.filter((v) => madeOn(v) >= since)
  const doctorRows = doctors
    .map((d) => {
      const own = recent.filter((v) => v.doctorId === d.id)
      const shows = noShowRate(own, now)
      const r = summarize(reviews.filter((x) => x.kind === 'doctor' && x.doctor?.id === d.id).map((x) => x.rating))
      return { id: d.id, name: doctorName(d.name), department: d.department, bookings: own.length, noShow: shows.rate, rating: r.average, reviews: r.count }
    })
    .filter((d) => d.bookings > 0)
    .sort((a, b) => b.bookings - a.bookings || a.name.localeCompare(b.name))

  // Downloads
  const bookingRows = (list: HospitalVisit[]) => [
    ['Booked on', 'Booking ID', 'Patient', 'Doctor', 'Department', 'Visit date', 'Source', 'Status'],
    ...[...list]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((v) => {
        const doc = v.doctorId ? doctorById.get(v.doctorId) : undefined
        return [madeOn(v), v.code, v.patient?.name ?? 'Patient', doc ? doctorName(doc.name) : '', doc?.department ?? '', v.start ? istDateKey(v.start) : '', SOURCE_LABEL[sourceOf(v)], visitStatus(v.status).label]
      }),
  ]
  const files: ReportFile[] = [
    { title: 'Monthly bookings', sub: `${monthName(last, 'year')} · CSV for Excel`, filename: `bookings-${last}.csv`, rows: bookingRows(booked.filter((v) => madeOn(v).startsWith(last))) },
    { title: 'Bookings this month', sub: `${monthName(month, 'year')} so far · CSV for Excel`, filename: `bookings-${month}.csv`, rows: bookingRows(thisMonth) },
    {
      title: 'Doctor performance',
      sub: 'Last 90 days · CSV for Excel',
      filename: `doctor-performance-${today}.csv`,
      rows: [
        ['Doctor', 'Department', 'Bookings', 'No-show rate (%)', 'Rating', 'Reviews'],
        ...doctorRows.map((d) => [d.name, d.department, d.bookings, d.noShow == null ? '' : d.noShow.toFixed(1), d.rating ?? '', d.reviews]),
      ],
    },
    { title: 'Payments ledger', sub: 'Consultation fees by day · on Finance', href: '/hospital/revenue', action: 'Open' },
  ]

  const vs = `vs ${lastSpan}`
  const subtitle = `How ${hospital.name} is doing on Consult your Doctor`
  const rangeMenu = (
    <RangeMenu label={`Last ${range} months`} options={RANGES.map((r) => ({ href: r === 6 ? '/hospital/reports' : `/hospital/reports?months=${r}`, label: `Last ${r} months`, active: r === range }))} />
  )
  const totalThis = thisMonth.length
  const chartCounts = perMonth(chartMonths, booked)

  const chart = (
    <Panel>
      <PanelHead title="Bookings by month" sub={`Last ${range} months · by the day the booking was made`} right={<span className="lg:hidden">{rangeMenu}</span>} />
      {chartCounts.every((n) => n === 0) ? (
        <EmptyLine>No bookings in the last {range} months.</EmptyLine>
      ) : (
        <BarChart bars={chartMonths.map((k, i) => ({ label: monthName(k, 'short'), value: chartCounts[i], active: k === month }))} label={`Bookings each month, last ${range} months`} width={620} height={200} />
      )}
    </Panel>
  )

  const sourcesPanel = (
    <Panel>
      <PanelHead title="Where bookings come from" sub={`${monthName(month)} so far · ${plural(totalThis, 'booking')}`} />
      {totalThis === 0 ? (
        <EmptyLine>No bookings this month yet.</EmptyLine>
      ) : (
        sources.map((s) => {
          const pct = Math.round((s.value / totalThis) * 100)
          return (
            <div key={s.key} className="py-[9px] border-t border-[#EEF2F7]">
              <div className="flex justify-between gap-3 mb-[7px] text-[13.5px]">
                <span className="font-extrabold truncate">{s.label}</span>
                <span className="font-bold text-[#5B667A] shrink-0">
                  {count(s.value)} · {pct}%
                </span>
              </div>
              <Meter pct={pct} label={`${s.label}: ${pct}%`} />
            </div>
          )
        })
      )}
    </Panel>
  )

  const topDoctors = (
    <Panel>
      <PanelHead title="Top doctors" sub="Last 90 days" />
      {doctorRows.length === 0 ? (
        <EmptyLine>No bookings in the last 90 days.</EmptyLine>
      ) : (
        <>
          <div className="hidden lg:grid grid-cols-[minmax(0,1.6fr)_110px_110px_120px] gap-4 px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">
            <span>Doctor</span>
            <span>Bookings</span>
            <span>No-shows</span>
            <span>Rating</span>
          </div>
          <ul>
            {doctorRows.slice(0, 8).map((d) => (
              <li key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.6fr)_110px_110px_120px] gap-x-4 gap-y-0.5 items-center py-[13px] border-t lg:border-t-0 lg:border-b border-[#EEF2F7] text-[13.5px]">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span aria-hidden className="w-8 h-8 shrink-0 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[11px] font-extrabold">
                    {d.name.replace(/^Dr\.?\s+/i, '').split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-extrabold truncate">{d.name}</span>
                    <span className="block lg:hidden text-[12px] text-[#5B667A] truncate">
                      {d.noShow == null ? 'No past slots yet' : `${Math.round(d.noShow)}% no-shows`}
                      {d.rating != null && ` · ${d.rating.toFixed(1)} ★`}
                    </span>
                  </span>
                </span>
                <span className="font-extrabold lg:font-normal tabular-nums text-right lg:text-left">
                  {count(d.bookings)}
                  <span className="lg:hidden text-[12px] font-bold text-[#5B667A]"> bookings</span>
                </span>
                <span className="hidden lg:block tabular-nums">{d.noShow == null ? '—' : `${Math.round(d.noShow)}%`}</span>
                <span className="hidden lg:block">
                  {d.rating != null ? (
                    <>
                      {d.rating.toFixed(1)} <span className="text-[#E8A317]">★</span>
                    </>
                  ) : (
                    <span className="text-[#98A2B3]">No reviews</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  )

  return (
    <>
      <HosBackHeader backHref="/hospital/more" backLabel="Back to more" title="Reports">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle}</p>
      </HosBackHeader>
      <HosBody>
        <DeskHead title="Reports" subtitle={subtitle} actions={rangeMenu} />

        <PhoneStats
          className="mb-3.5"
          stats={[
            { label: 'Bookings this month', value: count(totalThis), note: `vs ${count(lastSoFar.length)} on ${lastSpan}` },
            { label: 'New patients', value: count(newThis), note: `vs ${count(newLast)} on ${lastSpan}`, color: '#2A4DD0' },
            { label: 'No-show rate', value: noShowThis.rate == null ? '—' : `${noShowThis.rate.toFixed(1)}%`, note: `${plural(noShowThis.missed, 'missed visit')} this month`, color: '#B54708' },
            { label: 'Average rating', value: rating.average != null ? rating.average.toFixed(1) : '—', note: plural(rating.count, 'review') },
          ]}
        />

        <section className="hidden lg:grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Bookings this month" value={count(totalThis)} change={countDelta(totalThis, lastSoFar.length)} note={vs} extra={<Sparkline values={perMonth(sparkMonths, booked)} width={80} />} />
          <StatCard label="New patients" value={count(newThis)} change={countDelta(newThis, newLast)} note={vs} extra={<Sparkline values={perMonth(sparkMonths, firsts)} width={80} />} />
          <StatCard
            label="No-show rate"
            value={noShowThis.rate == null ? '—' : `${noShowThis.rate.toFixed(1)}%`}
            change={pointsDelta(noShowThis.rate, noShowLast.rate, { unit: '%', higherIsGood: false })}
            note={noShowThis.rate == null ? 'No past slots this month' : vs}
            extra={<Sparkline values={noShowSeries} width={80} />}
          />
          <StatCard
            label="Average rating"
            value={rating.average != null ? rating.average.toFixed(1) : '—'}
            change={pointsDelta(rating.average, ratingBefore.average)}
            note={rating.count ? `since 1 ${monthName(month, 'short')} · ${plural(rating.count, 'review')}` : 'No reviews yet'}
          />
        </section>

        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-5 lg:items-start">
          {chart}
          {sourcesPanel}
        </div>
        <div className="flex flex-col gap-3.5 mt-3.5 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-5 lg:mt-5 lg:items-start">
          {topDoctors}
          <ReportDownloads files={files} />
        </div>
      </HosBody>
    </>
  )
}
