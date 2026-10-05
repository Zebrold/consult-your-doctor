'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlarmClock, Barcode, CalendarDays, ChevronLeft, ChevronRight, Download, Droplet, FileCheck2, FileText, FlaskConical, Mail, Printer, Search, Users, X,
} from 'lucide-react'
import { Avatar } from '@/components/portal/ui'
import { RefreshButton } from '@/components/portal/RefreshButton'
import { formatINR, formatShortDate } from '@/components/patient/format'
import { OVERDUE_DAYS } from '../_lib/constants'
import { CallLink, NextStep, ReportLink, UploadReportButton, type BookingRef } from './BookingActions'

export type RosterBooking = BookingRef & {
  date: string | null
  amount: number | null
  email: string | null
  ageSex: string | null
  bloodGroup: string | null
  dateOfBirth: string | null
  gender: string | null
  visitsHere: number
  reportUrl: string | null
  tests: { name: string; price: number | null }[]
}

export type RosterGroup = 'all' | 'booked' | 'collected' | 'sent'

const GROUPS: { key: RosterGroup; label: string; countClass: string; dot?: string }[] = [
  { key: 'all', label: 'All Bookings', countClass: 'opacity-80' },
  { key: 'booked', label: 'To Check In', countClass: 'text-vibrant-blue font-bold', dot: 'bg-vibrant-blue' },
  { key: 'collected', label: 'Awaiting Report', countClass: 'text-fresh-teal font-bold', dot: 'bg-fresh-teal' },
  { key: 'sent', label: 'Report Sent', countClass: 'text-indigo-gray-600', dot: 'bg-indigo-gray-600' },
]

const PAGE = 8
const DAY = 86_400_000
const ms = (date: string) => Date.parse(`${date}T12:00:00+05:30`)
const groupOf = (b: { status: string }): RosterGroup => (b.status === 'confirmed' ? 'booked' : b.status === 'report_sent' ? 'sent' : 'collected')
const dayText = (date: string | null) => (date ? formatShortDate(`${date}T12:00:00+05:30`) : 'No date')
const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

type Look = { label: string; chip: string; dot: string; note: string; noteClass: string; overdue: boolean }

