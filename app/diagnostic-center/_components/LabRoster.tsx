'use client'

import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, Download, Droplet, FileText, Mail, Phone, Search, Users } from 'lucide-react'
import { Avatar, Chip, EmptyState, type Tone } from '@/components/portal/ui'
import { formatINR, formatShortDate } from '@/components/patient/format'
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
}

export type RosterGroup = 'all' | 'booked' | 'collected' | 'sent'

const GROUPS: { key: RosterGroup; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'booked', label: 'To check in' },
  { key: 'collected', label: 'Awaiting report' },
  { key: 'sent', label: 'Report sent' },
]

const STATUS: Record<string, { label: string; tone: Tone }> = {
  confirmed: { label: 'Booked', tone: 'blue' },
  visited: { label: 'Sample collected', tone: 'teal' },
  completed: { label: 'Awaiting report', tone: 'coral' },
  report_sent: { label: 'Report sent', tone: 'teal' },
}

const groupOf = (b: { status: string }): RosterGroup =>
  b.status === 'confirmed' ? 'booked' : b.status === 'report_sent' ? 'sent' : 'collected'

const dayText = (date: string | null) => (date ? formatShortDate(`${date}T12:00:00+05:30`) : 'No date')

function exportCsv(rows: RosterBooking[]) {
  const header = ['Booking ID', 'Date', 'Patient', 'Age/Sex', 'Phone', 'Email', 'Tests', 'Amount (INR)', 'Status']
  const lines = rows.map((r) => [r.code, r.date ?? '', r.patientName, r.ageSex ?? '', r.phone ?? '', r.email ?? '', r.testLabel, r.amount ?? '', STATUS[r.status]?.label ?? r.status])
  const csv = [header, ...lines].map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'lab-patients.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="p-2.5 rounded-lg bg-surface-container-lowest">
      <span className="block text-[10px] uppercase tracking-wider text-indigo-gray-600 font-semibold">{label}</span>
      <span className="block text-[13px] font-bold text-indigo-gray-900 mt-0.5">{children}</span>
    </div>
  )
}

