import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Activity, CalendarCheck, CalendarClock, CalendarDays, CalendarPlus, ClipboardList, Droplet, FolderOpen, HeartPulse, History,
  Stethoscope, TrendingDown, TrendingUp, UserCheck, Users, Wind, type LucideIcon,
} from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { ageFrom, doctorName, formatShortDate, formatSlot, formatTime, istDateKey } from '@/components/patient/format'
import { showHR, showSpO2 } from '@/lib/vitals'
import {
  bookingCode, isOpenVisit, latestVitals, loadPatientFacts, loadSlots, loadVisits, minutesBetween, requireDoctor, VISIT_STATUS,
  type RecordedVitals, type Visit,
} from '../_lib/doctor'
import { Avatar, Card, CardHeader, Chip, EmptyState, ProgressBar, SegmentBar, StatCard, StatFooterRow } from '@/components/portal/ui'
import { CallLink, CheckInButton, NextStepButton, PrescriptionButton, WritePrescriptionButton, type PickVisit, type VisitRef } from '../_components/VisitControls'
import { WalkInButton } from '../_components/WalkInModal'
import { RefreshButton } from '@/components/portal/RefreshButton'

export const metadata: Metadata = { title: 'Dashboard | Doctor Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const PAID = ['confirmed', 'visited', 'completed']

type Facts = Awaited<ReturnType<typeof loadPatientFacts>>

const ref = (v: Visit): VisitRef => ({ id: v.id, status: v.status, patientName: v.patient?.name ?? 'Patient', phone: v.patient?.phone ?? null })

const headerPad = 'px-3 md:px-stack-md py-2.5 md:py-3'
const headerButton = `flex items-center justify-center gap-1.5 md:gap-2 font-label-sm text-label-sm ${headerPad} rounded-full transition-all active:scale-95`

function ageSex(v: Visit | undefined, facts: Facts, now: number) {
  const f = v?.patient ? facts[v.patient.id] : undefined
  const age = ageFrom(f?.dateOfBirth, now)
  return [age != null ? `${age} yrs` : null, f?.gender].filter(Boolean).join(' • ') || null
}

export default async function DoctorDashboard() {
  const { admin, doctor } = await requireDoctor()
  const now = currentTime()
  const todayKey = istDateKey(now)
  const dayStart = Date.parse(`${todayKey}T00:00:00+05:30`)

  const [visits, slots] = await Promise.all([
    loadVisits(admin, doctor.id),
    loadSlots(admin, doctor.id, new Date(dayStart).toISOString(), new Date(dayStart + 8 * DAY).toISOString()),
  ])

  const live = visits.filter((v) => v.status !== 'cancelled')
  const paid = live.filter((v) => PAID.includes(v.status))
  const todays = live.filter((v) => v.start && istDateKey(v.start) === todayKey)
  const count = (status: string) => todays.filter((v) => v.status === status).length
  const vitals = latestVitals(visits)

  // Who to see next: someone already checked in, then the next booked slot, then the next day with bookings.
  const openToday = todays.filter(isOpenVisit)
  const next =
    openToday.find((v) => v.status === 'visited') ??
    openToday.find((v) => Date.parse(v.end ?? v.start!) > now - 15 * 60_000) ??
    openToday[0] ??
    live.find((v) => isOpenVisit(v) && v.start && Date.parse(v.start) > now) ??
    null
  const waiting = todays.filter((v) => v.status !== 'completed' && v.id !== next?.id)
  const checkedIn = todays.filter((v) => v.status === 'visited')

  // This-month numbers (India time)
  const monthKey = todayKey.slice(0, 7)
  const lastMonthKey = istDateKey(Date.parse(`${monthKey}-01T00:00:00+05:30`) - DAY).slice(0, 7)
  const inMonth = (v: Visit, key: string) => !!v.start && istDateKey(v.start).slice(0, 7) === key
  const completedThisMonth = visits.filter((v) => v.status === 'completed' && inMonth(v, monthKey)).length
  const completedLastMonth = visits.filter((v) => v.status === 'completed' && inMonth(v, lastMonthKey)).length
  const firstVisit = new Map<string, string>()
  for (const v of paid) if (v.patient && v.start && !firstVisit.has(v.patient.id)) firstVisit.set(v.patient.id, v.start)
  const newPatientsThisMonth = Array.from(firstVisit.values()).filter((start) => istDateKey(start).slice(0, 7) === monthKey).length
  const seenThisMonth = new Set(visits.filter((v) => v.status === 'completed' && inMonth(v, monthKey)).map((v) => v.patient?.id).filter(Boolean)).size

  const weekSlots = slots.filter((s) => Date.parse(s.start) > now && Date.parse(s.start) < now + 7 * DAY)
  const openWeek = weekSlots.filter((s) => !s.booked).length

  // Rest of today: the slot in progress and everything after it
  const todaySlots = slots.filter((s) => istDateKey(s.start) === todayKey)
  const restOfDay = todaySlots.filter((s) => Date.parse(s.end ?? s.start) > now)
  const visitBySlot = new Map(live.filter((v) => v.scheduleId).map((v) => [v.scheduleId!, v]))
  // Booked visits each get a row; a run of free slots between them is one "open" row, so a day of 10-minute
  // slots doesn't fill the column with dozens of identical lines.
  type DayRow = { kind: 'visit'; slot: (typeof restOfDay)[number] } | { kind: 'open'; first: (typeof restOfDay)[number]; last: (typeof restOfDay)[number]; count: number }
  const dayRows: DayRow[] = []
  for (const slot of restOfDay) {
    const prev = dayRows[dayRows.length - 1]
    if (visitBySlot.has(slot.id) || slot.booked) dayRows.push({ kind: 'visit', slot })
    else if (prev?.kind === 'open') dayRows[dayRows.length - 1] = { ...prev, last: slot, count: prev.count + 1 }
    else dayRows.push({ kind: 'open', first: slot, last: slot, count: 1 })
  }
  const inClinicToday = todays.filter((v) => PAID.includes(v.status)).length

  const factIds = Array.from(new Set([next, ...waiting, ...checkedIn].map((v) => v?.patient?.id).filter(Boolean) as string[]))
  const facts = await loadPatientFacts(admin, factIds)
  const visitsWith = (patientId: string) => paid.filter((v) => v.patient?.id === patientId)

  const delta = completedThisMonth - completedLastMonth
  const trend =
    completedLastMonth > 0
      ? `${delta >= 0 ? '+' : ''}${Math.round((delta / completedLastMonth) * 100)}% vs last month`
      : completedThisMonth > 0
        ? 'First consults this month'
        : 'No consults yet this month'

  // The quick prescription button works on whoever is in front of the doctor: checked in, else up next today.
  const prescribeFor = checkedIn[0] ?? (next && next.start && istDateKey(next.start) === todayKey ? next : null)
  // Otherwise it offers the paid visits of the last 30 days (none later than today): checked in first, then newest.
  const endOfToday = dayStart + DAY
  const recentVisits: PickVisit[] = paid
    .filter((v) => {
      const at = Date.parse(v.start ?? v.createdAt)
      return at < endOfToday && at >= endOfToday - 30 * DAY
    })
    .sort((a, b) => Number(b.status === 'visited') - Number(a.status === 'visited') || (b.start ?? b.createdAt).localeCompare(a.start ?? a.createdAt))
    .slice(0, 15)
    .map((v) => ({ ...ref(v), when: formatSlot(v.start ?? v.createdAt, now) }))

  return (
    <>
      {/* Doctor header */}
      <Card className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 md:gap-gutter">
        <div className="flex items-center gap-3 md:gap-gutter min-w-0">
          <span className="relative shrink-0">
            <Avatar name={doctor.name} image={doctor.image} className="w-12 h-12 md:w-16 md:h-16 text-lg ring-2 ring-primary/10" />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 bg-fresh-teal rounded-full ring-2 ring-surface-container-lowest" title="On duty" />
          </span>
          <div className="min-w-0">
            <span className="md:hidden block text-[11px] font-semibold text-secondary uppercase tracking-wider truncate">{doctor.specialty || 'Doctor'}</span>
            <h1 className="font-title-md text-[17px] md:font-headline-lg md:text-headline-lg text-indigo-gray-900 font-bold leading-tight truncate">
              {doctorName(doctor.name)}
              {doctor.qualifications && doctor.qualifications.length <= 32 && <span className="hidden md:inline">, {doctor.qualifications}</span>}
            </h1>
          </div>
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-base shrink-0">
          <WalkInButton
            label={
              <>
                <span className="md:hidden">New Consult</span>
                <span className="hidden md:inline">New Consultation</span>
              </>
            }
            icon={<CalendarPlus className="w-[18px] h-[18px]" />}
            className={`${headerButton} bg-vibrant-blue hover:bg-primary text-on-primary shadow-[0_4px_16px_rgba(0,102,255,0.22)] md:hover:scale-[1.02]`}
          />
          <WritePrescriptionButton
            current={prescribeFor ? ref(prescribeFor) : null}
            recent={recentVisits}
            label={
              <>
                <span className="md:hidden">Write Rx</span>
                <span className="hidden md:inline">Write Prescription</span>
              </>
            }
            pad={headerPad}
            className="md:gap-2"
          />
        </div>
      </Card>

      {/* Metrics */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-gutter">
        <StatCard
          label="Today's Caseload"
          value={todays.length}
          note="appointments"
          noteTone="teal"
          icon={CalendarDays}
          tone="blue"
          footer={
            <div className="flex flex-col gap-1.5 mt-1">
              <SegmentBar
                parts={[
                  { value: count('completed'), className: 'bg-fresh-teal', label: 'completed' },
                  { value: count('visited'), className: 'bg-vibrant-blue', label: 'checked in' },
                  { value: count('confirmed'), className: 'bg-outline-variant', label: 'still to see' },
                  { value: count('pending_payment'), className: 'bg-soft-coral', label: 'awaiting payment' },
                ]}
              />
              <span className="hidden md:block text-[11px] text-indigo-gray-600">
                {count('completed')} done • {count('visited')} checked in • {count('confirmed')} to see
              </span>
            </div>
          }
        />
        <StatCard
          label="My Patients"
          value={firstVisit.size}
          note={newPatientsThisMonth ? `${newPatientsThisMonth} new` : undefined}
          noteTone="coral"
          icon={Users}
          tone="coral"
          footer={
            <div className="flex flex-col gap-2 mt-1">
              <span className="hidden md:block font-label-sm text-label-sm text-indigo-gray-600">{seenThisMonth} seen this month</span>
              <ProgressBar pct={firstVisit.size ? (seenThisMonth / firstVisit.size) * 100 : 0} className="bg-tertiary" label={`${seenThisMonth} of ${firstVisit.size} seen this month`} />
            </div>
          }
        />
        <StatCard
          label="Consults This Month"
          value={completedThisMonth}
          note="completed"
          icon={Stethoscope}
          tone="teal"
          footer={
            <div className="flex flex-col gap-2 mt-1">
              <div className="hidden md:block">
                <StatFooterRow
                  tone={delta >= 0 ? 'teal' : 'coral'}
                  left={
                    <>
                      {delta >= 0 ? <TrendingUp className="w-4 h-4 shrink-0" /> : <TrendingDown className="w-4 h-4 shrink-0" />}
                      <span className="truncate">{trend}</span>
                    </>
                  }
                  right={`Last: ${completedLastMonth}`}
                />
              </div>
              <span className={`md:hidden text-[11px] font-semibold ${delta >= 0 ? 'text-fresh-teal' : 'text-soft-coral'}`}>{trend}</span>
              <ProgressBar
                pct={Math.max(completedThisMonth, completedLastMonth) ? (completedThisMonth / Math.max(completedThisMonth, completedLastMonth)) * 100 : 0}
                className="bg-fresh-teal"
                label={`${completedThisMonth} this month, ${completedLastMonth} last month`}
              />
            </div>
          }
        />
        <StatCard
          label="Open Slots (7 days)"
          value={openWeek}
          note={`of ${weekSlots.length}`}
          noteTone="neutral"
          icon={CalendarClock}
          tone="neutral"
          footer={
            <div className="flex flex-col gap-2 mt-1">
              <div className="hidden md:block">
                <StatFooterRow tone="blue" left={`${weekSlots.length - openWeek} booked`} right="Next 7 days" />
              </div>
              <ProgressBar pct={weekSlots.length ? ((weekSlots.length - openWeek) / weekSlots.length) * 100 : 0} label={`${weekSlots.length - openWeek} of ${weekSlots.length} slots booked`} />
            </div>
          }
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-gutter items-start">
        <div className="lg:col-span-7 min-w-0 flex flex-col gap-4 md:gap-stack-md">
          {/* Next patient */}
          <Card className="relative overflow-hidden">
            <div aria-hidden className="absolute top-0 inset-x-0 h-1 md:h-1.5 bg-gradient-to-r from-vibrant-blue via-fresh-teal to-primary" />
            {next?.patient ? (
              <NextPatient visit={next} facts={facts[next.patient.id]} vitals={vitals[next.patient.id]} history={visitsWith(next.patient.id)} now={now} />
            ) : (
              <EmptyState icon={CalendarCheck}>No upcoming visits. New bookings will show here.</EmptyState>
            )}
          </Card>

          {/* Waiting room */}
          <Card>
            <CardHeader
              title="Waiting Room"
              subtitle="Everyone else booked with you today"
              action={
                <div className="flex items-center gap-2 shrink-0">
                  <Chip tone="neutral">{waiting.length} waiting</Chip>
                  <RefreshButton label="Refresh the waiting room" />
                </div>
              }
            />
            {waiting.length === 0 ? (
              <EmptyState icon={Users}>No one else is booked today.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2.5 md:gap-3">
                {waiting.map((v) => {
                  const lateBy = v.status === 'confirmed' && v.start ? Math.round((now - Date.parse(v.start)) / 60_000) : 0
                  const status =
                    lateBy > 10
                      ? { label: `Late (+${lateBy}m)`, tone: 'coral' as const }
                      : v.status === 'visited'
                        ? { label: 'Ready', tone: 'teal' as const }
                        : VISIT_STATUS[v.status]
                  const note =
                    v.status === 'visited'
                      ? { text: 'Checked in', cls: 'text-secondary' }
                      : v.status === 'pending_payment'
                        ? { text: 'Awaiting payment', cls: 'text-soft-coral' }
                        : lateBy > 10
                          ? { text: 'Not arrived yet', cls: 'text-tertiary' }
                          : { text: 'Pending check-in', cls: 'text-indigo-gray-600' }
                  return (
                    <li
                      key={v.id}
                      className={`p-2.5 md:p-3.5 rounded-xl md:rounded-lg bg-surface-container-low/60 hover:bg-surface-container-low transition-colors flex items-center justify-between gap-3 ${v.status === 'visited' ? 'border border-fresh-teal/30' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 md:gap-stack-sm min-w-0">
                        <Avatar
                          name={v.patient?.name ?? null}
                          className={`w-9 h-9 md:w-10 md:h-10 text-xs md:text-sm ${lateBy > 10 ? '!bg-error-container !text-tertiary' : v.status === 'visited' ? '' : '!bg-surface-container-high !text-indigo-gray-900'}`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                            <span className="font-title-md text-[14px] md:text-[16px] text-indigo-gray-900 font-bold truncate">{v.patient?.name ?? 'Patient'}</span>
                            {status && <Chip tone={status.tone}>{status.label}</Chip>}
                          </div>
                          <span className="font-label-sm text-[11px] md:text-label-sm text-indigo-gray-600 truncate block">
                            In-person • {v.start ? formatTime(v.start) : 'Time not set'} • ID {bookingCode(v.id)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-base shrink-0">
                        <span className={`hidden md:block font-label-sm text-label-sm ${note.cls}`}>{note.text}</span>
                        <CheckInButton visit={ref(v)} kind="icon" />
                        <PrescriptionButton visit={ref(v)} kind="icon" />
                        <CallLink phone={v.patient?.phone ?? null} name={v.patient?.name ?? 'patient'} kind="icon" />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5 min-w-0 flex flex-col gap-4 md:gap-stack-md">
          {/* Rest of today */}
          <Card>
            <div className="flex items-start justify-between gap-3 mb-3 md:mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-title-md text-[16px] md:text-title-md text-indigo-gray-900 font-bold">
                    <span className="md:hidden">Today&apos;s Schedule</span>
                    <span className="hidden md:inline">Schedule Breakdown</span>
                  </h2>
                  <Chip tone="teal" className="md:hidden">{inClinicToday} in-clinic</Chip>
                </div>
                <p className="hidden md:block font-label-sm text-label-sm text-indigo-gray-600">Rest of day timetable</p>
              </div>
              <Link href="/doctor/schedule" className="text-vibrant-blue font-label-sm text-[12px] md:text-label-sm hover:underline flex items-center gap-1 shrink-0">
                <CalendarDays className="w-4 h-4" /> Full schedule
              </Link>
            </div>
            {todaySlots.length === 0 ? (
              <EmptyState icon={CalendarClock}>Your hospital admin publishes your slots. None are set for today.</EmptyState>
            ) : restOfDay.length === 0 ? (
              <EmptyState icon={CalendarCheck}>That&apos;s the last slot done for today.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2 md:gap-2.5">
                {dayRows.map((row) => {
                  if (row.kind === 'open') {
                    const current = Date.parse(row.first.start) <= now
                    const until = formatTime(row.last.end ?? row.last.start)
                    return (
                      <li key={row.first.id} className={`p-2.5 md:p-3 rounded-xl md:rounded-lg flex items-center gap-2.5 md:gap-stack-sm ${current ? 'bg-primary/5 ring-1 ring-vibrant-blue/30' : 'bg-surface-container-low/40'}`}>
                        <div className="text-right w-12 md:w-14 shrink-0">
                          <span className="font-title-md text-[13px] md:text-[14px] font-bold text-indigo-gray-900 block leading-tight">{formatTime(row.first.start).replace(/ (AM|PM)$/, '')}</span>
                          <span className={`block text-[10px] md:text-[11px] ${current ? 'text-primary font-semibold' : 'text-indigo-gray-600'}`}>{current ? 'Now' : formatTime(row.first.start).slice(-2)}</span>
                        </div>
                        <div className="w-1 self-stretch rounded-full bg-outline-variant/50" />
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block font-label-sm text-[13px] md:text-label-sm font-bold text-indigo-gray-900">
                              {row.count} open {row.count === 1 ? 'slot' : 'slots'}
                            </span>
                            <span className="block text-[11px] md:text-xs text-indigo-gray-600 truncate">Until {until} • patients can book these</span>
                          </span>
                          <span className="px-1.5 md:px-2 py-0.5 rounded bg-surface-container text-indigo-gray-600 font-label-sm text-[10px] md:text-[11px] shrink-0">Available</span>
                        </div>
                      </li>
                    )
                  }
                  const s = row.slot
                  const v = visitBySlot.get(s.id)
                  const current = Date.parse(s.start) <= now
                  const bar = !v ? 'bg-outline-variant' : v.status === 'completed' ? 'bg-fresh-teal' : v.status === 'visited' ? 'bg-secondary' : v.status === 'pending_payment' ? 'bg-tertiary-container' : 'bg-vibrant-blue'
                  const mins = minutesBetween(s.start, s.end)
                  return (
                    <li key={s.id} className={`p-2.5 md:p-3 rounded-xl md:rounded-lg flex items-start gap-2.5 md:gap-stack-sm ${current ? 'bg-primary/5 ring-1 ring-vibrant-blue/30' : 'bg-surface-container-low/40'}`}>
                      <div className="text-right w-12 md:w-14 shrink-0">
                        <span className="font-title-md text-[13px] md:text-[14px] font-bold text-indigo-gray-900 block leading-tight">{formatTime(s.start).replace(/ (AM|PM)$/, '')}</span>
                        <span className={`block text-[10px] md:text-[11px] ${current ? 'text-primary font-semibold' : 'text-indigo-gray-600'}`}>
                          {current ? 'Current' : mins ? `${mins} min` : formatTime(s.start).slice(-2)}
                        </span>
                      </div>
                      <div className={`w-1 self-stretch rounded-full ${bar}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-label-sm text-[13px] md:text-label-sm font-bold text-indigo-gray-900 truncate">{v?.patient?.name ?? 'Open slot'}</span>
                          {v ? (
                            <span className={`px-1.5 md:px-2 py-0.5 rounded font-label-sm text-[10px] md:text-[11px] shrink-0 ${v.status === 'visited' ? 'bg-secondary-container text-on-secondary-container' : v.status === 'pending_payment' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-primary-fixed text-on-primary-fixed'}`}>
                              {v.status === 'visited' ? 'Checked in' : v.status === 'pending_payment' ? 'Unpaid' : v.status === 'completed' ? 'Done' : 'In-Person'}
                            </span>
                          ) : (
                            <span className="px-1.5 md:px-2 py-0.5 rounded bg-surface-container text-indigo-gray-600 font-label-sm text-[10px] md:text-[11px] shrink-0">{s.booked ? 'Reserved' : 'Available'}</span>
                          )}
                        </div>
                        <p className="text-[11px] md:text-xs text-indigo-gray-600 truncate mt-0.5">
                          {v ? `Booking ID ${bookingCode(v.id)}${v.patient && vitals[v.patient.id] ? ' • Vitals on file' : ''}` : 'Patients can book this slot'}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {/* In-person clinic visits (checked in) */}
          <Card className="hidden md:block">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-stack-md pb-3 border-b border-surface-container-high/60">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold">In-Person Clinic Visits</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    {checkedIn.length} Checked In / Waiting
                  </span>
                </div>
                <p className="font-label-sm text-label-sm text-indigo-gray-600 mt-0.5">
                  Patients at {doctor.hospital?.name ?? 'the clinic'} who still need their prescription
                </p>
              </div>
            </div>
            {checkedIn.length === 0 ? (
              <EmptyState icon={UserCheck}>No one is checked in and waiting right now.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-3">
                {checkedIn.map((v, i) => {
                  const line = ageSex(v, facts, now)
                  const recorded = v.patient ? vitals[v.patient.id] : undefined
                  return (
                    <li
                      key={v.id}
                      className={`p-3.5 rounded-lg bg-surface-container-low/60 hover:bg-surface-container-low transition-colors flex flex-col xl:flex-row xl:items-center justify-between gap-3 ${i === 0 ? 'border border-fresh-teal/30' : ''}`}
                    >
                      <div className="flex items-center gap-stack-sm min-w-0">
                        <Avatar name={v.patient?.name ?? null} className={`w-10 h-10 text-sm ${i === 0 ? '!bg-secondary-container !text-on-secondary-container' : ''}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-title-md text-[16px] text-indigo-gray-900 font-bold truncate">{v.patient?.name ?? 'Patient'}</span>
                            {line && <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm text-[11px] text-indigo-gray-600 font-semibold">{line}</span>}
                            {v.start && (
                              <span className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${i === 0 ? 'bg-fresh-teal/15 text-fresh-teal' : 'bg-surface-container text-indigo-gray-600'}`}>
                                Slot {formatTime(v.start)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-indigo-gray-600 truncate mt-0.5">
                            <span className="font-medium text-indigo-gray-900">ID {bookingCode(v.id)}</span>
                            <span>•</span>
                            {recorded ? (
                              <span className="text-secondary font-semibold">Vitals on file ({recorded.date ? formatShortDate(recorded.date) : 'recorded'})</span>
                            ) : (
                              <span>No vitals recorded</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <PrescriptionButton visit={ref(v)} kind={i === 0 ? 'solid' : 'soft'} label="Write Prescription" className="self-end xl:self-center" pad="px-3.5 py-1.5" />
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </>
  )
}

function NextPatient({
  visit,
  facts,
  vitals,
  history,
  now,
}: {
  visit: Visit
  facts: Facts[string] | undefined
  vitals: RecordedVitals | undefined
  history: Visit[]
  now: number
}) {
  const patient = visit.patient!
  const age = ageFrom(facts?.dateOfBirth, now)
  const previous = history.filter((h) => h.id !== visit.id && h.status === 'completed' && h.start && Date.parse(h.start) < now)
  const lastVisit = previous[previous.length - 1]
  const isToday = visit.start && istDateKey(visit.start) === istDateKey(now)
  const status = VISIT_STATUS[visit.status]
  const recordedOn = vitals?.date ? `Recorded ${formatShortDate(vitals.date)}` : 'Recorded'

  return (
    <div className="flex flex-col gap-3 md:gap-stack-md pt-1">
      <div className="flex items-start sm:items-center justify-between gap-3 md:gap-gutter">
        <div className="flex items-center gap-3 md:gap-stack-md min-w-0 flex-1">
          <Avatar name={patient.name} className="w-12 h-12 md:w-16 md:h-16 text-lg" square />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <h2 className="font-title-md text-[16px] md:text-title-md text-indigo-gray-900 font-bold truncate">{patient.name}</h2>
              {(age != null || facts?.gender) && (
                <span className="px-1.5 md:px-2 py-0.5 rounded bg-surface-container font-label-sm text-[10px] md:text-label-sm text-indigo-gray-600 font-semibold">
                  {[age != null ? `${age}y` : null, facts?.gender?.[0]].filter(Boolean).join(' • ')}
                </span>
              )}
              {status && (
                <span className="hidden md:inline">
                  <Chip tone={status.tone}>{status.label}</Chip>
                </span>
              )}
            </div>
            <p className="font-label-sm text-[12px] md:text-label-sm text-secondary font-medium mt-0.5 truncate">
              {visit.start ? formatSlot(visit.start, now) : 'Time not set'} • ID {bookingCode(visit.id)}
            </p>
          </div>
        </div>
        <span className="md:hidden px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold whitespace-nowrap shrink-0">
          {visit.status === 'visited' ? 'Checked in' : isToday ? 'Up Next' : 'Next Visit'}
        </span>
        <div className="hidden md:block shrink-0">
          <NextStepButton visit={ref(visit)} />
        </div>
      </div>

      <div className="bg-surface-container-low rounded-xl p-3 md:p-4 grid grid-cols-3 gap-2 md:gap-stack-sm text-center md:text-left">
        {vitals ? (
          <>
            <Snapshot icon={HeartPulse} iconClass="text-tertiary" label="Blood Pressure" short="BP" value={vitals.bp} unit={vitals.bp && /^\d+\/\d+$/.test(vitals.bp) ? 'mmHg' : undefined} sub={recordedOn} />
            <Snapshot icon={Activity} iconClass="text-soft-coral" label="Pulse / Heart Rate" short="HR" value={vitals.hr ? showHR(vitals.hr) : null} sub={recordedOn} divider />
            <Snapshot icon={Wind} iconClass="text-vibrant-blue" label="Oxygen (SpO2)" short="SpO2" value={vitals.spo2 ? showSpO2(vitals.spo2) : null} sub={recordedOn} />
          </>
        ) : (
          <>
            <Snapshot icon={Droplet} iconClass="text-tertiary" label="Blood Group" short="Blood" value={facts?.bloodGroup ?? null} sub="Patient profile" />
            <Snapshot icon={ClipboardList} iconClass="text-vibrant-blue" label="Visits With You" short="Visits" value={String(history.length)} sub="Paid visits" divider />
            <Snapshot icon={History} iconClass="text-fresh-teal" label="Last Visit" short="Last" value={lastVisit?.start ? formatShortDate(lastVisit.start) : 'First visit'} sub={lastVisit ? 'Completed' : 'New patient'} />
          </>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2">
        <div className="md:hidden">
          <NextStepButton visit={ref(visit)} className="w-full" pad="px-4 py-2.5" />
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
          <Link
            href={`/doctor/patients?patient=${patient.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900 font-label-sm text-label-sm transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-vibrant-blue" /> Patient Record
          </Link>
          {visit.status === 'confirmed' && <PrescriptionButton visit={ref(visit)} kind="soft" label="Quick Prescription" pad="px-3 py-1.5" />}
          <CallLink phone={patient.phone} name={patient.name} pad="px-3 py-1.5" />
        </div>
      </div>
    </div>
  )
}

function Snapshot({
  icon: Icon,
  iconClass,
  label,
  short,
  value,
  unit,
  sub,
  divider,
}: {
  icon: LucideIcon
  iconClass: string
  label: string
  short: string
  value: string | null
  unit?: string
  sub: string
  divider?: boolean
}) {
  return (
    <div className={`flex flex-col items-center md:items-start min-w-0 ${divider ? 'border-x border-surface-container-high md:border-0' : ''}`}>
      <span className="font-label-sm text-[10px] md:text-label-sm text-indigo-gray-600 flex items-center gap-1">
        <Icon className={`w-3 h-3 md:w-3.5 md:h-3.5 ${iconClass}`} />
        <span className="md:hidden">{short}</span>
        <span className="hidden md:inline">{label}</span>
      </span>
      <span className="flex items-baseline gap-1 mt-0.5 md:mt-1 max-w-full">
        <span className={`font-title-md text-[14px] md:text-title-md font-bold truncate ${value ? 'text-indigo-gray-900' : 'text-outline'}`}>{value ?? '—'}</span>
        {value && unit && <span className="text-[10px] md:text-xs text-indigo-gray-600 font-label-sm">{unit}</span>}
      </span>
      <span className="text-[9px] md:text-[11px] text-secondary font-semibold font-label-sm truncate max-w-full">{sub}</span>
    </div>
  )
}
