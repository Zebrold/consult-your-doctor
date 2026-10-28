'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Ban, ChevronLeft, ChevronRight, LoaderCircle, Plus } from 'lucide-react'
import { blockScheduleSlot } from '@/app/actions/doctor'
import { formatINR, formatTime, istDateKey, visitToken } from '@/components/patient/format'
import { CallLink, CheckInButton, PrescriptionButton, SIZE, type VisitRef } from './VisitControls'
import { WalkInButton } from './WalkInModal'
import { ProfileEditor, type EditableProfile } from './ProfileEditor'
import { DeskHead, Donut, EmptyLine, Meter, Panel, PanelHead, Row, StatCard, btnOutline, card, delta, lineTab, segGroup, segTab } from './doc-ui'

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
type Kind = 'open' | 'reserved' | 'booked' | 'unpaid' | 'in' | 'done'
type Filter = 'all' | 'booked' | 'in' | 'open'
type View = 'day' | 'week' | 'month'

const DAY = 86_400_000
const noon = (key: string) => Date.parse(`${key}T12:00:00+05:30`)
const addDays = (key: string, n: number) => istDateKey(noon(key) + n * DAY)
const weekdayOf = (key: string) => new Date(noon(key)).getUTCDay() // 0 = Sunday
const mondayOf = (key: string) => addDays(key, -((weekdayOf(key) + 6) % 7))
const dayLabel = (key: string, opts: Intl.DateTimeFormatOptions) => new Date(noon(key)).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', ...opts })
/** Minutes since midnight, India time. */
const minuteOf = (iso: string) => {
  const [h, m] = new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).split(':').map(Number)
  return h * 60 + m
}
const lengthOf = (i: { start: string; end: string | null }) => (i.end ? Math.max(5, Math.round((Date.parse(i.end) - Date.parse(i.start)) / 60_000)) : 15)
const ref = (v: BoardVisit): VisitRef => ({ id: v.id, status: v.status, patientName: v.patient?.name ?? 'Patient', phone: v.patient?.phone ?? null })

function kindOf(item: Item): Kind {
  const v = item.visit
  if (!v) return item.slot?.booked ? 'reserved' : 'open'
  if (v.status === 'completed') return 'done'
  if (v.status === 'visited') return 'in'
  if (v.status === 'pending_payment') return 'unpaid'
  return 'booked'
}

const KIND: Record<Kind, { label: string; color: string; bg: string; dashed?: boolean }> = {
  in: { label: 'Checked in', color: '#067647', bg: '#ECFDF3' },
  booked: { label: 'Booked', color: '#2A4DD0', bg: '#EEF3FF' },
  unpaid: { label: 'Awaiting payment', color: '#B54708', bg: '#FFFAEB' },
  done: { label: 'Completed', color: '#98A2B3', bg: '#F4F6FA' },
  reserved: { label: 'Reserved', color: '#98A2B3', bg: '#F4F6FA' },
  open: { label: 'Open', color: '#D0D5DD', bg: '#FFFFFF', dashed: true },
}

const matches = (filter: Filter, kind: Kind) =>
  filter === 'all' || (filter === 'open' ? kind === 'open' : filter === 'in' ? kind === 'in' : kind === 'booked' || kind === 'unpaid' || kind === 'done')

const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['booked', 'Booked'],
  ['in', 'Checked in'],
  ['open', 'Open'],
]

