import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { IST, doctorName, formatTime, istDateKey } from '@/components/patient/format'
import { dayOf, dayStartIso, istHour, loadHospitalDoctors, loadHospitalSlots, requireHospital, shiftDay, type Slot } from '../_lib/hospital'
import { AddDoctorButton } from '../_components/DoctorDialogs'
import { DutySheetButton, RosterList, type RosterDoctor, type RosterState } from '../_components/RosterList'
import { BarChart, DeskHead, EmptyLine, HosBody, HosHeader, Meter, Panel, PanelHead, PhoneStats, StatCard, btnOutline, btnPrimary, plural } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Duty Roster | Hospital Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const SLOT_MS = 15 * 60_000
// The timeline runs from 8 AM to 9 PM.
const OPEN_MIN = 8 * 60
const CLOSE_MIN = 21 * 60

const PERIODS = [
  { label: 'Morning', hours: 'Before 12 PM', test: (h: number) => h < 12 },
  { label: 'Afternoon', hours: '12 – 5 PM', test: (h: number) => h >= 12 && h < 17 },
  { label: 'Evening', hours: 'After 5 PM', test: (h: number) => h >= 17 },
]

/** Minutes past midnight in India for an ISO timestamp. */
const istMinutes = (ms: number) => Math.floor(((ms + 330 * 60_000) % DAY) / 60_000)
const endOf = (s: Slot) => (s.end ? Date.parse(s.end) : Date.parse(s.start) + SLOT_MS)

function stateFor(slots: Slot[], isToday: boolean, now: number): { state: RosterState; note: string | null } {
  if (slots.length === 0) return { state: 'off', note: null }
  if (!isToday) return { state: 'scheduled', note: null }
  const current = slots.find((s) => Date.parse(s.start) <= now && endOf(s) > now)
  if (current?.booked) return { state: 'consulting', note: null }
  if (endOf(slots[slots.length - 1]) <= now) return { state: 'done', note: null }
  if (Date.parse(slots[0].start) > now) return { state: 'later', note: `Starts ${formatTime(slots[0].start)}` }
  return { state: 'available', note: null }
}

/** Back-to-back slots joined into clinic sessions, placed on the 8 AM – 9 PM line. */
function timelineBlocks(slots: Slot[]): RosterDoctor['blocks'] {
  const runs: { start: number; end: number; slots: number }[] = []
  for (const s of slots) {
    const start = Date.parse(s.start)
    const last = runs[runs.length - 1]
    if (last && start - last.end <= SLOT_MS) {
      last.end = Math.max(last.end, endOf(s))
      last.slots += 1
    } else runs.push({ start, end: endOf(s), slots: 1 })
  }
  const span = CLOSE_MIN - OPEN_MIN
  return runs.flatMap((r) => {
    const from = Math.max(OPEN_MIN, istMinutes(r.start))
    const to = Math.min(CLOSE_MIN, istMinutes(r.end) || 24 * 60)
    if (to <= from) return []
    const left = ((from - OPEN_MIN) / span) * 100
    return [{ left, width: Math.max(2, ((to - from) / span) * 100), slots: r.slots, time: `${formatTime(new Date(r.start).toISOString())} – ${formatTime(new Date(r.end).toISOString())}` }]
  })
}

