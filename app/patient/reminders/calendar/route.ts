import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { istToday } from '@/lib/patient-account'
import { loadHealthDetails } from '@/lib/patient-health'
import { activeMedicines, loadPrescriptions } from '@/lib/patient-medicines'
import { endDate, slotMinutes, SLOT_LABEL, type Slot } from '@/lib/medicine-schedule'

// A calendar file (.ics) of the patient's running medicines: one repeating event per dose time, with an alert, until the
// course ends. The phone's calendar does the reminding; nothing is sent from our side.

export const dynamic = 'force-dynamic'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const compact = (d: string) => d.replace(/-/g, '')
const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}00`
/** Lines longer than 75 octets are folded, as the format asks. */
const fold = (line: string) => (line.length <= 74 ? line : line.match(/.{1,73}/g)!.join('\r\n '))

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return new Response('Please log in to download your reminders.', { status: 401 })
  const admin = createAdminClient()
  const today = istToday()
  const [details, { prescriptions }] = await Promise.all([loadHealthDetails(admin, user.id), loadPrescriptions(admin, user.id)])
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')

  const events: string[] = []
  for (const m of activeMedicines(prescriptions, today)) {
    const p = m.pattern
    if (p.kind === 'when_needed') continue
    const slots: Slot[] = p.kind === 'once' ? ['morning'] : p.slots
    // The repeats start on the course's first day, so alternate-day and weekly doses keep the doctor's rhythm.
    const until = compact(endDate(m))
    const rule = p.kind === 'once' ? null : p.kind === 'alternate' ? `FREQ=DAILY;INTERVAL=2;UNTIL=${until}T235959` : p.kind === 'weekly' ? `FREQ=WEEKLY;UNTIL=${until}T235959` : `FREQ=DAILY;UNTIL=${until}T235959`
    for (const slot of slots) {
      const minutes = slotMinutes(slot, m.timing, details.meals)
      const summary = `Take ${m.name}${m.dose ? ` (${m.dose})` : ''}`
      const description = [m.frequency && `${m.frequency}, ${SLOT_LABEL[slot].toLowerCase()}`, m.timing, m.instructions, m.doctor && `Prescribed by ${m.doctor}`, 'From Consult your Doctor. Ask your doctor before changing a medicine.']
        .filter(Boolean)
        .join('. ')
      events.push(
        [
          'BEGIN:VEVENT',
          `UID:${m.key}-${slot}@consultyourdoctor.de`,
          `DTSTAMP:${stamp}`,
          `DTSTART;TZID=Asia/Kolkata:${compact(m.start)}T${hhmm(minutes)}`,
          'DURATION:PT10M',
          ...(rule ? [`RRULE:${rule}`] : []),
          `SUMMARY:${esc(summary)}`,
          `DESCRIPTION:${esc(description)}`,
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${esc(summary)}`,
          'TRIGGER:PT0M',
          'END:VALARM',
          'END:VEVENT',
        ]
          .map(fold)
          .join('\r\n'),
      )
    }
  }

  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Consult your Doctor//Medicine reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Medicines',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Kolkata',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0530',
    'TZOFFSETTO:+0530',
    'TZNAME:IST',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="medicine-reminders.ics"',
      'Cache-Control': 'private, no-store',
    },
  })
}
