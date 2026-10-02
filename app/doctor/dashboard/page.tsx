import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarCheck, CalendarClock, CalendarDays, ClipboardList, Droplet, FolderOpen, History, Hourglass, RefreshCw, Stethoscope, UserCheck, Users, type LucideIcon } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { ageFrom, doctorName, formatDayLabel, formatShortDate, formatSlot, formatTime, istDateKey } from '@/components/patient/format'
import { bookingCode, isOpenVisit, loadPatientFacts, loadSlots, loadVisits, minutesBetween, requireDoctor, VISIT_STATUS, type Visit } from '../_lib/doctor'
import { Avatar, Card, CardHeader, Chip, EmptyState, SegmentBar, StatCard } from '@/components/portal/ui'
import { CallLink, CheckInButton, NextStepButton, PrescriptionButton, type VisitRef } from '../_components/VisitControls'
import { WalkInButton } from '../_components/WalkInModal'

export const metadata: Metadata = { title: 'Dashboard | Doctor Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const PAID = ['confirmed', 'visited', 'completed']

const ref = (v: Visit): VisitRef => ({ id: v.id, status: v.status, patientName: v.patient?.name ?? 'Patient', phone: v.patient?.phone ?? null })

function greeting(now: number) {
  const hour = Number(new Date(now).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hourCycle: 'h23' }))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
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

  // Who to see next: someone already checked in, then the next booked slot, then the next day with bookings.
  const openToday = todays.filter(isOpenVisit)
  const next =
    openToday.find((v) => v.status === 'visited') ??
    openToday.find((v) => Date.parse(v.end ?? v.start!) > now - 15 * 60_000) ??
    openToday[0] ??
    live.find((v) => isOpenVisit(v) && v.start && Date.parse(v.start) > now) ??
    null
  const queue = todays.filter((v) => v.status !== 'completed' && v.id !== next?.id)
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

  const weekSlots = slots.filter((s) => Date.parse(s.start) > now && Date.parse(s.start) < now + 7 * DAY)
  const openWeek = weekSlots.filter((s) => !s.booked).length

  const todaySlots = slots.filter((s) => istDateKey(s.start) === todayKey)
  const visitBySlot = new Map(live.filter((v) => v.scheduleId).map((v) => [v.scheduleId!, v]))

  const factIds = Array.from(new Set([next, ...queue, ...checkedIn].map((v) => v?.patient?.id).filter(Boolean) as string[]))
  const facts = await loadPatientFacts(admin, factIds)
  const visitsWith = (patientId: string) => paid.filter((v) => v.patient?.id === patientId)

  const trendNote =
    completedLastMonth > 0
      ? `${completedThisMonth >= completedLastMonth ? '+' : ''}${Math.round(((completedThisMonth - completedLastMonth) / completedLastMonth) * 100)}% vs last month`
      : completedThisMonth > 0
        ? 'first this month'
        : undefined

  return (
    <>
      {/* Doctor header */}
      <Card className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-gutter">
        <div className="flex items-center gap-3 md:gap-gutter min-w-0">
          <span className="relative shrink-0">
            <Avatar name={doctor.name} image={doctor.image} className="w-12 h-12 md:w-16 md:h-16 text-lg ring-2 ring-primary/10" />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 bg-fresh-teal rounded-full ring-2 ring-surface-container-lowest" title="Signed in" />
          </span>
          <div className="min-w-0">
            <span className="text-[11px] md:text-label-sm font-semibold text-secondary uppercase tracking-wider">{greeting(now)}</span>
            <h1 className="font-title-md text-[17px] md:font-headline-lg md:text-headline-lg text-indigo-gray-900 font-bold leading-tight truncate">{doctorName(doctor.name)}</h1>
            <p className="hidden md:block text-sm text-indigo-gray-600 truncate">{[doctor.specialty, doctor.hospital?.name].filter(Boolean).join(' • ')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 shrink-0">
          <WalkInButton
            label="Add Walk-in"
            className="flex items-center justify-center gap-1.5 md:gap-2 bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-[12px] md:text-label-sm px-3 md:px-stack-md py-2.5 md:py-3 rounded-full shadow-[0_4px_16px_rgba(0,102,255,0.22)] transition-all active:scale-95"
          />
          <Link
            href="/doctor/schedule"
            className="flex items-center justify-center gap-1.5 md:gap-2 bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-[12px] md:text-label-sm px-3 md:px-stack-md py-2.5 md:py-3 rounded-full transition-colors"
          >
            <CalendarDays className="w-[18px] h-[18px] text-vibrant-blue" /> Open Schedule
          </Link>
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
            <div className="flex flex-col gap-1.5">
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
          note={newPatientsThisMonth ? `+${newPatientsThisMonth} new` : undefined}
          icon={Users}
          tone="coral"
          footer={<span className="hidden md:block text-[11px] text-indigo-gray-600">Patients with a paid visit</span>}
        />
        <StatCard
          label="Consults This Month"
          value={completedThisMonth}
          note={trendNote}
          noteTone={completedThisMonth >= completedLastMonth ? 'teal' : 'coral'}
          icon={Stethoscope}
          tone="teal"
          footer={<span className="text-[11px] text-indigo-gray-600">Last month: {completedLastMonth}</span>}
        />
        <StatCard
          label="Open Slots (7 days)"
          value={openWeek}
          note={`of ${weekSlots.length}`}
          noteTone="neutral"
          icon={CalendarClock}
          tone="neutral"
          footer={
            <SegmentBar
              parts={[
                { value: weekSlots.length - openWeek, className: 'bg-vibrant-blue', label: 'booked' },
                { value: openWeek, className: 'bg-surface-container-highest', label: 'open' },
              ]}
            />
          }
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-gutter items-start">
        <div className="lg:col-span-7 flex flex-col gap-4 md:gap-stack-md">
          {/* Next patient */}
          <Card className="relative overflow-hidden">
            <div aria-hidden className="absolute top-0 inset-x-0 h-1 md:h-1.5 bg-gradient-to-r from-vibrant-blue via-fresh-teal to-primary" />
            {next?.patient ? (
              <NextPatient visit={next} facts={facts[next.patient.id]} history={visitsWith(next.patient.id)} now={now} />
            ) : (
              <EmptyState icon={CalendarCheck}>No upcoming visits. New bookings will show here.</EmptyState>
            )}
          </Card>

          {/* Today's queue */}
          <Card>
            <CardHeader
              title="Today's Queue"
              subtitle="Everyone else booked with you today"
              action={<Chip tone="neutral">{queue.length} {queue.length === 1 ? 'patient' : 'patients'}</Chip>}
            />
            {queue.length === 0 ? (
              <EmptyState icon={Users}>No one else is booked today.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2.5 md:gap-3">
                {queue.map((v) => {
                  const late = v.status === 'confirmed' && v.start && Date.parse(v.start) < now - 10 * 60_000
                  const status = late
                    ? { label: `Late (+${Math.round((now - Date.parse(v.start!)) / 60_000)}m)`, tone: 'coral' as const }
                    : VISIT_STATUS[v.status]
                  return (
                    <li key={v.id} className={`p-2.5 md:p-3.5 rounded-xl md:rounded-lg bg-surface-container-low/60 flex items-center justify-between gap-3 ${v.status === 'visited' ? 'border border-fresh-teal/30' : ''}`}>
                      <div className="flex items-center gap-2.5 md:gap-stack-sm min-w-0">
                        <Avatar name={v.patient?.name ?? null} className="w-9 h-9 md:w-10 md:h-10 text-xs md:text-sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-title-md text-[14px] md:text-[16px] text-indigo-gray-900 font-bold truncate">{v.patient?.name ?? 'Patient'}</span>
                            {status && <Chip tone={status.tone}>{status.label}</Chip>}
                          </div>
                          <span className="font-label-sm text-[11px] md:text-label-sm text-indigo-gray-600 truncate block">
                            In-person • {v.start ? formatTime(v.start) : 'Time not set'} • ID {bookingCode(v.id)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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

        <div className="lg:col-span-5 flex flex-col gap-4 md:gap-stack-md">
          {/* Today's timeline */}
          <Card>
            <CardHeader
              title="Today's Schedule"
              subtitle={todaySlots.length ? `${todaySlots.length} slots published by your hospital` : 'No slots published for today'}
              action={
                <Link href="/doctor/schedule" className="text-vibrant-blue font-label-sm text-label-sm hover:underline flex items-center gap-1 shrink-0">
                  <RefreshCw className="w-4 h-4" /> Full schedule
                </Link>
              }
            />
            {todaySlots.length === 0 ? (
              <EmptyState icon={CalendarClock}>Your hospital admin publishes your slots. None are set for today.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2 md:gap-3">
                {todaySlots.map((s) => {
                  const v = visitBySlot.get(s.id)
                  const past = Date.parse(s.end ?? s.start) < now
                  const bar = !v ? 'bg-outline-variant' : v.status === 'completed' ? 'bg-fresh-teal' : v.status === 'visited' ? 'bg-secondary' : v.status === 'pending_payment' ? 'bg-soft-coral' : 'bg-vibrant-blue'
                  const mins = minutesBetween(s.start, s.end)
                  return (
                    <li key={s.id} className={`p-2.5 md:p-3 rounded-xl md:rounded-lg bg-surface-container-low/40 flex items-start gap-2.5 md:gap-stack-sm ${past && (!v || v.status === 'completed') ? 'opacity-60' : ''}`}>
                      <div className="text-right w-12 md:w-14 shrink-0">
                        <span className="font-title-md text-[13px] md:text-[14px] font-bold text-indigo-gray-900 block leading-tight">{formatTime(s.start).replace(/ (AM|PM)$/, '')}</span>
                        <span className="block text-[10px] md:text-[11px] text-indigo-gray-600">{mins ? `${mins} min` : formatTime(s.start).slice(-2)}</span>
                      </div>
                      <div className={`w-1 self-stretch rounded-full ${bar}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-label-sm text-[13px] md:text-label-sm font-bold text-indigo-gray-900 truncate">{v?.patient?.name ?? 'Open slot'}</span>
                          {v ? <Chip tone={VISIT_STATUS[v.status]?.tone}>{VISIT_STATUS[v.status]?.label}</Chip> : <Chip tone="neutral">{s.booked ? 'Booked' : 'Available'}</Chip>}
                        </div>
                        <p className="text-[11px] md:text-xs text-indigo-gray-600 truncate mt-0.5">
                          {v ? `In-person • ID ${bookingCode(v.id)}` : 'Patients can book this slot'}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {/* Checked in */}
          <Card>
            <CardHeader
              title="Checked In & Waiting"
              subtitle="Patients at the clinic who still need their prescription"
              action={<Chip tone="teal">{checkedIn.length} waiting</Chip>}
            />
            {checkedIn.length === 0 ? (
              <EmptyState icon={UserCheck}>No one is checked in and waiting right now.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-3">
                {checkedIn.map((v) => (
                  <li key={v.id} className="p-3.5 rounded-lg bg-surface-container-low/60 border border-fresh-teal/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-stack-sm min-w-0">
                      <Avatar name={v.patient?.name ?? null} className="w-10 h-10 text-sm" />
                      <div className="min-w-0">
                        <span className="font-title-md text-[16px] text-indigo-gray-900 font-bold truncate block">{v.patient?.name ?? 'Patient'}</span>
                        <span className="text-xs text-indigo-gray-600 truncate block">
                          {[ageLine(v, facts, now), v.start ? `Slot ${formatTime(v.start)}` : null].filter(Boolean).join(' • ')}
                        </span>
                      </div>
                    </div>
                    <PrescriptionButton visit={ref(v)} kind="solid" label="Write Prescription" className="self-end md:self-center" />
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

function ageLine(v: Visit, facts: Awaited<ReturnType<typeof loadPatientFacts>>, now: number) {
  const f = v.patient ? facts[v.patient.id] : undefined
  const age = ageFrom(f?.dateOfBirth, now)
  return [age != null ? `${age} yrs` : null, f?.gender].filter(Boolean).join(' • ') || null
}

function NextPatient({
  visit,
  facts,
  history,
  now,
}: {
  visit: Visit
  facts: Awaited<ReturnType<typeof loadPatientFacts>>[string] | undefined
  history: Visit[]
  now: number
}) {
  const patient = visit.patient!
  const age = ageFrom(facts?.dateOfBirth, now)
  const previous = history.filter((h) => h.id !== visit.id && h.status === 'completed' && h.start && Date.parse(h.start) < now)
  const lastVisit = previous[previous.length - 1]
  const isToday = visit.start && formatDayLabel(visit.start, now) === 'Today'
  const status = VISIT_STATUS[visit.status]

  return (
    <div className="flex flex-col gap-3 md:gap-stack-md pt-1">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-gutter">
        <div className="flex items-center gap-3 md:gap-stack-md min-w-0">
          <Avatar name={patient.name} className="w-12 h-12 md:w-16 md:h-16 text-lg" square />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-title-md text-[16px] md:text-title-md text-indigo-gray-900 font-bold truncate">{patient.name}</h2>
              {(age != null || facts?.gender) && (
                <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm text-[10px] md:text-label-sm text-indigo-gray-600 font-semibold">
                  {[age != null ? `${age} yrs` : null, facts?.gender].filter(Boolean).join(' • ')}
                </span>
              )}
              {status && <Chip tone={status.tone}>{status.label}</Chip>}
            </div>
            <p className="font-label-sm text-[12px] md:text-label-sm text-secondary font-medium mt-0.5">
              {isToday ? 'Up next' : 'Next visit'} • {visit.start ? formatSlot(visit.start, now) : 'Time not set'} • ID {bookingCode(visit.id)}
            </p>
          </div>
        </div>
        <NextStepButton visit={ref(visit)} className="w-full sm:w-auto" />
      </div>

      <div className="bg-surface-container-low rounded-xl p-3 md:p-4 grid grid-cols-3 gap-2 md:gap-stack-sm text-center md:text-left">
        <Snapshot icon={Droplet} label="Blood Group" value={facts?.bloodGroup || 'Not added'} muted={!facts?.bloodGroup} />
        <Snapshot icon={ClipboardList} label="Visits With You" value={String(history.length)} />
        <Snapshot icon={History} label="Last Visit" value={lastVisit?.start ? formatShortDate(lastVisit.start) : 'First visit'} muted={!lastVisit} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/doctor/patients?patient=${patient.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-indigo-gray-900 font-label-sm text-label-sm"
        >
          <FolderOpen className="w-4 h-4 text-vibrant-blue" /> Patient Record
        </Link>
        {visit.status === 'confirmed' && <PrescriptionButton visit={ref(visit)} kind="soft" className="py-1.5 px-3" />}
        <CallLink phone={patient.phone} name={patient.name} />
        {visit.status === 'confirmed' && (
          <span className="flex items-center gap-1 text-[11px] text-indigo-gray-600">
            <Hourglass className="w-3.5 h-3.5" /> Check the patient in when they arrive
          </span>
        )}
      </div>
    </div>
  )
}

function Snapshot({ icon: Icon, label, value, muted }: { icon: LucideIcon; label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex flex-col items-center md:items-start min-w-0">
      <span className="font-label-sm text-[10px] md:text-label-sm text-indigo-gray-600 flex items-center gap-1">
        <Icon className="w-3.5 h-3.5 text-vibrant-blue" /> {label}
      </span>
      <span className={`font-title-md text-[14px] md:text-title-md font-bold mt-1 truncate max-w-full ${muted ? 'text-outline' : 'text-indigo-gray-900'}`}>{value}</span>
    </div>
  )
}
