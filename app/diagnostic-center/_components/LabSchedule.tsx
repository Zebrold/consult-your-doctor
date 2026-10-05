'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  CalendarCheck, CalendarDays, CalendarRange, CheckCircle2, ChevronLeft, ChevronRight, CircleCheck, ClipboardList, Clock,
  FlaskConical, Hourglass, IndianRupee, ListChecks, Phone, Plus, TrendingUp, UserCheck, Zap, type LucideIcon,
} from 'lucide-react'
import { Avatar, Chip, EmptyState, type Tone } from '@/components/portal/ui'
import { formatINR, IST } from '@/components/patient/format'
import { CallLink, NextStep, ReportLink, type BookingRef } from './BookingActions'
import { NewBookingButton, NewBookingForm } from './NewBooking'
import { TestMenu } from './TestMenu'

export type ScheduleBooking = BookingRef & {
  date: string | null
  amount: number | null
  ageSex: string | null
  bloodGroup: string | null
  testCount: number
  reportUrl: string | null
}

type LabHeader = {
  name: string
  image: string | null
  city: string | null
  address: string | null
  live: boolean
  tests: { name: string; price: number | null }[]
  priced: { name: string; price: number }[]
}

type Filter = 'booked' | 'collected' | 'sent' | 'unpaid'
type View = 'day' | 'week' | 'month' | 'list'

const STATUS: Record<string, { label: string; tone: Tone; bar: string; text: string; order: number }> = {
  confirmed: { label: 'Booked', tone: 'blue', bar: 'bg-vibrant-blue', text: 'text-vibrant-blue', order: 0 },
  visited: { label: 'Sample collected', tone: 'teal', bar: 'bg-fresh-teal', text: 'text-fresh-teal', order: 1 },
  completed: { label: 'Awaiting report', tone: 'coral', bar: 'bg-fresh-teal', text: 'text-fresh-teal', order: 1 },
  report_sent: { label: 'Report sent', tone: 'teal', bar: 'bg-indigo-gray-600', text: 'text-indigo-gray-600', order: 2 },
  pending_payment: { label: 'Awaiting payment', tone: 'coral', bar: 'bg-soft-coral', text: 'text-soft-coral', order: 3 },
}

const FILTERS: { key: Filter; label: string; dot: string }[] = [
  { key: 'booked', label: 'To Check In', dot: 'bg-vibrant-blue' },
  { key: 'collected', label: 'Awaiting Report', dot: 'bg-fresh-teal' },
  { key: 'sent', label: 'Report Sent', dot: 'bg-indigo-gray-600' },
  { key: 'unpaid', label: 'Unpaid', dot: 'bg-soft-coral' },
]

const VIEWS: { id: View; label: string; phone: boolean }[] = [
  { id: 'day', label: 'Day', phone: true },
  { id: 'week', label: 'Week', phone: true },
  { id: 'month', label: 'Month', phone: true },
  { id: 'list', label: 'List', phone: false },
]

const groupOf = (b: { status: string }): Filter =>
  b.status === 'confirmed' ? 'booked' : b.status === 'report_sent' ? 'sent' : b.status === 'pending_payment' ? 'unpaid' : 'collected'

