'use client'

import { useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CalendarCheck, ChevronLeft, ChevronRight, ClipboardList, FlaskConical, IndianRupee, UserCheck, Users } from 'lucide-react'
import { Chip, EmptyState, SegmentBar, type Tone } from '@/components/portal/ui'
import { formatINR, IST } from '@/components/patient/format'
import { CallLink, NextStep, ReportLink, type BookingRef } from './BookingActions'

export type ScheduleBooking = BookingRef & {
  date: string | null
  amount: number | null
  ageSex: string | null
  reportUrl: string | null
}

const STATUS: Record<string, { label: string; tone: Tone; bar: string; order: number }> = {
  confirmed: { label: 'Booked', tone: 'blue', bar: 'bg-vibrant-blue', order: 0 },
  visited: { label: 'Sample collected', tone: 'teal', bar: 'bg-fresh-teal', order: 1 },
  completed: { label: 'Awaiting report', tone: 'coral', bar: 'bg-fresh-teal', order: 1 },
  report_sent: { label: 'Report sent', tone: 'teal', bar: 'bg-secondary', order: 2 },
  pending_payment: { label: 'Awaiting payment', tone: 'coral', bar: 'bg-soft-coral', order: 3 },
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'booked', label: 'To check in' },
  { key: 'collected', label: 'Awaiting report' },
  { key: 'sent', label: 'Report sent' },
  { key: 'unpaid', label: 'Unpaid' },
] as const
type Filter = (typeof FILTERS)[number]['key']

const inFilter = (b: ScheduleBooking, f: Filter) =>
  f === 'all' ||
  (f === 'booked' && b.status === 'confirmed') ||
  (f === 'collected' && (b.status === 'visited' || b.status === 'completed')) ||
  (f === 'sent' && b.status === 'report_sent') ||
  (f === 'unpaid' && b.status === 'pending_payment')

const DAY = 86_400_000
const ms = (key: string) => Date.parse(`${key}T12:00:00+05:30`)
const shift = (key: string, days: number) => new Date(ms(key) + days * DAY).toLocaleDateString('en-CA', { timeZone: IST })
const fmt = (key: string, opts: Intl.DateTimeFormatOptions) => new Date(ms(key)).toLocaleDateString('en-GB', { timeZone: IST, ...opts })

