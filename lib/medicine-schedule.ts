import { MedicineSchema, medicineName, type Medicine } from '@/lib/rx'
import type { Meals } from '@/lib/patient-health'

// Medicines & reminders: the schedule comes only from what the doctor wrote on the prescription (form, name, dose,
// frequency such as 1-0-1, before or after food, duration). Nothing is added, changed or suggested. Reminder times are
// the patient's own meal times for the doctor's morning, afternoon and night doses.
//
// Prescriptions written since 20261116 keep the structured medicines (medical_records.medicines). Older ones only have
// the visit notes, whose "Rx:" part lists each medicine as lib/rx.ts medicineLine wrote it, so that is read back.

export type Slot = 'morning' | 'afternoon' | 'evening' | 'night'
export const SLOT_LABEL: Record<Slot, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' }

export type Pattern =
  | { kind: 'daily'; slots: Slot[] }
  | { kind: 'alternate'; slots: Slot[] }
  | { kind: 'weekly'; slots: Slot[] }
  | { kind: 'when_needed' }
  | { kind: 'once' }

export type PrescribedMedicine = {
  /** "<record id>:<index>" */
  key: string
  name: string
  dose: string
  /** As written, e.g. "1-0-1". */
  frequency: string
  /** "After food", "Before food", … as written. */
  timing: string
  instructions: string
  /** "5 days" as written, or empty. */
  duration: string
  /** Days the course lasts, when the prescription says. */
  days: number | null
  /** The visit date, yyyy-mm-dd (IST): day 1 of the course. */
  start: string
  pattern: Pattern
  doctor: string | null
  hospital: string | null
  /** The visit the prescription belongs to. */
  visitId: string
  prescriptionNo: string | null
}

const FREQ = /^(?:[0-9½]+(?:-[0-9½]+){2,3})$/

/** The doses a day for a frequency written as 1-0-1 or 1-1-1-1 (a non-zero number means a dose then). */
export function patternOf(frequency: string): Pattern {
  const f = frequency.trim()
  const head = f.split(/\s/)[0]
  if (FREQ.test(head)) {
    const parts = head.split('-')
    const names: Slot[] = parts.length === 4 ? ['morning', 'afternoon', 'evening', 'night'] : ['morning', 'afternoon', 'night']
    const slots = names.filter((_, i) => parts[i] && parts[i] !== '0')
    return slots.length ? { kind: 'daily', slots } : { kind: 'when_needed' }
  }
  if (/^sos/i.test(f)) return { kind: 'when_needed' }
  if (/^stat/i.test(f)) return { kind: 'once' }
  if (/alternate/i.test(f)) return { kind: 'alternate', slots: ['morning'] }
  if (/week/i.test(f)) return { kind: 'weekly', slots: ['morning'] }
  if (/three times|thrice/i.test(f)) return { kind: 'daily', slots: ['morning', 'afternoon', 'night'] }
  if (/twice/i.test(f)) return { kind: 'daily', slots: ['morning', 'night'] }
  if (/once/i.test(f)) return { kind: 'daily', slots: ['morning'] }
  return { kind: 'when_needed' }
}

/** "5 days", "2 weeks", "for 1 month" → a number of days. */
export function durationDays(duration: string): number | null {
  const m = /(\d+)\s*(day|week|month)/i.exec(duration)
  if (!m) return null
  const n = Number(m[1])
  return m[2].toLowerCase() === 'week' ? n * 7 : m[2].toLowerCase() === 'month' ? n * 30 : n
}

const TIMINGS = ['after food', 'before food', 'with food', 'empty stomach', 'at bedtime', 'any time']
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** One "Rx:" line as medicineLine wrote it: name — dose — 1-0-1 (…) — after food — for 5 days — instructions. */
function parseLine(line: string): Omit<Medicine, 'form' | 'generic'> | null {
  const parts = line.split(' — ').map((p) => p.trim()).filter(Boolean)
  if (!parts.length) return null
  const out = { name: parts[0], dose: '', frequency: '', timing: '', duration: '', instructions: '' }
  const extra: string[] = []
  parts.slice(1).forEach((p) => {
    const head = p.split(/\s/)[0]
    if (!out.frequency && (FREQ.test(head) || /^(SOS|STAT|Alternate days|Once a week)\b/i.test(p))) out.frequency = p.replace(/\s*\(.*\)$/, '')
    else if (!out.duration && /^for \d+/i.test(p)) out.duration = p.replace(/^for /i, '')
    else if (!out.timing && TIMINGS.includes(p.toLowerCase())) out.timing = cap(p)
    else if (!out.dose && !out.frequency) out.dose = p
    else extra.push(p)
  })
  out.instructions = extra.join(' — ')
  return out
}

