'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Ban, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, FileText, Hourglass,
  IndianRupee, LoaderCircle, MapPin, UserCheck, type LucideIcon,
} from 'lucide-react'
import { blockScheduleSlot } from '@/app/actions/doctor'
import { CONSULTATION_PLATFORM_FEE } from '@/lib/pricing'
import { doctorName, formatDayLabel, formatINR, formatTime, istDateKey } from '@/components/patient/format'
import { Avatar, Chip } from '@/components/portal/ui'
import { CallLink, CheckInButton, NextStepButton, PrescriptionButton, type VisitRef } from './VisitControls'
import { WalkInButton } from './WalkInModal'

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
export type BoardPatientFacts = { age: number | null; gender: string | null; bloodGroup: string | null }
type Slot = { id: string; start: string; end: string | null; booked: boolean }
type Item = { key: string; start: string; end: string | null; slot: Slot | null; visit: BoardVisit | null }
type Filter = 'all' | 'booked' | 'checked-in' | 'open' | 'done'

const DAY = 86_400_000
const noon = (key: string) => Date.parse(`${key}T12:00:00+05:30`)
const addDays = (key: string, n: number) => istDateKey(noon(key) + n * DAY)
const weekdayOf = (key: string) => new Date(noon(key)).getUTCDay() // 0 = Sunday
const isOpenVisit = (v: BoardVisit) => v.status === 'confirmed' || v.status === 'visited'
const ref = (v: BoardVisit): VisitRef => ({ id: v.id, status: v.status, patientName: v.patient?.name ?? 'Patient', phone: v.patient?.phone ?? null })

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

