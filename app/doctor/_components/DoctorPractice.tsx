import Link from 'next/link'
import { Hospital } from 'lucide-react'
import { IST, formatINR, istDateKey } from '@/components/patient/format'
import { monthName } from '@/lib/report-stats'
import type { DoctorInfo, Slot, Visit } from '../_lib/doctor'
import { DeskHead, DocBackHeader, DocBody, Panel, Row, btnOutline, card } from './doc-ui'
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** "10 AM", "2:30 PM" in India time. */
const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(/\s?([ap])m/i, (_, x: string) => ` ${x.toUpperCase()}M`)

/** Monday 0 … Sunday 6, in India time. */
const weekday = (ms: number) => WEEKDAYS.indexOf(new Date(ms).toLocaleDateString('en-GB', { timeZone: IST, weekday: 'short' }))

/** "Mon to Sat", "Mon, Wed", "Thu" */
function dayRuns(days: number[]) {
  const runs: number[][] = []
  for (const d of [...days].sort((a, b) => a - b)) {
    const run = runs[runs.length - 1]
    if (run && d === run[run.length - 1] + 1) run.push(d)
    else runs.push([d])
  }
  return runs.map((r) => (r.length >= 3 ? `${WEEKDAYS[r[0]]} to ${WEEKDAYS[r[r.length - 1]]}` : r.map((d) => WEEKDAYS[d]).join(', '))).join(', ')
}

/**
 * The doctor's usual timings from the slots the hospital has published: each day's back-to-back slots joined into
 * sessions, the commonest pattern for each weekday, then weekdays with the same hours grouped ("Mon to Sat · 10 AM to 2 PM").
 */
function timings(slots: Slot[]): string[] {
  const byDate = new Map<string, { start: number; end: number }[]>()
  for (const s of slots) {
    const start = Date.parse(s.start)
    const end = s.end ? Date.parse(s.end) : start + 15 * 60_000
    const key = istDateKey(start)
    byDate.set(key, [...(byDate.get(key) ?? []), { start, end }])
  }
  const patterns = new Map<number, Map<string, number>>()
  for (const list of byDate.values()) {
    list.sort((a, b) => a.start - b.start)
    const sessions: { start: number; end: number }[] = []
    for (const s of list) {
      const open = sessions[sessions.length - 1]
      if (open && s.start - open.end <= 5 * 60_000) open.end = Math.max(open.end, s.end)
      else sessions.push({ ...s })
    }
    const text = sessions.map((s) => `${clock(s.start)} to ${clock(s.end)}`).join(', ')
    const day = weekday(list[0].start)
    const counts = patterns.get(day) ?? new Map<string, number>()
    counts.set(text, (counts.get(text) ?? 0) + 1)
    patterns.set(day, counts)
  }
  const usual = new Map<string, number[]>()
  for (const [day, counts] of patterns) {
    const text = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    usual.set(text, [...(usual.get(text) ?? []), day])
  }
  return [...usual.entries()].sort((a, b) => Math.min(...a[1]) - Math.min(...b[1])).map(([text, days]) => `${dayRuns(days)} · ${text}`)
}

/**
 * Hospitals & clinics, after the DeskDocPractice export. A doctor on Consult your Doctor consults at one hospital, which
 * publishes their slots, so this shows that hospital: the usual timings, the fee and this month's consultations.
 */
export function DoctorPractice({ doctor, slots, visits, now, others }: { doctor: Pick<DoctorInfo, 'fee' | 'hospital'>; slots: Slot[]; visits: Visit[]; now: number; others?: React.ReactNode }) {
  const month = istDateKey(now).slice(0, 7)
  const consultations = visits.filter((v) => (v.status === 'visited' || v.status === 'completed') && v.start && istDateKey(v.start).startsWith(month)).length
  const hours = timings(slots)
  const open = slots.filter((s) => !s.booked).length
  const h = doctor.hospital
  const subtitle = 'Where you see patients through Consult your Doctor'

  return (
    <>
      <DocBackHeader backHref="/doctor/profile" backLabel="Back to profile" title="Hospitals & clinics">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle}</p>
      </DocBackHeader>
      <DocBody>
        <DeskHead title="Hospitals & clinics" subtitle={subtitle} />

        {!h ? (
          <Panel>
            <p className="text-[14px] font-extrabold">You aren’t linked to a hospital yet</p>
            <p className="mt-1 text-[13.5px] text-[#5B667A]">A hospital on Consult your Doctor adds you to its roster and publishes your slots. Once it does, it shows here.</p>
          </Panel>
        ) : (
          <div className="grid gap-3.5 lg:gap-4 lg:grid-cols-3 lg:items-stretch">
            <section className={`${card} p-4 lg:p-[22px]`} aria-label={h.name}>
              <div className="flex justify-between gap-2">
                <span className="w-11 h-11 rounded-xl bg-[#F4F6FA] flex items-center justify-center shrink-0">
                  <Hospital className="w-[22px] h-[22px] text-[#2A4DD0]" strokeWidth={2} aria-hidden />
                </span>
                <span className="inline-flex items-center h-6 px-[9px] rounded-full bg-[#EEF3FF] text-[#2A4DD0] text-[11.5px] font-extrabold whitespace-nowrap">Your hospital</span>
              </div>
              <span className="block mt-3.5 text-[17px] font-extrabold">{h.name}</span>
              <span className="block mb-3 text-[13px] text-[#5B667A]">{h.address || h.city || 'Address not added yet'}</span>
              <div className="py-2.5 lg:py-[11px] border-t border-[#EEF2F7] text-[13px] lg:text-[13.5px]">
                <span className="block text-[#5B667A]">Your timings</span>
                {hours.length ? (
                  hours.map((t) => (
                    <span key={t} className="block mt-1 font-extrabold">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="block mt-1 font-extrabold text-[#98A2B3]">No slots published for the next 4 weeks</span>
                )}
              </div>
              <Row label="Consultation fee">{doctor.fee ? formatINR(doctor.fee) : 'Not set'}</Row>
              <Row label="Next 4 weeks">
                {slots.length} {slots.length === 1 ? 'slot' : 'slots'} · {open} open
              </Row>
              <Row label="This month">
                {consultations} {consultations === 1 ? 'consultation' : 'consultations'} in {monthName(month)}
              </Row>
              <div className="flex gap-2 mt-3.5">
                <Link href="/doctor/schedule" className={`${btnOutline} lg:border !h-[38px] flex-1`}>
                  See your schedule
                </Link>
                <Link href={`/hospitals/${h.id}`} className={`${btnOutline} lg:border !h-[38px]`}>
                  Hospital page
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border-[1.5px] border-dashed border-[#C9D2E0] bg-[#F9FBFE] p-4 lg:p-[22px] flex flex-col justify-center">
              <h2 className="text-[15px] font-extrabold">How timings work</h2>
              <p className="mt-1.5 text-[13.5px] leading-[1.6] text-[#27324A]">
                {h.name} publishes your slots on Consult your Doctor, and patients book them in the app or at the hospital desk.
              </p>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-[#27324A]">To change your timings or take time off, ask the hospital’s front desk to update your slots.</p>
            </section>
          </div>
        )}
        {others}
      </DocBody>
    </>
  )
}
