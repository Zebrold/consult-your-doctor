import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import Link from 'next/link'
import { CalendarPlus, Pill } from 'lucide-react'
import { AccountPage } from '@/components/patient/AccountPage'
import { btnOutline, card } from '@/components/patient/app-ui'
import { doctorName, formatShortDate, formatSlot, initials } from '@/components/patient/format'
import { MealTimes, TodaySchedule, type Dose } from '@/components/patient/health/reminders'
import { istToday, patientAccount } from '@/lib/patient-account'
import { loadFamily, loadHealthDetails, missingTable } from '@/lib/patient-health'
import { activeMedicines, advisedTests, dosesToday, finishedMedicines, followUpNote, loadPrescriptions, slotLabel } from '@/lib/patient-medicines'
import { endDate, progressLabel } from '@/lib/medicine-schedule'
import { FOLLOW_UP_DAYS, freeFollowUpDoctors } from '@/lib/follow-up'

export const metadata: Metadata = { title: 'Medicines & reminders' }

const UPCOMING_DONE = new Set(['cancelled', 'refunded', 'completed', 'visited', 'no_show', 'pending_payment'])
const dateOf = (d: string) => `${d}T12:00:00+05:30`

/** Medicines & reminders: today's doses from the doctors' prescriptions at the patient's meal times, and what's next. */
export default async function RemindersPage() {
  const { user, admin, profile } = await patientAccount('/patient/reminders')
  const now = currentTime()
  const today = istToday(now)
  const [details, { visits, prescriptions }, family, freeDoctors, dosesRes] = await Promise.all([
    loadHealthDetails(admin, user.id),
    loadPrescriptions(admin, user.id),
    loadFamily(admin, user.id),
    freeFollowUpDoctors(admin, user.id, now),
    admin.from('medicine_doses').select('dose_key').eq('patient_id', user.id).eq('dose_date', today),
  ])
  const dosesReady = !missingTable(dosesRes.error)
  const takenKeys = new Set(((dosesRes.data ?? []) as { dose_key: string }[]).map((d) => d.dose_key))
  const memberName = new Map(family.members.map((m) => [m.id, m.name]))

  const active = activeMedicines(prescriptions, today)
  const doses: Dose[] = dosesToday(active, today, details.meals).map((d) => ({
    key: d.key,
    minutes: d.minutes,
    slot: slotLabel(d.slot),
    name: d.medicine.name,
    pattern: d.medicine.frequency,
    dose: d.medicine.dose,
    instructions: [d.medicine.timing, d.medicine.instructions].filter(Boolean).join(', '),
    doctor: d.medicine.doctor,
    progress: progressLabel(d.medicine, today),
    taken: takenKeys.has(d.key),
  }))
  const asNeeded = active.filter((m) => m.pattern.kind === 'when_needed')
  const done = finishedMedicines(prescriptions, today).slice(0, 6)

  // The newest prescription still running today, for the banner and the "Active prescription" card.
  const current = prescriptions.find((p) => p.medicines.some((m) => active.includes(m))) ?? null
  const latest = prescriptions[0] ?? null

  // Coming up: free follow-ups, tests the doctor advised, and visits booked for the family.
  const coming: { key: string; title: string; sub: string; href: string; action: string }[] = []
  for (const doctorId of freeDoctors) {
    const v = visits.find((x) => x.doctor?.id === doctorId && (x.status === 'completed' || x.status === 'visited'))
    if (!v?.at) continue
    const until = new Date(Date.parse(v.at) + FOLLOW_UP_DAYS * 86_400_000).toISOString()
    coming.push({ key: `fu-${doctorId}`, title: `Free follow-up with ${doctorName(v.doctor?.name)}`, sub: `${v.hospital?.name ? `${v.hospital.name} · ` : ''}no booking fee until ${formatShortDate(until)}`, href: `/book/${doctorId}`, action: 'Book free' })
  }
  if (latest) {
    const notes = latest.record.notes
    for (const test of advisedTests(notes).slice(0, 3)) {
      coming.push({ key: `t-${test}`, title: test, sub: `Advised by ${doctorName(latest.visit.doctor?.name)} on ${formatShortDate(dateOf(latest.visit.date))}`, href: `/diagnostics?q=${encodeURIComponent(test)}`, action: 'Book test' })
    }
    const fu = followUpNote(notes)
    if (fu && !freeDoctors.includes(latest.visit.doctor?.id ?? '')) {
      coming.push({ key: 'fu-note', title: `See ${doctorName(latest.visit.doctor?.name)} again`, sub: `The doctor asked: ${fu}`, href: latest.visit.doctor ? `/book/${latest.visit.doctor.id}` : '/find', action: 'Book' })
    }
  }
  for (const v of [...visits].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))) {
    if (!v.at || UPCOMING_DONE.has(v.status) || Date.parse(v.at) < now) continue
    const who = v.familyMemberId ? memberName.get(v.familyMemberId) : null
    coming.push({ key: `v-${v.id}`, title: `${who ? `${who} · ` : ''}${v.doctor?.specialty || doctorName(v.doctor?.name)}`, sub: `Booked · ${formatSlot(v.at, now)}`, href: `/book/confirmation/${v.id}`, action: 'View pass' })
    if (coming.length >= 6) break
  }

  const label = new Date(now).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })
  const prescribedFor = (p: { visit: { familyMemberId: string | null } }) => (p.visit.familyMemberId ? memberName.get(p.visit.familyMemberId) : null)

  return (
    <AccountPage
      user={user}
      profile={profile}
      wide
      title="Medicines & reminders"
      subtitle="Taken from your doctors’ prescriptions, at your meal times"
      phoneSubtitle={doses.length ? `${doses.length} ${doses.length === 1 ? 'dose' : 'doses'} today, from your prescriptions` : 'From your doctors’ prescriptions'}
      actions={
        active.length > 0 ? (
          <a href="/patient/reminders/calendar" className={btnOutline}>
            <CalendarPlus className="w-4 h-4" /> Add to calendar
          </a>
        ) : undefined
      }
    >
      {current && (
        <section className="flex flex-col md:flex-row md:items-center gap-3 rounded-[18px] lg:rounded-2xl bg-[#EEF3FF] shadow-[0_0_0_1px_#D9E3FF] px-4 py-3.5 lg:px-[22px] lg:py-4">
          <span className="shrink-0 w-10 h-10 rounded-full bg-white text-[#2A4DD0] flex items-center justify-center">
            <Pill className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14.5px] font-extrabold">
              {current.medicines.length} {current.medicines.length === 1 ? 'medicine' : 'medicines'} from {doctorName(current.visit.doctor?.name)}&apos;s prescription
              {prescribedFor(current) ? ` for ${prescribedFor(current)}` : ''}
            </span>
            <span className="block mt-0.5 text-[12.5px] text-[#4A5878]">
              Prescribed on {formatShortDate(dateOf(current.visit.date))}
              {current.visit.hospital ? ` at ${current.visit.hospital.name}` : ''}. Reminders follow the doctor&apos;s timing and your meal times.
            </span>
          </span>
          <Link href="/patient/records?type=rx" className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
            View prescription
          </Link>
        </section>
      )}

      <div className="flex flex-col gap-3.5 lg:grid lg:gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0">
          <div className="order-1 lg:order-none">
            <TodaySchedule doses={doses} date={today} label={label} ready={dosesReady} />
          </div>

          {asNeeded.length > 0 && (
            <section className={`${card} p-4 lg:p-[22px] order-4 lg:order-none`}>
              <h2 className="text-[16px] font-extrabold">Only when needed</h2>
              <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">No set time. Take them as the doctor wrote.</p>
              {asNeeded.map((m) => (
                <div key={m.key} className="py-2.5 border-t border-[#EEF2F7] first:border-t-0 mt-1">
                  <span className="block text-[14px] font-extrabold">{m.name}</span>
                  <span className="block text-[12.5px] text-[#4A5878]">{[m.dose, m.frequency, m.timing, m.instructions].filter(Boolean).join(' · ')}</span>
                </div>
              ))}
            </section>
          )}

          <div className="order-5 lg:order-none grid gap-3.5 lg:gap-5 xl:grid-cols-2 items-start">
            <section className={`${card} p-4 lg:p-[22px]`}>
              <h2 className="text-[16px] font-extrabold">Coming up</h2>
              <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">Follow-ups, tests your doctor advised and booked visits</p>
              {coming.length === 0 ? (
                <p className="mt-3 text-[13px] text-[#5B667A]">Nothing coming up.</p>
              ) : (
                <div className="mt-2">
                  {coming.map((c) => (
                    <div key={c.key} className="flex items-center gap-3 py-3 border-t border-[#EEF2F7] first:border-t-0">
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] font-extrabold">{c.title}</span>
                        <span className="block text-[12px] text-[#5B667A]">{c.sub}</span>
                      </span>
                      <Link href={c.href} className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
                        {c.action}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className={`${card} p-4 lg:p-[22px]`}>
              <h2 className="text-[16px] font-extrabold">Finished courses</h2>
              {done.length === 0 ? (
                <p className="mt-2 text-[13px] text-[#5B667A]">Courses you finish in the last 60 days show here.</p>
              ) : (
                <div className="mt-2">
                  {done.map((m) => (
                    <div key={m.key} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7] first:border-t-0">
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-extrabold truncate">{m.name}</span>
                        <span className="block text-[12px] text-[#5B667A] truncate">{[m.doctor, m.frequency, m.timing?.toLowerCase(), m.duration].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className="shrink-0 text-[12px] font-extrabold text-[#5B667A]">Finished {formatShortDate(dateOf(endDate(m)))}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0">
          {current && (
            <section className={`${card} p-4 lg:p-[22px] order-3 lg:order-none`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-extrabold">Active prescription</h2>
                <Link href="/patient/records?type=rx" className="text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
                  All records
                </Link>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="shrink-0 w-10 h-10 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center text-[12.5px] font-extrabold">{initials(current.visit.doctor?.name)}</span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-extrabold">{doctorName(current.visit.doctor?.name)}</span>
                  <span className="block text-[12px] text-[#5B667A]">
                    {[current.visit.doctor?.specialty, formatShortDate(dateOf(current.visit.date)), current.record.prescriptionNo ? `Rx ${current.record.prescriptionNo}` : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </div>
              <div className="mt-2">
                {current.medicines.map((m) => (
                  <div key={m.key} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7]">
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-extrabold">{m.name}</span>
                      <span className="block text-[12px] text-[#5B667A]">{[m.dose, m.timing, m.duration].filter(Boolean).join(' · ')}</span>
                    </span>
                    {m.frequency && <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#F3F6FC] text-[12px] font-extrabold tabular-nums">{m.frequency}</span>}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-[#5B667A]">1-0-1 means morning, afternoon, night. Only your doctor can change a prescription; ask them before you stop or change a medicine.</p>
            </section>
          )}
          <div className="order-2 lg:order-none">
            <MealTimes meals={details.meals} ready={details.extended} />
          </div>
          <section className={`${card} p-4 lg:p-[22px] order-6 lg:order-none`}>
            <h2 className="text-[16px] font-extrabold">Remind me</h2>
            <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">Add today&apos;s medicines to your phone&apos;s calendar, with an alert at each dose time until the course ends.</p>
            {active.length > 0 ? (
              <a href="/patient/reminders/calendar" className={`${btnOutline} mt-3 w-full`}>
                <CalendarPlus className="w-4 h-4" /> Add to my calendar
              </a>
            ) : (
              <p className="mt-2.5 text-[12.5px] text-[#8A94A6]">No medicines running right now.</p>
            )}
            <p className="mt-2 text-[11.5px] text-[#8A94A6]">If your doctor changes the prescription, add it again.</p>
          </section>
        </div>
      </div>
    </AccountPage>
  )
}