export function LabSchedule({ bookings, today, initialDate }: { bookings: ScheduleBooking[]; today: string; initialDate: string }) {
  const [day, setDay] = useState(initialDate)
  const [filter, setFilter] = useState<Filter>('all')

  const go = (key: string) => {
    setDay(key)
    setFilter('all')
    const url = new URL(window.location.href)
    if (key === today) url.searchParams.delete('date')
    else url.searchParams.set('date', key)
    window.history.replaceState(null, '', url)
  }

  const countOn = (key: string) => bookings.filter((b) => b.date === key && b.status !== 'pending_payment').length
  const dayList = bookings
    .filter((b) => b.date === day)
    .sort((a, b) => (STATUS[a.status]?.order ?? 9) - (STATUS[b.status]?.order ?? 9) || a.patientName.localeCompare(b.patientName))
  const paid = dayList.filter((b) => b.status !== 'pending_payment')
  const n = (s: string) => dayList.filter((b) => b.status === s).length
  const value = paid.reduce((sum, b) => sum + (b.amount ?? 0), 0)
  const shown = dayList.filter((b) => inFilter(b, filter))
  const strip = Array.from({ length: 7 }, (_, i) => shift(day, i - 3))
  const isPast = day < today

  const dayTitle = day === today ? 'Today' : day === shift(today, 1) ? 'Tomorrow' : day === shift(today, -1) ? 'Yesterday' : fmt(day, { weekday: 'long' })

  return (
    <div className="flex flex-col gap-4 md:gap-stack-md">
      {/* Day picker */}
      <section className="bg-surface-container-lowest rounded-2xl md:rounded-xl p-4 shadow-sm border border-surface-container md:border-transparent flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface-container-low rounded-full p-1">
              <button type="button" aria-label="Previous day" onClick={() => go(shift(day, -1))} className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:text-indigo-gray-900 hover:bg-surface-container-lowest">
                <ChevronLeft className="w-[18px] h-[18px]" />
              </button>
              <span className="px-2 md:px-3 font-title-md text-[13px] md:text-[14px] font-bold text-indigo-gray-900 whitespace-nowrap">
                {dayTitle}, {fmt(day, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button type="button" aria-label="Next day" onClick={() => go(shift(day, 1))} className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:text-indigo-gray-900 hover:bg-surface-container-lowest">
                <ChevronRight className="w-[18px] h-[18px]" />
              </button>
            </div>
            {day !== today && (
              <button type="button" onClick={() => go(today)} className="px-3.5 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-label-sm">
                Today
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-[12px] text-indigo-gray-600">
            Jump to
            <input type="date" value={day} onChange={(e) => e.target.value && go(e.target.value)} className="px-2.5 py-1.5 rounded-full bg-surface-container-low text-indigo-gray-900 text-[12px] font-semibold focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30" />
          </label>
        </div>

        <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
          {strip.map((key) => {
            const count = countOn(key)
            const selected = key === day
            const past = key < today
            return (
              <button
                key={key}
                type="button"
                onClick={() => go(key)}
                aria-pressed={selected}
                className={`relative py-2 md:p-3 rounded-xl text-center md:text-left flex flex-col items-center md:items-start transition-all border ${
                  selected
                    ? 'border-vibrant-blue bg-vibrant-blue/5 shadow-md shadow-vibrant-blue/10'
                    : `border-surface-container-high hover:border-vibrant-blue/30 ${past ? 'bg-surface-container-low/60 opacity-75' : 'bg-surface-container-lowest'}`
                }`}
              >
                <span className={`font-label-sm text-[10px] md:text-[11px] uppercase font-semibold ${selected ? 'text-vibrant-blue' : 'text-indigo-gray-600'}`}>
                  {key === today ? 'Today' : fmt(key, { weekday: 'short' })}
                </span>
                <span className="font-title-md text-[16px] md:text-[18px] font-bold text-indigo-gray-900 leading-tight">{fmt(key, { day: 'numeric' })}</span>
                <span className="hidden md:inline text-[11px] text-indigo-gray-600">{fmt(key, { month: 'short' })}</span>
                <span
                  className={`mt-1 text-[9px] md:text-[11px] font-bold px-1.5 md:px-2 py-0.5 rounded-full ${
                    count === 0 ? 'text-indigo-gray-600 bg-surface-container' : selected ? 'bg-vibrant-blue text-on-primary' : 'bg-fresh-teal/10 text-secondary'
                  }`}
                >
                  {count}
                  <span className="hidden md:inline"> {count === 1 ? 'booking' : 'bookings'}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Day summary */}
      <section className="flex md:grid md:grid-cols-4 gap-2.5 md:gap-gutter overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <DayStat icon={Users} tone="blue" label="Bookings" value={paid.length} note={n('pending_payment') ? `+${n('pending_payment')} unpaid` : undefined}>
          <SegmentBar
            parts={[
              { value: n('report_sent'), className: 'bg-secondary', label: 'report sent' },
              { value: n('visited') + n('completed'), className: 'bg-fresh-teal', label: 'sample collected' },
              { value: n('confirmed'), className: 'bg-vibrant-blue', label: 'to check in' },
            ]}
          />
        </DayStat>
        <DayStat icon={UserCheck} tone="neutral" label={isPast ? 'Never checked in' : 'To check in'} value={n('confirmed')} alert={isPast && n('confirmed') > 0} />
        <DayStat icon={FlaskConical} tone="coral" label="Awaiting report" value={n('visited') + n('completed')} />
        <DayStat icon={IndianRupee} tone="teal" label="Test value" value={formatINR(value)} note="at today’s prices" />
      </section>

      {/* Roster */}
      <section className="bg-surface-container-lowest rounded-2xl md:rounded-xl p-4 md:p-stack-md shadow-sm border border-surface-container md:border-transparent flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="font-title-md text-[16px] md:text-title-md text-indigo-gray-900 font-bold">Patient Roster</h2>
            <p className="text-[12px] text-indigo-gray-600">Bookings are made for a day; patients come in during your opening hours.</p>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {FILTERS.map((f) => {
              const c = dayList.filter((b) => inFilter(b, f.key)).length
              if (f.key === 'unpaid' && c === 0) return null
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-full font-label-sm text-[12px] whitespace-nowrap transition-colors ${
                    active ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-low text-indigo-gray-600 hover:bg-surface-container'
                  }`}
                >
                  {f.label} <span className={active ? 'opacity-80' : 'text-indigo-gray-900'}>{c}</span>
                </button>
              )
            })}
          </div>
        </div>

        {shown.length === 0 ? (
          <EmptyState icon={dayList.length ? ClipboardList : CalendarCheck}>
            {dayList.length ? 'No bookings match this filter.' : `No bookings for ${dayTitle === 'Today' ? 'today' : fmt(day, { weekday: 'long', day: 'numeric', month: 'long' })}.`}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2.5 md:gap-3">
            {shown.map((b) => {
              const missed = b.status === 'confirmed' && isPast
              const status = missed ? { label: 'Not checked in', tone: 'coral' as Tone, bar: 'bg-soft-coral' } : STATUS[b.status]
              return (
                <li key={b.id} className="relative overflow-hidden p-3.5 md:p-4 rounded-xl bg-surface-container-low/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <span aria-hidden className={`absolute left-0 inset-y-0 w-1.5 ${status?.bar ?? 'bg-outline-variant'}`} />
                  <div className="flex items-start md:items-center gap-3 md:gap-4 pl-2 min-w-0">
                    <div className="w-[76px] shrink-0">
                      <span className="block font-title-md text-[13px] md:text-[14px] font-bold text-indigo-gray-900">#{b.code}</span>
                      <span className="block text-[11px] text-indigo-gray-600">{b.amount != null ? formatINR(b.amount) : 'Price n/a'}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-title-md text-[15px] font-bold text-indigo-gray-900">{b.patientName}</span>
                        {status && <Chip tone={status.tone}>{status.label}</Chip>}
                      </div>
                      <p className="text-[13px] text-primary font-medium mt-0.5">{b.testLabel}</p>
                      <p className="text-[12px] text-indigo-gray-600">{[b.ageSex, b.phone, b.status === 'pending_payment' ? 'Not paid online yet' : null].filter(Boolean).join(' • ') || 'No contact details'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    <CallLink phone={b.phone} name={b.patientName} kind="icon" />
                    {b.status === 'report_sent' && b.reportUrl ? <ReportLink href={b.reportUrl} kind="soft" /> : <NextStep booking={b} reportUrl={b.reportUrl} />}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function DayStat({
  icon: Icon,
  tone,
  label,
  value,
  note,
  alert,
  children,
}: {
  icon: LucideIcon
  tone: Tone
  label: string
  value: string | number
  note?: string
  alert?: boolean
  children?: ReactNode
}) {
  const tint = { blue: 'bg-primary-fixed text-on-primary-fixed', teal: 'bg-secondary-container text-on-secondary-container', coral: 'bg-error-container text-tertiary', neutral: 'bg-surface-container-high text-vibrant-blue' }[tone]
  return (
    <div className={`min-w-[150px] flex-1 bg-surface-container-lowest p-3 md:p-4 rounded-xl shadow-sm border flex flex-col gap-2 ${alert ? 'border-soft-coral/30 ring-1 ring-soft-coral/20' : 'border-surface-container md:border-transparent'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-label-sm text-[11px] uppercase tracking-wider ${alert ? 'text-soft-coral font-bold' : 'text-indigo-gray-600'}`}>{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tint}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`font-headline-lg text-[24px] md:text-[28px] font-extrabold leading-none ${alert ? 'text-soft-coral' : 'text-indigo-gray-900'}`}>{value}</span>
        {note && <span className="text-[11px] font-semibold text-indigo-gray-600">{note}</span>}
      </div>
      {children}
    </div>
  )
}
