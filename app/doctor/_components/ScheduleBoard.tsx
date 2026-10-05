'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity, Ban, CalendarCheck, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, FileText,
  HeartPulse, Hourglass, LoaderCircle, MapPin, PlusCircle, Receipt, Stethoscope, UserCheck, UserPlus, Wallet, Wind,
  type LucideIcon,
} from 'lucide-react'
import { blockScheduleSlot } from '@/app/actions/doctor'
import { CONSULTATION_PLATFORM_FEE } from '@/lib/pricing'
import { showHR, showSpO2 } from '@/lib/vitals'
import { doctorName, formatDayLabel, formatINR, formatShortDate, formatTime, istDateKey } from '@/components/patient/format'
import { Avatar, Chip } from '@/components/portal/ui'
import { CallLink, CheckInButton, NextStepButton, PrescriptionButton, type VisitRef } from './VisitControls'
import { WalkInButton } from './WalkInModal'
import { ProfileEditor, type EditableProfile } from './ProfileEditor'

export type BoardVisit = {
  id: string
  status: string
  scheduleId: string | null
  start: string
  end: string | null
  patient: { id: string; name: string; phone: string | null } | null
  recordUrl: string | null
  hasNotes: boolean
}
export type BoardVitals = { bp: string | null; spo2: string | null; hr: string | null; date: string | null }
export type BoardPatientFacts = { age: number | null; gender: string | null; bloodGroup: string | null; vitals: BoardVitals | null }
type Slot = { id: string; start: string; end: string | null; booked: boolean }
type Item = { key: string; start: string; end: string | null; slot: Slot | null; visit: BoardVisit | null }
type Filter = 'all' | 'booked' | 'checked-in' | 'open' | 'done'
type View = 'day' | 'week' | 'month' | 'list'

const DAY = 86_400_000
const noon = (key: string) => Date.parse(`${key}T12:00:00+05:30`)
const addDays = (key: string, n: number) => istDateKey(noon(key) + n * DAY)
const weekdayOf = (key: string) => new Date(noon(key)).getUTCDay() // 0 = Sunday
const isOpenVisit = (v: BoardVisit) => v.status === 'confirmed' || v.status === 'visited'
const ref = (v: BoardVisit): VisitRef => ({ id: v.id, status: v.status, patientName: v.patient?.name ?? 'Patient', phone: v.patient?.phone ?? null })
const dayLabel = (key: string, opts: Intl.DateTimeFormatOptions) => new Date(noon(key)).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', ...opts })

function classify(item: Item): Exclude<Filter, 'all'> {
  if (!item.visit) return item.slot?.booked ? 'booked' : 'open'
  if (item.visit.status === 'completed') return 'done'
  if (item.visit.status === 'visited') return 'checked-in'
  return 'booked'
}

const FILTERS: { id: Filter; label: string; dot: string }[] = [
  { id: 'all', label: 'All slots', dot: 'bg-indigo-gray-600' },
  { id: 'booked', label: 'Booked', dot: 'bg-vibrant-blue' },
  { id: 'checked-in', label: 'Checked in', dot: 'bg-fresh-teal' },
  { id: 'open', label: 'Open', dot: 'bg-outline-variant' },
  { id: 'done', label: 'Completed', dot: 'bg-secondary' },
]

const VIEWS: { id: View; label: string; phone: boolean }[] = [
  { id: 'day', label: 'Day', phone: true },
  { id: 'week', label: 'Week', phone: true },
  { id: 'month', label: 'Month', phone: true },
  { id: 'list', label: 'List', phone: false },
]

const card = 'bg-surface-container-lowest rounded-xl shadow-[0_2px_16px_rgba(0,102,255,0.03)]'

