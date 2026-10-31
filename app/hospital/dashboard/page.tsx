import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, Plus } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { IST, doctorName, formatINR, formatTime, istDateKey, visitToken } from '@/components/patient/format'
import { LiveRefresh } from '@/components/portal/LiveRefresh'
import { loadHospitalBeds, summarizeBeds, wardSummaries } from '@/lib/beds'
import {
  dayOf, dayStartIso, hospitalShare, isPaidVisit, istHour, paymentLook, loadHospitalDoctors, loadHospitalSlots, loadHospitalVisits, requireHospital, sessionLabel, shiftDay,
  type HospitalVisit,
} from '../_lib/hospital'
import { AddDoctorButton } from '../_components/DoctorDialogs'
import {
  BarChart, DeskHead, Donut, EmptyLine, HosBody, HosHeader, Initials, Meter, MoreLink, Panel, PanelHead, PhoneStats, Row, StatCard, Status, Verified, btnOutline,
  btnPrimary, delta, plural,
} from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Dashboard | Hospital Portal' }
export const dynamic = 'force-dynamic'

const LATE_MS = 15 * 60_000

type Attention = { id: string; title: string; tag: string; color: string; sub: string; cta: string; href: string }

export default async function HospitalDashboardPage() {
  const { admin, hospital, staff } = await requireHospital()
  const now = currentTime()
  const today = istDateKey(now)
  const lastWeek = shiftDay(today, -7)

  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const ids = doctors.map((d) => d.id)
  const [visits, slots, beds] = await Promise.all([
    loadHospitalVisits(admin, hospital.id, ids),
    loadHospitalSlots(admin, ids, dayStartIso(lastWeek), dayStartIso(shiftDay(today, 8))),
    loadHospitalBeds(admin, hospital.id),
  ])
  const bedSummary = summarizeBeds(beds.data)
  const wards = wardSummaries(beds.data)
  const doctorById = new Map(doctors.map((d) => [d.id, d]))
  const departments = Array.from(new Set(doctors.map((d) => d.department))).sort()
  const live = hospital.status === 'active'

  // Today's patients: every booking on today's slots; the paid ones are the ones coming in.
  const todays = visits.filter((v) => dayOf(v.start) === today)
  const paidOn = (key: string) => visits.filter((v) => isPaidVisit(v) && dayOf(v.start) === key).length
  const paidToday = todays.filter(isPaidVisit)
  const isLate = (v: HospitalVisit) => v.status === 'confirmed' && !!v.start && Date.parse(v.start) < now - LATE_MS
  const late = paidToday.filter(isLate)
  const checkedIn = paidToday.filter((v) => v.status === 'visited').length
  const unpaidToday = todays.filter((v) => v.status === 'pending_payment' && v.start && Date.parse(v.start) > now)

  // Slots: how full each day is, for today's number and the week's line.
  const slotsOn = (key: string) => slots.filter((s) => dayOf(s.start) === key)
  const occupancyOn = (key: string) => {
    const list = slotsOn(key)
    return list.length ? Math.round((list.filter((s) => s.booked).length / list.length) * 100) : 0
  }
  const todaySlots = slotsOn(today)
  const bookedSlots = todaySlots.filter((s) => s.booked).length
  const slotPct = occupancyOn(today)

  // Money the hospital takes: what its counter has collected. A booking paid online counts once the counter takes its fee.
  const shareOf = (v: HospitalVisit) => (v.payment ? hospitalShare(v.payment) ?? 0 : 0)
  const paidDay = (v: HospitalVisit) => dayOf(v.payment?.createdAt ?? v.createdAt)
  const revenueOn = (key: string) => visits.reduce((sum, v) => (v.payment && paidDay(v) === key ? sum + shareOf(v) : sum), 0)
  const revenueMonth = visits.reduce((sum, v) => (v.payment && paidDay(v)?.startsWith(today.slice(0, 7)) ? sum + shareOf(v) : sum), 0)
  const revenueToday = revenueOn(today)

  const last7 = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6))
  const weekday = new Date(now).toLocaleDateString('en-US', { timeZone: IST, weekday: 'short' })
  const ptsChange = (() => {
    const d = delta(slotPct, occupancyOn(lastWeek))
    return { ...d, text: `${d.text.replace(/^\+/, '')}%` }
  })()

  // Doctors with slots today, earliest first.
  const onDuty = doctors
    .map((d) => ({ doctor: d, mine: todaySlots.filter((s) => s.doctorId === d.id) }))
    .filter((x) => x.mine.length > 0)
    .sort((a, b) => a.mine[0].start.localeCompare(b.mine[0].start))
  const weekDoctors = new Set(slots.filter((s) => Date.parse(s.start) > now && Date.parse(s.start) < now + 7 * 86_400_000).map((s) => s.doctorId))
  const unscheduled = doctors.filter((d) => !weekDoctors.has(d.id))

  // Appointments by hour: today's bookings in each clinic hour.
  const hours = [...todaySlots.map((s) => istHour(s.start)), ...todays.filter((v) => v.start).map((v) => istHour(v.start!))]
  const firstHour = hours.length ? Math.min(...hours) : 9
  const lastHour = hours.length ? Math.max(...hours) : 18
  const nowHour = istHour(new Date(now).toISOString())
  const hourBars = Array.from({ length: Math.max(1, lastHour - firstHour + 1) }, (_, i) => {
    const h = firstHour + i
    return { label: String(h % 12 || 12), value: todays.filter((v) => v.start && istHour(v.start) === h).length, active: h === nowHour }
  })

  const deptLoad = departments.map((dept) => {
    const list = todaySlots.filter((s) => doctorById.get(s.doctorId)?.department === dept)
    return { dept, booked: list.filter((s) => s.booked).length, total: list.length }
  })

  const cleaning = beds.data.filter((b) => !b.admission && b.status === 'cleaning')
  const attention: Attention[] = []
  if (unscheduled[0]) {
    attention.push({
      id: 'slots',
      title: `${doctorName(unscheduled[0].name)} has no slots${unscheduled.length > 1 ? ` (+${unscheduled.length - 1} more)` : ''}`,
      tag: 'Roster',
      color: '#B42318',
      sub: `Nothing published for the next 7 days, so patients can’t book. ${unscheduled[0].department}.`,
      cta: 'Publish slots',
      href: `/hospital/doctors/${unscheduled[0].id}/schedule`,
    })
  }
  if (late[0]) {
    attention.push({
      id: 'late',
      title: `${plural(late.length, 'patient')} not checked in`,
      tag: 'Queue',
      color: '#B42318',
      sub: `${late[0].patient?.name ?? 'A patient'} was due at ${formatTime(late[0].start!)}${late.length > 1 ? ` and ${late.length - 1} more are late` : ''}.`,
      cta: 'Open today’s list',
      href: '/hospital/patients?view=today',
    })
  }
  if (unpaidToday[0]) {
    attention.push({
      id: 'unpaid',
      title: `${plural(unpaidToday.length, 'unpaid booking')} today`,
      tag: 'Payments',
      color: '#B54708',
      sub: `Slots are held until the patient pays. Next: ${unpaidToday[0].patient?.name ?? 'Patient'} at ${formatTime(unpaidToday[0].start!)}.`,
      cta: 'View bookings',
      href: '/hospital/patients?view=unpaid',
    })
  }
  if (cleaning[0]) {
    attention.push({
      id: 'beds',
      title: `${cleaning[0].ward}, ${cleaning[0].label} needs cleaning${cleaning.length > 1 ? ` (+${cleaning.length - 1} more)` : ''}`,
      tag: 'Beds',
      color: '#B54708',
      sub: 'Mark it ready once housekeeping is done.',
      cta: 'View beds',
      href: '/hospital/beds',
    })
  }
  const attentionCount = attention.length ? `${plural(attention.length, 'item needs', 'items need')} action` : 'Nothing pending'

  const team = [plural(doctors.length, 'doctor'), plural(departments.length, 'department')]
  const dateLabel = new Date(now).toLocaleDateString('en-GB', { timeZone: IST, weekday: 'long', day: 'numeric', month: 'long' })
  const statusOf = (v: HospitalVisit) => (isLate(v) ? { label: 'Not checked in', color: '#B42318' } : null)

  return (
    <>
      <HosHeader
        staff={staff}
        eyebrow={`Hospital admin · ${live ? 'Live for booking' : 'Not listed yet'}`}
        title={hospital.name}
        titleExtra={live ? <Verified /> : undefined}
        subtitle={[...team, hospital.city].filter(Boolean).join(' · ')}
      />
      <HosBody>
        <DeskHead
          title={hospital.name}
          titleExtra={live ? <Verified /> : undefined}
          subtitle={
            <span className="flex flex-wrap items-center gap-x-1.5">
              <span className="font-bold">{dateLabel}</span>
              <span>·</span>
              <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-extrabold ${live ? 'text-[#067647]' : 'text-[#B54708]'}`}>
                <span className={`w-[7px] h-[7px] rounded-full ${live ? 'bg-[#067647]' : 'bg-[#B54708]'}`} />
                {live ? 'Live' : 'Not listed'}
              </span>
              <span>·</span>
              <span>{[...team, bedSummary.total ? plural(bedSummary.total, 'bed') : null, hospital.city].filter(Boolean).join(' · ')}</span>
              <LiveRefresh />
            </span>
          }
          actions={
            <>
              <Link href="/hospital/doctors" className={btnOutline}>
                <CalendarDays className="w-4 h-4" /> Duty roster
              </Link>
              <Link href="/hospital/patients?walkin=1" className={btnOutline}>
                <Plus className="w-4 h-4" strokeWidth={2.4} /> Walk-in patient
              </Link>
              <AddDoctorButton departments={departments} label="Add doctor" className={btnPrimary} />
            </>
          }
        />

        <div className="lg:hidden grid grid-cols-2 gap-2.5 mb-3.5">
          <Link href="/hospital/doctors" className={`${btnOutline} !h-[46px]`}>
            <CalendarDays className="w-4 h-4" /> Duty roster
          </Link>
          <AddDoctorButton departments={departments} label="Add doctor" className={`${btnPrimary} !h-[46px] !shadow-none`} />
        </div>

        <PhoneStats
          className="mb-3.5"
          stats={[
            { label: 'Slot occupancy', value: `${bookedSlots} / ${todaySlots.length}`, note: `${slotPct}% booked today`, color: '#2A4DD0' },
            { label: 'Today’s patients', value: paidToday.length, note: `${checkedIn} checked in`, color: '#067647' },
            { label: 'Collected today', value: formatINR(revenueToday), note: `${formatINR(revenueMonth)} this month` },
            { label: 'Beds occupied', value: bedSummary.total ? `${bedSummary.occupied} / ${bedSummary.total}` : '—', note: bedSummary.total ? `${bedSummary.available} available` : 'No beds set up' },
          ]}
        />

        <section className="hidden lg:grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Today’s patients" value={paidToday.length} change={delta(paidToday.length, paidOn(lastWeek))} note={`vs last ${weekday}`} series={last7.map(paidOn)} />
          <StatCard label="Slot occupancy" value={`${slotPct}%`} change={ptsChange} note={`${bookedSlots} of ${todaySlots.length} slots booked`} series={last7.map(occupancyOn)} />
          <StatCard label="Collected today" value={formatINR(revenueToday)} change={delta(revenueToday, revenueOn(lastWeek), { percent: true })} note={`vs last ${weekday}`} series={last7.map(revenueOn)} />
          <StatCard
            label="Beds occupied"
            value={bedSummary.total ? `${bedSummary.occupied} / ${bedSummary.total}` : '—'}
            note={bedSummary.total ? `${bedSummary.available} free · ${bedSummary.occupancy}% full` : 'No beds set up yet'}
          />
        </section>

        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5 lg:items-start">
          <div className="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0">
            <div className="hidden lg:grid grid-cols-[1.5fr_1fr] gap-5">
              <Panel>
                <PanelHead title="Appointments by hour" sub="Today · all doctors" />
                {todays.length === 0 ? <EmptyLine>No bookings for today yet.</EmptyLine> : <BarChart bars={hourBars} label="Today’s appointments by hour" width={560} height={200} />}
              </Panel>
              <Panel>
                <PanelHead title="Department load" sub="Slots booked today" />
                {deptLoad.length === 0 ? (
                  <EmptyLine>Add doctors to see each department.</EmptyLine>
                ) : (
                  <ul>
                    {deptLoad.map((d) => (
                      <li key={d.dept} className="py-[9px]">
                        <div className="flex justify-between gap-2 mb-1.5 text-[13px]">
                          <span className="font-extrabold truncate">{d.dept}</span>
                          <span className="font-bold text-[#5B667A] shrink-0">
                            {d.booked} / {d.total}
                          </span>
                        </div>
                        <Meter pct={d.total ? (d.booked / d.total) * 100 : 0} label={`${d.dept}: ${d.booked} of ${d.total} slots booked`} />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel className="order-1 lg:hidden">
              <AttentionList items={attention} count={attentionCount} />
            </Panel>

            <Panel className="order-2 lg:order-none" label="Today’s patient queue">
              <PanelHead title="Today’s patient queue" sub="Across all doctors, in slot order" right={<MoreLink href="/hospital/patients?view=today">All patients</MoreLink>} />
              {todays.length === 0 ? (
                <EmptyLine>No appointments today. Bookings show here as soon as patients book.</EmptyLine>
              ) : (
                <>
                  <ul className="lg:hidden">
                    {todays.slice(0, 6).map((v) => {
                      const doc = v.doctorId ? doctorById.get(v.doctorId) : undefined
                      const late = statusOf(v)
                      return (
                        <li key={v.id} className="flex items-center gap-3 py-[11px] border-t border-[#EEF2F7]">
                          <span className="shrink-0 w-[66px] text-[12.5px] font-extrabold">{v.start ? formatTime(v.start) : '—'}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14px] font-extrabold truncate">{v.patient?.name ?? 'Patient'}</span>
                            <span className="block text-[12px] text-[#5B667A] truncate">
                              {v.fastTrack && <span className="font-extrabold text-[#B93815]">Fast track · </span>}
                              {[doc ? doctorName(doc.name) : null, `Token ${visitToken(v.id)}`].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          {late ? <Status label={late.label} color={late.color} dot={false} /> : <Status status={v.status} dot={false} />}
                        </li>
                      )
                    })}
                  </ul>
                  <div className="hidden lg:block" role="table" aria-label="Today’s patient queue">
                    <div role="row" className={`${queueGrid} px-3.5 py-2.5 -mx-3.5 rounded-[10px] bg-[#F7F9FC] text-[11.5px] font-extrabold tracking-[0.04em] uppercase text-[#5B667A]`}>
                      {['Time', 'Patient', 'Doctor', 'Status', 'Payment'].map((h) => (
                        <span key={h} role="columnheader">
                          {h}
                        </span>
                      ))}
                    </div>
                    {todays.slice(0, 10).map((v) => {
                      const doc = v.doctorId ? doctorById.get(v.doctorId) : undefined
                      const late = statusOf(v)
                      const pay = paymentLook(v, shareOf(v))
                      return (
                        <div key={v.id} role="row" className={`${queueGrid} items-center py-[13px] border-b border-[#EEF2F7] text-[13.5px]`}>
                          <span role="cell" className="font-extrabold">{v.start ? formatTime(v.start) : '—'}</span>
                          <span role="cell" className="flex items-center gap-2.5 min-w-0">
                            <Initials name={v.patient?.name ?? null} className="w-8 h-8 text-[11px]" />
                            <span className="min-w-0">
                              <span className="block font-extrabold truncate">{v.patient?.name ?? 'Patient'}</span>
                              <span className="block text-[12px] text-[#5B667A] truncate">
                                Token {visitToken(v.id)}
                                {v.fastTrack && <span className="font-extrabold text-[#B93815]"> · Fast track</span>}
                              </span>
                            </span>
                          </span>
                          <span role="cell" className="min-w-0">
                            <span className="block text-[#27324A] truncate">{doc ? doctorName(doc.name) : '—'}</span>
                            <span className="block text-[12px] text-[#5B667A] truncate">{doc?.department}</span>
                          </span>
                          <span role="cell">{late ? <Status label={late.label} color={late.color} /> : <Status status={v.status} />}</span>
                          <span role="cell" className="text-[12.5px] font-extrabold truncate" style={{ color: pay.color }}>
                            {pay.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </Panel>

            <Panel className="order-3 lg:hidden" label="Clinic sessions today">
              <PanelHead title="Clinic sessions today" sub="Published slots by doctor" right={<MoreLink href="/hospital/doctors">Roster</MoreLink>} />
              {onDuty.length === 0 ? (
                <EmptyLine>No sessions today. Publish slots from the duty roster.</EmptyLine>
              ) : (
                <ul>
                  {onDuty.map(({ doctor: d, mine }) => {
                    const booked = mine.filter((s) => s.booked).length
                    return (
                      <li key={d.id} className="py-[11px] border-t border-[#EEF2F7]">
                        <Link href={`/hospital/doctors/${d.id}/schedule`} className="block">
                          <span className="flex justify-between gap-2">
                            <span className="text-[14px] font-extrabold truncate">{doctorName(d.name)}</span>
                            <span className="text-[12.5px] font-extrabold shrink-0">
                              {booked} / {mine.length}
                            </span>
                          </span>
                          <span className="block mb-2 text-[12px] text-[#5B667A] truncate">
                            {d.department} · {sessionLabel(mine)}
                          </span>
                          <Meter pct={(booked / mine.length) * 100} label={`${booked} of ${mine.length} slots booked`} />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>

            <Panel className="order-4 lg:hidden" label="Inpatient beds">
              <PanelHead title="Inpatient beds" sub="Live ward census" right={<MoreLink href="/hospital/beds">Beds</MoreLink>} />
              {wards.length === 0 ? (
                <EmptyLine>No beds set up yet. Add your wards and beds from Beds.</EmptyLine>
              ) : (
                <ul>
                  {wards.map((w) => (
                    <li key={w.ward} className="flex items-center gap-3 py-[11px] border-t border-[#EEF2F7]">
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-extrabold truncate">{w.ward}</span>
                        <span className="block text-[12px] text-[#5B667A]">
                          {w.available} available · {w.total - w.occupied - w.available} cleaning or repair
                        </span>
                      </span>
                      <span className="shrink-0 text-[14px] font-extrabold">
                        {w.occupied} / {w.total}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <aside className="hidden lg:flex lg:flex-col lg:gap-4 lg:min-w-0">
            <Panel id="attention" className="scroll-mt-24">
              <AttentionList items={attention} count={attentionCount} />
            </Panel>

            <Panel>
              <PanelHead title="Inpatient beds" sub="Live ward census" right={<MoreLink href="/hospital/beds">Beds</MoreLink>} />
              {bedSummary.total === 0 ? (
                <EmptyLine>No beds set up yet.</EmptyLine>
              ) : (
                <div className="flex items-center gap-[18px]">
                  <Donut pct={bedSummary.occupancy} size={104} label="occupied" />
                  <div className="flex-1 min-w-0">
                    <Row label="In use">{bedSummary.occupied}</Row>
                    <Row label="Free">{bedSummary.available}</Row>
                    <Row label="Cleaning or repair">{bedSummary.unavailable}</Row>
                  </div>
                </div>
              )}
            </Panel>

            <Panel>
              <PanelHead title="Doctors on duty" sub={`${onDuty.length} of ${doctors.length} today`} right={<MoreLink href="/hospital/doctors">Roster</MoreLink>} />
              {onDuty.length === 0 ? (
                <EmptyLine>No doctor has slots today.</EmptyLine>
              ) : (
                <ul>
                  {onDuty.map(({ doctor: d, mine }) => (
                    <li key={d.id} className="border-t border-[#EEF2F7]">
                      <Link href={`/hospital/doctors/${d.id}/schedule`} className="flex items-center gap-2.5 py-2.5 hover:text-[#2A4DD0]">
                        <Initials name={d.name} image={d.image} className="w-8 h-8 text-[11px]" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13.5px] font-extrabold truncate">{doctorName(d.name)}</span>
                          <span className="block text-[12px] text-[#5B667A] truncate">{d.department}</span>
                        </span>
                        <span className="shrink-0 text-[12.5px] font-extrabold">
                          {mine.filter((s) => s.booked).length}/{mine.length}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </aside>
        </div>
      </HosBody>
    </>
  )
}

const queueGrid = 'grid grid-cols-[72px_minmax(0,1.4fr)_minmax(0,1fr)_124px_112px] gap-3.5'

/** The queue's payment column: what has been paid and where. */

function AttentionList({ items, count }: { items: Attention[]; count: string }) {
  return (
    <>
      <PanelHead title="Needs attention" sub={count} />
      {items.length === 0 ? (
        <p className="pt-3 border-t border-[#EEF2F7] text-[13px] font-bold text-[#067647]">All clear. Nothing needs action right now.</p>
      ) : (
        <ul>
          {items.map((a) => (
            <li key={a.id} className="py-3 border-t border-[#EEF2F7]">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-extrabold min-w-0">{a.title}</span>
                <span className="shrink-0 text-[12px] font-extrabold" style={{ color: a.color }}>
                  {a.tag}
                </span>
              </span>
              <span className="block mt-0.5 text-[12.5px] text-[#5B667A]">{a.sub}</span>
              <Link href={a.href} className={`${btnPrimary} !h-9 !px-3 !text-[12.5px] !shadow-none mt-2.5`}>
                {a.cta}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
