import { IST } from '@/components/patient/format'

// Dates and times on the booking page and the booking emails, in India time. No server imports, so the page's client
// component can use them too.

/** "Mon, 2 Nov, 2026" */
export function cardDate(iso: string | number) {
  const d = new Date(iso)
  const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', { timeZone: IST, ...o })
  return `${part({ weekday: 'short' })}, ${part({ day: 'numeric' })} ${part({ month: 'short' })}, ${part({ year: 'numeric' })}`
}

/** "10:30 AM" */
export const cardTime = (iso: string | number) =>
  new Date(iso).toLocaleTimeString('en-US', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true })

/** "Sat, 31 Oct 2026 | 02:04 PM" */
export function cardStamp(iso: string | number) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/,/g, '').replace(/^(\w{3}) /, '$1, ')
  const time = d.toLocaleTimeString('en-US', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: true })
  return `${date} | ${time}`
}