export function ScheduleBoard({
  doctor,
  slots,
  visits,
  facts,
  now,
  initialDate,
  windowKeys,
}: {
  doctor: {
    name: string
    image: string | null
    specialty: string | null
    qualifications: string | null
    hospital: { name: string; city: string | null; address: string | null } | null
    fee: number | null
    editable: EditableProfile
  }
  slots: Slot[]
  visits: BoardVisit[]
  facts: Record<string, BoardPatientFacts>
  now: number
  initialDate: string
  windowKeys: { from: string; to: string }
}) {
  const router = useRouter()
  const today = istDateKey(now)
  const [date, setDate] = useState(initialDate)
  const [view, setView] = useState<View>('day')
  const [filter, setFilter] = useState<Filter>('all')
  const [month, setMonth] = useState(initialDate.slice(0, 7))

  const itemsByDay = useMemo(() => {
    const map = new Map<string, Item[]>()
    const add = (item: Item) => {
      const key = istDateKey(item.start)
      map.set(key, [...(map.get(key) ?? []), item])
    }
    const visitBySlot = new Map(visits.filter((v) => v.scheduleId).map((v) => [v.scheduleId!, v]))
    const placed = new Set<string>()
    for (const s of slots) {
      const v = visitBySlot.get(s.id) ?? null
      if (v) placed.add(v.id)
      add({ key: s.id, start: s.start, end: s.end, slot: s, visit: v })
    }
    for (const v of visits) if (!placed.has(v.id)) add({ key: v.id, start: v.start, end: v.end, slot: null, visit: v })
    for (const list of map.values()) list.sort((a, b) => a.start.localeCompare(b.start))
    return map
  }, [slots, visits])

  const pick = (key: string) => {
    if (key < windowKeys.from || key > windowKeys.to) {
      router.push(`/doctor/schedule?date=${key}`)
      return
    }
    setDate(key)
    setMonth(key.slice(0, 7))
  }

  const dayItems = itemsByDay.get(date) ?? []
  const shown = filter === 'all' ? dayItems : dayItems.filter((i) => classify(i) === filter)
  const counts = (key: Exclude<Filter, 'all'>) => dayItems.filter((i) => classify(i) === key).length
  const bookedItems = dayItems.filter((i) => i.visit)
  const bookedMinutes = bookedItems.reduce((m, i) => m + (i.end ? (Date.parse(i.end) - Date.parse(i.start)) / 60000 : 0), 0)
  const unpaid = dayItems.filter((i) => i.visit?.status === 'pending_payment').length
  const waiting = dayItems.filter((i) => i.visit?.status === 'visited')

  // Banner: a checked-in patient first (they're at the clinic), then whoever's slot is now, then the next booking today
  const spotlight =
    date === today
      ? dayItems.find((i) => i.visit?.status === 'visited') ??
        dayItems.find((i) => i.visit && isOpenVisit(i.visit) && Date.parse(i.start) <= now && Date.parse(i.end ?? i.start) > now) ??
        dayItems.find((i) => i.visit && isOpenVisit(i.visit) && Date.parse(i.start) > now) ??
        null
      : null

  // Week (Monday first) around the selected date
  const weekStart = addDays(date, -((weekdayOf(date) + 6) % 7))
  const weekKeys = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekItems = weekKeys.flatMap((k) => itemsByDay.get(k) ?? [])
  const weekBooked = weekItems.filter((i) => i.visit || i.slot?.booked).length
  const weekPct = weekItems.length ? Math.round((weekBooked / weekItems.length) * 100) : 0

  const relative = formatDayLabel(noon(date), now)
  const dateLabel =
    relative === 'Today' || relative === 'Tomorrow'
      ? `${relative}, ${dayLabel(date, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : `${relative} ${new Date(noon(date)).getUTCFullYear()}`
  const stepDays = view === 'week' ? 7 : view === 'month' ? 31 : 1
  const navLabel =
    view === 'week'
      ? `Week of ${dayLabel(weekStart, { day: 'numeric', month: 'short' })}`
      : view === 'month'
        ? dayLabel(`${month}-01`, { month: 'long', year: 'numeric' })
        : dateLabel

  const shiftBy = (direction: -1 | 1) => {
    if (view === 'month') {
      const target = addDays(`${month}-01`, direction === 1 ? 32 : -1).slice(0, 7)
      pick(`${target}-01`)
    } else {
      pick(addDays(date, direction * stepDays))
    }
  }

  return (
    <>
      {/* Command bar */}
      <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 md:gap-stack-md md:bg-surface-container-lowest md:p-stack-md md:rounded-xl md:shadow-[0_4px_24px_rgba(0,102,255,0.04)]">
        <div className="hidden md:flex items-center gap-stack-sm min-w-0">
          <span className="relative shrink-0">
            <Avatar name={doctor.name} image={doctor.image} className="w-14 h-14 text-lg shadow-sm" />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-fresh-teal ring-2 ring-surface-container-lowest" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-base min-w-0">
              <h1 className="font-title-md text-title-md text-indigo-gray-900 tracking-tight truncate">{doctorName(doctor.name)}</h1>
              {doctor.qualifications && doctor.qualifications.length <= 24 && (
                <span className="px-2 py-0.5 rounded-full bg-surface-variant text-primary font-label-sm text-[11px] tracking-wide shrink-0">{doctor.qualifications}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-stack-sm gap-y-1 mt-0.5 text-[13px] text-indigo-gray-600">
              {doctor.specialty && (
                <span className="flex items-center gap-1">
                  <Stethoscope className="w-4 h-4 text-vibrant-blue" /> {doctor.specialty}
                </span>
              )}
              {doctor.specialty && doctor.hospital && <span className="hidden sm:inline text-outline-variant">•</span>}
              {doctor.hospital && (
                <span className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-4 h-4 text-fresh-teal shrink-0" />
                  <span className="truncate">{[doctor.hospital.name, doctor.hospital.city].filter(Boolean).join(', ')}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 md:gap-stack-sm">
          <div className="flex items-center justify-between gap-2 bg-surface-container-lowest md:bg-transparent px-3 py-2 md:p-0 rounded-xl border border-surface-container md:border-0 shadow-sm md:shadow-none">
            <div className="flex items-center min-w-0 md:bg-surface-container-low md:px-base md:py-1 md:rounded-full md:shadow-sm">
              <button type="button" aria-label="Previous" onClick={() => shiftBy(-1)} className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:text-primary hover:bg-surface-container-lowest">
                <ChevronLeft className="w-4 h-4 md:w-[18px] md:h-[18px]" />
              </button>
              <span className="px-1 md:px-base flex items-center gap-1.5 font-title-md text-[12px] md:text-[14px] text-indigo-gray-900 md:whitespace-nowrap min-w-0 leading-tight">
                <CalendarDays className="w-3.5 h-3.5 md:w-4 md:h-4 text-vibrant-blue" />
                {navLabel}
              </span>
              <button type="button" aria-label="Next" onClick={() => shiftBy(1)} className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:text-primary hover:bg-surface-container-lowest">
                <ChevronRight className="w-4 h-4 md:w-[18px] md:h-[18px]" />
              </button>
            </div>
            <div className="flex items-center bg-surface-container-low p-0.5 md:p-1 rounded-lg md:rounded-full md:shadow-sm">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={view === v.id}
                  onClick={() => setView(v.id)}
                  className={`${v.phone ? '' : 'hidden md:block'} px-2 md:px-base py-1 rounded-md md:rounded-full font-label-sm text-[11px] md:text-[12px] transition-colors ${
                    view === v.id ? 'bg-surface-container-lowest md:bg-primary text-primary md:text-on-primary font-bold shadow-sm' : 'text-indigo-gray-600 hover:text-indigo-gray-900'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2 md:gap-base">
            <button
              type="button"
              onClick={() => {
                pick(today)
                setView('day')
              }}
              disabled={date === today && view === 'day'}
              className="px-stack-sm py-2 rounded-xl md:rounded-full bg-surface-container-lowest md:bg-surface-container border border-surface-container md:border-0 hover:bg-surface-container-high text-indigo-gray-900 font-label-sm text-label-sm flex items-center justify-center gap-1 disabled:opacity-60"
            >
              <CalendarCheck className="w-[18px] h-[18px] text-vibrant-blue" /> Today
            </button>
            <WalkInButton
              label="New Appointment"
              icon={<PlusCircle className="w-[18px] h-[18px]" />}
              className="px-stack-md py-2 rounded-xl md:rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm shadow-[0_4px_14px_rgba(0,102,255,0.25)] hover:bg-primary hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5"
            />
          </div>
        </div>
      </section>

      {/* Day KPIs */}
      <section className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-base overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Kpi label="Total Booked" value={bookedItems.length} note={bookedMinutes ? `${(bookedMinutes / 60).toFixed(1)} hrs` : undefined} icon={CalendarDays} tint="bg-primary/10 text-primary" />
        <Kpi label="Checked In" value={counts('checked-in')} note="In clinic" noteClass="text-fresh-teal" icon={UserCheck} tint="bg-secondary-container/30 text-secondary" />
        <Kpi
          label={spotlight?.visit?.status === 'visited' ? 'In Consult' : 'Awaiting Payment'}
          value={spotlight?.visit?.status === 'visited' ? 1 : unpaid}
          note={spotlight?.visit?.status === 'visited' ? 'Active' : unpaid ? 'Unpaid' : undefined}
          noteClass="text-soft-coral"
          icon={spotlight?.visit?.status === 'visited' ? Stethoscope : Hourglass}
          tint={spotlight?.visit?.status === 'visited' ? 'bg-primary-fixed text-primary' : 'bg-error-container/60 text-tertiary'}
          highlight={spotlight?.visit?.status === 'visited'}
        />
        <Kpi label="Open Slots" value={dayItems.filter((i) => classify(i) === 'open' && Date.parse(i.start) > now).length} note="Bookable" noteClass="text-indigo-gray-600" icon={CalendarClock} tint="bg-surface-container-high text-primary" />
        <Kpi label="Completed" value={counts('done')} note="Signed off" noteClass="text-fresh-teal" icon={CheckCircle2} tint="bg-surface-container-low text-indigo-gray-600" />
      </section>

      {/* Current / next consultation */}
      {spotlight?.visit?.patient && view === 'day' && <Spotlight item={spotlight} facts={facts[spotlight.visit.patient.id]} now={now} />}

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-gutter items-start">
        {/* Left: calendar & filters */}
        <div className="hidden xl:flex xl:col-span-3 flex-col gap-stack-md">
          <MiniCalendar month={month} setMonth={setMonth} selected={date} today={today} hasSlots={(k) => itemsByDay.has(k)} onPick={pick} />
          <div className={`${card} p-stack-md flex flex-col gap-stack-sm`}>
            <div className="flex items-center justify-between">
              <span className="font-title-md text-[14px] text-indigo-gray-900 uppercase tracking-wider">Slot Status</span>
              {filter !== 'all' && (
                <button type="button" onClick={() => setFilter('all')} className="font-label-sm text-[11px] text-primary hover:underline">
                  Show all
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {FILTERS.filter((f) => f.id !== 'all').map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(filter === f.id ? 'all' : f.id)}
                  className={`flex items-center justify-between p-2 rounded-lg text-left transition-colors ${filter === f.id ? 'bg-primary-fixed/40' : 'hover:bg-surface-container-low'} ${filter !== 'all' && filter !== f.id ? 'opacity-50' : ''}`}
                >
                  <span className="flex items-center gap-2 text-[13px] text-indigo-gray-900">
                    <span className={`w-4 h-4 rounded flex items-center justify-center ${filter === 'all' || filter === f.id ? 'bg-primary text-on-primary' : 'border border-outline-variant'}`}>
                      {(filter === 'all' || filter === f.id) && <CheckCircle2 className="w-3 h-3" />}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${f.dot}`} /> {f.label}
                  </span>
                  <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-bold">{counts(f.id as Exclude<Filter, 'all'>)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Centre */}
        <div className="xl:col-span-6 min-w-0 flex flex-col gap-stack-sm">
          {/* Phone & tablet: week strip + filter chips */}
          {view === 'day' && (
            <div className="xl:hidden flex flex-col gap-3">
              <div className="flex justify-between items-center bg-surface-container-lowest p-1.5 rounded-2xl border border-surface-container shadow-sm text-center">
                {weekKeys.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pick(k)}
                    className={`flex-1 py-1.5 rounded-xl ${k === date ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'hover:bg-surface-container-low text-indigo-gray-600'}`}
                  >
                    <span className={`block text-[10px] font-medium ${k === date ? 'text-on-primary/80' : ''}`}>{new Date(noon(k)).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'narrow' })}</span>
                    <span className={`block text-xs font-bold ${k === date ? '' : 'text-indigo-gray-900'}`}>{Number(k.slice(8))}</span>
                    <span className={`mx-auto mt-0.5 block w-1 h-1 rounded-full ${itemsByDay.has(k) ? (k === date ? 'bg-on-primary' : 'bg-vibrant-blue') : 'bg-transparent'}`} />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-2.5 py-1 rounded-full border text-xs flex items-center gap-1.5 shrink-0 ${
                      filter === f.id ? 'bg-primary-fixed/50 text-primary border-primary/30 font-semibold' : 'bg-surface-container-lowest text-indigo-gray-600 border-surface-container font-medium'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} /> {f.label}
                    <span className={`text-[10px] px-1 rounded-full ${filter === f.id ? 'bg-primary/15 text-primary' : 'bg-surface-container'}`}>{f.id === 'all' ? dayItems.length : counts(f.id)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === 'day' && (
            <>
              <div className="flex items-center justify-between gap-2 px-1 md:px-base">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="font-title-md text-[12px] md:text-title-md text-indigo-gray-600 md:text-indigo-gray-900 uppercase md:normal-case font-semibold">
                    {date === today ? "Today's Timeline" : 'Timeline'}
                  </h2>
                  <span className="font-label-sm text-[11px] md:text-[12px] text-indigo-gray-600 truncate">
                    {dayItems.length ? `${formatTime(dayItems[0].start)} – ${formatTime(dayItems[dayItems.length - 1].end ?? dayItems[dayItems.length - 1].start)}` : 'No slots'}
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-stack-sm text-[12px] font-label-sm text-indigo-gray-600 shrink-0">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Booked</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-fresh-teal" /> Checked in</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-soft-coral" /> Unpaid</span>
                </div>
                <span className="md:hidden text-[11px] text-outline">{bookedItems.length} appointments</span>
              </div>
              {shown.length === 0 ? (
                <div className="p-8 rounded-xl bg-surface-container-lowest shadow-sm text-center text-sm text-indigo-gray-600">
                  {dayItems.length === 0 ? 'No slots on this day. Your hospital admin publishes your slots.' : 'No slots match this filter.'}
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5 md:gap-3">
                  {shown.map((item) => (
                    <TimelineRow key={item.key} item={item} now={now} />
                  ))}
                </ul>
              )}
            </>
          )}

          {view === 'week' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {weekKeys.map((k) => {
                const items = itemsByDay.get(k) ?? []
                const booked = items.filter((i) => i.visit)
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      pick(k)
                      setView('day')
                    }}
                    className={`text-left bg-surface-container-lowest p-stack-sm rounded-xl shadow-sm hover:shadow-md transition-shadow ${k === today ? 'ring-2 ring-vibrant-blue/40' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-title-md text-[15px] text-indigo-gray-900 font-bold">{dayLabel(k, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="text-[11px] text-indigo-gray-600">
                        {booked.length} booked • {items.filter((i) => classify(i) === 'open').length} open
                      </span>
                    </div>
                    {booked.length === 0 ? (
                      <p className="text-xs text-outline">{items.length ? 'No bookings yet' : 'No slots'}</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {booked.slice(0, 5).map((i) => (
                          <li key={i.key} className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-primary w-16 shrink-0">{formatTime(i.start)}</span>
                            <span className="truncate text-indigo-gray-900">{i.visit?.patient?.name ?? 'Patient'}</span>
                          </li>
                        ))}
                        {booked.length > 5 && <li className="text-[11px] text-indigo-gray-600">+{booked.length - 5} more</li>}
                      </ul>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {view === 'month' && (
            <MonthGrid
              month={month}
              today={today}
              selected={date}
              itemsByDay={itemsByDay}
              onPick={(k) => {
                pick(k)
                setView('day')
              }}
            />
          )}

          {view === 'list' && <BookingList itemsByDay={itemsByDay} from={date} now={now} />}
        </div>

        {/* Right: fees, waiting room, week */}
        <div className="xl:col-span-3 min-w-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4 md:gap-stack-md">
          {date === today && (
            <div className={`xl:hidden ${card} p-3.5 md:p-stack-md flex flex-col gap-2.5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-title-md text-[13px] md:text-[15px] font-bold text-indigo-gray-900">Waiting Room</h3>
                  <span className="px-1.5 bg-primary-fixed text-primary font-bold text-[10px] rounded-full">{waiting.length}</span>
                </div>
                <span className="text-[10px] font-medium text-fresh-teal flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-fresh-teal rounded-full animate-pulse" /> Checked in today
                </span>
              </div>
              {waiting.length === 0 ? (
                <p className="text-[12px] text-indigo-gray-600 py-1">No one is checked in and waiting.</p>
              ) : (
                <ul className="divide-y divide-surface-container">
                  {waiting.map((i) => {
                    const mins = Math.round((now - Date.parse(i.start)) / 60_000)
                    return (
                      <li key={i.key} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-indigo-gray-900 truncate">{i.visit?.patient?.name ?? 'Patient'}</p>
                          <p className="text-[10px] text-indigo-gray-600">Slot {formatTime(i.start)} • ID {i.visit!.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${mins > 15 ? 'text-tertiary bg-error-container' : mins > 0 ? 'text-amber-700 bg-amber-50' : 'text-indigo-gray-600 bg-surface-container'}`}>
                          {mins > 0 ? `Slot ${mins} min ago` : `In ${-mins} min`}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
              <WalkInButton
                label="Add Walk-in Patient"
                icon={<UserPlus className="w-[18px] h-[18px]" />}
                className="w-full py-2 px-3 bg-error-container/40 border border-soft-coral/30 text-tertiary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:bg-error-container"
              />
            </div>
          )}

          <div className={`${card} p-stack-md flex flex-col gap-stack-sm`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-title-md text-[15px] text-indigo-gray-900">Consultation Fees</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">Live</span>
                </div>
                <span className="text-[11px] text-indigo-gray-600">What patients pay to book you</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-[10px] font-bold shrink-0">₹ INR</span>
            </div>
            <div className="flex flex-col gap-2">
              <FeeRow icon={Stethoscope} tint="bg-primary/10 text-primary" title="In-Person Clinic Visit" sub="Per booked slot" value={doctor.fee ? formatINR(doctor.fee) : 'Not set'}>
                <ProfileEditor
                  profile={doctor.editable}
                  label=""
                  ariaLabel="Edit consultation fee"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-indigo-gray-600 hover:text-primary hover:bg-surface-container-lowest transition-colors"
                />
              </FeeRow>
              <FeeRow icon={Receipt} tint="bg-surface-container text-secondary" title="Platform Fee" sub="Added at checkout" value={formatINR(CONSULTATION_PLATFORM_FEE)} />
              {doctor.fee ? <FeeRow icon={Wallet} tint="bg-fresh-teal/15 text-fresh-teal" title="Patient Pays" sub="Total at checkout" value={formatINR(doctor.fee + CONSULTATION_PLATFORM_FEE)} /> : null}
            </div>
            <ProfileEditor
              profile={doctor.editable}
              label="Update Consultation Fee"
              className="w-full py-2.5 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-sm text-[12px] font-bold shadow-[0_4px_14px_rgba(0,102,255,0.25)] transition-all flex items-center justify-center gap-1.5"
            />
          </div>

          <div className={`${card} p-stack-md flex flex-col gap-stack-sm`}>
            <div className="flex items-center justify-between">
              <span className="font-title-md text-[14px] text-indigo-gray-900 uppercase tracking-wider">Slot Utilisation</span>
              <span className="font-label-sm text-[11px] text-fresh-teal font-bold">This week</span>
            </div>
            <div className="flex items-center gap-stack-sm">
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
                  <path className="text-surface-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path className="text-vibrant-blue" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${weekPct}, 100`} strokeLinecap="round" strokeWidth="3.5" />
                </svg>
                <span className="absolute font-headline-lg text-[14px] text-indigo-gray-900 font-bold">{weekPct}%</span>
              </div>
              <div className="flex flex-col gap-1 text-[11px] text-indigo-gray-600">
                <span>Slots booked: <strong className="text-indigo-gray-900">{weekBooked} of {weekItems.length}</strong></span>
                <span>Completed: <strong className="text-indigo-gray-900">{weekItems.filter((i) => classify(i) === 'done').length}</strong></span>
                <span>Still open: <strong className="text-fresh-teal">{weekItems.filter((i) => classify(i) === 'open' && Date.parse(i.start) > now).length}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function Kpi({
  label,
  value,
  note,
  noteClass = 'text-primary',
  icon: Icon,
  tint,
  highlight,
}: {
  label: string
  value: number
  note?: string
  noteClass?: string
  icon: LucideIcon
  tint: string
  highlight?: boolean
}) {
  return (
    <div
      className={`shrink-0 w-32 md:w-auto p-2.5 md:p-stack-sm rounded-xl border shadow-[0_2px_12px_rgba(0,102,255,0.03)] flex items-start md:items-center justify-between gap-2 ${
        highlight ? 'bg-primary/5 border-primary/30' : 'bg-surface-container-lowest border-surface-container md:border-transparent'
      }`}
    >
      <div className="min-w-0">
        <span className={`font-label-sm text-[10px] md:text-[11px] uppercase tracking-wider block truncate ${highlight ? 'text-primary' : 'text-indigo-gray-600'}`}>{label}</span>
        <div className="flex flex-col md:flex-row md:items-baseline md:gap-base mt-0.5">
          <span className={`font-headline-lg text-[18px] md:text-[26px] font-extrabold ${highlight ? 'text-primary' : 'text-indigo-gray-900'}`}>{String(value).padStart(2, '0')}</span>
          {note && <span className={`font-label-sm text-[10px] md:text-[11px] ${noteClass}`}>{note}</span>}
        </div>
      </div>
      <span className={`w-6 h-6 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${tint}`}>
        <Icon className="w-3 h-3 md:w-5 md:h-5" />
      </span>
    </div>
  )
}

function FeeRow({
  icon: Icon,
  tint,
  title,
  sub,
  value,
  children,
}: {
  icon: LucideIcon
  tint: string
  title: string
  sub: string
  value: string
  children?: ReactNode
}) {
  return (
    <div className="p-stack-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tint}`}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="flex flex-col min-w-0">
          <span className="font-title-md text-[12px] text-indigo-gray-900 font-semibold truncate">{title}</span>
          <span className="text-[10px] text-indigo-gray-600 truncate">{sub}</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-title-md text-[13px] text-indigo-gray-900 font-bold">{value}</span>
        {children}
      </div>
    </div>
  )
}

function Spotlight({ item, facts, now }: { item: Item; facts: BoardPatientFacts | undefined; now: number }) {
  const visit = item.visit!
  const patient = visit.patient!
  const live = Date.parse(item.start) <= now && Date.parse(item.end ?? item.start) > now
  const elapsed = Math.max(0, Math.round((now - Date.parse(item.start)) / 60000))
  const vitals = facts?.vitals
  const tag =
    visit.status === 'visited'
      ? live
        ? `Current consultation • ${elapsed}m elapsed`
        : 'Checked in • waiting for you'
      : live
        ? 'Slot in progress • not checked in'
        : 'Up next'

  return (
    <section className="relative overflow-hidden rounded-2xl md:rounded-xl bg-gradient-to-br md:bg-gradient-to-r from-vibrant-blue via-primary-container to-primary md:from-primary md:via-primary md:to-vibrant-blue text-on-primary p-4 md:p-stack-md shadow-[0_8px_24px_rgba(0,102,255,0.18)]">
      <div aria-hidden className="absolute -right-6 -bottom-6 w-36 h-36 bg-on-primary/10 rounded-full blur-xl pointer-events-none" />
      <svg aria-hidden className="hidden md:block absolute right-0 inset-y-0 h-full w-1/3 opacity-10 pointer-events-none text-on-primary" preserveAspectRatio="none" viewBox="0 0 300 120">
        <path d="M0,60 Q75,10 150,60 T300,60" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M0,80 Q75,30 150,80 T300,80" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-stack-md">
        <div className="flex items-start sm:items-center gap-stack-sm min-w-0">
          <span className="w-11 h-11 md:w-14 md:h-14 rounded-xl bg-on-primary/20 border border-on-primary/30 flex items-center justify-center font-bold text-sm md:text-base shrink-0">
            {patient.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-base">
              <span className="px-2 py-0.5 rounded-full bg-on-primary/20 font-label-sm text-[10px] md:text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-secondary-fixed rounded-full animate-pulse" />
                {tag}
              </span>
              <span className="text-[11px] md:text-[13px] text-on-primary/80">
                {formatTime(item.start)}
                {item.end ? ` – ${formatTime(item.end)}` : ''}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-fresh-teal text-on-primary font-label-sm text-[10px] uppercase font-bold">In-Person</span>
            </div>
            <h2 className="font-headline-lg text-[18px] md:text-headline-lg-mobile lg:text-headline-lg tracking-tight mt-1 truncate">
              {patient.name}
              {facts?.age != null && <span>, {facts.age}</span>}
              <span className="font-body-md text-[12px] md:text-body-md text-on-primary/80"> • ID {visit.id.slice(0, 8).toUpperCase()}</span>
            </h2>
            <p className="text-[12px] md:text-[14px] text-on-primary/90 mt-0.5 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 shrink-0" />
              {[facts?.gender, facts?.bloodGroup ? `Blood group ${facts.bloodGroup}` : null].filter(Boolean).join(' • ') || 'In-person consultation'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 lg:flex lg:items-center gap-2 lg:gap-stack-sm pt-3 lg:pt-0 border-t border-on-primary/15 lg:border-0 lg:bg-on-primary/10 lg:backdrop-blur-md lg:px-stack-md lg:py-stack-sm lg:rounded-lg self-stretch lg:self-center">
          {vitals ? (
            <>
              <SpotFact icon={HeartPulse} label="Blood Pressure" value={vitals.bp ?? '—'} unit={vitals.bp && /^\d+\/\d+$/.test(vitals.bp) ? 'mmHg' : undefined} />
              <Divider />
              <SpotFact icon={Activity} label="Heart Rate" value={vitals.hr ? showHR(vitals.hr) : '—'} />
              <Divider />
              <SpotFact icon={Wind} label="SpO2" value={vitals.spo2 ? showSpO2(vitals.spo2) : '—'} />
            </>
          ) : (
            <>
              <SpotFact label="Blood group" value={facts?.bloodGroup || '—'} />
              <Divider />
              <SpotFact label="Sex" value={facts?.gender || '—'} />
              <Divider />
              <SpotFact label="Status" value={visit.status === 'visited' ? 'Checked in' : visit.status === 'confirmed' ? 'Booked' : 'Done'} />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 md:gap-base shrink-0">
          <span className="hidden sm:flex items-center gap-1 text-[10px] md:text-[11px] font-label-sm text-on-primary/80 lg:bg-on-primary/10 lg:px-base lg:py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-fresh-teal" />
            {vitals ? `Vitals from ${vitals.date ? formatShortDate(vitals.date) : 'your notes'}` : 'No vitals recorded yet'}
          </span>
          <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
            <CallLink phone={patient.phone} name={patient.name} kind="light" pad="p-2.5" />
            <NextStepButton visit={ref(visit)} kind="light" pad="px-3.5 md:px-stack-md py-2 md:py-2.5" />
          </div>
        </div>
      </div>
    </section>
  )
}

function Divider() {
  return <div className="hidden lg:block h-6 w-px bg-on-primary/20" />
}

function SpotFact({ icon: Icon, label, value, unit }: { icon?: LucideIcon; label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col items-center lg:items-start text-center lg:text-left bg-on-primary/10 lg:bg-transparent rounded-lg p-1.5 lg:p-0">
      <span className="font-label-sm text-[9px] md:text-[10px] uppercase tracking-wider text-on-primary/70 flex items-center gap-1 whitespace-nowrap">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </span>
      <span className="font-title-md text-[13px] md:text-[18px] font-bold">
        {value}
        {unit && <span className="text-[9px] md:text-[11px] font-normal text-on-primary/80"> {unit}</span>}
      </span>
    </div>
  )
}

function RowAction({ v, kind, past }: { v: BoardVisit; kind: Exclude<Filter, 'all'>; past: boolean }) {
  if (kind === 'done') {
    return v.recordUrl ? (
      <a href={v.recordUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-[11px] flex items-center gap-1 transition-colors">
        <FileText className="w-3.5 h-3.5 text-vibrant-blue" /> View Prescription
      </a>
    ) : (
      <span className="px-3 py-1.5 rounded-full bg-surface-container-low text-indigo-gray-600 font-label-sm text-[11px] flex items-center gap-1">
        <ClipboardCheck className="w-3.5 h-3.5 text-secondary" /> {v.hasNotes ? 'Notes saved' : 'Completed'}
      </span>
    )
  }
  if (v.status === 'pending_payment') {
    return <span className="px-3 py-1.5 rounded-full bg-error-container/60 text-tertiary font-label-sm text-[11px]">{past ? 'Never paid' : 'Awaiting payment'}</span>
  }
  if (v.status === 'visited') return <PrescriptionButton visit={ref(v)} kind="blue" label="Write Rx" pad="px-3 py-1.5" />
  return (
    <>
      <PrescriptionButton visit={ref(v)} kind="icon" />
      <CheckInButton visit={ref(v)} kind="soft" label="Check In" pad="px-3 py-1.5" />
    </>
  )
}

function TimelineRow({ item, now }: { item: Item; now: number }) {
  const v = item.visit
  const kind = classify(item)
  const minutes = item.end ? Math.round((Date.parse(item.end) - Date.parse(item.start)) / 60000) : null
  const past = Date.parse(item.end ?? item.start) <= now
  const live = !!v && isOpenVisit(v) && Date.parse(item.start) <= now && !past

  const tag = live
    ? { text: 'Now', cls: 'bg-soft-coral text-on-error animate-pulse font-bold' }
    : kind === 'done'
      ? { text: 'Done', cls: 'bg-surface-container text-indigo-gray-600' }
      : kind === 'checked-in'
        ? { text: 'Ready', cls: 'bg-fresh-teal/15 text-secondary font-bold' }
        : v?.status === 'pending_payment'
          ? { text: 'Unpaid', cls: 'bg-error-container text-tertiary font-bold' }
          : kind === 'booked'
            ? { text: 'Booked', cls: 'bg-primary/10 text-primary' }
            : { text: past ? 'Past' : 'Open', cls: 'bg-surface-container text-indigo-gray-600' }

  const typeChip = !v
    ? null
    : v.status === 'pending_payment'
      ? 'bg-soft-coral/15 text-soft-coral'
      : v.status === 'visited'
        ? 'bg-fresh-teal/15 text-secondary'
        : live
          ? 'bg-primary/10 text-primary font-bold'
          : 'bg-surface-container-high text-primary'

  return (
    <li
      className={`p-3 md:p-stack-sm rounded-xl flex gap-3 md:gap-stack-sm transition-all ${
        live
          ? 'bg-primary/5 border-2 border-vibrant-blue md:border-0 md:ring-2 md:ring-vibrant-blue/60 shadow-[0_4px_16px_rgba(0,102,255,0.08)]'
          : `bg-surface-container-lowest shadow-[0_2px_12px_rgba(0,102,255,0.02)] hover:shadow-md border ${!v && kind === 'open' ? 'border-dashed border-outline-variant/70' : 'border-surface-container md:border-transparent'}`
      } ${(kind === 'done' || (kind === 'open' && past)) && !live ? 'opacity-75 hover:opacity-100' : ''}`}
    >
      <div className="w-11 md:w-16 shrink-0 flex flex-col items-center justify-center">
        <span className={`font-title-md text-[12px] md:text-[14px] font-bold leading-none md:leading-normal ${live ? 'text-primary' : 'text-indigo-gray-900'}`}>{formatTime(item.start).replace(/ (AM|PM)$/, '')}</span>
        <span className="font-label-sm text-[10px] text-indigo-gray-600">{minutes ? `${minutes} min` : formatTime(item.start).slice(-2)}</span>
        <span className={`mt-1 px-1.5 rounded font-label-sm text-[9px] uppercase ${tag.cls}`}>{tag.text}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l md:border-l-0 border-surface-container pl-3 md:pl-0">
        <div className="flex items-center gap-stack-sm min-w-0">
          {v ? <Avatar name={v.patient?.name ?? null} className="hidden md:flex w-10 h-10 text-[13px]" /> : null}
          <div className="min-w-0">
            <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
              <span className="font-title-md text-[12px] md:text-[15px] text-indigo-gray-900 font-bold truncate">
                {v?.patient?.name ?? (kind === 'booked' ? 'Booked' : 'Open slot')}
              </span>
              {typeChip && <span className={`px-1.5 md:px-2 py-0.5 rounded md:rounded-full font-label-sm text-[10px] shrink-0 ${typeChip}`}>{live ? 'In Session' : 'In-Person'}</span>}
            </div>
            <span className="font-body-md text-[11px] md:text-[12px] text-indigo-gray-600 block truncate">
              {v
                ? `Booking ID ${v.id.slice(0, 8).toUpperCase()}${v.hasNotes ? ' • Prescription saved' : ''}`
                : kind === 'booked'
                  ? 'Reserved'
                  : past
                    ? 'Not booked'
                    : 'Patients can book this slot'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-base self-end sm:self-center shrink-0">
          {v ? (
            <>
              <RowAction v={v} kind={kind} past={past} />
              <CallLink phone={v.patient?.phone ?? null} name={v.patient?.name ?? 'patient'} kind="icon" />
            </>
          ) : (
            item.slot && !item.slot.booked && !past && <BlockSlotButton slotId={item.slot.id} time={formatTime(item.start)} />
          )}
        </div>
      </div>
    </li>
  )
}

function BlockSlotButton({ slotId, time }: { slotId: string; time: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Block the ${time} slot? Patients will no longer be able to book it.`)) return
        start(async () => {
          const res = await blockScheduleSlot(slotId)
          if ('error' in res && res.error) alert(res.error)
          router.refresh()
        })
      }}
      className="px-3 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-indigo-gray-600 font-label-sm text-[11px] flex items-center gap-1 disabled:opacity-60"
    >
      {pending ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
      Block
    </button>
  )
}

/** Month at a glance: bookings and open slots per day; picking a day opens it. */
function MonthGrid({ month, today, selected, itemsByDay, onPick }: { month: string; today: string; selected: string; itemsByDay: Map<string, Item[]>; onPick: (key: string) => void }) {
  const first = `${month}-01`
  const lead = (weekdayOf(first) + 6) % 7 // Monday first
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => addDays(first, i - lead))
  return (
    <div className={`${card} p-3 md:p-stack-md`}>
      <div className="grid grid-cols-7 gap-1 md:gap-1.5 text-center font-label-sm text-[10px] md:text-[11px] text-indigo-gray-600 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-1.5">
        {cells.map((key) => {
          const items = itemsByDay.get(key) ?? []
          const booked = items.filter((i) => i.visit).length
          const open = items.filter((i) => classify(i) === 'open').length
          const inMonth = key.slice(0, 7) === month
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className={`min-h-[56px] md:min-h-[76px] p-1 md:p-2 rounded-lg text-left flex flex-col gap-0.5 transition-colors ${
                key === selected ? 'bg-primary-fixed/50 ring-1 ring-primary/40' : inMonth ? 'bg-surface-container-low/60 hover:bg-surface-container-low' : 'opacity-40'
              } ${key === today ? 'ring-2 ring-vibrant-blue/50' : ''}`}
            >
              <span className={`text-[11px] md:text-[13px] font-bold ${key === today ? 'text-primary' : 'text-indigo-gray-900'}`}>{Number(key.slice(8))}</span>
              {booked > 0 && <span className="text-[9px] md:text-[10px] font-semibold text-primary leading-tight truncate">{booked} booked</span>}
              {open > 0 && <span className="text-[9px] md:text-[10px] text-fresh-teal leading-tight truncate">{open} open</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Every booking from the chosen day onward, grouped by day. */
function BookingList({ itemsByDay, from, now }: { itemsByDay: Map<string, Item[]>; from: string; now: number }) {
  const days = Array.from(itemsByDay.entries())
    .filter(([key, items]) => key >= from && items.some((i) => i.visit))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 14)
  if (days.length === 0) {
    return <div className="p-8 rounded-xl bg-surface-container-lowest shadow-sm text-center text-sm text-indigo-gray-600">No bookings from this day onward yet.</div>
  }
  return (
    <div className="flex flex-col gap-stack-sm">
      {days.map(([key, items]) => (
        <div key={key} className={`${card} p-stack-sm`}>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="font-title-md text-[14px] font-bold text-indigo-gray-900">{formatDayLabel(noon(key), now)}</span>
            <span className="text-[11px] text-indigo-gray-600">{items.filter((i) => i.visit).length} booked</span>
          </div>
          <ul className="divide-y divide-surface-container">
            {items
              .filter((i) => i.visit)
              .map((i) => {
                const v = i.visit!
                return (
                  <li key={i.key} className="py-2.5 px-1 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-stack-sm min-w-0">
                      <span className="font-semibold text-primary text-[13px] w-16 shrink-0">{formatTime(i.start)}</span>
                      <Avatar name={v.patient?.name ?? null} className="w-8 h-8 text-[11px]" />
                      <div className="min-w-0">
                        <span className="text-[14px] font-semibold text-indigo-gray-900 truncate block">{v.patient?.name ?? 'Patient'}</span>
                        <span className="text-[11px] text-indigo-gray-600">ID {v.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Chip tone={v.status === 'pending_payment' ? 'coral' : v.status === 'visited' ? 'teal' : v.status === 'completed' ? 'neutral' : 'blue'}>
                        {v.status === 'pending_payment' ? 'Unpaid' : v.status === 'visited' ? 'Checked in' : v.status === 'completed' ? 'Done' : 'Booked'}
                      </Chip>
                      <CallLink phone={v.patient?.phone ?? null} name={v.patient?.name ?? 'patient'} kind="icon" />
                    </div>
                  </li>
                )
              })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function MiniCalendar({
  month,
  setMonth,
  selected,
  today,
  hasSlots,
  onPick,
}: {
  month: string
  setMonth: (m: string) => void
  selected: string
  today: string
  hasSlots: (key: string) => boolean
  onPick: (key: string) => void
}) {
  const first = `${month}-01`
  const lead = weekdayOf(first)
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => addDays(first, i - lead))
  const shift = (n: -1 | 1) => setMonth(addDays(first, n === 1 ? 32 : -1).slice(0, 7))

  return (
    <div className={`${card} p-stack-md`}>
      <div className="flex items-center justify-between mb-stack-sm">
        <span className="font-title-md text-[16px] text-indigo-gray-900">{dayLabel(first, { month: 'long', year: 'numeric' })}</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="w-7 h-7 rounded-full flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => shift(1)} className="w-7 h-7 rounded-full flex items-center justify-center text-indigo-gray-600 hover:bg-surface-container">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center font-label-sm text-[11px] text-indigo-gray-600 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[13px]">
        {cells.map((key) => {
          const inMonth = key.slice(0, 7) === month
          const isSelected = key === selected
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className={`relative py-1 rounded-lg transition-colors ${
                isSelected ? 'bg-primary text-on-primary font-bold shadow-sm' : inMonth ? 'text-indigo-gray-900 hover:bg-surface-container' : 'text-outline-variant'
              } ${key === today && !isSelected ? 'ring-1 ring-vibrant-blue/50' : ''}`}
            >
              {Number(key.slice(8))}
              {hasSlots(key) && !isSelected && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-vibrant-blue" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

