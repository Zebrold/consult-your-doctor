import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Moon, Stethoscope, Sun, Sunrise, Users } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatLongDate, formatTime, istDateKey } from '@/components/patient/format'
import { Card, CardHeader, Chip, EmptyState, SegmentBar, StatCard } from '@/components/portal/ui'
import { dayOf, dayStartIso, loadHospitalDoctors, loadHospitalSlots, requireHospital, type Slot } from '../_lib/hospital'
import { AddDoctorButton } from '../_components/DoctorDialogs'
import { RosterList, type RosterDoctor, type RosterState } from '../_components/RosterList'

export const metadata: Metadata = { title: 'Duty Roster | Hospital Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const shift = (key: string, days: number) => istDateKey(Date.parse(`${key}T12:00:00+05:30`) + days * DAY)
const hourOf = (iso: string) => Number(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hourCycle: 'h23' }))

const PERIODS = [
  { key: 'morning', label: 'Morning', hours: 'Before 12 PM', icon: Sunrise, test: (h: number) => h < 12 },
  { key: 'afternoon', label: 'Afternoon', hours: '12 PM – 5 PM', icon: Sun, test: (h: number) => h >= 12 && h < 17 },
  { key: 'evening', label: 'Evening', hours: 'After 5 PM', icon: Moon, test: (h: number) => h >= 17 },
]

function stateFor(slots: Slot[], isToday: boolean, now: number): { state: RosterState; note: string | null } {
  if (slots.length === 0) return { state: 'off', note: null }
  if (!isToday) return { state: 'scheduled', note: null }
  const current = slots.find((s) => Date.parse(s.start) <= now && Date.parse(s.end ?? s.start) > now)
  if (current?.booked) return { state: 'consulting', note: null }
  const last = slots[slots.length - 1]
  if (Date.parse(last.end ?? last.start) <= now) return { state: 'done', note: null }
  if (Date.parse(slots[0].start) > now) return { state: 'later', note: `Starts ${formatTime(slots[0].start)}` }
  const nextOpen = slots.find((s) => !s.booked && Date.parse(s.start) > now)
  return { state: 'available', note: nextOpen ? `Available • next open ${formatTime(nextOpen.start)}` : 'Available • fully booked' }
}