export function ScheduleBoard({
  doctor,
  slots,
  visits,
  facts,
  now,
  initialDate,
  windowKeys,
}: {
  doctor: { name: string; image: string | null; specialty: string | null; hospital: { name: string; city: string | null; address: string | null } | null; fee: number | null }
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
  const [view, setView] = useState<'day' | 'week'>('day')
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
      ? `${relative}, ${new Date(noon(date)).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}`
      : `${relative} ${new Date(noon(date)).getUTCFullYear()}`

  return (
    <>
      {/* Command bar */}
      <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 md:gap-stack-md md:bg-surface-container-lowest md:p-stack-md md:rounded-xl md:shadow-[0_4px_24px_rgba(0,102,255,0.04)]">
        <div className="hidden md:flex items-center gap-stack-sm min-w-0">
          <span className="relative">
            <Avatar name={doctor.name} image={doctor.image} className="w-14 h-14 text-lg shadow-sm" />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-fresh-teal ring-2 ring-surface-container-lowest" />
          </span>
          <div className="min-w-0">
            <h1 className="font-title-md text-title-md text-indigo-gray-900 tracking-tight truncate">{doctorName(doctor.name)}</h1>
            <div className="flex flex-wrap items-center gap-x-stack-sm gap-y-1 mt-0.5 text-[13px] text-indigo-gray-600">
              {doctor.specialty && <span>{doctor.specialty}</span>}
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 flex items-center justify-between bg-surface-container-lowest md:bg-surface-container-low px-2 py-1 rounded-xl md:rounded-full border border-surface-container md:border-transparent shadow-sm">
              <button type="button" aria-label="Previous day" onClick={() => pick(addDays(date, view === 'week' ? -7 : -1))} className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:text-primary hover:bg-surface-container-lowest">
                <ChevronLeft className="w-[18px] h-[18px]" />
              </button>
              <span className="px-2 flex items-center gap-1.5 font-title-md text-[13px] md:text-[14px] text-indigo-gray-900 whitespace-nowrap">
                <CalendarDays className="w-4 h-4 text-vibrant-blue" />
                {view === 'week'
                  ? `Week of ${new Date(noon(weekStart)).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}`
                  : dateLabel}
              </span>
              <button type="button" aria-label="Next day" onClick={() => pick(addDays(date, view === 'week' ? 7 : 1))} className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:text-primary hover:bg-surface-container-lowest">
                <ChevronRight className="w-[18px] h-[18px]" />
              </button>
            </div>
            <div className="flex items-center bg-surface-container-low p-1 rounded-full shadow-sm">
              {(['day', 'week'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 rounded-full font-label-sm text-[12px] capitalize transition-colors ${view === v ? 'bg-primary text-on-primary shadow-sm' : 'text-indigo-gray-600 hover:text-indigo-gray-900'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            {date !== today && (
              <button type="button" onClick={() => pick(today)} className="px-stack-sm py-2 rounded-xl md:rounded-full bg-surface-container hover:bg-surface-container-high text-indigo-gray-900 font-label-sm text-label-sm">
                Back to Today
              </button>
            )}
            <WalkInButton
              label="Add Walk-in"
              className="px-stack-md py-2 rounded-xl md:rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm shadow-[0_4px_14px_rgba(0,102,255,0.25)] hover:bg-primary transition-all flex items-center justify-center gap-1.5"
            />
          </div>
        </div>
      </section>

      {/* Day KPIs */}
      <section className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-base overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Kpi label="Total Booked" value={bookedItems.length} note={bookedMinutes ? `${(bookedMinutes / 60).toFixed(1)} hrs` : undefined} icon={CalendarDays} tint="bg-primary/10 text-primary" />
        <Kpi label="Checked In" value={counts('checked-in')} note="Waiting" noteClass="text-fresh-teal" icon={UserCheck} tint="bg-secondary-container/30 text-secondary" />
        <Kpi label="Awaiting Payment" value={unpaid} note={unpaid ? 'Unpaid' : undefined} noteClass="text-soft-coral" icon={Hourglass} tint="bg-error-container/60 text-tertiary" />
        <Kpi label="Open Slots" value={dayItems.filter((i) => classify(i) === 'open' && Date.parse(i.start) > now).length} note="Bookable" noteClass="text-indigo-gray-600" icon={CalendarClock} tint="bg-surface-container-high text-primary" />
        <Kpi label="Completed" value={counts('done')} note="Signed off" noteClass="text-fresh-teal" icon={CheckCircle2} tint="bg-surface-container-low text-indigo-gray-600" />
      </section>

      {/* Current / next consultation */}
      {spotlight?.visit?.patient && (
        <Spotlight item={spotlight} facts={facts[spotlight.visit.patient.id]} now={now} />
      )}

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-gutter items-start">
        {/* Left: calendar & filters */}
        <div className="hidden xl:flex xl:col-span-3 flex-col gap-stack-md">
          <MiniCalendar month={month} setMonth={setMonth} selected={date} today={today} hasSlots={(k) => itemsByDay.has(k)} onPick={pick} />
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0_2px_16px_rgba(0,102,255,0.03)] flex flex-col gap-stack-sm">
            <span className="font-title-md text-[14px] text-indigo-gray-900 uppercase tracking-wider">Slot Status</span>
            <div className="flex flex-col gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center justify-between p-2 rounded-lg text-left transition-colors ${filter === f.id ? 'bg-primary-fixed/40' : 'hover:bg-surface-container-low'}`}
                >
                  <span className="flex items-center gap-2 text-[13px] text-indigo-gray-900">
                    <span className={`w-2.5 h-2.5 rounded-full ${f.dot}`} /> {f.label}
                  </span>
                  <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-bold">
                    {f.id === 'all' ? dayItems.length : counts(f.id)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Centre: timeline or week */}
        <div className="xl:col-span-6 flex flex-col gap-stack-sm">
          {/* Phone & tablet: week strip + filter chips */}
          <div className="xl:hidden flex flex-col gap-3">
            <div className="flex justify-between items-center bg-surface-container-lowest p-1.5 rounded-2xl border border-surface-container shadow-sm text-center">
              {weekKeys.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => pick(k)}
                  className={`flex-1 py-1.5 rounded-xl ${k === date ? 'bg-vibrant-blue text-on-primary shadow-sm' : 'hover:bg-surface-container-low text-indigo-gray-600'}`}
                >
                  <span className="block text-[10px] font-medium">{new Date(noon(k)).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'narrow' })}</span>
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
                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 shrink-0 ${
                    filter === f.id ? 'bg-primary-fixed/50 text-primary border-primary/30' : 'bg-surface-container-lowest text-indigo-gray-600 border-surface-container'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} /> {f.label}
                  <span className="text-[10px] px-1 rounded-full bg-surface-container">{f.id === 'all' ? dayItems.length : counts(f.id)}</span>
                </button>
              ))}
            </div>
          </div>

          {view === 'day' ? (
            <>
              <div className="flex items-center justify-between px-1 md:px-base">
                <h2 className="font-title-md text-[13px] md:text-title-md text-indigo-gray-600 md:text-indigo-gray-900 uppercase md:normal-case font-semibold">
                  {date === today ? "Today's Timeline" : 'Timeline'}
                </h2>
                <span className="font-label-sm text-[11px] md:text-[12px] text-indigo-gray-600">
                  {dayItems.length ? `${formatTime(dayItems[0].start)} – ${formatTime(dayItems[dayItems.length - 1].end ?? dayItems[dayItems.length - 1].start)}` : 'No slots'}
                </span>
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
          ) : (
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
                      <span className="font-title-md text-[15px] text-indigo-gray-900 font-bold">
                        {new Date(noon(k)).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
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
        </div>

        {/* Right: fee & week */}
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4 md:gap-stack-md">
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0_2px_16px_rgba(0,102,255,0.03)] flex flex-col gap-stack-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-title-md text-[15px] text-indigo-gray-900">Consultation Fee</span>
                <span className="block text-[11px] text-indigo-gray-600">What patients pay to book you</span>
              </div>
              <Link href="/doctor/profile" className="text-[11px] font-semibold text-primary hover:underline">Edit</Link>
            </div>
            <div className="p-stack-sm rounded-lg bg-surface-container-low flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </span>
                <span className="flex flex-col">
                  <span className="font-title-md text-[12px] text-indigo-gray-900 font-semibold">In-Person Clinic Visit</span>
                  <span className="text-[10px] text-indigo-gray-600">One booked slot</span>
                </span>
              </span>
              <span className="font-title-md text-[13px] text-indigo-gray-900 font-bold">{doctor.fee ? formatINR(doctor.fee) : 'Not set'}</span>
            </div>
            <p className="text-[11px] text-indigo-gray-600">
              Patients also pay a {formatINR(CONSULTATION_PLATFORM_FEE)} platform fee at checkout{doctor.fee ? `, ${formatINR(doctor.fee + CONSULTATION_PLATFORM_FEE)} in total` : ''}.
            </p>
          </div>

          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0_2px_16px_rgba(0,102,255,0.03)] flex flex-col gap-stack-sm">
            <span className="font-title-md text-[14px] text-indigo-gray-900 uppercase tracking-wider">This Week</span>
            <div className="flex items-center gap-stack-sm">
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
                  <path className="text-surface-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path className="text-fresh-teal" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${weekPct}, 100`} strokeLinecap="round" strokeWidth="3.5" />
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

function Kpi({ label, value, note, noteClass = 'text-primary', icon: Icon, tint }: { label: string; value: number; note?: string; noteClass?: string; icon: LucideIcon; tint: string }) {
  return (
    <div className="shrink-0 w-36 md:w-auto bg-surface-container-lowest p-2.5 md:p-stack-sm rounded-xl border border-surface-container md:border-transparent shadow-[0_2px_12px_rgba(0,102,255,0.03)] flex items-start md:items-center justify-between gap-2">
      <div className="min-w-0">
        <span className="font-label-sm text-[10px] md:text-[11px] text-indigo-gray-600 uppercase tracking-wider block truncate">{label}</span>
        <div className="flex items-baseline gap-1.5 md:gap-base mt-0.5">
          <span className="font-headline-lg text-[18px] md:text-[26px] text-indigo-gray-900 font-extrabold">{String(value).padStart(2, '0')}</span>
          {note && <span className={`font-label-sm text-[10px] md:text-[11px] ${noteClass}`}>{note}</span>}
        </div>
      </div>
      <span className={`w-6 h-6 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${tint}`}>
        <Icon className="w-3 h-3 md:w-5 md:h-5" />
      </span>
    </div>
  )
}

function Spotlight({ item, facts, now }: { item: Item; facts: BoardPatientFacts | undefined; now: number }) {
  const visit = item.visit!
  const patient = visit.patient!
  const live = Date.parse(item.start) <= now && Date.parse(item.end ?? item.start) > now
  const elapsed = Math.max(0, Math.round((now - Date.parse(item.start)) / 60000))
  return (
    <section className="relative overflow-hidden rounded-2xl md:rounded-xl bg-gradient-to-br md:bg-gradient-to-r from-primary to-vibrant-blue text-on-primary p-4 md:p-stack-md shadow-[0_8px_24px_rgba(0,102,255,0.18)]">
      <div aria-hidden className="absolute -right-6 -bottom-6 w-36 h-36 bg-on-primary/10 rounded-full blur-xl pointer-events-none" />
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-stack-md">
        <div className="flex items-start sm:items-center gap-stack-sm min-w-0">
          <span className="w-11 h-11 md:w-14 md:h-14 rounded-xl bg-on-primary/20 border border-on-primary/30 flex items-center justify-center font-bold text-sm md:text-base shrink-0">
            {patient.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-base">
              <span className="px-2 py-0.5 rounded-full bg-on-primary/20 font-label-sm text-[10px] md:text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-secondary-fixed rounded-full" />
                {visit.status === 'visited'
                  ? live
                    ? `Current consultation • ${elapsed}m elapsed`
                    : 'Checked in • waiting for you'
                  : live
                    ? 'Slot in progress • not checked in yet'
                    : 'Up next'}
              </span>
              <span className="text-[12px] md:text-[13px] text-on-primary/80">
                {formatTime(item.start)}
                {item.end ? ` – ${formatTime(item.end)}` : ''}
              </span>
            </div>
            <h2 className="font-headline-lg text-[18px] md:text-headline-lg-mobile lg:text-headline-lg tracking-tight mt-1 truncate">
              {patient.name}
              {facts?.age != null && <span className="font-body-md text-body-md text-on-primary/80">, {facts.age}</span>}
            </h2>
            <p className="text-[12px] md:text-[14px] text-on-primary/90 mt-0.5">
              Booking ID {visit.id.slice(0, 8).toUpperCase()} • In-person
            </p>
          </div>
        </div>
        <div className="flex items-center gap-stack-sm bg-on-primary/10 px-stack-md py-stack-sm rounded-lg self-start lg:self-center">
          <SpotFact label="Blood group" value={facts?.bloodGroup || '—'} />
          <div className="h-6 w-px bg-on-primary/20" />
          <SpotFact label="Sex" value={facts?.gender || '—'} />
          <div className="h-6 w-px bg-on-primary/20" />
          <SpotFact label="Status" value={visit.status === 'visited' ? 'Checked in' : visit.status === 'confirmed' ? 'Booked' : 'Done'} />
        </div>
        <div className="flex flex-wrap items-center gap-base shrink-0">
          <NextStepButton visit={ref(visit)} />
          <CallLink phone={patient.phone} name={patient.name} />
        </div>
      </div>
    </section>
  )
}

function SpotFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-primary/70">{label}</span>
      <span className="font-title-md text-[15px] md:text-[18px] font-bold">{value}</span>
    </div>
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

  return (
    <li
      className={`bg-surface-container-lowest p-3 md:p-stack-sm rounded-xl flex gap-3 md:gap-stack-sm transition-shadow ${
        live ? 'shadow-[0_4px_16px_rgba(0,102,255,0.08)] ring-2 ring-vibrant-blue/60 bg-primary/5' : 'shadow-[0_2px_12px_rgba(0,102,255,0.02)] hover:shadow-md'
      } ${(kind === 'done' || (kind === 'open' && past)) && !live ? 'opacity-75' : ''} ${!v && kind === 'open' ? 'border border-dashed border-outline-variant/70' : ''}`}
    >
      <div className="w-12 md:w-16 shrink-0 flex flex-col items-center justify-center">
        <span className={`font-title-md text-[13px] md:text-[14px] font-bold ${live ? 'text-primary' : 'text-indigo-gray-900'}`}>{formatTime(item.start).replace(/ (AM|PM)$/, '')}</span>
        <span className="font-label-sm text-[10px] text-indigo-gray-600">{minutes ? `${minutes} min` : formatTime(item.start).slice(-2)}</span>
        <span className={`mt-1 px-1.5 rounded font-label-sm text-[9px] uppercase ${tag.cls}`}>{tag.text}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l md:border-l-0 border-surface-container pl-3 md:pl-0">
        <div className="flex items-center gap-stack-sm min-w-0">
          {v ? <Avatar name={v.patient?.name ?? null} className="hidden md:flex w-10 h-10 text-[13px]" /> : null}
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-title-md text-[13px] md:text-[15px] text-indigo-gray-900 font-bold truncate">
                {v?.patient?.name ?? (kind === 'booked' ? 'Booked' : 'Open slot')}
              </span>
              {v && <Chip tone={v.status === 'pending_payment' ? 'coral' : v.status === 'visited' ? 'teal' : 'blue'}>In-person</Chip>}
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
        <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
          {v ? (
            <>
              <CheckInButton visit={ref(v)} kind="icon" />
              <PrescriptionButton visit={ref(v)} kind="icon" />
              <CallLink phone={v.patient?.phone ?? null} name={v.patient?.name ?? 'patient'} kind="icon" />
              {v.recordUrl && (
                <a href={v.recordUrl} target="_blank" rel="noopener noreferrer" title="Open prescription" aria-label="Open prescription" className="p-2 rounded-full hover:bg-surface-container text-vibrant-blue">
                  <FileText className="w-4 h-4" />
                </a>
              )}
              {kind === 'done' && !v.recordUrl && <ClipboardCheck className="w-4 h-4 text-secondary mx-2" aria-label="Completed" />}
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
    <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0_2px_16px_rgba(0,102,255,0.03)]">
      <div className="flex items-center justify-between mb-stack-sm">
        <span className="font-title-md text-[16px] text-indigo-gray-900">
          {new Date(noon(first)).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', month: 'long', year: 'numeric' })}
        </span>
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
