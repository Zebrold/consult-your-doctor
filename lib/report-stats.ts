import { IST, istDateKey } from '@/components/patient/format'
import type { Delta } from '@/components/portal/workspace-ui'

// Shared sums for the staff Reports pages (hospital and doctor). Months are "YYYY-MM" in India time; a month in
// progress is compared with the same days of the month before, so a half-finished month isn't set against a whole one.

const DAY = 86_400_000

/** The month before a "YYYY-MM". */
export const prevMonth = (key: string) => istDateKey(Date.parse(`${key}-01T12:00:00+05:30`) - DAY).slice(0, 7)

/** The `n` months ending with `last`, oldest first. */
export function monthsEnding(last: string, n: number) {
  const keys = [last]
  while (keys.length < n) keys.unshift(prevMonth(keys[0]))
  return keys
}

/** "November" / "Nov" / "November 2026" */
export const monthName = (key: string, style: 'long' | 'short' | 'year' = 'long') =>
  // en-US for the short form: "Sep", not en-GB's "Sept".
  new Date(`${key}-15T12:00:00+05:30`).toLocaleDateString(style === 'short' ? 'en-US' : 'en-GB', { timeZone: IST, month: style === 'short' ? 'short' : 'long', ...(style === 'year' ? { year: 'numeric' } : {}) })

/** Day keys from the 1st of this month to today, and the same span of last month (cut at its last day). */
export function monthSoFar(today: string) {
  const month = today.slice(0, 7)
  const last = prevMonth(month)
  const lastDays = new Date(Date.UTC(Number(last.slice(0, 4)), Number(last.slice(5, 7)), 0)).getUTCDate()
  const cutDay = Math.min(Number(today.slice(8, 10)), lastDays)
  const cut = `${last}-${String(cutDay).padStart(2, '0')}`
  return {
    month,
    last,
    /** The days of last month this month is compared with: "1–14 Oct", "1 Oct". */
    lastSpan: `${cutDay > 1 ? '1–' : ''}${cutDay} ${monthName(last, 'short')}`,
    inThis: (day: string | null) => !!day && day.startsWith(month) && day <= today,
    inLastSoFar: (day: string | null) => !!day && day.startsWith(last) && day <= cut,
  }
}

/** Past bookings (slot over) that were never checked in, as a share of all past bookings. Null when there were none. */
export function noShowRate(visits: { status: string; start: string | null; end: string | null }[], now: number): { rate: number | null; missed: number; total: number } {
  const past = visits.filter((v) => v.start && Date.parse(v.end ?? v.start) < now && v.status !== 'pending_payment' && v.status !== 'cancelled')
  const missed = past.filter((v) => v.status === 'confirmed').length
  return { rate: past.length ? (missed / past.length) * 100 : null, missed, total: past.length }
}

/** A change in a rate or rating, in its own units: "-0.6%", "+0.1". Lower is better for a no-show rate. */
export function pointsDelta(now: number | null, before: number | null, { unit = '', higherIsGood = true, digits = 1 } = {}): Delta | undefined {
  if (now == null || before == null) return undefined
  const diff = Math.round((now - before) * 10 ** digits) / 10 ** digits
  const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  return { text: `${diff > 0 ? '+' : diff < 0 ? '-' : ''}${Math.abs(diff).toFixed(digits)}${unit}`, dir, good: dir === 'flat' || (dir === 'up') === higherIsGood }
}

/** A percent change of a count against last month's same days; none when last month had nothing to compare. */
export function countDelta(now: number, before: number): Delta | undefined {
  if (before <= 0) return undefined
  const raw = ((now - before) / before) * 100
  // One decimal under 10%, whole numbers above: "+5.9%", "+44%".
  const pct = Math.abs(raw) >= 10 ? Math.round(raw) : Math.round(raw * 10) / 10
  const dir = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  return { text: `${pct > 0 ? '+' : pct < 0 ? '-' : ''}${Math.abs(pct)}%`, dir, good: dir !== 'down' }
}

/**
 * The complaints written on a prescription ("Complaints: Fever, Cough." at the start of its notes, see
 * prescriptionNotes in lib/prescriptions.ts), one per item.
 */
export function complaintsIn(notes: string | null | undefined): string[] {
  const m = (notes ?? '').match(/(?:^|\s)Complaints: (.+?)\.(?:\s|$)/)
  if (!m) return []
  return m[1]
    .split(/\n|,(?![^(]*\))/)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => s.length > 1 && s.length <= 60)
}

/** The most common complaints, case folded, with the spelling used most. */
export function topComplaints(notes: (string | null)[], limit = 5): { label: string; count: number }[] {
  const counts = new Map<string, { label: string; count: number }>()
  for (const n of notes) {
    // Each visit counts a complaint once.
    for (const c of new Set(complaintsIn(n).map((x) => x.toLowerCase()))) {
      const label = complaintsIn(n).find((x) => x.toLowerCase() === c) ?? c
      const entry = counts.get(c) ?? { label: label[0].toUpperCase() + label.slice(1), count: 0 }
      entry.count++
      counts.set(c, entry)
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit)
}

/** "4,120" */
export const count = (n: number) => n.toLocaleString('en-IN')
