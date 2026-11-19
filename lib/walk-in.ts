// Walk-in booking by QR code (supabase/migrations/20261122_hospital_walk_in.sql).
//
// A hospital sets the hours it takes walk-ins (Hospital portal → Walk-in & QR) and puts its QR code at reception. The
// code opens the hospital's page with "Walk in now" ready: during those hours the patient picks a doctor, pays the
// booking fee online like any booking, and is booked with that doctor for right now (a slot made at the moment of
// booking, as the front desk's walk-ins are). Outside the hours the page says when walk-ins open, and timed slots can
// still be booked as usual.
//
// Plain module (no server imports): the hospital page, the booking action and the portal share these rules.

/** The time a walk-in is booked for, in place of a published slot's id. */
export const WALK_IN = 'walk-in'

export type WalkInHours = {
  enabled: boolean
  /** "09:00", India time. */
  start: string
  end: string
  /** Weekdays, 0 = Sunday … 6 = Saturday. */
  days: number[]
}

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** Monday first, the way people read a week. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export const DEFAULT_WALK_IN: WalkInHours = { enabled: false, start: '09:00', end: '17:00', days: ALL_DAYS }

const hhmm = (v: unknown): string | null => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d/.test(v) ? v.slice(0, 5) : null)
export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
export const isClockTime = (t: unknown): t is string => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)

/**
 * The hospital row's walk-in hours. `ready` is false before the migration has run (the columns aren't there), so the
 * portal can say so; `hours` is null when walk-ins are off.
 */
export function readWalkIn(row: Record<string, unknown> | null | undefined): { ready: boolean; saved: WalkInHours; hours: WalkInHours | null } {
  if (!row || !('walk_in_enabled' in row)) return { ready: false, saved: DEFAULT_WALK_IN, hours: null }
  const start = hhmm(row.walk_in_start)
  const end = hhmm(row.walk_in_end)
  const days = Array.isArray(row.walk_in_days) ? [...new Set(row.walk_in_days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : ALL_DAYS
  const saved: WalkInHours = { enabled: row.walk_in_enabled === true, start: start ?? DEFAULT_WALK_IN.start, end: end ?? DEFAULT_WALK_IN.end, days: days.length ? days : ALL_DAYS }
  const usable = saved.enabled && !!start && !!end && toMinutes(end) > toMinutes(start) && days.length > 0
  return { ready: true, saved, hours: usable ? saved : null }
}

/** "9:00 AM", "5:30 PM" */
export function formatClock(t: string) {
  const m = toMinutes(t)
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h % 12 || 12}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** "Every day", "Mon–Sat", "Mon, Wed, Fri" */
export function formatDays(days: number[]) {
  const set = new Set(days)
  if (set.size === 7) return 'Every day'
  const ordered = WEEK_ORDER.filter((d) => set.has(d))
  const runs: number[][] = []
  for (const d of ordered) {
    const last = runs.at(-1)
    if (last && WEEK_ORDER.indexOf(last.at(-1)!) === WEEK_ORDER.indexOf(d) - 1) last.push(d)
    else runs.push([d])
  }
  return runs.map((r) => (r.length >= 3 ? `${DAY_SHORT[r[0]]}–${DAY_SHORT[r.at(-1)!]}` : r.map((d) => DAY_SHORT[d]).join(', '))).join(', ')
}

/** "9:00 AM – 5:00 PM · Mon–Sat" */
export const hoursLabel = (h: WalkInHours) => `${formatClock(h.start)} – ${formatClock(h.end)}${h.days.length === 7 ? '' : ` · ${formatDays(h.days)}`}`

/** The weekday and minutes past midnight in India. */
function indiaClock(now: number) {
  const d = new Date(now + 5.5 * 3_600_000)
  return { day: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() }
}

export type WalkInState = {
  open: boolean
  /** "9:00 AM – 5:00 PM · Mon–Sat" */
  hours: string
  /** "Open now until 5:00 PM", "Opens today at 9:00 AM", "Opens Monday at 9:00 AM" */
  note: string
}

/** Whether walk-ins are being taken at `now`, and what to tell patients. Null when the hospital takes no walk-ins. */
export function walkInState(hours: WalkInHours | null, now: number): WalkInState | null {
  if (!hours) return null
  const { day, minutes } = indiaClock(now)
  const start = toMinutes(hours.start)
  const end = toMinutes(hours.end)
  const today = hours.days.includes(day)
  const open = today && minutes >= start && minutes < end
  let note: string
  if (open) note = `Open now until ${formatClock(hours.end)}`
  else if (today && minutes < start) note = `Opens today at ${formatClock(hours.start)}`
  else {
    const next = [1, 2, 3, 4, 5, 6, 7].map((n) => (day + n) % 7).find((d) => hours.days.includes(d))
    note = next == null ? 'Closed' : `Opens ${next === (day + 1) % 7 ? 'tomorrow' : DAY_LONG[next]} at ${formatClock(hours.start)}`
  }
  return { open, hours: hoursLabel(hours), note }
}

/** The address in a hospital's walk-in QR code: a short link that opens its page with walk-in ready. */
export const walkInLink = (base: string, hospitalId: string) => `${base.replace(/\/+$/, '')}/walk-in/${hospitalId}`