function exportCsv(rows: RosterBooking[], look: (b: RosterBooking) => Look) {
  const header = ['Booking ID', 'Date', 'Patient', 'Age/Sex', 'Phone', 'Email', 'Tests', 'Amount (INR)', 'Status']
  const lines = rows.map((r) => [r.code, r.date ?? '', r.patientName, r.ageSex ?? '', r.phone ?? '', r.email ?? '', r.testLabel, r.amount ?? '', look(r).label])
  const csv = [header, ...lines].map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'lab-patients.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function LabRoster({
  bookings,
  initialGroup,
  initialBooking,
  today,
  header,
  mobileAction,
}: {
  bookings: RosterBooking[]
  initialGroup: RosterGroup
  initialBooking: string | null
  today: string
  /** The "New Booking" button, rendered by the page. */
  header: ReactNode
  /** The phone's sticky "New Booking" button. */
  mobileAction?: ReactNode
}) {
  const [group, setGroup] = useState<RosterGroup>(initialGroup)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(PAGE)
  const [openId, setOpenId] = useState<string | null>(() => (initialBooking && bookings.some((b) => b.id === initialBooking) ? initialBooking : null))
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl+K jumps to the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const waited = (b: RosterBooking) => (b.date ? Math.max(0, Math.round((ms(today) - ms(b.date)) / DAY)) : 0)
  const look = (b: RosterBooking): Look => {
    if (b.status === 'report_sent') return { label: 'Report Sent', chip: 'bg-secondary-container/40 text-on-secondary-fixed-variant', dot: 'bg-fresh-teal', note: 'In patient’s account', noteClass: 'text-indigo-gray-600', overdue: false }
    if (b.status === 'confirmed') {
      if (b.date && b.date < today) return { label: 'Not Checked In', chip: 'bg-tertiary-fixed/60 text-tertiary', dot: 'bg-soft-coral', note: 'Missed the booked day', noteClass: 'text-soft-coral', overdue: false }
      const ahead = b.date ? Math.round((ms(b.date) - ms(today)) / DAY) : null
      const note = ahead == null ? 'No day chosen' : ahead === 0 ? 'Due in today' : ahead === 1 ? 'Due tomorrow' : `Due in ${ahead} days`
      return { label: 'Booked', chip: 'bg-surface-container text-indigo-gray-900', dot: 'bg-vibrant-blue', note, noteClass: 'text-indigo-gray-600', overdue: false }
    }
    const d = waited(b)
    if (d >= OVERDUE_DAYS) return { label: 'Report Overdue', chip: 'bg-tertiary-fixed text-tertiary', dot: 'bg-soft-coral', note: `Waiting ${d} days`, noteClass: 'text-soft-coral font-semibold', overdue: true }
    return { label: 'Sample Collected', chip: 'bg-primary-fixed/60 text-on-primary-fixed', dot: 'bg-vibrant-blue animate-pulse', note: d === 0 ? 'Report due • collected today' : `Report due • ${d}d waiting`, noteClass: 'text-vibrant-blue', overdue: false }
  }

  const counts = useMemo(() => {
    const c: Record<RosterGroup, number> = { all: bookings.length, booked: 0, collected: 0, sent: 0 }
    for (const b of bookings) c[groupOf(b)]++
    return c
  }, [bookings])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings.filter(
      (b) => (group === 'all' || groupOf(b) === group) && (!q || [b.patientName, b.code, b.phone, b.testLabel, b.email].some((v) => v?.toLowerCase().includes(q))),
    )
  }, [bookings, group, query])

  const open = bookings.find((b) => b.id === openId) ?? null
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const current = Math.min(page, pages - 1)
  const pageRows = rows.slice(current * PAGE, current * PAGE + PAGE)
  const bookedToday = bookings.filter((b) => b.date === today).length
  const overdue = bookings.filter((b) => groupOf(b) === 'collected' && waited(b) >= OVERDUE_DAYS).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const alert = overdue[0] ?? null
  const emptyText = bookings.length ? 'No bookings match your search.' : 'No paid bookings yet. Patients who book and pay, and walk-ins you book, appear here.'

  const reset = () => {
    setPage(0)
    setLimit(PAGE)
  }
  const pickGroup = (g: RosterGroup) => {
    setGroup(g)
    reset()
  }

  const search = (phone: boolean) => (
    <label className="relative flex-1 block min-w-0">
      <Search className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline md:text-indigo-gray-600 pointer-events-none" />
      <span className="sr-only">Search bookings</span>
      <input
        ref={phone ? undefined : searchRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          reset()
        }}
        placeholder={phone ? 'Search patient, booking ID, phone...' : 'Search by patient name, booking ID, test or mobile...'}
        className="w-full h-12 md:h-auto pl-10 md:pl-11 pr-4 md:pr-16 md:py-3 rounded-xl md:rounded-full bg-surface-container-lowest md:bg-surface-container-low text-on-surface text-[14px] md:text-body-md placeholder:text-outline md:placeholder:text-indigo-gray-600/70 shadow-sm md:shadow-none focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30 md:focus:ring-vibrant-blue transition-all"
      />
      {!phone && (
        <kbd className="hidden md:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-lowest shadow-sm text-indigo-gray-600 font-label-sm text-label-sm">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      )}
    </label>
  )
  const pills = (
    <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {GROUPS.map((g) => {
        const on = group === g.key
        return (
          <button
            key={g.key}
            type="button"
            aria-pressed={on}
            onClick={() => pickGroup(g.key)}
            className={`px-3.5 md:px-4 py-1.5 md:py-2 rounded-full font-label-sm text-label-sm whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
              on ? 'bg-vibrant-blue md:bg-primary text-on-primary shadow-sm' : 'bg-surface-container-lowest md:bg-surface-container-low text-on-surface-variant hover:bg-surface-container shadow-sm md:shadow-none'
            }`}
          >
            {g.dot && !on && <span className={`md:hidden w-1.5 h-1.5 rounded-full ${g.dot}`} />}
            {g.label}
            <span className={`ml-0.5 text-[11px] ${on ? 'opacity-80' : g.countClass}`}>{on ? counts[g.key] : `(${counts[g.key]})`}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <>
      {/* Phone: title */}
      <div className="md:hidden flex items-center justify-between gap-3 order-first pt-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-fresh-teal" />
            <span className="font-label-sm text-label-sm text-fresh-teal uppercase tracking-wider">{bookedToday ? `${bookedToday} booked for today` : 'Lab bookings'}</span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold tracking-tight">Patient Records</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" aria-label="Export CSV" title="Export CSV" onClick={() => exportCsv(rows, look)} className="w-10 h-10 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-on-surface-variant hover:text-vibrant-blue">
            <Download className="w-5 h-5" />
          </button>
          <RefreshButton label="Refresh bookings" className="w-10 h-10 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-on-surface-variant hover:text-vibrant-blue" />
        </div>
      </div>

      {/* Phone: search & filters */}
      <div className="md:hidden flex flex-col gap-2">
        {search(true)}
        {pills}
      </div>

      {/* Header, search & filters */}
      <section className="hidden md:flex bg-surface-container-lowest rounded-2xl shadow-[0_4px_30px_rgba(0,102,255,0.05)] p-6 flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight">Patient Roster &amp; Lab Records</h1>
            <p className="font-body-md text-body-md text-indigo-gray-600 mt-1">Every paid booking: check patients in, upload reports and track what&apos;s been sent.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => exportCsv(rows, look)}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-variant transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-[18px] h-[18px]" /> Export Roster (CSV)
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-variant transition-colors shadow-sm">
              <Printer className="w-[18px] h-[18px]" /> Print List
            </button>
            {header}
          </div>
        </div>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-2">
          <div className="flex-1 max-w-2xl">{search(false)}</div>
          {pills}
        </div>
      </section>

      {/* Phone: oldest overdue report */}
      {alert && group !== 'sent' && !query && <OverdueAlert b={alert} days={waited(alert)} more={overdue.length - 1} onOpen={() => setOpenId(alert.id)} />}

      {rows.length === 0 && (
        <div className="md:hidden p-8 rounded-xl bg-surface-container-lowest text-center text-sm text-indigo-gray-600 shadow-sm flex flex-col items-center gap-2">
          <Users className="w-7 h-7 text-outline" />
          {emptyText}
        </div>
      )}
      {/* Desktop table */}
      <section className="hidden md:flex bg-surface-container-lowest rounded-2xl shadow-[0_4px_30px_rgba(0,102,255,0.05)] overflow-hidden flex-col w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[920px]">
            <thead>
              <tr className="bg-surface-container-low text-indigo-gray-600 font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3.5 px-6 font-semibold">Patient Details</th>
                <th className="py-3.5 px-4 font-semibold">Booking</th>
                <th className="py-3.5 px-4 font-semibold">Tests Ordered</th>
                <th className="py-3.5 px-4 font-semibold">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-6 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-14 px-6 text-center">
                    <span className="inline-flex flex-col items-center gap-2 text-sm text-indigo-gray-600">
                      <span className="w-12 h-12 rounded-full bg-surface-container-low text-outline flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </span>
                      {emptyText}
                    </span>
                  </td>
                </tr>
              )}
              {pageRows.map((b) => {
                const l = look(b)
                const active = b.id === openId
                return (
                  <tr key={b.id} onClick={() => setOpenId(b.id)} className={`cursor-pointer transition-colors group ${active ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-container-low/60'}`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-title-md text-sm shrink-0 ${l.overdue ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-container text-on-surface-variant'}`}>
                          {initialsOf(b.patientName)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-title-md text-body-md font-bold text-on-surface truncate max-w-[200px] group-hover:text-primary transition-colors">{b.patientName}</span>
                            {l.overdue && <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-tertiary-fixed text-tertiary font-bold tracking-tight shrink-0">OVERDUE</span>}
                          </div>
                          <span className="font-label-sm text-label-sm text-indigo-gray-600 whitespace-nowrap">{[b.ageSex, b.phone].filter(Boolean).join(' • ') || 'No contact details'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm font-bold text-on-surface flex items-center gap-1">
                          <Barcode className={`w-4 h-4 ${active ? 'text-vibrant-blue' : 'text-indigo-gray-600'}`} />#{b.code}
                        </span>
                        <span className="font-label-sm text-label-sm text-indigo-gray-600">{b.date === today ? 'Booked for today' : `For ${dayText(b.date)}`}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col max-w-[240px]">
                        <span className="font-body-md text-body-md font-semibold text-on-surface truncate" title={b.testLabel}>
                          {b.tests[0]?.name ?? b.testLabel}
                        </span>
                        <span className={`font-label-sm text-label-sm flex items-center gap-1 truncate ${l.noteClass}`}>
                          {l.overdue ? <AlarmClock className="w-3.5 h-3.5 shrink-0" /> : b.status === 'report_sent' ? <FileCheck2 className="w-3.5 h-3.5 shrink-0 text-fresh-teal" /> : <FlaskConical className="w-3.5 h-3.5 shrink-0" />}
                          {b.tests.length > 1 ? `+${b.tests.length - 1} more • ` : ''}
                          {l.note}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-body-md text-body-md text-on-surface font-medium">{b.amount != null ? formatINR(b.amount) : '—'}</span>
                        <span className="font-label-sm text-label-sm text-indigo-gray-600">{b.visitsHere > 1 ? `Returning • ${b.visitsHere} bookings` : 'First booking here'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-semibold ${l.chip}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${l.dot}`} />
                          {l.label}
                        </span>
                        <span className="font-label-sm text-label-sm text-indigo-gray-600">{b.reportUrl ? 'Report uploaded' : b.status === 'confirmed' ? 'Not checked in yet' : b.status === 'report_sent' ? 'Report sent' : 'Checked in'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <NextStep booking={b} reportUrl={b.reportUrl} kind="icon" />
                        <button
                          type="button"
                          onClick={() => setOpenId(b.id)}
                          className={`px-3.5 py-1.5 rounded-full font-label-sm text-label-sm transition-all ${active || l.overdue ? 'bg-vibrant-blue text-on-primary shadow-sm hover:bg-primary' : 'bg-surface-container text-on-surface hover:bg-surface-variant'}`}
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-surface-container-low flex items-center justify-between gap-3 mt-auto">
          <span className="font-label-sm text-label-sm text-indigo-gray-600">
            {rows.length ? `Showing ${current * PAGE + 1}-${current * PAGE + pageRows.length} of ${rows.length.toLocaleString('en-IN')} bookings` : 'Showing 0 bookings'}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)} className="w-8 h-8 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center hover:bg-surface-variant disabled:opacity-40 shadow-sm">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-label-sm text-label-sm font-bold text-on-surface px-2">
              Page {current + 1} of {pages}
            </span>
            <button type="button" aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="w-8 h-8 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center hover:bg-surface-variant disabled:opacity-40 shadow-sm">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Phone cards */}
      <section className={`${rows.length ? 'flex' : 'hidden'} md:hidden flex-col gap-3`}>
        <div className="flex items-center justify-between pt-1">
          <h2 className="font-title-md text-title-md font-bold text-on-surface">{group === 'all' ? 'Patient Bookings' : GROUPS.find((g) => g.key === group)?.label}</h2>
          <span className="text-vibrant-blue font-label-sm text-label-sm font-semibold">
            {rows.length} {rows.length === 1 ? 'booking' : 'bookings'}
          </span>
        </div>
        {rows.slice(0, limit).map((b) => {
          const l = look(b)
          return (
            <article key={b.id} className={`bg-surface-container-lowest rounded-xl p-3.5 shadow-sm flex flex-col gap-2.5 ${l.overdue ? 'ring-1 ring-soft-coral/30' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => setOpenId(b.id)} className="flex items-center gap-3 min-w-0 text-left">
                  <Avatar name={b.patientName} className="w-10 h-10 text-xs" />
                  <span className="flex flex-col min-w-0">
                    <span className="font-title-md text-[15px] font-bold text-on-surface truncate">{b.patientName}</span>
                    <span className="font-label-sm text-[11px] text-outline truncate">
                      {b.ageSex ? `${b.ageSex.replace(' • ', ' ')} • ` : ''}#{b.code}
                    </span>
                  </span>
                </button>
                <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-semibold flex items-center gap-1 shrink-0 ${l.chip}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${l.dot}`} />
                  {l.label}
                </span>
              </div>
              <div className="bg-surface-container-low rounded-lg p-2.5 flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-[11px] text-outline">Tests Ordered</span>
                  <span className="font-body-md text-[13px] font-medium text-on-surface truncate">{b.testLabel}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-[10px] font-semibold shrink-0">{b.amount != null ? formatINR(b.amount) : 'No price'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className={`font-label-sm text-[11px] truncate ${l.overdue ? 'text-soft-coral font-semibold' : 'text-on-surface-variant'}`}>{l.overdue ? l.note : b.date === today ? 'Booked for today' : `Booked for ${dayText(b.date)}`}</span>
                <span className="flex items-center gap-1 shrink-0">
                  <NextStep booking={b} reportUrl={b.reportUrl} kind="icon" />
                  <button type="button" onClick={() => setOpenId(b.id)} className="text-vibrant-blue font-label-sm text-label-sm font-bold flex items-center gap-0.5">
                    Details <ChevronRight className="w-4 h-4" />
                  </button>
                </span>
              </div>
            </article>
          )
        })}
        {rows.length > limit && (
          <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="py-2.5 rounded-xl bg-surface-container-lowest shadow-sm text-sm font-semibold text-primary">
            Show more bookings
          </button>
        )}
      </section>

      {mobileAction && <div className="md:hidden sticky bottom-[72px] z-30 flex pt-1">{mobileAction}</div>}

      {open && <Inspector b={open} look={look(open)} onClose={() => setOpenId(null)} />}
    </>
  )
}

function OverdueAlert({ b, days, more, onOpen }: { b: RosterBooking; days: number; more: number; onOpen: () => void }) {
  return (
    <section className="md:hidden flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <AlarmClock className="w-5 h-5 text-soft-coral" />
          <h2 className="font-title-md text-title-md font-bold text-on-surface">Overdue Report</h2>
        </div>
        <span className="font-label-sm text-label-sm text-soft-coral font-semibold">{more > 0 ? `+${more} more overdue` : 'Upload it first'}</span>
      </div>
      <div className="bg-surface-container-lowest rounded-xl p-3 shadow-md flex flex-col gap-3.5 relative overflow-hidden">
        <div aria-hidden className="absolute top-0 inset-x-0 h-1.5 bg-soft-coral" />
        <div className="flex items-start justify-between gap-2 pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative shrink-0">
              <Avatar name={b.patientName} className="w-12 h-12 text-sm" />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-soft-coral flex items-center justify-center text-on-tertiary text-[9px] font-bold">!</span>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-title-md text-[17px] font-bold text-on-surface truncate">{b.patientName}</span>
                {b.ageSex && <span className="font-label-sm text-[11px] text-outline font-medium shrink-0">{b.ageSex}</span>}
              </div>
              <span className="font-label-sm text-label-sm font-semibold text-vibrant-blue">#{b.code}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-soft-coral/15 text-soft-coral font-label-sm text-label-sm font-bold flex items-center gap-1 shrink-0">
            <AlarmClock className="w-3.5 h-3.5" /> OVERDUE
          </span>
        </div>
        <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-soft-coral animate-pulse shrink-0" />
              <div className="min-w-0">
                <div className="font-title-md text-[14px] font-bold text-on-surface truncate">Report not uploaded</div>
                <div className="font-label-sm text-[11px] text-outline">Booked for {dayText(b.date)}</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-headline-lg-mobile text-[18px] leading-tight font-black text-soft-coral">
                {days} <span className="text-[12px] font-semibold">days</span>
              </div>
              <div className="font-label-sm text-[10px] text-soft-coral font-bold uppercase tracking-wider">Waiting</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {b.tests.slice(0, 2).map((t) => (
              <div key={t.name} className="bg-surface-container-lowest rounded-lg p-2 flex flex-col min-w-0">
                <span className="font-label-sm text-[11px] text-on-surface-variant truncate">{t.name}</span>
                <span className="font-title-md text-[15px] font-bold text-on-surface mt-0.5">{t.price != null ? formatINR(t.price) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <UploadReportButton booking={b} kind="blue" className="h-10" />
          {b.phone ? (
            <CallLink phone={b.phone} name={b.patientName} kind="soft" className="h-10" />
          ) : (
            <button type="button" onClick={onOpen} className="h-10 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm font-semibold">
              Details
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function Inspector({ b, look, onClose }: { b: RosterBooking; look: Look; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-stretch md:justify-end" role="dialog" aria-modal="true" aria-label={`${b.patientName}'s booking`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md max-h-[90vh] md:max-h-none md:h-full overflow-y-auto bg-surface-container-lowest rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-2xl p-5 md:p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-title-md text-[18px] font-bold shrink-0">{initialsOf(b.patientName)}</span>
            <div className="min-w-0">
              <h2 className="font-title-md text-title-md text-indigo-gray-900 font-bold tracking-tight truncate">{b.patientName}</h2>
              <span className="font-label-sm text-[12px] text-indigo-gray-600">
                {b.ageSex && `${b.ageSex} • `}Booking #{b.code}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <span className={`inline-flex items-center gap-1.5 self-start -mt-2 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-semibold ${look.chip}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${look.dot}`} />
          {look.label} • {look.note}
        </span>
        <Details b={b} />
      </div>
    </div>
  )
}

function Details({ b }: { b: RosterBooking }) {
  return (
    <div className="flex flex-col gap-stack-md">
      <div className="bg-surface-container-low rounded-xl p-stack-sm flex flex-col gap-base">
        <span className="font-label-sm text-label-sm text-indigo-gray-900 font-bold uppercase tracking-wider">Patient Details</span>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Fact label="Blood group" value={b.bloodGroup} icon />
          <Fact label="Date of birth" value={b.dateOfBirth ? formatShortDate(`${b.dateOfBirth}T12:00:00+05:30`) : null} />
          <Fact label="Sex" value={b.gender} />
        </div>
        <p className="text-[10px] text-indigo-gray-600 px-1">From the patient&apos;s own profile. {b.visitsHere > 1 ? `${b.visitsHere} bookings with you so far.` : 'First booking with you.'}</p>
      </div>

      <div className="flex flex-col gap-base">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900 uppercase tracking-wider">Tests Ordered</span>
          <span className="font-label-sm text-[11px] text-indigo-gray-600 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> {dayText(b.date)}
          </span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {b.tests.map((t) => (
            <li key={t.name} className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <FlaskConical className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[13px] text-indigo-gray-900 truncate">{t.name}</span>
              </span>
              <span className="text-[12px] font-semibold text-indigo-gray-900 shrink-0">{t.price != null ? formatINR(t.price) : '—'}</span>
            </li>
          ))}
        </ul>
        {b.amount != null && (
          <div className="flex items-center justify-between px-1 text-[12px]">
            <span className="text-indigo-gray-600">Total at your prices</span>
            <span className="font-bold text-primary">{formatINR(b.amount)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-base">
        <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900 uppercase tracking-wider">Lab Report</span>
        <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between gap-stack-sm">
          <span className="flex items-center gap-stack-sm min-w-0">
            <span className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center shadow-sm shrink-0">
              {b.reportUrl ? <FileCheck2 className="w-5 h-5 text-fresh-teal" /> : <FileText className="w-5 h-5 text-outline" />}
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-[13px] text-indigo-gray-900 font-medium truncate">{b.reportUrl ? 'Report uploaded' : 'No report yet'}</span>
              <span className="text-[11px] text-indigo-gray-600">{b.reportUrl ? 'Visible in the patient’s account' : b.status === 'confirmed' ? 'Check the patient in first' : 'Upload it once the results are ready'}</span>
            </span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <ReportLink href={b.reportUrl} kind="icon" />
            {b.status !== 'confirmed' && <UploadReportButton booking={b} hasReport={!!b.reportUrl} kind={b.reportUrl ? 'icon' : 'blue'} />}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-stack-sm">
        {b.status === 'confirmed' ? <NextStep booking={b} kind="blue" /> : b.phone ? <CallLink phone={b.phone} name={b.patientName} kind="blue" className="col-span-2" /> : null}
        {b.status === 'confirmed' && b.phone ? <CallLink phone={b.phone} name={b.patientName} kind="soft" /> : null}
      </div>
      {b.email && (
        <a href={`mailto:${b.email}`} className="-mt-2 w-full py-2 px-3 rounded-full bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-[12px] flex items-center justify-center gap-1">
          <Mail className="w-4 h-4 text-primary" /> Message Patient
        </a>
      )}
    </div>
  )
}

function Fact({ label, value, icon }: { label: string; value: string | null; icon?: boolean }) {
  return (
    <div className="bg-surface-container-lowest p-2 rounded-lg min-w-0">
      <span className="font-label-sm text-[9px] md:text-[10px] text-indigo-gray-600 uppercase flex items-center justify-center gap-0.5">
        {icon && <Droplet className="w-3 h-3 text-soft-coral" />} {label}
      </span>
      <p className={`font-title-md text-[13px] md:text-[14px] font-bold mt-0.5 truncate ${value ? 'text-indigo-gray-900' : 'text-outline'}`}>{value ?? '—'}</p>
    </div>
  )
}