export function ScheduleBoard({
  doctor,
  slots,
  visits,
  facts,
  now,
  initialDate,
  windowKeys,
  bookingFee,
}: {
  doctor: { hospital: { name: string; city: string | null } | null; fee: number | null; editable: EditableProfile }
  slots: Slot[]
  visits: BoardVisit[]
  facts: Record<string, BoardPatientFacts>
  now: number
  initialDate: string
  windowKeys: { from: string; to: string }
  /** The booking fee patients pay in the app per appointment. */
  bookingFee: number
}) {
  const router = useRouter()
  const today = istDateKey(now)
  const [date, setDate] = useState(initialDate)
  const [view, setView] = useState<View>('week')
  const [filter, setFilter] = useState<Filter>('all')

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
  }

  const items = (key: string) => itemsByDay.get(key) ?? []
  const dayItems = items(date)
  const shown = dayItems.filter((i) => matches(filter, kindOf(i)))
  const countOf = (list: Item[], ...kinds: Kind[]) => list.filter((i) => kinds.includes(kindOf(i))).length

  // The selected week, Monday first, and the one before it for comparisons
  const weekStart = mondayOf(date)
  const weekKeys = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const lastWeekKeys = weekKeys.map((k) => addDays(k, -7))
  const perDay = (keys: string[], test: (i: Item) => boolean) => keys.map((k) => items(k).filter(test).length)
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
  const isBooked = (i: Item) => !!i.visit
  const isOpenAhead = (i: Item) => kindOf(i) === 'open' && Date.parse(i.start) > now
  const isOpenAny = (i: Item) => kindOf(i) === 'open'
  const isDone = (i: Item) => kindOf(i) === 'done'
  // A no-show: a booking whose slot has ended without the patient being checked in.
  const isNoShow = (i: Item) => kindOf(i) === 'booked' && Date.parse(i.end ?? i.start) < now
  const weekItems = weekKeys.flatMap(items)
  const weekBooked = weekItems.filter(isBooked).length
  const weekPublished = weekItems.filter((i) => i.slot).length
  const weekPct = weekPublished ? (weekItems.filter((i) => i.slot && (i.visit || i.slot.booked)).length / weekPublished) * 100 : 0
  const waiting = items(today).filter((i) => kindOf(i) === 'in')

  const navLabel =
    view === 'week'
      ? `Week of ${dayLabel(weekStart, { day: 'numeric', month: 'short' })} – ${dayLabel(addDays(weekStart, 6), { day: 'numeric', month: 'short' })}`
      : view === 'month'
        ? dayLabel(date, { month: 'long', year: 'numeric' })
        : dayLabel(date, { weekday: 'long', day: 'numeric', month: 'short' })
  const shift = (direction: -1 | 1) => {
    if (view === 'month') {
      const first = `${date.slice(0, 7)}-01`
      pick(direction === 1 ? `${addDays(first, 32).slice(0, 7)}-01` : `${addDays(first, -1).slice(0, 7)}-01`)
    } else pick(addDays(date, direction * (view === 'week' ? 7 : 1)))
  }
  const hospital = doctor.hospital?.name ?? 'your hospital'

  const feeCard = (
    <Panel>
      <PanelHead title="Consultation fee" sub="Paid by the patient at the hospital" right={<span className="lg:hidden text-[12px] font-extrabold text-[#5B667A]">INR</span>} />
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#EEF2F7] lg:border-0 lg:pt-0">
        <span className="min-w-0">
          <span className="block text-[14px] font-extrabold">In-person visit</span>
          <span className="block text-[12px] text-[#5B667A]">Per booked slot</span>
        </span>
        <span className="text-[17px] lg:text-[22px] font-extrabold">{doctor.fee ? formatINR(doctor.fee) : 'Not set'}</span>
      </div>
      <ProfileEditor profile={doctor.editable} label="Update consultation fee" className={`${btnOutline} lg:border w-full mt-3 [&_svg]:w-[15px] [&_svg]:h-[15px]`} />
      <p className="mt-2.5 text-[11.5px] lg:text-[12px] leading-normal text-[#5B667A]">
        The {formatINR(bookingFee)} booking fee is collected in the app and is separate from your fee.
      </p>
    </Panel>
  )

  return (
    <>
      {/* ---------- Phones ---------- */}
      <div className="lg:hidden flex flex-col gap-3.5">
        <section aria-label="Pick a day" className={`${card} px-3 pt-3 pb-3.5`}>
          <div className="flex items-center justify-between gap-2 px-1">
            <button type="button" aria-label="Previous week" onClick={() => pick(addDays(date, -7))} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[#27324A] active:bg-[#F4F6FA]">
              <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={2.4} />
            </button>
            <span className="text-[14.5px] font-extrabold">{dayLabel(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <button type="button" aria-label="Next week" onClick={() => pick(addDays(date, 7))} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[#27324A] active:bg-[#F4F6FA]">
              <ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.4} />
            </button>
          </div>
          <div role="radiogroup" aria-label="Day" className="grid grid-cols-7 gap-1 mt-2">
            {weekKeys.map((k) => {
              const on = k === date
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={dayLabel(k, { weekday: 'long', day: 'numeric', month: 'long' })}
                  onClick={() => pick(k)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl ${on ? 'bg-[#2A4DD0] text-white' : k === today ? 'text-[#2A4DD0]' : 'text-[#0B1B3F]'}`}
                >
                  <span className="text-[11px] font-bold opacity-80">{dayLabel(k, { weekday: 'narrow' })}</span>
                  <span className="text-[16px] font-extrabold">{Number(k.slice(8))}</span>
                  <span className={`w-1 h-1 rounded-full ${itemsByDay.has(k) ? (on ? 'bg-white' : 'bg-[#2A4DD0]') : 'bg-transparent'}`} />
                </button>
              )
            })}
          </div>
        </section>

        <section aria-label="This day" className={`${card} grid grid-cols-3 overflow-hidden`}>
          {[
            ['Booked', countOf(dayItems, 'booked', 'unpaid', 'in', 'done')],
            ['Checked in', countOf(dayItems, 'in')],
            ['Open', dayItems.filter(isOpenAhead).length],
          ].map(([label, value]) => (
            <div key={label} className="px-3.5 py-3 shadow-[inset_-1px_0_0_#EEF2F7]">
              <span className="block text-[11.5px] font-bold text-[#5B667A]">{label}</span>
              <span className="block mt-0.5 text-[20px] font-extrabold tabular-nums">{value}</span>
            </div>
          ))}
        </section>

        <section aria-label="Slots">
          <div role="tablist" className="flex border-b border-[#E1E7F0]">
            {FILTERS.map(([f, label]) => (
              <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={lineTab(filter === f)}>
                {label}
              </button>
            ))}
          </div>
          <SlotList items={shown} facts={facts} now={now} empty={dayItems.length ? 'No slots in this view.' : `No slots on this day. ${hospital} publishes your slots.`} />
        </section>

        {date === today && <WaitingRoom waiting={waiting} />}
        {feeCard}
        <Panel>
          <PanelHead title="Slot utilisation" sub="This week" className="mb-3.5" />
          <Meter pct={weekPct} label={`${Math.round(weekPct)}% of this week's slots booked`} />
          <div className="flex justify-between gap-3 mt-2.5 text-[12.5px] text-[#5B667A]">
            <span>
              <strong className="text-[#0B1B3F]">{weekBooked} of {weekPublished}</strong> slots booked
            </span>
            <span>
              <strong className="text-[#0B1B3F]">{weekItems.filter(isDone).length}</strong> completed · <strong className="text-[#0B1B3F]">{weekItems.filter(isOpenAhead).length}</strong> open
            </span>
          </div>
        </Panel>
      </div>

      {/* ---------- Desktops ---------- */}
      <div className="hidden lg:block">
        <DeskHead
          title="Schedule"
          subtitle={`${navLabel} · slots published by ${hospital}`}
          actions={
            <>
              <button type="button" aria-label={`Previous ${view}`} onClick={() => shift(-1)} className={`${btnOutline} lg:border`}>
                <ChevronLeft className="w-4 h-4" strokeWidth={2.6} />
              </button>
              <button type="button" onClick={() => pick(today)} disabled={date === today} className={`${btnOutline} lg:border disabled:opacity-60`}>
                Today
              </button>
              <button type="button" aria-label={`Next ${view}`} onClick={() => shift(1)} className={`${btnOutline} lg:border`}>
                <ChevronRight className="w-4 h-4" strokeWidth={2.6} />
              </button>
              <div role="tablist" aria-label="View" className={segGroup}>
                {(['day', 'week', 'month'] as View[]).map((v) => (
                  <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={segTab(view === v)}>
                    {v[0].toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </>
          }
        />

        <section className="grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Booked this week" value={weekBooked} change={delta(weekBooked, sum(perDay(lastWeekKeys, isBooked)))} note="vs last week" series={perDay(weekKeys, isBooked)} />
          <StatCard
            label="Open slots"
            value={weekItems.filter(isOpenAny).length}
            change={delta(weekItems.filter(isOpenAny).length, sum(perDay(lastWeekKeys, isOpenAny)), { higherIsGood: false })}
            note="vs last week"
            series={perDay(weekKeys, isOpenAny)}
          />
          <StatCard label="Completed" value={weekItems.filter(isDone).length} change={delta(weekItems.filter(isDone).length, sum(perDay(lastWeekKeys, isDone)))} note="vs last week" series={perDay(weekKeys, isDone)} />
          <StatCard label="No-shows" value={weekItems.filter(isNoShow).length} change={delta(weekItems.filter(isNoShow).length, sum(perDay(lastWeekKeys, isNoShow)), { higherIsGood: false })} note="vs last week" series={perDay(weekKeys, isNoShow)} />
        </section>

        <section className="grid grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
          <div className={`${card} p-[18px] pb-2 min-w-0`}>
            {view === 'week' && (
              <>
                <Legend />
                <WeekGrid
                  keys={weekKeys}
                  itemsFor={items}
                  today={today}
                  onDay={(k) => {
                    pick(k)
                    setView('day')
                  }}
                />
              </>
            )}
            {view === 'day' && (
              <div className="pb-2.5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <PanelHead
                    title={date === today ? "Today's slots" : dayLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}
                    sub={dayItems.length ? `${formatTime(dayItems[0].start)} to ${formatTime(dayItems[dayItems.length - 1].end ?? dayItems[dayItems.length - 1].start)}` : 'No slots'}
                    className=""
                  />
                  <div role="tablist" aria-label="Filter" className={segGroup}>
                    {FILTERS.map(([f, label]) => (
                      <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={segTab(filter === f)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <SlotList items={shown} facts={facts} now={now} empty={dayItems.length ? 'No slots in this view.' : `No slots on this day. ${hospital} publishes your slots.`} />
              </div>
            )}
            {view === 'month' && (
              <MonthGrid
                month={date.slice(0, 7)}
                today={today}
                selected={date}
                itemsFor={items}
                onPick={(k) => {
                  pick(k)
                  setView('day')
                }}
              />
            )}
          </div>

          <aside className="flex flex-col gap-4 min-w-0">
            <WaitingRoom waiting={waiting} />
            {feeCard}
            <Panel>
              <PanelHead title="This week" />
              <div className="flex items-center gap-4">
                <Donut pct={weekPct} size={100} />
                <div className="flex-1 min-w-0">
                  <Row label="Booked">
                    {weekBooked} / {weekPublished}
                  </Row>
                  <Row label="Completed">{weekItems.filter(isDone).length}</Row>
                </div>
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </>
  )
}

function WaitingRoom({ waiting }: { waiting: Item[] }) {
  return (
    <Panel>
      <PanelHead title="Waiting room" sub={`${waiting.length} checked in today`} />
      {waiting.length === 0 ? (
        <EmptyLine>No one is checked in and waiting.</EmptyLine>
      ) : (
        <ul>
          {waiting.map((i) => (
            <li key={i.key} className="flex items-center gap-3 py-[11px] border-t border-[#EEF2F7]">
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-extrabold truncate">{i.visit?.patient?.name ?? 'Patient'}</span>
                <span className="block text-[12px] text-[#5B667A]">
                  Token {visitToken(i.visit!.id)} · slot {formatTime(i.start)}
                </span>
              </span>
              <PrescriptionButton visit={ref(i.visit!)} kind="blueOutline" label="Start consult" icon={false} size={SIZE.sm} />
            </li>
          ))}
        </ul>
      )}
      <WalkInButton label="Add walk-in patient" icon={<Plus className="w-[15px] h-[15px]" strokeWidth={2.4} />} className={`${btnOutline} lg:border w-full mt-2.5`} />
    </Panel>
  )
}

function Legend() {
  const keys: Kind[] = ['in', 'booked', 'unpaid', 'done', 'open']
  return (
    <div className="flex flex-wrap gap-4 mb-3.5 ml-1">
      {keys.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#5B667A]">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: k === 'open' ? '#D0D5DD' : KIND[k].color }} />
          {KIND[k].label}
        </span>
      ))}
    </div>
  )
}

/** A day's slots as a list: the time, then a card with the patient (or "Open slot"), its status and what to do next. */
function SlotList({ items, facts, now, empty }: { items: Item[]; facts: Record<string, BoardPatientFacts>; now: number; empty: string }) {
  if (items.length === 0) return <p className="my-[18px] text-center text-[13px] text-[#5B667A]">{empty}</p>
  return (
    <ul className="mt-1.5">
      {items.map((item) => {
        const kind = kindOf(item)
        const k = KIND[kind]
        const v = item.visit
        const past = Date.parse(item.end ?? item.start) <= now
        const f = v?.patient ? facts[v.patient.id] : undefined
        const who = [f?.age != null ? String(f.age) : null, f?.gender?.[0]?.toUpperCase()].filter(Boolean).join(' ')
        const sub = v ? [who, `Token ${visitToken(v.id)}`, `${lengthOf(item)} min`].filter(Boolean).join(' · ') : kind === 'reserved' ? 'Held, not open to book' : `${lengthOf(item)} min · in-person`
        const actions: ReactNode = v ? (
          <>
            {v.status === 'confirmed' && <CheckInButton visit={ref(v)} kind="blueOutline" size={SIZE.sm} />}
            {v.status === 'visited' && <PrescriptionButton visit={ref(v)} kind="primary" label="Start consult" icon={false} size={SIZE.sm} />}
            {v.status === 'completed' && <PrescriptionButton visit={ref(v)} kind="outline" label="Update Rx" size={SIZE.sm} />}
            {v.recordUrl && (
              <a href={v.recordUrl} target="_blank" rel="noopener noreferrer" className="hidden lg:inline-flex items-center h-[34px] px-2 text-[12.5px] font-extrabold text-[#2A4DD0] hover:underline">
                Prescription
              </a>
            )}
            <CallLink phone={v.patient?.phone ?? null} name={v.patient?.name ?? 'patient'} kind="icon" />
          </>
        ) : kind === 'open' && item.slot && !past ? (
          <BlockSlotButton slotId={item.slot.id} time={formatTime(item.start)} />
        ) : null
        return (
          <li key={item.key} className={`flex gap-3 py-2 ${kind === 'open' && past ? 'opacity-60' : ''}`}>
            <span className="shrink-0 w-[62px] lg:w-[72px] pt-3 text-[12.5px] font-extrabold text-[#27324A]">{formatTime(item.start)}</span>
            <div
              className={`flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-2.5 px-3 py-[11px] rounded-[14px] bg-white ${k.dashed ? 'border-[1.5px] border-dashed border-[#D0D5DD]' : 'shadow-[0_0_0_1px_#E6EBF3]'}`}
              style={{ boxShadow: k.dashed ? undefined : `0 0 0 1px #E6EBF3, inset 3px 0 0 ${k.color}` }}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="flex-1 min-w-0">
                  {v?.patient ? (
                    <Link href={`/doctor/patients/${v.patient.id}`} className="block text-[14px] font-extrabold truncate hover:text-[#2A4DD0]">
                      {v.patient.name}
                    </Link>
                  ) : (
                    <span className="block text-[14px] font-extrabold text-[#5B667A] truncate">{v ? 'Patient' : kind === 'reserved' ? 'Reserved' : 'Open slot'}</span>
                  )}
                  <span className="block text-[12px] text-[#5B667A] truncate">{sub}</span>
                </span>
                <span className="shrink-0 text-[12px] font-extrabold" style={{ color: kind === 'open' ? '#98A2B3' : k.color }}>
                  {kind === 'open' && past ? 'Not booked' : k.label}
                </span>
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2 lg:shrink-0">{actions}</div>}
            </div>
          </li>
        )
      })}
    </ul>
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
      className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-[10px] text-[12.5px] font-extrabold text-[#5B667A] bg-[#F4F6FA] hover:bg-[#EEF2F7] disabled:opacity-60"
    >
      {pending ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
      Block
    </button>
  )
}

type Block = { key: string; start: string; end: string; kind: Kind; title: string; sub: string; href: string | null; count: number }

/** A day's slots as calendar blocks: each visit on its own, and each run of back-to-back open slots as one block. */
function blocksOf(list: Item[]): Block[] {
  const blocks: Block[] = []
  for (const item of list) {
    const kind = kindOf(item)
    const end = item.end ?? new Date(Date.parse(item.start) + 15 * 60_000).toISOString()
    const prev = blocks[blocks.length - 1]
    if (kind === 'open' && prev?.kind === 'open' && Date.parse(prev.end) >= Date.parse(item.start)) {
      blocks[blocks.length - 1] = { ...prev, end, count: prev.count + 1, sub: `${prev.count + 1} slots` }
      continue
    }
    const v = item.visit
    blocks.push({
      key: item.key,
      start: item.start,
      end,
      kind,
      title: v ? v.patient?.name ?? 'Patient' : kind === 'reserved' ? 'Reserved' : 'Open',
      sub: v ? KIND[kind].label : kind === 'open' ? `${lengthOf(item)} min` : 'Held',
      href: v?.patient ? `/doctor/patients/${v.patient.id}` : null,
      count: 1,
    })
  }
  return blocks
}

/** The week as a calendar: a column per day, a row every half hour, visits and open slots as blocks. */
function WeekGrid({ keys, itemsFor, today, onDay }: { keys: string[]; itemsFor: (k: string) => Item[]; today: string; onDay: (k: string) => void }) {
  const all = keys.flatMap(itemsFor)
  if (all.length === 0) return <EmptyLine>No slots this week. Your hospital publishes your slots.</EmptyLine>
  const startMin = Math.floor(Math.min(...all.map((i) => minuteOf(i.start))) / 30) * 30
  const endMin = Math.ceil(Math.max(...all.map((i) => minuteOf(i.start) + lengthOf(i))) / 30) * 30
  // Short slots get more room per minute, so a 10-minute visit still fits its name.
  const shortest = Math.min(...all.filter((i) => i.visit).map(lengthOf), 30)
  const perMin = Math.min(4, Math.max(56 / 30, 34 / shortest))
  const rows = Math.max(2, (endMin - startMin) / 30)
  const height = rows * 30 * perMin
  const label = (min: number) => `${Math.floor(min / 60) % 12 || 12}:${String(min % 60).padStart(2, '0')}`

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-t border-[#EEF2F7]">
          <span />
          {keys.map((k) => (
            <button key={k} type="button" onClick={() => onDay(k)} className={`py-2.5 px-2 text-center border-l border-[#EEF2F7] hover:bg-[#F7F9FC] ${k === today ? 'bg-[#F7F9FF]' : ''}`}>
              <span className="block text-[12px] font-bold text-[#5B667A]">{dayLabel(k, { weekday: 'short' })}</span>
              <span className={`block text-[18px] font-extrabold ${k === today ? 'text-[#2A4DD0]' : ''}`}>{Number(k.slice(8))}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]" style={{ height }}>
          <div className="relative">
            {Array.from({ length: rows }, (_, r) => (
              <span key={r} className="absolute right-2 text-[11.5px] font-bold text-[#5B667A]" style={{ top: r * 30 * perMin + 4 }}>
                {label(startMin + r * 30)}
              </span>
            ))}
          </div>
          {keys.map((k) => (
            <div
              key={k}
              className={`relative border-l border-[#EEF2F7] ${k === today ? 'bg-[#FBFCFF]' : ''}`}
              style={{ backgroundImage: `repeating-linear-gradient(to bottom, #EEF2F7 0 1px, transparent 1px ${30 * perMin}px)` }}
            >
              {blocksOf(itemsFor(k)).map((b) => {
                const top = (minuteOf(b.start) - startMin) * perMin
                const h = Math.max(30, ((Date.parse(b.end) - Date.parse(b.start)) / 60_000) * perMin - 6)
                const s = KIND[b.kind]
                const body = (
                  <>
                    <span className={`block text-[12px] font-extrabold truncate ${b.kind === 'open' || b.kind === 'reserved' ? 'text-[#98A2B3]' : ''}`}>{b.title}</span>
                    {h >= 44 && (
                      <span className="block text-[11px] font-bold truncate" style={{ color: b.kind === 'open' || b.kind === 'reserved' || b.kind === 'done' ? '#98A2B3' : s.color }}>
                        {b.sub}
                      </span>
                    )}
                  </>
                )
                const cls = `absolute left-1 right-1 px-2 py-1.5 rounded-[9px] overflow-hidden z-[1] ${s.dashed ? 'border-[1.5px] border-dashed border-[#D0D5DD]' : ''}`
                const style = { top: top + 3, height: h, background: s.bg, boxShadow: `inset 3px 0 0 ${b.kind === 'done' ? '#98A2B3' : s.color}` }
                return b.href ? (
                  <Link key={b.key} href={b.href} title={`${formatTime(b.start)} · ${b.title}`} className={`${cls} hover:brightness-[0.98]`} style={style}>
                    {body}
                  </Link>
                ) : (
                  <div key={b.key} title={`${formatTime(b.start)} · ${b.title}${b.kind === 'open' ? ` · ${b.sub}` : ''}`} className={cls} style={style}>
                    {body}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Month at a glance: bookings and open slots per day; picking a day opens it. */
function MonthGrid({ month, today, selected, itemsFor, onPick }: { month: string; today: string; selected: string; itemsFor: (k: string) => Item[]; onPick: (key: string) => void }) {
  const first = `${month}-01`
  const lead = (weekdayOf(first) + 6) % 7 // Monday first
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => addDays(first, i - lead))
  return (
    <div className="pb-2.5">
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11.5px] font-extrabold uppercase tracking-[0.04em] text-[#5B667A] mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((key) => {
          const list = itemsFor(key)
          const booked = list.filter((i) => i.visit).length
          const open = list.filter((i) => kindOf(i) === 'open').length
          const inMonth = key.slice(0, 7) === month
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className={`min-h-[78px] p-2 rounded-[10px] text-left flex flex-col gap-0.5 transition-colors ${
                key === selected ? 'bg-[#EEF3FF] shadow-[inset_0_0_0_1.5px_#2A4DD0]' : inMonth ? 'bg-[#F7F9FC] hover:bg-[#EEF2F7]' : 'opacity-40'
              }`}
            >
              <span className={`text-[13px] font-extrabold ${key === today ? 'text-[#2A4DD0]' : ''}`}>{Number(key.slice(8))}</span>
              {booked > 0 && <span className="text-[11px] font-extrabold text-[#2A4DD0] truncate">{booked} booked</span>}
              {open > 0 && <span className="text-[11px] font-bold text-[#067647] truncate">{open} open</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