/** The medicines in a visit's notes ("… Rx: A; B; C Tests: …"). */
export function medicinesFromNotes(notes: string | null | undefined) {
  const m = /Rx: (.*?)(?= (?:Tests|Advice|Follow-up|Referral|Vitals): |$)/.exec(notes ?? '')
  if (!m) return []
  return m[1]
    .replace(/\.$/, '')
    .split('; ')
    .map(parseLine)
    .filter((x): x is NonNullable<ReturnType<typeof parseLine>> => !!x && !!x.name)
}

type RecordIn = { id: string; notes: string | null; medicines?: unknown; prescription_no?: string | null }
type VisitIn = { id: string; date: string; doctor: string | null; hospital: string | null }

/** The medicines on one prescription, with their schedules. */
export function prescribedMedicines(record: RecordIn, visit: VisitIn): PrescribedMedicine[] {
  const structured = Array.isArray(record.medicines)
    ? record.medicines.map((m) => MedicineSchema.safeParse(m)).filter((r) => r.success).map((r) => r.data)
    : []
  const list = structured.length
    ? structured.map((m) => ({ name: medicineName(m), dose: m.dose, frequency: m.frequency, timing: m.timing, duration: m.duration, instructions: m.instructions }))
    : medicinesFromNotes(record.notes)
  return list.map((m, i) => ({
    key: `${record.id}:${i}`,
    name: m.name,
    dose: m.dose,
    frequency: m.frequency,
    timing: m.timing,
    instructions: m.instructions,
    duration: m.duration,
    days: durationDays(m.duration),
    start: visit.date,
    pattern: patternOf(m.frequency),
    doctor: visit.doctor,
    hospital: visit.hospital,
    visitId: visit.id,
    prescriptionNo: record.prescription_no ?? null,
  }))
}

const DAY = 86_400_000
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY)

/** Which day of the course `today` is (1 = the visit day), or null outside it. Unknown durations run 30 days. */
export function courseDay(m: PrescribedMedicine, today: string): number | null {
  const n = dayNumber(today) - dayNumber(m.start) + 1
  const length = m.days ?? 30
  return n >= 1 && n <= length ? n : null
}

/** The course ended before today (and within the last `withinDays`). */
export function finished(m: PrescribedMedicine, today: string, withinDays = 60) {
  if (m.pattern.kind === 'when_needed') return false
  const length = m.pattern.kind === 'once' ? 1 : m.days ?? 30
  const after = dayNumber(today) - (dayNumber(m.start) + length - 1)
  return after >= 1 && after <= withinDays
}

/** The last day of the course, yyyy-mm-dd. */
export function endDate(m: PrescribedMedicine) {
  const length = m.pattern.kind === 'once' ? 1 : m.days ?? 30
  return new Date((dayNumber(m.start) + length - 1) * DAY).toISOString().slice(0, 10)
}

/** The slots due today for this medicine (none on the off days of alternate-day and weekly medicines). */
export function slotsToday(m: PrescribedMedicine, today: string): Slot[] {
  const day = courseDay(m, today)
  if (day == null) return []
  const p = m.pattern
  if (p.kind === 'daily') return p.slots
  if (p.kind === 'alternate') return (day - 1) % 2 === 0 ? p.slots : []
  if (p.kind === 'weekly') return (day - 1) % 7 === 0 ? p.slots : []
  if (p.kind === 'once') return day === 1 ? ['morning'] : []
  return []
}

/** When a slot's reminder goes off: at the meal the doctor's timing refers to, or bedtime for "at bedtime". */
export function slotMinutes(slot: Slot, timing: string, meals: Meals) {
  if (/bedtime/i.test(timing)) return 22 * 60
  if (slot === 'morning') return meals.breakfast
  if (slot === 'afternoon') return meals.lunch
  if (slot === 'evening') return 17 * 60 + 30
  return meals.dinner
}

/** The meal a slot sits with, for "after breakfast" style labels. */
export const SLOT_MEAL: Record<Slot, string> = { morning: 'breakfast', afternoon: 'lunch', evening: 'evening snack', night: 'dinner' }

/** "Day 2 of 5", "Week 1 of 8", "Day 4 (no end date on the prescription)". */
export function progressLabel(m: PrescribedMedicine, today: string) {
  const day = courseDay(m, today)
  if (day == null) return ''
  if (m.pattern.kind === 'weekly') return m.days ? `Week ${Math.ceil(day / 7)} of ${Math.ceil(m.days / 7)}` : `Week ${Math.ceil(day / 7)}`
  return m.days ? `Day ${day} of ${m.days}` : `Day ${day}, no duration on the prescription`
}