const DAY = 86_400_000
const ms = (key: string) => Date.parse(`${key}T12:00:00+05:30`)
const shift = (key: string, days: number) => new Date(ms(key) + days * DAY).toLocaleDateString('en-CA', { timeZone: IST })
const fmt = (key: string, opts: Intl.DateTimeFormatOptions) => new Date(ms(key)).toLocaleDateString('en-GB', { timeZone: IST, ...opts })
const weekdayOf = (key: string) => new Date(ms(key)).getUTCDay()
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)
const card = 'bg-surface-container-lowest rounded-xl md:rounded-2xl shadow-sm border border-surface-container md:border-outline-variant/30'
const noBar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export function LabSchedule({
  lab,
  bookings,
  today,
  initialDate,
  booked,
}: {
  lab: LabHeader
  bookings: ScheduleBooking[]
  today: string
  initialDate: string
  /** How often each test has been booked (paid), for the price list. */
  booked: Record<string, number>
}) {
  const [day, setDay] = useState(initialDate)
  const [view, setView] = useState<View>('day')
  const [filter, setFilter] = useState<Filter | null>(null)
  const [month, setMonth] = useState(initialDate.slice(0, 7))

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleBooking[]>()
    for (const b of bookings) if (b.date) map.set(b.date, [...(map.get(b.date) ?? []), b])
    for (const list of map.values()) list.sort((a, b) => (STATUS[a.status]?.order ?? 9) - (STATUS[b.status]?.order ?? 9) || a.patientName.localeCompare(b.patientName))
    return map
  }, [bookings])
  const paidOn = (key: string) => (byDay.get(key) ?? []).filter((b) => b.status !== 'pending_payment')

  const go = (key: string) => {
    setDay(key)
    setMonth(key.slice(0, 7))
    setFilter(null)
    const url = new URL(window.location.href)
    if (key === today) url.searchParams.delete('date')
    else url.searchParams.set('date', key)
    window.history.replaceState(null, '', url)
  }
  const openDay = (key: string) => {
    go(key)
    setView('day')
  }

  const dayList = byDay.get(day) ?? []
  const paid = paidOn(day)
  const count = (f: Filter) => dayList.filter((b) => groupOf(b) === f).length
  const toCheck = count('booked')
  const collected = paid.length - toCheck
  const sent = count('sent')
  const value = paid.reduce((sum, b) => sum + (b.amount ?? 0), 0)
  const shown = filter ? dayList.filter((b) => groupOf(b) === filter) : dayList
  const isPast = day < today
  const spotlight = day === today ? dayList.find((b) => b.status === 'confirmed') ?? dayList.find((b) => groupOf(b) === 'collected') ?? null : null

  const weekStart = shift(day, -((weekdayOf(day) + 6) % 7))
  const weekKeys = Array.from({ length: 7 }, (_, i) => shift(weekStart, i))
  const weekPaid = weekKeys.flatMap(paidOn)
  const weekSent = weekPaid.filter((b) => b.status === 'report_sent').length
  const weekCollected = weekPaid.filter((b) => b.status !== 'confirmed').length

  const dayTitle = day === today ? 'Today' : day === shift(today, 1) ? 'Tomorrow' : day === shift(today, -1) ? 'Yesterday' : fmt(day, { weekday: 'short' })
  const navLabel =
    view === 'week'
      ? `Week of ${fmt(weekStart, { day: 'numeric', month: 'short' })}`
      : view === 'month'
        ? fmt(`${month}-01`, { month: 'long', year: 'numeric' })
        : `${dayTitle}, ${fmt(day, { day: 'numeric', month: 'short', year: 'numeric' })}`
  const step = (direction: -1 | 1) => {
    if (view === 'month') go(`${shift(`${month}-01`, direction === 1 ? 32 : -1).slice(0, 7)}-01`)
    else go(shift(day, direction * (view === 'week' ? 7 : 1)))
  }
  const bookingDefault = day < today ? today : day

  const viewToggle = (phone: boolean) => (
    <div className={`flex items-center bg-indigo-gray-50 rounded-full p-1 border border-outline-variant/50 ${phone ? '' : 'shadow-sm'}`}>
      {VIEWS.filter((v) => !phone || v.phone).map((v) => (
        <button
          key={v.id}
          type="button"
          aria-pressed={view === v.id}
          onClick={() => setView(v.id)}
          className={`px-3 md:px-3.5 py-1 rounded-full font-label-sm text-[11px] md:text-label-sm transition-colors ${
            view === v.id ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'text-indigo-gray-600 hover:text-indigo-gray-900'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  )

  return (
    <>
      {/* Desktop header row */}
      <section className="hidden md:flex flex-col xl:flex-row xl:items-center justify-between gap-5 p-5 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40">
        <div className="flex items-center gap-4 min-w-0">
          <span className="relative w-14 h-14 shrink-0">
            <Avatar name={lab.name} image={lab.image} className="w-14 h-14 text-lg shadow-sm ring-2 ring-primary/20" />
            {lab.live && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-fresh-teal rounded-full ring-2 ring-surface-container-lowest" title="Live for online booking" />}
          </span>
          <div className="min-w-0">
            <h1 className="font-title-md text-[20px] text-indigo-gray-900 font-bold tracking-tight truncate">{lab.name}</h1>
            <p className="text-[13px] text-indigo-gray-600 truncate">
              {lab.priced.length} bookable {lab.priced.length === 1 ? 'test' : 'tests'}
              {lab.city ? ` • ${lab.city}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-indigo-gray-50 rounded-full px-2 py-1 border border-outline-variant/50 shadow-sm">
            <button type="button" aria-label="Previous" onClick={() => step(-1)} className="w-8 h-8 flex items-center justify-center rounded-full text-indigo-gray-600 hover:text-indigo-gray-900 hover:bg-surface-container-lowest transition-colors">
              <ChevronLeft className="w-[18px] h-[18px]" />
            </button>
            <PickDate value={day} onPick={go} className="flex items-center gap-1.5 px-3">
              <CalendarDays className="w-4 h-4 text-vibrant-blue" />
              <span className="font-title-md text-[13px] font-bold text-indigo-gray-900 whitespace-nowrap">{navLabel}</span>
            </PickDate>
            <button type="button" aria-label="Next" onClick={() => step(1)} className="w-8 h-8 flex items-center justify-center rounded-full text-indigo-gray-600 hover:text-indigo-gray-900 hover:bg-surface-container-lowest transition-colors">
              <ChevronRight className="w-[18px] h-[18px]" />
            </button>
          </div>
          {viewToggle(false)}
          <div className="flex items-center gap-2">
            <a
              href="#tests"
              className="px-4 py-2 rounded-full font-label-sm text-label-sm bg-indigo-gray-50 hover:bg-surface-container border border-outline-variant/60 text-indigo-gray-900 font-semibold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <ListChecks className="w-[18px] h-[18px] text-vibrant-blue" /> Test Prices
            </a>
            <NewBookingButton
              tests={lab.priced}
              minDate={today}
              maxDate={shift(today, 90)}
              defaultDate={bookingDefault}
              label="New Test Intake"
              className="px-4 py-2 rounded-full font-label-sm text-label-sm bg-primary-container text-on-primary font-bold shadow-[0_4px_14px_rgba(0,102,255,0.25)] hover:bg-primary transition-all flex items-center gap-1.5"
            />
          </div>
        </div>
      </section>

      {/* Phone header card */}
      <section className={`md:hidden ${card} p-4 flex flex-col gap-3`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative shrink-0">
              <Avatar name={lab.name} image={lab.image} className="w-12 h-12 text-sm" />
              {lab.live && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-fresh-teal ring-2 ring-surface-container-lowest" />}
            </span>
            <div className="min-w-0">
              <span className="font-title-md text-[17px] text-on-surface font-bold tracking-tight truncate block">{lab.name}</span>
              <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 truncate">
                <FlaskConical className="w-3.5 h-3.5 text-primary shrink-0" /> {lab.priced.length} bookable tests
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="font-label-sm text-[11px] text-primary font-semibold bg-surface-container-low px-2 py-1 rounded-full">{fmt(day, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <span className="text-[11px] text-on-surface-variant mt-0.5">{paid.length} booked</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a href="#book" className="flex items-center justify-center gap-1.5 bg-vibrant-blue text-on-primary py-2.5 px-3 rounded-full font-label-sm text-label-sm shadow-sm active:scale-[0.98] transition-transform">
            <Plus className="w-[18px] h-[18px]" /> New Booking
          </a>
          <a href="#tests" className="flex items-center justify-center gap-1.5 bg-surface-container-low text-primary py-2.5 px-3 rounded-full font-label-sm text-label-sm active:scale-[0.98] transition-transform">
            <ListChecks className="w-[18px] h-[18px] text-fresh-teal" /> Test Prices
          </a>
        </div>
      </section>

      {/* Day summary */}
      <section className={`flex md:grid md:grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-4 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 py-1 ${noBar}`}>
        <Stat
          label="Check-ins"
          icon={CalendarCheck}
          tint="bg-primary/10 text-primary"
          value={`${collected} / ${paid.length}`}
          chip={`${pct(collected, paid.length)}% Checked In`}
          chipClass="text-primary bg-primary/10"
          bar={pct(collected, paid.length)}
          barClass="bg-primary"
          foot={isPast ? `${toCheck} never came` : `${toCheck} still to check in`}
          footIcon={CircleCheck}
          footIconClass="text-fresh-teal"
        />
        <Stat
          label="Awaiting Report"
          icon={FlaskConical}
          tint="bg-fresh-teal/10 text-fresh-teal"
          value={`${count('collected')} ${count('collected') === 1 ? 'Sample' : 'Samples'}`}
          valueClass="text-fresh-teal"
          chip="Collected"
          chipClass="text-fresh-teal bg-fresh-teal/10"
          bar={pct(count('collected'), collected)}
          barClass="bg-fresh-teal"
          foot={count('collected') ? 'Upload once results are ready' : 'Every sample reported'}
          footIcon={Clock}
          footIconClass="text-vibrant-blue"
        />
        <Stat
          label={isPast ? 'Never Came' : 'To Check In'}
          icon={Hourglass}
          tint="bg-soft-coral/10 text-soft-coral"
          value={`${toCheck} ${isPast ? 'Missed' : 'Waiting'}`}
          valueClass="text-soft-coral"
          chip={isPast ? 'Past day' : 'In-Centre'}
          chipClass={`text-soft-coral bg-soft-coral/10 ${!isPast && toCheck ? 'animate-pulse' : ''}`}
          bar={pct(toCheck, paid.length)}
          barClass="bg-soft-coral"
          foot={count('unpaid') ? `${count('unpaid')} booked online, not paid` : 'No unpaid bookings'}
          footIcon={Clock}
          footIconClass="text-soft-coral"
        />
        <Stat
          label="Day's Test Value"
          icon={IndianRupee}
          tint="bg-secondary-container/30 text-secondary"
          value={formatINR(value)}
          chip={`${pct(sent, collected)}% Reported`}
          chipClass="text-fresh-teal bg-fresh-teal/10"
          bar={pct(sent, collected)}
          barClass="bg-fresh-teal"
          foot={`${sent} ${sent === 1 ? 'report' : 'reports'} sent`}
          footIcon={TrendingUp}
          footIconClass="text-fresh-teal"
        />
      </section>

      {/* Next action today */}
      {spotlight && view === 'day' && <Spotlight booking={spotlight} />}

      {/* Date picker: cards on desktop, a strip on phones */}
      <section className={`hidden md:flex ${card} p-4 flex-col gap-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-vibrant-blue/10 text-vibrant-blue flex items-center justify-center">
              <CalendarRange className="w-[18px] h-[18px]" />
            </span>
            <div>
              <h3 className="font-title-md text-[15px] font-bold text-indigo-gray-900">Select Date &amp; View Bookings</h3>
              <span className="font-label-sm text-[12px] text-indigo-gray-600">Paid bookings per day (patients book a day, not a time)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PickDate value={day} onPick={openDay} className="px-3 py-1.5 rounded-full border border-outline-variant hover:border-vibrant-blue/30 text-indigo-gray-900 font-label-sm text-[12px] font-semibold flex items-center gap-1.5 bg-surface-container-lowest transition-colors">
              <CalendarDays className="w-4 h-4 text-vibrant-blue" /> Pick Date
            </PickDate>
            {day !== today && (
              <button type="button" onClick={() => openDay(today)} className="px-3 py-1.5 rounded-full bg-fresh-teal/10 hover:bg-fresh-teal/20 text-fresh-teal font-label-sm text-[12px] font-bold flex items-center gap-1 transition-colors">
                <CalendarCheck className="w-4 h-4" /> Back to Today
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[-2, -1, 0, 1, 2, 3].map((n) => {
            const k = shift(day, n)
            return <DayCard key={k} day={k} today={today} selected={k === day} list={paidOn(k)} onPick={openDay} />
          })}
        </div>
      </section>

      <section className="md:hidden flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Select Lab Date</span>
          <div className="flex items-center gap-1.5">
            <PickDate value={day} onPick={openDay} className="w-8 h-8 rounded-full bg-surface-container-lowest border border-outline-variant/50 flex items-center justify-center text-vibrant-blue">
              <CalendarDays className="w-4 h-4" />
            </PickDate>
            {viewToggle(true)}
          </div>
        </div>
        <div className={`flex gap-2 overflow-x-auto -mx-4 px-4 py-0.5 ${noBar}`}>
          {[-2, -1, 0, 1, 2, 3, 4].map((n) => {
            const k = shift(day, n)
            const list = paidOn(k)
            const selected = k === day
            return (
              <button
                key={k}
                type="button"
                onClick={() => openDay(k)}
                className={`flex flex-col items-center justify-center shrink-0 rounded-xl ${
                  selected ? 'min-w-[74px] py-2.5 px-2 bg-vibrant-blue text-on-primary shadow-md' : `min-w-[62px] py-2 px-1 bg-surface-container-lowest shadow-sm ${k < today ? 'text-on-surface-variant' : 'text-on-surface'}`
                }`}
              >
                <span className={`font-label-sm text-[11px] ${selected ? 'uppercase tracking-wide opacity-90' : 'text-on-surface-variant'}`}>{k === today ? 'Today' : fmt(k, { weekday: 'short' })}</span>
                <span className={`font-bold ${selected ? 'text-[20px] leading-none my-1' : 'text-[18px] mt-0.5'}`}>{Number(k.slice(8))}</span>
                <span className={`text-[9px] font-semibold ${selected ? 'font-bold bg-on-primary/20 px-1.5 py-0.5 rounded-full' : list.length ? 'text-primary mt-1' : k < today ? 'text-on-surface-variant/70 mt-1' : 'text-fresh-teal mt-1'}`}>
                  {list.length ? `${list.length} booked` : k < today ? 'None' : 'Open'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        <div className="contents lg:flex lg:col-span-8 lg:flex-col lg:gap-6 min-w-0">
          {view === 'day' && (
            <div className="order-1 lg:order-none flex items-center justify-between flex-wrap gap-2 min-w-0">
              <div className={`flex items-center gap-2 overflow-x-auto md:flex-wrap -mx-4 px-4 md:mx-0 md:px-0 ${noBar}`}>
                {[{ key: null, label: 'All Bookings', dot: '' } as { key: Filter | null; label: string; dot: string }, ...FILTERS].map((f) => {
                  const on = filter === f.key
                  return (
                    <button
                      key={f.label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilter(f.key)}
                      className={`px-3 md:px-3.5 py-1.5 rounded-full font-label-sm text-label-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                        on
                          ? 'bg-primary text-on-primary font-bold shadow-sm'
                          : f.key === 'unpaid'
                            ? 'bg-soft-coral/10 text-soft-coral font-bold hover:bg-soft-coral/20'
                            : 'bg-surface-container-lowest text-indigo-gray-600 border border-outline-variant/40 hover:bg-indigo-gray-50 font-medium shadow-sm md:shadow-none'
                      }`}
                    >
                      {f.dot && !on && f.key !== 'unpaid' && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
                      {f.label} ({f.key ? count(f.key) : dayList.length})
                    </button>
                  )
                })}
              </div>
              <span className={`hidden md:flex items-center gap-1.5 text-label-sm font-semibold px-2.5 py-1 rounded-full ${lab.live ? 'text-fresh-teal bg-fresh-teal/10' : 'text-soft-coral bg-soft-coral/10'}`}>
                <span className={`w-2 h-2 rounded-full ${lab.live ? 'bg-fresh-teal animate-pulse' : 'bg-soft-coral'}`} />
                {lab.live ? 'Live for Online Booking' : 'Not Listed for Online Booking'}
              </span>
            </div>
          )}

          <div className="order-2 lg:order-none min-w-0">
            {view === 'day' && (
              <div className="md:bg-surface-container-lowest md:rounded-2xl md:shadow-sm md:border md:border-outline-variant/30 md:p-5 flex flex-col gap-3 md:gap-4">
                <div className="flex items-center justify-between gap-3 px-1 md:px-0 md:pb-3 md:border-b md:border-surface-container">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-title-md text-[17px] md:text-title-md font-bold text-indigo-gray-900">
                        <span className="md:hidden">Patient Roster</span>
                        <span className="hidden md:inline">Timeline &amp; Patient Roster</span>
                      </span>
                      <span className="hidden sm:inline text-indigo-gray-600 font-label-sm text-label-sm">({dayList.length} {dayList.length === 1 ? 'booking' : 'bookings'})</span>
                    </div>
                    <p className="md:hidden font-label-sm text-[11px] text-on-surface-variant">
                      {dayTitle} • {fmt(day, { day: 'numeric', month: 'short' })} • check in, upload, call
                    </p>
                  </div>
                  <NewBookingButton
                    tests={lab.priced}
                    minDate={today}
                    maxDate={shift(today, 90)}
                    defaultDate={bookingDefault}
                    label="Add Walk-in"
                    className="hidden md:flex text-primary font-label-sm text-label-sm font-bold items-center gap-1 hover:underline shrink-0"
                  />
                </div>
                {shown.length === 0 ? (
                  <div className="p-8 rounded-xl bg-surface-container-lowest md:bg-surface-container-low text-center text-sm text-indigo-gray-600 shadow-sm md:shadow-none">
                    {dayList.length === 0 ? `No bookings for ${day === today ? 'today' : fmt(day, { weekday: 'long', day: 'numeric', month: 'long' })}.` : 'No bookings match this filter.'}
                  </div>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {shown.map((b) => (
                      <BookingRow key={b.id} b={b} missed={isPast && b.status === 'confirmed'} />
                    ))}
                  </ul>
                )}
              </div>
            )}

            {view === 'week' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {weekKeys.map((k) => {
                  const list = paidOn(k)
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => openDay(k)}
                      className={`text-left ${card} p-stack-sm hover:shadow-md transition-shadow ${k === today ? 'ring-2 ring-vibrant-blue/40' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-title-md text-[15px] text-indigo-gray-900 font-bold">{fmt(k, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        <span className="text-[11px] text-indigo-gray-600">
                          {list.length} booked • {list.filter((b) => b.status === 'report_sent').length} sent
                        </span>
                      </div>
                      {list.length === 0 ? (
                        <p className="text-xs text-outline">No bookings</p>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {list.slice(0, 5).map((b) => (
                            <li key={b.id} className="flex items-center gap-2 text-xs">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS[b.status]?.bar ?? 'bg-outline-variant'}`} />
                              <span className="truncate text-indigo-gray-900 font-medium">{b.patientName}</span>
                              <span className="truncate text-indigo-gray-600">{b.testLabel}</span>
                            </li>
                          ))}
                          {list.length > 5 && <li className="text-[11px] text-indigo-gray-600">+{list.length - 5} more</li>}
                        </ul>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {view === 'month' && <MonthGrid month={month} today={today} selected={day} byDay={byDay} onPick={openDay} />}

            {view === 'list' && <BookingList byDay={byDay} from={day} today={today} />}
          </div>

          {/* Test menu & prices */}
          <section id="tests" className={`order-4 lg:order-none ${card} p-4 md:p-5 flex flex-col gap-3 md:gap-4 scroll-mt-20 min-w-0`}>
            <div className="flex items-start sm:items-center justify-between gap-3 pb-1 md:pb-3 md:border-b md:border-surface-container">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="hidden sm:flex w-9 h-9 rounded-full bg-primary/10 text-primary items-center justify-center shrink-0">
                  <IndianRupee className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-title-md text-[17px] md:text-title-md font-bold text-indigo-gray-900">
                    <span className="md:hidden">Test Tariff &amp; Pricing</span>
                    <span className="hidden md:inline">Available Diagnostic Tests &amp; Price Configuration (₹ INR)</span>
                  </h2>
                  <span className="font-label-sm text-[11px] md:text-[12px] text-indigo-gray-600">
                    <span className="md:hidden">Your test menu • Rupee (₹ INR)</span>
                    <span className="hidden md:inline">Set test prices, add or remove tests: changes show on your booking page straight away</span>
                  </span>
                </div>
              </div>
              <Chip tone="neutral">
                {lab.tests.length} {lab.tests.length === 1 ? 'test' : 'tests'}
              </Chip>
            </div>
            <TestMenu tests={lab.tests} booked={booked} />
          </section>
        </div>

        <div className="contents lg:flex lg:col-span-4 lg:flex-col lg:gap-6 min-w-0">
          {/* Direct booking */}
          <section id="book" className={`order-3 lg:order-none ${card} p-4 md:p-5 flex flex-col gap-3 scroll-mt-20 min-w-0`}>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-vibrant-blue text-on-primary flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="font-title-md text-[17px] md:text-title-md font-bold text-indigo-gray-900">Direct Patient Fast Booking</h2>
            </div>
            <p className="font-body-md text-[13px] text-indigo-gray-600">Book a walk-in or phone patient. They pay at your desk and the report goes to their account.</p>
            <NewBookingForm key={bookingDefault} tests={lab.priced} minDate={today} maxDate={shift(today, 90)} defaultDate={bookingDefault} />
          </section>

          {/* Week turnaround */}
          <section className={`order-5 lg:order-none ${card} p-4 md:p-5 flex flex-col gap-3 min-w-0`}>
            <div className="flex items-center justify-between">
              <span className="font-title-md text-[14px] text-indigo-gray-900 font-bold uppercase tracking-wider">Report Turnaround</span>
              <span className="font-label-sm text-[11px] text-fresh-teal font-bold">Week of {fmt(weekStart, { day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-stack-sm">
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
                  <path className="text-surface-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path className="text-fresh-teal" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${pct(weekSent, weekCollected)}, 100`} strokeLinecap="round" strokeWidth="3.5" />
                </svg>
                <span className="absolute font-headline-lg text-[14px] text-indigo-gray-900 font-bold">{pct(weekSent, weekCollected)}%</span>
              </div>
              <div className="flex flex-col gap-1 text-[12px] text-indigo-gray-600">
                <span>Paid bookings: <strong className="text-indigo-gray-900">{weekPaid.length}</strong></span>
                <span>Samples collected: <strong className="text-indigo-gray-900">{weekCollected}</strong></span>
                <span>Reports sent: <strong className="text-fresh-teal">{weekSent}</strong></span>
              </div>
            </div>
          </section>
        </div>
      </section>
    </>
  )
}

/** A label that opens the browser's date picker. */
function PickDate({ value, onPick, className, children }: { value: string; onPick: (key: string) => void; className: string; children: ReactNode }) {
  return (
    <label className={`relative cursor-pointer ${className}`}>
      {children}
      <input
        type="date"
        value={value}
        onChange={(e) => e.target.value && onPick(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.()
          } catch {
            // Some browsers only allow the picker from a direct tap; the native input still works.
          }
        }}
        aria-label="Pick a date"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </label>
  )
}

function Stat({
  label,
  icon: Icon,
  tint,
  value,
  valueClass = 'text-indigo-gray-900',
  chip,
  chipClass,
  bar,
  barClass,
  foot,
  footIcon: FootIcon,
  footIconClass,
}: {
  label: string
  icon: LucideIcon
  tint: string
  value: string
  valueClass?: string
  chip: string
  chipClass: string
  bar: number
  barClass: string
  foot: string
  footIcon: LucideIcon
  footIconClass: string
}) {
  return (
    <div className="min-w-[156px] flex-1 md:min-w-0 bg-surface-container-lowest p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-surface-container md:border-outline-variant/40 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <span className="font-label-sm text-[11px] text-indigo-gray-600 uppercase tracking-wider font-semibold truncate">{label}</span>
        <span className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 ${tint}`}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </span>
      </div>
      <div className="flex items-baseline gap-2 mt-2 flex-wrap">
        <span className={`font-headline-lg text-[19px] md:text-[26px] font-bold leading-none whitespace-nowrap ${valueClass}`}>{value}</span>
        <span className={`hidden md:inline font-label-sm text-[11px] font-bold px-2 py-0.5 rounded-full ${chipClass}`}>{chip}</span>
      </div>
      <div className="w-full bg-surface-container h-1.5 rounded-full mt-2.5 overflow-hidden" role="img" aria-label={`${bar}%`}>
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, bar)}%` }} />
      </div>
      <span className="font-body-md text-[11px] md:text-[12px] text-indigo-gray-600 mt-2 flex items-center gap-1 min-w-0">
        <FootIcon className={`w-3.5 h-3.5 shrink-0 ${footIconClass}`} />
        <span className="truncate">{foot}</span>
      </span>
    </div>
  )
}

function Spotlight({ booking: b }: { booking: ScheduleBooking }) {
  const checkIn = b.status === 'confirmed'
  const Icon = checkIn ? UserCheck : FlaskConical
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-vibrant-blue text-on-primary p-4 md:p-5 shadow-xl shadow-vibrant-blue/15 border border-vibrant-blue/30">
      <div aria-hidden className="absolute -right-6 -bottom-6 w-36 h-36 bg-on-primary/10 rounded-full blur-xl pointer-events-none" />
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <span className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-surface-container-lowest/15 backdrop-blur-md flex items-center justify-center shrink-0 ring-1 ring-surface-container-lowest/30">
            <Icon className="w-6 h-6 md:w-7 md:h-7" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-fresh-teal text-on-primary font-label-sm text-[10px] uppercase font-bold tracking-wider">
                {checkIn ? 'Next to Check In' : 'Sample Collected • Report Due'}
              </span>
              <span className="font-label-sm text-[12px] text-primary-fixed">• Booking #{b.code}</span>
              {b.ageSex && <span className="font-label-sm text-[12px] text-primary-fixed">• {b.ageSex}</span>}
              {b.amount != null && <span className="hidden sm:inline font-label-sm text-[12px] text-primary-fixed">• {formatINR(b.amount)}</span>}
            </div>
            <h2 className="font-title-md text-[18px] md:text-[20px] font-bold tracking-tight mt-0.5 truncate">{b.patientName}</h2>
            <p className="font-body-md text-[12px] md:text-[13px] text-primary-fixed truncate">
              {b.testLabel} ({b.testCount} {b.testCount === 1 ? 'test' : 'tests'})
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <CallLink phone={b.phone} name={b.patientName} kind="light" />
          <NextStep booking={b} reportUrl={b.reportUrl} kind="light" />
        </div>
      </div>
    </section>
  )
}

function DayCard({ day, today, selected, list, onPick }: { day: string; today: string; selected: boolean; list: ScheduleBooking[]; onPick: (key: string) => void }) {
  const past = day < today
  const toReport = list.filter((b) => groupOf(b) === 'collected').length
  const label = day === today ? `Today (${fmt(day, { weekday: 'short' })})` : fmt(day, { weekday: 'short', day: 'numeric', month: 'short' })
  const chip = selected
    ? { text: `${list.length} Booked`, cls: 'text-on-primary bg-vibrant-blue shadow-sm' }
    : past
      ? toReport
        ? { text: `${toReport} to report`, cls: 'text-soft-coral bg-soft-coral/10' }
        : { text: list.length ? `${list.length} booked` : 'Passed', cls: 'text-indigo-gray-600 bg-surface-container' }
      : list.length
        ? { text: `${list.length} booked`, cls: 'text-primary bg-primary/10' }
        : { text: 'Open', cls: 'text-fresh-teal bg-fresh-teal/10' }
  return (
    <button
      type="button"
      onClick={() => onPick(day)}
      aria-pressed={selected}
      className={`p-3 rounded-xl text-left transition-all flex flex-col relative overflow-hidden ${
        selected
          ? 'border-2 border-vibrant-blue bg-vibrant-blue/5 shadow-md shadow-vibrant-blue/10'
          : `border border-outline-variant/60 hover:border-vibrant-blue/30 hover:bg-indigo-gray-50 ${past ? 'bg-indigo-gray-50 opacity-75 hover:opacity-100' : 'bg-surface-container-lowest'}`
      }`}
    >
      {selected && <CheckCircle2 className="absolute right-2 top-2 w-[18px] h-[18px] text-vibrant-blue" />}
      <span className={`font-label-sm text-[11px] uppercase ${selected ? 'text-vibrant-blue font-bold' : 'text-indigo-gray-600 font-semibold'}`}>{label}</span>
      <span className="font-title-md text-[16px] font-bold text-indigo-gray-900 mt-0.5">{fmt(day, { day: 'numeric', month: 'short' })}</span>
      <span className={`mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full self-start ${chip.cls}`}>{chip.text}</span>
    </button>
  )
}

function BookingRow({ b, missed }: { b: ScheduleBooking; missed: boolean }) {
  const s = STATUS[b.status]
  const collected = groupOf(b) === 'collected'
  const label = missed ? 'Not checked in' : s?.label
  return (
    <li
      className={`relative overflow-hidden rounded-xl p-4 pl-5 md:pl-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all hover:shadow-md ${
        collected
          ? 'bg-surface-container-lowest border border-fresh-teal/30 hover:border-fresh-teal md:bg-gradient-to-r md:from-fresh-teal/5 md:to-transparent'
          : 'bg-surface-container-lowest md:bg-surface-container-low shadow-sm md:shadow-none border border-surface-container md:border-transparent'
      } ${b.status === 'report_sent' ? 'opacity-90 hover:opacity-100' : ''}`}
    >
      <div aria-hidden className={`absolute left-0 top-0 bottom-0 w-1.5 ${missed ? 'bg-soft-coral' : s?.bar ?? 'bg-outline-variant'}`} />
      <div className="flex items-start md:items-center gap-3 md:gap-4 md:pl-2 min-w-0">
        <div className="hidden md:flex flex-col min-w-[88px]">
          <span className={`font-title-md text-[14px] font-bold ${collected ? 'text-fresh-teal' : 'text-indigo-gray-900'}`}>#{b.code}</span>
          <span className="font-label-sm text-[12px] text-indigo-gray-600">{b.amount != null ? formatINR(b.amount) : 'No price'}</span>
        </div>
        <Avatar name={b.patientName} className="md:hidden w-10 h-10 text-xs" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <span className="font-title-md text-[15px] font-bold text-indigo-gray-900 truncate">{b.patientName}</span>
            {b.ageSex && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-container text-on-surface-variant whitespace-nowrap">{b.ageSex}</span>}
            {s && (
              <span className="hidden md:inline-flex">
                <Chip tone={missed ? 'coral' : s.tone}>{label}</Chip>
              </span>
            )}
          </div>
          <p className="font-body-md text-[12px] md:text-[13px] text-primary md:text-indigo-gray-600 font-medium md:font-normal mt-0.5 truncate">
            {b.testLabel}
            <span className="hidden md:inline">{b.phone ? ` • ${b.phone}` : ''}</span>
          </p>
        </div>
        <div className="md:hidden text-right shrink-0">
          <span className="font-title-md text-[13px] font-bold text-on-surface block">#{b.code}</span>
          <span className={`text-[10px] font-semibold ${missed ? 'text-soft-coral' : s?.text ?? 'text-indigo-gray-600'}`}>{label}</span>
        </div>
      </div>
      <div className="md:hidden grid grid-cols-2 gap-2 text-[11px] bg-surface-container-low rounded-lg p-2.5">
        <span className="flex items-center gap-1.5 text-on-surface-variant min-w-0">
          <Phone className="w-[15px] h-[15px] text-vibrant-blue shrink-0" />
          <strong className="text-on-surface truncate">{b.phone ?? 'No phone'}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-on-surface-variant min-w-0">
          <IndianRupee className="w-[15px] h-[15px] text-fresh-teal shrink-0" />
          <strong className="text-on-surface truncate">{b.amount != null ? formatINR(b.amount) : 'No price'}</strong>
          <span className="truncate">• {b.testCount} {b.testCount === 1 ? 'test' : 'tests'}</span>
        </span>
      </div>
      <div className="flex items-center justify-end gap-2 shrink-0">
        <CallLink phone={b.phone} name={b.patientName} kind="icon" />
        {b.status === 'report_sent' && b.reportUrl ? <ReportLink href={b.reportUrl} kind="soft" /> : <NextStep booking={b} reportUrl={b.reportUrl} kind={collected ? 'blue' : 'soft'} />}
      </div>
    </li>
  )
}

function MonthGrid({ month, today, selected, byDay, onPick }: { month: string; today: string; selected: string; byDay: Map<string, ScheduleBooking[]>; onPick: (key: string) => void }) {
  const first = `${month}-01`
  const lead = (weekdayOf(first) + 6) % 7
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => shift(first, i - lead))
  return (
    <div className={`${card} p-3 md:p-stack-md`}>
      <div className="grid grid-cols-7 gap-1 md:gap-1.5 text-center font-label-sm text-[10px] md:text-[11px] text-indigo-gray-600 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-1.5">
        {cells.map((key) => {
          const list = (byDay.get(key) ?? []).filter((b) => b.status !== 'pending_payment')
          const waiting = list.filter((b) => groupOf(b) === 'collected').length
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
              {list.length > 0 && <span className="text-[9px] md:text-[10px] font-semibold text-primary leading-tight truncate">{list.length} booked</span>}
              {waiting > 0 && <span className="text-[9px] md:text-[10px] text-soft-coral leading-tight truncate">{waiting} to report</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BookingList({ byDay, from, today }: { byDay: Map<string, ScheduleBooking[]>; from: string; today: string }) {
  const days = Array.from(byDay.entries())
    .filter(([key]) => key >= from)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 14)
  if (days.length === 0) return <EmptyState icon={ClipboardList}>No bookings from this day onward yet.</EmptyState>
  return (
    <div className="flex flex-col gap-stack-sm">
      {days.map(([key, list]) => (
        <div key={key} className={`${card} p-stack-sm`}>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="font-title-md text-[14px] font-bold text-indigo-gray-900">{key === today ? 'Today' : fmt(key, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            <span className="text-[11px] text-indigo-gray-600">
              {list.length} {list.length === 1 ? 'booking' : 'bookings'}
            </span>
          </div>
          <ul className="divide-y divide-surface-container">
            {list.map((b) => (
              <li key={b.id} className="py-2.5 px-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-stack-sm min-w-0">
                  <span className="font-semibold text-primary text-[12px] w-20 shrink-0">#{b.code}</span>
                  <Avatar name={b.patientName} className="w-8 h-8 text-[11px]" />
                  <div className="min-w-0">
                    <span className="text-[14px] font-semibold text-indigo-gray-900 truncate block">{b.patientName}</span>
                    <span className="text-[11px] text-indigo-gray-600 truncate block">{b.testLabel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {STATUS[b.status] && <Chip tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Chip>}
                  <CallLink phone={b.phone} name={b.patientName} kind="icon" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

