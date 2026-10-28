import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Star } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { IST, ageFrom, doctorName, formatSlot, formatTime, istDateKey, visitToken } from '@/components/patient/format'
import { showHR, showSpO2 } from '@/lib/vitals'
import { loadDoctorInpatients } from '@/lib/beds'
import { loadDoctorReviews } from '@/lib/reviews'
import { isOpenVisit, latestVitals, loadPatientFacts, loadSlots, loadVisits, patientCode, requireDoctor, type PatientFacts, type RecordedVitals, type Visit } from '../_lib/doctor'
import { latestAllergy } from '../_lib/notes'
import { NextStepButton, PrescriptionButton, SIZE, WritePrescriptionButton, type PickVisit, type VisitRef } from '../_components/VisitControls'
import { WalkInButton } from '../_components/WalkInModal'
import { Inpatients } from '../_components/Inpatients'
import {
  BarChart, DeskHead, DocBody, DocHeader, Donut, EmptyLine, Initials, MoreLink, Panel, PanelHead, Readings, Row, StatCard, Status, Verified, btnOutline,
  btnPrimary, btnSmall, card, delta,
} from '../_components/doc-ui'

export const metadata: Metadata = { title: 'Dashboard | Doctor Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const PAID = ['confirmed', 'visited', 'completed']

const ref = (v: Visit): VisitRef => ({ id: v.id, status: v.status, patientName: v.patient?.name ?? 'Patient', phone: v.patient?.phone ?? null })
const noonOf = (key: string) => Date.parse(`${key}T12:00:00+05:30`)

/** "42 F" from the patient's own profile, or null. */
function ageSex(facts: PatientFacts | undefined, now: number) {
  const age = ageFrom(facts?.dateOfBirth, now)
  return [age != null ? String(age) : null, facts?.gender?.[0]?.toUpperCase()].filter(Boolean).join(' ') || null
}

function greeting(now: number) {
  const hour = Number(new Date(now).toLocaleString('en-US', { timeZone: IST, hour: 'numeric', hourCycle: 'h23' }))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export default async function DoctorDashboard() {
  const { admin, doctor } = await requireDoctor()
  const now = currentTime()
  const todayKey = istDateKey(now)
  const dayStart = Date.parse(`${todayKey}T00:00:00+05:30`)

  const [visits, slots, inpatients, reviews] = await Promise.all([
    loadVisits(admin, doctor.id),
    loadSlots(admin, doctor.id, new Date(dayStart).toISOString(), new Date(dayStart + 8 * DAY).toISOString()),
    loadDoctorInpatients(admin, doctor.id),
    loadDoctorReviews(admin, doctor.id, 1),
  ])

  const live = visits.filter((v) => v.status !== 'cancelled')
  const paid = live.filter((v) => PAID.includes(v.status))
  const onDay = (key: string, list: Visit[] = live) => list.filter((v) => v.start && istDateKey(v.start) === key)
  const todays = onDay(todayKey)
  const checkedIn = todays.filter((v) => v.status === 'visited')
  const vitals = latestVitals(visits)

  // Who to see next: someone already checked in, then the next booked slot, then the next day with bookings.
  const openToday = todays.filter(isOpenVisit)
  const next =
    openToday.find((v) => v.status === 'visited') ??
    openToday.find((v) => Date.parse(v.end ?? v.start!) > now - 15 * 60_000) ??
    openToday[0] ??
    live.find((v) => isOpenVisit(v) && v.start && Date.parse(v.start) > now) ??
    null
  const waiting = checkedIn.filter((v) => v.id !== next?.id)

  // The last seven days, oldest first, for the sparklines
  const last7 = Array.from({ length: 7 }, (_, i) => istDateKey(now - (6 - i) * DAY))
  const weekdayShort = new Date(now).toLocaleDateString('en-US', { timeZone: IST, weekday: 'short' })

  // Patients: everyone with a paid booking, dated by their first one
  const firstVisit = new Map<string, string>()
  for (const v of paid) if (v.patient && v.start && !firstVisit.has(v.patient.id)) firstVisit.set(v.patient.id, istDateKey(v.start))
  const firstDays = Array.from(firstVisit.values())
  const newThisWeek = firstDays.filter((k) => k >= last7[0] && k <= todayKey).length
  const newThisMonth = firstDays.filter((k) => k.slice(0, 7) === todayKey.slice(0, 7) && k <= todayKey).length

  // Consults: completed visits per month, the last seven months
  const monthKeys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${todayKey.slice(0, 7)}-15T12:00:00+05:30`)
    d.setUTCMonth(d.getUTCMonth() - (6 - i))
    return d.toISOString().slice(0, 7)
  })
  const completedIn = (month: string) => visits.filter((v) => v.status === 'completed' && v.start && istDateKey(v.start).slice(0, 7) === month).length
  const consultSeries = monthKeys.map(completedIn)
  const [lastMonth, thisMonth] = consultSeries.slice(-2)
  const lastMonthName = new Date(`${monthKeys[5]}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short' })

  // Slots: the next seven days
  const weekSlots = slots.filter((s) => Date.parse(s.start) > now && Date.parse(s.start) < now + 7 * DAY)
  const openWeek = weekSlots.filter((s) => !s.booked).length
  const bookedWeek = weekSlots.length - openWeek

  // This week, Monday first, for the bar chart
  const monday = istDateKey(noonOf(todayKey) - ((new Date(noonOf(todayKey)).getUTCDay() + 6) % 7) * DAY)
  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const key = istDateKey(noonOf(monday) + i * DAY)
    return { label: new Date(noonOf(key)).toLocaleDateString('en-US', { timeZone: IST, weekday: 'short' }), value: onDay(key, paid).length, active: key === todayKey }
  })

  const factIds = Array.from(new Set([next, ...todays].map((v) => v?.patient?.id).filter(Boolean) as string[]))
  const facts = await loadPatientFacts(admin, factIds)
  const priorVisits = (v: Visit) => paid.filter((p) => p.patient?.id === v.patient?.id && p.id !== v.id && (p.start ?? '') < (v.start ?? '')).length
  const visitKind = (v: Visit) => (priorVisits(v) ? 'Return visit' : 'First visit')

  // The Write Rx button opens on whoever is in front of the doctor: checked in, else up next today. Otherwise it offers
  // the paid visits of the last 30 days (none later than today): checked in first, then newest.
  const prescribeFor = checkedIn[0] ?? (next?.start && istDateKey(next.start) === todayKey ? next : null)
  const endOfToday = dayStart + DAY
  const recentVisits: PickVisit[] = paid
    .filter((v) => {
      const at = Date.parse(v.start ?? v.createdAt)
      return at < endOfToday && at >= endOfToday - 30 * DAY
    })
    .sort((a, b) => Number(b.status === 'visited') - Number(a.status === 'visited') || (b.start ?? b.createdAt).localeCompare(a.start ?? a.createdAt))
    .slice(0, 15)
    .map((v) => ({ ...ref(v), when: formatSlot(v.start ?? v.createdAt, now) }))

  const name = doctorName(doctor.name)
  const verified = doctor.registrationNumber ? <Verified /> : null
  const where = [doctor.specialty, doctor.hospital && [doctor.hospital.name, doctor.hospital.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
  const dateLine = (() => {
    const d = new Date(now)
    const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', { timeZone: IST, ...o })
    return `${part({ weekday: 'long' })}, ${part({ day: 'numeric' })} ${part({ month: 'long' })}`
  })()

  const writeRx = () => <WritePrescriptionButton current={prescribeFor ? ref(prescribeFor) : null} recent={recentVisits} kind="outline" />
  const newConsult = (className: string) => <WalkInButton label="New consult" icon={<Plus className="w-4 h-4" strokeWidth={2.6} />} className={className} />

  const glance = [
    { label: "Today's appointments", value: todays.length, note: `${checkedIn.length} checked in`, color: '#067647' },
    { label: 'My patients', value: firstVisit.size, note: newThisWeek ? `+${newThisWeek} new this week` : `${newThisMonth} new this month`, color: '#2A4DD0' },
    {
      label: 'Consults this month',
      value: thisMonth,
      note: `${thisMonth - lastMonth >= 0 ? '+' : ''}${thisMonth - lastMonth} vs last month`,
      color: thisMonth >= lastMonth ? '#067647' : '#B42318',
    },
    { label: 'Open slots, 7 days', value: openWeek, note: `of ${weekSlots.length} published`, color: '#5B667A' },
  ]

  return (
    <>
      <DocHeader doctor={{ name: doctor.name, image: doctor.image }} eyebrow={`${greeting(now)},`} title={name} titleExtra={verified} subtitle={where || undefined} />

      <DocBody>
        <DeskHead
          eyebrow={dateLine}
          title={`${greeting(now)}, ${name}`}
          titleExtra={verified}
          subtitle={
            todays.length
              ? `You have ${plural(todays.length, 'appointment')} today. ${checkedIn.length ? `${plural(checkedIn.length, 'patient')} ${checkedIn.length === 1 ? 'is' : 'are'} waiting.` : 'No one is waiting yet.'}`
              : 'No appointments today.'
          }
          actions={
            <>
              {writeRx()}
              {newConsult(btnPrimary)}
            </>
          }
        />

        {/* Phone: quick actions and today at a glance */}
        <div className="lg:hidden grid grid-cols-2 gap-2.5 mb-3.5">
          {newConsult(btnPrimary)}
          {writeRx()}
        </div>
        <section aria-label="Today at a glance" className={`lg:hidden ${card} grid grid-cols-2 overflow-hidden mb-3.5`}>
          {glance.map((s) => (
            <div key={s.label} className="px-4 py-3.5 shadow-[inset_-1px_-1px_0_#EEF2F7]">
              <span className="block text-[11.5px] font-bold text-[#5B667A]">{s.label}</span>
              <span className="block mt-1 text-[22px] font-extrabold tracking-[-0.02em] tabular-nums">{s.value}</span>
              <span className="block text-[12px] font-bold" style={{ color: s.color }}>
                {s.note}
              </span>
            </div>
          ))}
        </section>

        {/* Desktop: stat cards */}
        <section className="hidden lg:grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Today's appointments" value={todays.length} change={delta(todays.length, onDay(istDateKey(now - 7 * DAY)).length)} note={`vs last ${weekdayShort}`} series={last7.map((k) => onDay(k).length)} />
          <StatCard
            label="My patients"
            value={firstVisit.size}
            change={delta(newThisWeek, 0)}
            note="this week"
            series={last7.map((k) => firstDays.filter((d) => d <= k).length)}
          />
          <StatCard label="Consults this month" value={thisMonth} change={delta(thisMonth, lastMonth, { percent: true })} note={`vs ${lastMonthName}`} series={consultSeries} />
          <StatCard
            label="Avg. rating"
            value={reviews.summary.average != null ? reviews.summary.average.toFixed(1) : '—'}
            note={reviews.summary.count ? `from ${plural(reviews.summary.count, 'review')}` : 'No reviews yet'}
            extra={
              <span aria-hidden className="flex gap-0.5 pb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4" fill={(reviews.summary.average ?? 0) >= i - 0.25 ? '#E0A100' : '#EEF2F7'} stroke="none" />
                ))}
              </span>
            }
          />
        </section>

        {/* Phones stack the cards in the design's order (display: contents lets the two columns mix); desktops get
            the schedule and charts on the left and the patient-facing cards on the right. */}
        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5 lg:items-start">
          <div className="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0">
            <Panel className="order-3 lg:order-none" label="Today's schedule">
              <PanelHead
                title="Today's schedule"
                sub={todays.length ? `${doctor.hospital?.name ?? 'In-person'} · ${formatTime(todays[0].start!)} to ${formatTime(todays[todays.length - 1].end ?? todays[todays.length - 1].start!)}` : 'No appointments today'}
                right={<MoreLink href="/doctor/schedule">Full schedule</MoreLink>}
              />
              {todays.length === 0 ? (
                <EmptyLine>Bookings for today will show here. Your hospital publishes your slots.</EmptyLine>
              ) : (
                <>
                  {/* Phone list */}
                  <ul className="lg:hidden">
                    {todays.map((v) => (
                      <li key={v.id}>
                        <Link href={v.patient ? `/doctor/patients/${v.patient.id}` : '/doctor/schedule'} className="flex items-center gap-3 py-[11px] border-t border-[#EEF2F7]">
                          <span className="shrink-0 w-16 text-[13px] font-extrabold">{formatTime(v.start!)}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14px] font-extrabold truncate">{v.patient?.name ?? 'Patient'}</span>
                            <span className="block text-[12px] text-[#5B667A] truncate">{[ageSex(v.patient ? facts[v.patient.id] : undefined, now), visitKind(v)].filter(Boolean).join(' · ')}</span>
                          </span>
                          <Status status={v.status} dot={false} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {/* Desktop table */}
                  <div className="hidden lg:block" role="table" aria-label="Today's appointments">
                    <div role="row" className="grid grid-cols-[80px_minmax(0,1.3fr)_minmax(0,1fr)_130px_120px] gap-4 px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]">
                      <span role="columnheader">Time</span>
                      <span role="columnheader">Patient</span>
                      <span role="columnheader">Visit</span>
                      <span role="columnheader">Status</span>
                      <span role="columnheader" className="sr-only">Record</span>
                    </div>
                    {todays.map((v) => {
                      const line = [ageSex(v.patient ? facts[v.patient.id] : undefined, now), `Token ${visitToken(v.id)}`].filter(Boolean).join(' · ')
                      return (
                        <div key={v.id} role="row" className="grid grid-cols-[80px_minmax(0,1.3fr)_minmax(0,1fr)_130px_120px] gap-4 items-center py-[13px] border-b border-[#EEF2F7] text-[13.5px]">
                          <span role="cell" className="font-extrabold">{formatTime(v.start!)}</span>
                          <span role="cell" className="flex items-center gap-2.5 min-w-0">
                            <Initials name={v.patient?.name ?? null} className="w-[34px] h-[34px] text-[11.5px]" />
                            <span className="min-w-0">
                              <span className="block font-extrabold truncate">{v.patient?.name ?? 'Patient'}</span>
                              <span className="block text-[12px] text-[#5B667A] truncate">{line}</span>
                            </span>
                          </span>
                          <span role="cell" className="text-[#27324A] truncate">{visitKind(v)}</span>
                          <span role="cell"><Status status={v.status} /></span>
                          <span role="cell" className="flex justify-end">
                            {v.patient && (
                              <Link href={`/doctor/patients/${v.patient.id}`} className={btnSmall}>
                                Open record
                              </Link>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </Panel>

            <div className="hidden lg:grid grid-cols-[1.4fr_1fr] gap-5">
              <Panel>
                <PanelHead
                  title="Appointments this week"
                  sub={`${plural(thisMonth, 'consult')} completed this month · ${thisMonth - lastMonth >= 0 ? `${thisMonth - lastMonth} more` : `${lastMonth - thisMonth} fewer`} than ${lastMonthName}`}
                />
                <BarChart bars={weekBars} label={`Paid appointments each day this week: ${weekBars.map((b) => `${b.label} ${b.value}`).join(', ')}`} />
              </Panel>
              <Panel>
                <PanelHead title="Slot utilisation" sub="Next 7 days" />
                <div className="flex items-center gap-[18px]">
                  <Donut pct={weekSlots.length ? (bookedWeek / weekSlots.length) * 100 : 0} />
                  <div className="flex-1 min-w-0">
                    <Row label="Booked">{bookedWeek}</Row>
                    <Row label="Open">{openWeek}</Row>
                    <Row label="Published">{weekSlots.length}</Row>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          <aside className="contents lg:flex lg:flex-col lg:gap-4 lg:min-w-0">
            <UpNext
              className="order-1 lg:order-none"
              visit={next}
              facts={next?.patient ? facts[next.patient.id] : undefined}
              vitals={next?.patient ? vitals[next.patient.id] : undefined}
              allergy={next?.patient ? latestAllergy(visits.filter((v) => v.patient?.id === next.patient!.id).reverse().flatMap((v) => v.records.map((r) => r.notes))) : null}
              kind={next ? visitKind(next) : ''}
              now={now}
            />

            <Panel id="waiting-room" className="order-2 lg:order-none scroll-mt-24">
              <PanelHead
                title="Waiting room"
                sub={waiting.length ? `${waiting.length} waiting · checked in at the hospital` : 'Patients checked in at the hospital'}
                right={<span className="lg:hidden text-[12px] font-extrabold text-[#5B667A] whitespace-nowrap">{waiting.length} waiting</span>}
              />
              {waiting.length === 0 ? (
                <EmptyLine>No one else is checked in and waiting.</EmptyLine>
              ) : (
                <ul>
                  {waiting.map((v) => (
                    <li key={v.id} className="flex items-center gap-3 py-3 border-t border-[#EEF2F7]">
                      <Initials name={v.patient?.name ?? null} className="w-[38px] h-[38px] lg:w-9 lg:h-9 text-[12.5px] lg:text-[12px]" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-extrabold truncate">{v.patient?.name ?? 'Patient'}</span>
                        <span className="block text-[12px] text-[#5B667A] truncate">Token {visitToken(v.id)} · slot {formatTime(v.start!)}</span>
                      </span>
                      <PrescriptionButton visit={ref(v)} kind="blueOutline" label="Start consult" icon={false} size={SIZE.sm} />
                    </li>
                  ))}
                </ul>
              )}
              <WalkInButton label="Add walk-in patient" icon={<Plus className="w-[15px] h-[15px]" strokeWidth={2.4} />} className={`${btnOutline} lg:border w-full mt-1`} />
            </Panel>

            <Inpatients admissions={inpatients} now={now} className="order-4 lg:order-none" />
          </aside>
        </div>
      </DocBody>
    </>
  )
}

/** The patient to see next: the blue band on desktops, a white card on phones; their readings and the next step. */
function UpNext({
  visit,
  facts,
  vitals,
  allergy,
  kind,
  now,
  className,
}: {
  visit: Visit | null
  facts: PatientFacts | undefined
  vitals: RecordedVitals | undefined
  allergy: string | null
  kind: string
  now: number
  className: string
}) {
  if (!visit?.patient) {
    return (
      <Panel className={className}>
        <PanelHead title="Up next" sub="No more visits booked" />
        <EmptyLine>New bookings will show here.</EmptyLine>
      </Panel>
    )
  }
  const patient = visit.patient
  const token = visitToken(visit.id)
  const when = visit.start ? (istDateKey(visit.start) === istDateKey(now) ? formatTime(visit.start) : formatSlot(visit.start, now)) : 'Time not set'
  const as = ageSex(facts, now)
  const readings = vitals
    ? [
        { k: 'BP', v: vitals.bp },
        { k: 'SpO₂', v: vitals.spo2 ? showSpO2(vitals.spo2) : null },
        { k: 'Pulse', v: vitals.hr ? showHR(vitals.hr) : null },
      ]
    : [
        { k: 'Blood group', v: facts?.bloodGroup ?? null },
        { k: 'Age', v: ageFrom(facts?.dateOfBirth, now)?.toString() ?? null },
        { k: 'Sex', v: facts?.gender ?? null },
      ]

  return (
    <section aria-label="Up next" className={`${card} p-4 lg:p-0 lg:overflow-hidden ${className}`}>
      {/* Phone header */}
      <div className="lg:hidden">
        <div className="flex items-start justify-between gap-2.5">
          <span>
            <h2 className="text-[16px] font-extrabold">Up next</h2>
            <span className="block mt-0.5 text-[12.5px] text-[#5B667A]">
              Token {token} · {when}
            </span>
          </span>
          <Status status={visit.status} dot={false} />
        </div>
        <div className="flex items-center gap-3 mt-3.5">
          <Initials name={patient.name} className="w-[46px] h-[46px] text-[15px]" />
          <span className="flex-1 min-w-0">
            <span className="block text-[16px] font-extrabold truncate">{patient.name}</span>
            <span className="block text-[12.5px] text-[#5B667A] truncate">{[as, patientCode(patient.id), kind].filter(Boolean).join(' · ')}</span>
          </span>
        </div>
      </div>
      {/* Desktop band */}
      <div className="hidden lg:flex items-center justify-between gap-3 px-5 py-4 bg-[#2A4DD0] text-white">
        <span className="min-w-0">
          <span className="block text-[11.5px] font-extrabold tracking-[0.08em] text-[#CFDCFF]">UP NEXT · TOKEN {token}</span>
          <span className="block text-[18px] font-extrabold truncate">{patient.name}</span>
          <span className="block text-[12.5px] text-[#E3EAFF] truncate">{[as, kind, when].filter(Boolean).join(' · ')}</span>
        </span>
        <Initials name={patient.name} className="w-11 h-11 text-[14px]" />
      </div>

      <div className="lg:px-5 lg:pt-3.5 lg:pb-[18px]">
        <Readings items={readings} className="mt-3 lg:mt-0 border-y border-[#EEF2F7] lg:border-y-0" />
        <Row label="Allergy" className="hidden lg:flex">
          {allergy ? <span className="text-[#B42318]">{allergy}</span> : <span className="text-[#98A2B3]">None recorded</span>}
        </Row>
        {allergy && (
          <p className="lg:hidden mt-2.5 text-[12.5px] font-bold">
            <span className="text-[#5B667A]">Allergy </span>
            <span className="text-[#B42318]">{allergy}</span>
          </p>
        )}
        <div className="grid grid-cols-[1fr_1.3fr] gap-2 mt-3">
          <Link href={`/doctor/patients/${patient.id}`} className={`${btnOutline} lg:border`}>
            <span className="lg:hidden">View record</span>
            <span className="hidden lg:inline">Record</span>
          </Link>
          {visit.status === 'confirmed' || visit.status === 'visited' ? (
            <NextStepButton visit={ref(visit)} />
          ) : (
            <span className="flex items-center justify-center text-center text-[12px] font-bold text-[#B54708]">Awaiting payment</span>
          )}
        </div>
      </div>
    </section>
  )
}