export default async function HospitalRosterPage(props: { searchParams?: Promise<{ date?: string }> }) {
  const params = (await props.searchParams) ?? {}
  const { admin, hospital } = await requireHospital()
  const now = currentTime()
  const today = istDateKey(now)
  const day = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today
  const isToday = day === today

  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const ids = doctors.map((d) => d.id)
  const windowStart = dayStartIso(day < today ? day : today)
  const windowEnd = new Date(Math.max(Date.parse(dayStartIso(day)) + DAY, now + 7 * DAY)).toISOString()
  const slots = await loadHospitalSlots(admin, ids, windowStart, windowEnd)

  const daySlots = slots.filter((s) => dayOf(s.start) === day)
  const upcomingOpen = slots.filter((s) => !s.booked && Date.parse(s.start) > now && Date.parse(s.start) < now + 7 * DAY)
  const scheduledThisWeek = new Set(slots.filter((s) => Date.parse(s.start) > now && Date.parse(s.start) < now + 7 * DAY).map((s) => s.doctorId))
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
      credentials: [d.qualifications, d.experience ? `${d.experience} yrs` : null].filter(Boolean).join(' • ') || d.specialty,
      shift: mine.length ? `${formatTime(mine[0].start)} – ${formatTime(last.end ?? last.start)}` : null,
      slots: mine.length,
      booked: mine.filter((s) => s.booked).length,
      state,
      stateNote: note,
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

  const onDuty = roster.filter((d) => d.state !== 'off')
  const bookedToday = daySlots.filter((s) => s.booked).length
  const nowHour = hourOf(new Date(now).toISOString())
  const unscheduled = doctors.filter((d) => !scheduledThisWeek.has(d.id))

  return (
    <>
      <Card className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
            <span className="w-2 h-2 rounded-full bg-fresh-teal" /> Built from published slots
          </span>
          <h1 className="font-headline-lg text-[24px] md:text-headline-lg text-indigo-gray-900 font-bold tracking-tight mt-2">Doctors &amp; Duty Roster</h1>
          <p className="text-sm md:text-body-md text-indigo-gray-600">Who is consulting, when, and how full their day is.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-surface-container-low rounded-full p-1">
            <Link href={`/hospital/doctors?date=${shift(day, -1)}`} aria-label="Previous day" className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container-lowest">
              <ChevronLeft className="w-[18px] h-[18px]" />
            </Link>
            <span className="px-2 md:px-3 font-title-md text-[13px] md:text-[14px] font-bold text-indigo-gray-900 whitespace-nowrap">
              {isToday ? 'Today, ' : ''}
              {new Date(`${day}T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', weekday: isToday ? undefined : 'short', day: 'numeric', month: 'short' })}
            </span>
            <Link href={`/hospital/doctors?date=${shift(day, 1)}`} aria-label="Next day" className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container-lowest">
              <ChevronRight className="w-[18px] h-[18px]" />
            </Link>
          </div>
          {!isToday && (
            <Link href="/hospital/doctors" className="px-3.5 py-2 rounded-full bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-label-sm">
              Today
            </Link>
          )}
          <AddDoctorButton
            departments={departments}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-sm text-label-sm shadow-md"
          />
        </div>
      </Card>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-gutter">
        <StatCard label="Doctors" value={doctors.length} note={`${departments.length} departments`} noteTone="neutral" icon={Users} tone="blue" footer={<span className="text-[11px] text-indigo-gray-600">At {hospital.name}</span>} />
        <StatCard label={isToday ? 'On Duty Today' : 'On Duty'} value={onDuty.length} note={`of ${doctors.length}`} noteTone="neutral" icon={Stethoscope} tone="teal" footer={<span className="text-[11px] text-indigo-gray-600">With slots on this day</span>} />
        <StatCard
          label="Slots Booked"
          value={bookedToday}
          note={`of ${daySlots.length}`}
          noteTone="neutral"
          icon={CalendarDays}
          tone="neutral"
          footer={
            <SegmentBar
              parts={[
                { value: bookedToday, className: 'bg-vibrant-blue', label: 'booked' },
                { value: daySlots.length - bookedToday, className: 'bg-surface-container-highest', label: 'open' },
              ]}
            />
          }
        />
        <StatCard label="Open Slots (7 Days)" value={upcomingOpen.length} icon={CalendarClock} tone="coral" footer={<span className="text-[11px] text-indigo-gray-600">Bookable by patients now</span>} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-gutter items-start">
        <div className="xl:col-span-8">
          <RosterList doctors={roster} departments={departments} day={day} />
        </div>

        <div className="xl:col-span-4 flex flex-col gap-4 md:gap-gutter">
          <Card>
            <CardHeader title="Shift Timetable" subtitle={formatLongDate(`${day}T12:00:00+05:30`)} />
            <ul className="flex flex-col gap-3">
              {PERIODS.map((p) => {
                const inPeriod = daySlots.filter((s) => p.test(hourOf(s.start)))
                const docs = new Set(inPeriod.map((s) => s.doctorId)).size
                const booked = inPeriod.filter((s) => s.booked).length
                const current = isToday && p.test(nowHour)
                return (
                  <li key={p.key} className={`p-4 rounded-xl flex flex-col gap-2 ${current ? 'bg-primary-fixed/30' : 'bg-surface-container-low'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-title-md text-[15px] font-bold text-indigo-gray-900">
                        <p.icon className="w-4 h-4 text-vibrant-blue" /> {p.label}
                      </span>
                      {current ? <Chip tone="blue">Now</Chip> : <span className="text-[12px] text-indigo-gray-600">{p.hours}</span>}
                    </div>
                    <p className="text-[12px] text-indigo-gray-600">
                      {docs ? `${docs} ${docs === 1 ? 'doctor' : 'doctors'} • ${booked}/${inPeriod.length} slots booked` : 'No slots'}
                    </p>
                    {inPeriod.length > 0 && (
                      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                        <div className="bg-vibrant-blue h-full rounded-full" style={{ width: `${(booked / inPeriod.length) * 100}%` }} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader title="No Slots This Week" subtitle="Patients can’t book these doctors until slots are published" action={<Chip tone={unscheduled.length ? 'coral' : 'teal'}>{unscheduled.length}</Chip>} />
            {unscheduled.length === 0 ? (
              <EmptyState icon={CalendarDays}>Every doctor has bookable slots in the next 7 days.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2">
                {unscheduled.map((d) => (
                  <li key={d.id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-indigo-gray-900 truncate">{doctorName(d.name)}</span>
                      <span className="block text-[12px] text-indigo-gray-600 truncate">{d.department}</span>
                    </span>
                    <Link href={`/hospital/doctors/${d.id}/schedule`} className="px-3 py-1.5 rounded-full bg-vibrant-blue text-on-primary text-[12px] font-bold shrink-0">
                      Publish slots
                    </Link>
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