function Details({ b }: { b: RosterBooking }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Fact label="Blood group">
          <span className="inline-flex items-center gap-1">
            <Droplet className="w-3.5 h-3.5 text-soft-coral" />
            {b.bloodGroup ?? '—'}
          </span>
        </Fact>
        <Fact label="Date of birth">{b.dateOfBirth ? formatShortDate(`${b.dateOfBirth}T12:00:00+05:30`) : '—'}</Fact>
        <Fact label="Sex">{b.gender ?? '—'}</Fact>
      </div>
      <p className="text-[11px] text-indigo-gray-600">From the patient’s own profile. {b.visitsHere > 1 ? `${b.visitsHere} bookings with you so far.` : 'First booking with you.'}</p>
      <div className="p-3 rounded-lg bg-surface-container-lowest flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 min-w-0">
          <FileText className={`w-5 h-5 shrink-0 ${b.reportUrl ? 'text-vibrant-blue' : 'text-outline'}`} />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-indigo-gray-900">{b.reportUrl ? 'Report uploaded' : 'No report yet'}</span>
            <span className="block text-[11px] text-indigo-gray-600">{b.reportUrl ? 'Visible in the patient’s account' : 'Upload it once the results are ready'}</span>
          </span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <ReportLink href={b.reportUrl} kind="soft" />
          <UploadReportButton booking={b} hasReport={!!b.reportUrl} kind={b.reportUrl ? 'icon' : 'blue'} />
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {b.phone && (
          <a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`} className="px-3.5 py-2 rounded-full bg-surface-container-high text-indigo-gray-900 text-[12px] font-semibold flex items-center gap-1.5">
            <Phone className="w-4 h-4" /> {b.phone}
          </a>
        )}
        {b.email && (
          <a href={`mailto:${b.email}`} className="px-3.5 py-2 rounded-full bg-surface-container-high text-indigo-gray-900 text-[12px] font-semibold flex items-center gap-1.5 min-w-0">
            <Mail className="w-4 h-4 shrink-0" /> <span className="truncate">{b.email}</span>
          </a>
        )}
      </div>
    </div>
  )
}

export function LabRoster({ bookings, initialGroup, today }: { bookings: RosterBooking[]; initialGroup: RosterGroup; today: string }) {
  const statusOf = (b: RosterBooking) => (b.status === 'confirmed' && b.date && b.date < today ? { label: 'Not checked in', tone: 'coral' as Tone } : STATUS[b.status])
  const [group, setGroup] = useState<RosterGroup>(initialGroup)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [limit, setLimit] = useState(25)

  const counts = useMemo(() => {
    const c: Record<RosterGroup, number> = { all: bookings.length, booked: 0, collected: 0, sent: 0 }
    for (const b of bookings) c[groupOf(b)]++
    return c
  }, [bookings])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings.filter(
      (b) =>
        (group === 'all' || groupOf(b) === group) &&
        (!q || [b.patientName, b.code, b.phone, b.testLabel, b.email].some((v) => v?.toLowerCase().includes(q))),
    )
  }, [bookings, group, query])

  return (
    <section className="bg-surface-container-lowest rounded-2xl md:rounded-xl shadow-sm border border-surface-container md:border-transparent overflow-hidden">
      <div className="p-4 md:p-stack-md flex flex-col gap-3 md:gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <label className="relative flex-1 max-w-2xl">
            <Search className="w-5 h-5 text-indigo-gray-600 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, booking ID, phone or test…"
              aria-label="Search patients"
              className="w-full pl-11 pr-4 py-3 rounded-full bg-surface-container-low text-[14px] text-indigo-gray-900 placeholder:text-indigo-gray-600/70 focus:outline-none focus:ring-2 focus:ring-vibrant-blue"
            />
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
            {GROUPS.map((g) => {
              const active = g.key === group
              return (
                <button
                  key={g.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setGroup(g.key)}
                  className={`px-4 py-2 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors ${
                    active ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-low text-indigo-gray-600 hover:bg-surface-container'
                  }`}
                >
                  {g.label} <span className={active ? 'opacity-80' : 'text-vibrant-blue font-bold'}>({counts[g.key]})</span>
                </button>
              )
            })}
            <button type="button" onClick={() => exportCsv(rows)} disabled={rows.length === 0} className="ml-1 px-3 py-2 rounded-full text-vibrant-blue font-label-sm text-label-sm flex items-center gap-1 hover:bg-surface-container-low whitespace-nowrap disabled:opacity-50">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 pb-4 md:px-stack-md md:pb-stack-md">
          <EmptyState icon={Users}>{bookings.length ? 'No bookings match your search.' : 'No paid bookings yet. Patients who book and pay will appear here.'}</EmptyState>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-indigo-gray-600 font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-3.5 px-6">Patient</th>
                  <th className="py-3.5 px-4">Booking</th>
                  <th className="py-3.5 px-4">Tests Ordered</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {rows.slice(0, limit).map((b) => {
                  const expanded = open === b.id
                  const status = statusOf(b)
                  return (
                    <Fragment key={b.id}>
                      <tr className={`transition-colors ${expanded ? 'bg-primary/5' : 'hover:bg-surface-container-low/60'}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar name={b.patientName} className="w-10 h-10 text-sm" />
                            <div className="min-w-0">
                              <span className="block font-title-md text-[15px] font-bold text-indigo-gray-900">{b.patientName}</span>
                              <span className="block font-label-sm text-label-sm text-indigo-gray-600 whitespace-nowrap">{[b.ageSex, b.phone].filter(Boolean).join(' • ') || 'No details on file'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="block font-label-sm text-label-sm font-bold text-indigo-gray-900">#{b.code}</span>
                          <span className="block font-label-sm text-label-sm text-indigo-gray-600">{dayText(b.date)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="block max-w-[260px] text-[14px] font-semibold text-indigo-gray-900 truncate" title={b.testLabel}>{b.testLabel}</span>
                          <span className="block font-label-sm text-label-sm text-indigo-gray-600">{b.amount != null ? formatINR(b.amount) : 'Price not on menu'}</span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">{status && <Chip tone={status.tone}>{status.label}</Chip>}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <NextStep booking={b} reportUrl={b.reportUrl} />
                            <button
                              type="button"
                              onClick={() => setOpen(expanded ? null : b.id)}
                              aria-expanded={expanded}
                              className="px-3 py-2 rounded-full bg-surface-container hover:bg-surface-variant text-indigo-gray-900 font-label-sm text-label-sm flex items-center gap-1"
                            >
                              Details <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-primary/5">
                          <td colSpan={5} className="px-6 pb-5 pt-1">
                            <div className="max-w-3xl p-4 rounded-xl bg-surface-container-low">
                              <Details b={b} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <ul className="md:hidden flex flex-col gap-3 px-4 pb-4">
            {rows.slice(0, limit).map((b) => {
              const expanded = open === b.id
              const status = statusOf(b)
              return (
                <li key={b.id} className={`rounded-xl p-3.5 flex flex-col gap-2.5 border ${expanded ? 'border-vibrant-blue/40 bg-primary/5' : 'border-surface-container bg-surface-container-lowest shadow-sm'}`}>
                  <button type="button" onClick={() => setOpen(expanded ? null : b.id)} aria-expanded={expanded} className="flex items-center justify-between gap-2 text-left">
                    <span className="flex items-center gap-3 min-w-0">
                      <Avatar name={b.patientName} className="w-10 h-10 text-sm" />
                      <span className="min-w-0">
                        <span className="block font-title-md text-[15px] font-bold text-indigo-gray-900 truncate">{b.patientName}</span>
                        <span className="block text-[11px] text-indigo-gray-600 truncate">{[b.ageSex, `#${b.code}`].filter(Boolean).join(' • ')}</span>
                      </span>
                    </span>
                    {status && <Chip tone={status.tone}>{status.label}</Chip>}
                  </button>
                  <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block text-[11px] text-indigo-gray-600">{dayText(b.date)}</span>
                      <span className="block text-[13px] font-medium text-indigo-gray-900 truncate">{b.testLabel}</span>
                    </span>
                    <span className="text-[13px] font-bold text-indigo-gray-900 shrink-0">{b.amount != null ? formatINR(b.amount) : ''}</span>
                  </div>
                  {expanded && <Details b={b} />}
                  <div className="flex items-center justify-end gap-1.5">
                    <CallLink phone={b.phone} name={b.patientName} kind="icon" />
                    <NextStep booking={b} reportUrl={b.reportUrl} />
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="px-4 md:px-6 py-3 bg-surface-container-low flex items-center justify-between gap-3">
            <span className="font-label-sm text-label-sm text-indigo-gray-600">
              Showing {Math.min(limit, rows.length)} of {rows.length} {rows.length === 1 ? 'booking' : 'bookings'}
            </span>
            {rows.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + 25)} className="px-4 py-1.5 rounded-full bg-surface-container-lowest text-vibrant-blue font-label-sm text-label-sm shadow-sm">
                Show more
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