export default async function HospitalRosterPage(props: { searchParams?: Promise<{ date?: string }> }) {
  const params = (await props.searchParams) ?? {}
  const { admin, hospital, staff } = await requireHospital()
  const now = currentTime()
  const today = istDateKey(now)
  const day = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today
  const isToday = day === today

  // The week (Monday to Sunday) around the chosen day, for the bookings chart
  const weekStart = shiftDay(day, -((new Date(`${day}T12:00:00+05:30`).getUTCDay() + 6) % 7))
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(weekStart, i))

  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const ids = doctors.map((d) => d.id)
  const from = [weekStart, today].sort()[0]
  const until = Math.max(Date.parse(dayStartIso(shiftDay(week[6], 1))), Date.parse(dayStartIso(shiftDay(day, 1))), now + 7 * DAY)
  const slots = await loadHospitalSlots(admin, ids, dayStartIso(from), new Date(until).toISOString())

  const daySlots = slots.filter((s) => dayOf(s.start) === day)
  const nextWeek = slots.filter((s) => Date.parse(s.start) > now && Date.parse(s.start) < now + 7 * DAY)
  const openNextWeek = nextWeek.filter((s) => !s.booked).length
  const scheduledNextWeek = new Set(nextWeek.map((s) => s.doctorId))
  const departments = Array.from(new Set(doctors.map((d) => d.department))).sort()

  const roster: RosterDoctor[] = doctors.map((d) => {
    const mine = daySlots.filter((s) => s.doctorId === d.id)
    const { state, note } = stateFor(mine, isToday, now)
    const last = mine[mine.length - 1]
    return {
      id: d.id,
      name: doctorName(d.name),
      image: d.image,
      phone: d.phone,
      department: d.department,
      credentials: [d.department, d.experience ? `${d.experience} yrs` : null].filter(Boolean).join(' · '),
      shift: mine.length ? `${formatTime(mine[0].start)} – ${formatTime(new Date(endOf(last)).toISOString())}` : null,
      slots: mine.length,
      booked: mine.filter((s) => s.booked).length,
      state,
      stateNote: note,
      periods: PERIODS.map((p) => {
        const inPeriod = mine.filter((s) => p.test(istHour(s.start)))
        const end = inPeriod.length ? new Date(endOf(inPeriod[inPeriod.length - 1])).toISOString() : null
        return { label: p.label, hours: end ? `${formatTime(inPeriod[0].start)} – ${formatTime(end)}` : p.hours, slots: inPeriod.length }
      }),
      blocks: timelineBlocks(mine),
      edit: {
        id: d.id,
        name: doctorName(d.name),
        phone: d.phone,
        specialty: d.specialty,
        experience: d.experience,
        fee: d.fee,
        qualifications: d.qualifications,
        address: d.address,
        bio: d.bio,
      },
    }
  })
  // On duty first, then by name
  const rank: Record<RosterState, number> = { consulting: 0, available: 1, later: 2, scheduled: 2, done: 3, off: 4 }
  roster.sort((a, b) => rank[a.state] - rank[b.state] || a.name.localeCompare(b.name))

  const onDuty = roster.filter((d) => d.state !== 'off').length
  const booked = daySlots.filter((s) => s.booked).length
  const fullPct = daySlots.length ? Math.round((booked / daySlots.length) * 100) : 0
  const unscheduled = doctors.filter((d) => !scheduledNextWeek.has(d.id))
  const byDept = departments.map((dep) => ({ dep, count: doctors.filter((d) => d.department === dep).length })).sort((a, b) => b.count - a.count)
  const weekBars = week.map((k) => ({
    label: new Date(`${k}T12:00:00+05:30`).toLocaleDateString('en-US', { timeZone: IST, weekday: 'short' }),
    value: slots.filter((s) => s.booked && dayOf(s.start) === k).length,
    active: k === day,
  }))

  const dayLabel = `${isToday ? 'Today, ' : ''}${new Date(`${day}T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: IST, weekday: isToday ? undefined : 'short', day: 'numeric', month: 'short' })}`
  const subtitle = 'Who is consulting, when, and how full their day is.'
  const dayHref = (key: string) => (key === today ? '/hospital/doctors' : `/hospital/doctors?date=${key}`)

  return (
    <>
      <HosHeader staff={staff} title="Doctors & duty roster" subtitle={subtitle}>
        <div className="flex items-center justify-between p-1.5 rounded-[14px] bg-white text-[#0B1B3F]">
          <Link href={dayHref(shiftDay(day, -1))} aria-label="Previous day" className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center active:bg-[#F4F6FA]">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="text-[14.5px] font-extrabold">{dayLabel}</span>
          <Link href={dayHref(shiftDay(day, 1))} aria-label="Next day" className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center active:bg-[#F4F6FA]">
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </HosHeader>
      <HosBody>
        <DeskHead
          title="Doctors & duty roster"
          subtitle={subtitle}
          actions={
            <>
              <Link href={dayHref(shiftDay(day, -1))} aria-label="Previous day" className={`${btnOutline} !px-3`}>
                <ChevronLeft className="w-4 h-4" />
              </Link>
              <span className="px-1.5 text-[14.5px] font-extrabold whitespace-nowrap">{dayLabel}</span>
              <Link href={dayHref(shiftDay(day, 1))} aria-label="Next day" className={`${btnOutline} !px-3`}>
                <ChevronRight className="w-4 h-4" />
              </Link>
              {!isToday && (
                <Link href="/hospital/doctors" className={btnOutline}>
                  Today
                </Link>
              )}
              <DutySheetButton doctors={roster} day={day} className={btnOutline} />
              <AddDoctorButton departments={departments} label="Add doctor" className={btnPrimary} />
            </>
          }
        />

        <PhoneStats
          stats={[
            { label: 'Doctors', value: doctors.length, note: plural(departments.length, 'department') },
            { label: 'On duty', value: `${onDuty} of ${doctors.length}`, note: 'with slots this day', color: '#067647' },
            { label: 'Slots booked', value: `${booked} / ${daySlots.length}`, note: `${fullPct}% full`, color: '#2A4DD0' },
            { label: 'Open, 7 days', value: openNextWeek, note: 'bookable by patients' },
          ]}
        />

        <section className="hidden lg:grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Doctors" value={doctors.length} note={plural(departments.length, 'department')} />
          <StatCard label={isToday ? 'On duty today' : 'On duty'} value={`${onDuty} of ${doctors.length}`} note="With slots this day" />
          <StatCard label="Slots booked" value={`${booked} / ${daySlots.length}`} note={`${fullPct}% full`} />
          <StatCard label="Open next 7 days" value={openNextWeek} note="Bookable by patients" />
        </section>

        <RosterList doctors={roster} departments={departments} day={day} />

        {unscheduled.length > 0 && (
          <Panel className="lg:hidden mt-3.5">
            <NoSlotsList doctors={unscheduled.map((d) => ({ id: d.id, name: doctorName(d.name), department: d.department }))} />
          </Panel>
        )}

        <section className="hidden lg:grid grid-cols-3 gap-5 mt-5 items-start">
          <Panel>
            <PanelHead title="Doctors by department" />
            {byDept.length === 0 ? (
              <EmptyLine>No doctors yet.</EmptyLine>
            ) : (
              byDept.map(({ dep, count }) => (
                <div key={dep} className="py-2">
                  <div className="flex justify-between gap-3 mb-1.5 text-[13px]">
                    <span className="font-extrabold truncate">{dep}</span>
                    <span className="font-bold text-[#5B667A] shrink-0">{plural(count, 'doctor')}</span>
                  </div>
                  <Meter pct={(count / doctors.length) * 100} label={`${dep}: ${plural(count, 'doctor')}`} />
                </div>
              ))
            )}
          </Panel>
          <Panel>
            <PanelHead title="Bookings this week" sub="Booked slots, Monday to Sunday" />
            <BarChart bars={weekBars} label="Booked slots each day this week" width={360} height={180} />
          </Panel>
          <Panel>
            <NoSlotsList doctors={unscheduled.map((d) => ({ id: d.id, name: doctorName(d.name), department: d.department }))} />
          </Panel>
        </section>
      </HosBody>
    </>
  )
}

/** Doctors with nothing bookable in the next seven days: patients can't book them until slots are published. */
function NoSlotsList({ doctors }: { doctors: { id: string; name: string; department: string }[] }) {
  return (
    <>
      <PanelHead title="No slots this week" sub="Patients can’t book these doctors until slots are published" />
      {doctors.length === 0 ? (
        <EmptyLine>Every doctor has bookable slots in the next 7 days.</EmptyLine>
      ) : (
        <ul>
          {doctors.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7]">
              <span className="min-w-0">
                <span className="block text-[13.5px] font-extrabold truncate">{d.name}</span>
                <span className="block text-[12px] text-[#5B667A] truncate">{d.department}</span>
              </span>
              <Link href={`/hospital/doctors/${d.id}/schedule`} className={`${btnPrimary} !h-[34px] !px-3 !text-[12.5px] !shadow-none shrink-0`}>
                Publish slots
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
