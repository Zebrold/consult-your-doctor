// Formatting shared by the patient pages. Times are always shown in India time so the
// server render and the browser agree, whatever timezone the visitor's device is in.

export const IST = 'Asia/Kolkata'
const DAY_MS = 86_400_000

/** "2026-10-17" in India time. */
export function istDateKey(value: string | number | Date) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: IST })
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true })
}

/** "Today", "Tomorrow" or "Thu 23 Oct". */
export function formatDayLabel(value: string | number, now: number) {
  const key = istDateKey(value)
  if (key === istDateKey(now)) return 'Today'
  if (key === istDateKey(now + DAY_MS)) return 'Tomorrow'
  return new Date(value).toLocaleDateString('en-GB', { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short' })
}

/** "Today, 2:30 PM" / "Thu 23 Oct, 4:15 PM". */
export function formatSlot(iso: string, now: number) {
  return `${formatDayLabel(iso, now)}, ${formatTime(iso)}`
}

export function formatLongDate(value: string | number) {
  return new Date(value).toLocaleDateString('en-GB', { timeZone: IST, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatShortDate(value: string | number) {
  return new Date(value).toLocaleDateString('en-GB', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' })
}

/** The next `count` calendar days in India time, starting today. */
export function upcomingDays(now: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const at = now + i * DAY_MS
    return {
      key: istDateKey(at),
      weekday: new Date(at).toLocaleDateString('en-US', { timeZone: IST, weekday: 'short' }),
      day: new Date(at).toLocaleDateString('en-US', { timeZone: IST, day: 'numeric' }),
    }
  })
}

export function isMorning(iso: string) {
  const hour = Number(new Date(iso).toLocaleString('en-US', { timeZone: IST, hour: 'numeric', hourCycle: 'h23' }))
  return hour < 12
}

export const formatINR = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`

/** Names are stored with or without the "Dr." prefix; show it exactly once. */
export function doctorName(name: string | null | undefined) {
  const bare = (name || '').replace(/^Dr\.?\s+/i, '').trim()
  return bare ? `Dr. ${bare}` : 'Doctor'
}

export function initials(name: string | null | undefined) {
  const parts = (name || '').replace(/^Dr\.?\s+/i, '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'PT'
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function firstName(name: string | null | undefined) {
  return (name || '').trim().split(/\s+/)[0] || ''
}

export function ageFrom(dateOfBirth: string | null | undefined, now: number) {
  if (!dateOfBirth) return null
  const born = new Date(dateOfBirth)
  if (Number.isNaN(born.getTime())) return null
  const today = new Date(now)
  let age = today.getFullYear() - born.getFullYear()
  if (today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) age--
  return age >= 0 ? age : null
}

export function timeAgo(iso: string | number | Date) {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 60_000) return 'Just now'
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: IST, day: 'numeric', month: 'short' })
}
