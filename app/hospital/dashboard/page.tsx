import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  BadgeCheck, BedDouble, Building2, CalendarCheck, CalendarClock, CalendarPlus, CheckCircle2, ChevronRight,
  CircleCheck, IndianRupee, ListFilter, Phone, PhoneCall, ShieldCheck,
  Siren, Stethoscope, TrendingDown, TrendingUp, UserRoundX, Users, Wallet, type LucideIcon,
} from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatINR, formatTime, initials, istDateKey } from '@/components/patient/format'
import { Avatar } from '@/components/portal/ui'
import { ageSex, loadPatientFacts } from '@/lib/patient-facts'
import {
  dayOf, dayStartIso, hospitalShare, isPaidVisit, loadHospitalDoctors, loadHospitalSlots, loadHospitalVisits, requireHospital, type HospitalDoctor,
  type HospitalVisit, type Slot,
} from '../_lib/hospital'
import { AddDoctorButton } from '../_components/DoctorDialogs'
import { LiveRefresh } from '@/components/portal/LiveRefresh'
import { loadHospitalBeds, summarizeBeds, wardSummaries } from '@/lib/beds'

export const metadata: Metadata = { title: 'Dashboard | Hospital Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const LATE_MS = 15 * 60_000
const card = 'bg-white rounded-xl p-4 md:p-6 shadow-xs border border-slate-200/90'
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function Counter({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub: string }) {
  return (
    <div className="min-w-[150px] flex-1 p-3.5 md:p-4 rounded-xl bg-white shadow-xs border border-slate-200/90 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{label}</div>
        <div className="text-2xl font-bold tracking-tight mt-0.5 text-slate-900 tabular-nums">{value}</div>
        <div className="text-xs text-slate-500 truncate">{sub}</div>
      </div>
      <span className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-600 shrink-0">
        <Icon className="w-4 h-4" />
      </span>
    </div>
  )
}

type Alert = {
  key: string
  tone: 'coral' | 'blue'
  icon: LucideIcon
  title: string
  chip?: string
  line: string
  facts: { label: string; value: string }[]
  primary: { href: string; label: string }
  call?: { phone: string; label: string }
}

export default async function HospitalDashboardPage() {
  const { admin, hospital, staff } = await requireHospital()
  const now = currentTime()
  const today = istDateKey(now)

  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const ids = doctors.map((d) => d.id)
  const [visits, slots, beds] = await Promise.all([
    loadHospitalVisits(admin, hospital.id, ids),
    loadHospitalSlots(admin, ids, dayStartIso(today), new Date(Date.parse(dayStartIso(today)) + 7 * DAY).toISOString()),
    loadHospitalBeds(admin, hospital.id),
  ])
  const bedSummary = summarizeBeds(beds.data)
  const bedWards = wardSummaries(beds.data)
  const doctorById = new Map(doctors.map((d) => [d.id, d]))
  const departmentNames = Array.from(new Set(doctors.map((d) => d.department))).sort()
  const live = hospital.status === 'active'

  const todays = visits.filter((v) => dayOf(v.start) === today)
  const paidToday = todays.filter(isPaidVisit)
  const isLate = (v: HospitalVisit) => v.status === 'confirmed' && !!v.start && Date.parse(v.start) < now - LATE_MS
  const late = paidToday.filter(isLate)
  const checkedIn = paidToday.filter((v) => v.status === 'visited').length
  const completed = paidToday.filter((v) => v.status === 'completed').length
  const toCome = paidToday.filter((v) => v.status === 'confirmed' && !isLate(v)).length
  const unpaidToday = todays.filter((v) => v.status === 'pending_payment' && v.start && Date.parse(v.start) > now)

  const todaySlots = slots.filter((s) => dayOf(s.start) === today)
  const bookedSlots = todaySlots.filter((s) => s.booked).length
  const slotPct = todaySlots.length ? Math.round((bookedSlots / todaySlots.length) * 100) : 0
  const onDuty = doctors
    .map((d) => ({ doctor: d, mine: todaySlots.filter((s) => s.doctorId === d.id) }))
    .filter((x) => x.mine.length > 0)
    .sort((a, b) => a.mine[0].start.localeCompare(b.mine[0].start))
  const weekDoctors = new Set(slots.filter((s) => Date.parse(s.start) > now).map((s) => s.doctorId))
  const unscheduled = doctors.filter((d) => !weekDoctors.has(d.id))

  const month = today.slice(0, 7)
  const lastMonth = istDateKey(Date.parse(`${month}-01T12:00:00+05:30`) - DAY).slice(0, 7)
  const paidOn = (v: HospitalVisit) => dayOf(v.payment?.createdAt ?? v.createdAt)
  const revenueIn = (key: string) => visits.reduce((sum, v) => (v.payment && paidOn(v)?.startsWith(key) ? sum + hospitalShare(v.payment) : sum), 0)
  const paymentsToday = visits.filter((v) => v.payment && paidOn(v) === today)
  const revenueToday = paymentsToday.reduce((sum, v) => sum + hospitalShare(v.payment!), 0)
  const revenueThisMonth = revenueIn(month)

  // Next 7 days: how full each department's published slots are.
  const deptFill = new Map<string, { booked: number; total: number }>()
  for (const s of slots) {
    if (Date.parse(s.start) < now) continue
    const dept = doctorById.get(s.doctorId)?.department ?? 'Other'
    const entry = deptFill.get(dept) ?? { booked: 0, total: 0 }
    entry.total++
    if (s.booked) entry.booked++
    deptFill.set(dept, entry)
  }
  const departments = Array.from(deptFill.entries()).sort((a, b) => b[1].booked / b[1].total - a[1].booked / a[1].total)

  const facts = await loadPatientFacts(admin, Array.from(new Set(todays.map((v) => v.patient?.id).filter(Boolean) as string[])))
  const lineOf = (v: HospitalVisit) => (v.patient ? ageSex(facts[v.patient.id], now) : null)

  const alerts: Alert[] = []
  if (late[0]) {
    const v = late[0]
    const doc = v.doctorId ? doctorById.get(v.doctorId) : undefined
    const mins = Math.round((now - Date.parse(v.start!)) / 60_000)
    alerts.push({
      key: 'late',
      tone: 'coral',
      icon: UserRoundX,
      title: v.patient?.name ?? 'Patient',
      chip: formatTime(v.start!),
      line: `${mins} min past slot • not checked in${late.length > 1 ? ` • +${late.length - 1} more` : ''}`,
      facts: [
        { label: 'Doctor', value: doc ? doctorName(doc.name) : '—' },
        { label: 'Department', value: doc?.department ?? '—' },
        { label: 'Booking', value: `#${v.code}` },
      ],
      primary: { href: '/hospital/patients?view=today', label: 'Open Today’s List' },
      call: v.patient?.phone ? { phone: v.patient.phone, label: 'Call Patient' } : undefined,
    })
  }
  if (unscheduled[0]) {
    const d = unscheduled[0]
    alerts.push({
      key: 'slots',
      tone: 'coral',
      icon: CalendarClock,
      title: doctorName(d.name),
      chip: d.department,
      line: `No slots published for next 7 days${unscheduled.length > 1 ? ` • +${plural(unscheduled.length - 1, 'more doctor')}` : ''}`,
      facts: [
        { label: 'Department', value: d.department },
        { label: 'Staff ID', value: d.staffId ?? '—' },
        { label: 'Fee', value: d.fee != null ? formatINR(d.fee) : '—' },
      ],
      primary: { href: `/hospital/doctors/${d.id}/schedule`, label: 'Publish Slots' },
      call: d.phone ? { phone: d.phone, label: 'Call Doctor' } : undefined,
    })
  }
  if (unpaidToday[0]) {
    const v = unpaidToday[0]
    alerts.push({
      key: 'unpaid',
      tone: 'blue',
      icon: IndianRupee,
      title: plural(unpaidToday.length, 'unpaid booking') + ' today',
      chip: 'Online',
      line: 'Slot held until patient completes payment',
      facts: [
        { label: 'Next', value: v.patient?.name ?? 'Patient' },
        { label: 'At', value: formatTime(v.start!) },
        { label: 'Booking', value: `#${v.code}` },
      ],
      primary: { href: '/hospital/patients?view=today', label: 'View Bookings' },
      call: v.patient?.phone ? { phone: v.patient.phone, label: 'Call Patient' } : undefined,
    })
  }

  return (
    <>
      {/* Command header - matches Patients & Visits and Inpatient Beds */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm uppercase tracking-wider">
            Hospital Command <LiveRefresh label="Live" />
          </span>
          <h1 className="font-headline-lg text-[24px] md:text-headline-lg text-indigo-gray-900 font-bold tracking-tight mt-1.5">
            {hospital.name} Dashboard
          </h1>
          <p className="text-sm md:text-body-md text-indigo-gray-600">
            {staff.name} (Hospital Admin) • {plural(doctors.length, 'doctor')} across {plural(departmentNames.length, 'department')}
            {hospital.city ? ` • ${hospital.city}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/hospital/doctors"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold transition-all"
          >
            <CalendarCheck className="w-4 h-4 text-indigo-gray-600" /> Duty Roster
          </Link>
          <AddDoctorButton
            departments={departmentNames}
            label="Add Doctor"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold shadow-[0_8px_20px_rgba(15,23,42,0.11)] hover:brightness-105 active:scale-95 transition-all"
          />
        </div>
      </section>

      {/* Top Counters Row - Exact matching layout from Beds & Patients pages */}
      <section className="flex md:grid md:grid-cols-4 gap-2.5 md:gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <Counter
          icon={CalendarCheck}
          label="Slot occupancy"
          value={`${bookedSlots}/${todaySlots.length}`}
          sub={`${slotPct}% booked today (${todaySlots.length - bookedSlots} open)`}
        />
        <Counter
          icon={Users}
          label="Today's patients"
          value={String(paidToday.length)}
          sub={late.length > 0 ? `${late.length} not checked in • ${checkedIn} in` : `${checkedIn} checked in • ${toCome} to come`}
        />
        <Counter
          icon={Wallet}
          label="Hospital revenue"
          value={formatINR(revenueToday)}
          sub={`${formatINR(revenueThisMonth)} this month`}
        />
        <Counter
          icon={Stethoscope}
          label="Doctors on duty"
          value={`${onDuty.length}/${doctors.length}`}
          sub={`${plural(departmentNames.length, 'specialty', 'specialties')} active`}
        />
      </section>

      {/* Workspace Grid - matches beds and patients 12-col layout */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 items-start">
        <div className="xl:col-span-8 min-w-0 flex flex-col gap-4 md:gap-6">
          <AttentionTicker alerts={alerts} />

          {/* Today's patient queue */}
          <div className={card}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Today&apos;s Patient Queue</h2>
                <p className="text-xs text-slate-500 mt-0.5">Consultations booked across your doctors, in slot order</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  Total: {todays.length}
                </span>
                <Link
                  href="/hospital/patients?view=today"
                  aria-label="Open the full list"
                  title="Open the full list"
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ListFilter className="w-4 h-4" />
                </Link>
              </div>
            </div>
            {todays.length === 0 ? (
              <Placeholder icon={Users} title="No appointments today" sub="Bookings for today show here as soon as patients book" />
            ) : (
              <div className="divide-y divide-slate-100">
                {todays.slice(0, 6).map((v) => (
                  <QueueRow key={v.id} v={v} doc={v.doctorId ? doctorById.get(v.doctorId) : undefined} line={lineOf(v)} late={isLate(v)} />
                ))}
              </div>
            )}
            {todays.length > 6 && (
              <div className="pt-3 border-t border-slate-100">
                <Link href="/hospital/patients?view=today" className="text-xs text-[#0066ff] font-semibold hover:underline flex items-center gap-1">
                  View all {todays.length} consultations scheduled today <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Clinic sessions */}
          <div className={card}>
            <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Clinic Sessions Today</h2>
                <p className="text-xs text-slate-500 mt-0.5">Published schedules and active consultation shifts</p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 shrink-0">
                <Stethoscope className="w-3.5 h-3.5 text-slate-500" /> {plural(onDuty.length, 'Session')}
              </span>
            </div>
            {onDuty.length === 0 ? (
              <Placeholder
                icon={CalendarPlus}
                title="No active sessions today"
                sub="Publish slots for your doctors from the Duty Roster"
                aside={
                  <Link href="/hospital/doctors" className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold whitespace-nowrap shadow-xs">
                    Duty Roster
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {onDuty.slice(0, 6).map(({ doctor, mine }) => (
                  <Session key={doctor.id} doctor={doctor} slots={mine} now={now} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-4 min-w-0 flex flex-col gap-4 md:gap-6">
          {/* Inpatient beds */}
          <div className={card}>
            <div className="flex items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-slate-600" /> Inpatient Beds
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Current hospital census and ward availability</p>
              </div>
              <LiveRefresh />
            </div>
            {bedSummary.total === 0 ? (
              <Placeholder
                icon={BedDouble}
                title="No beds configured"
                sub="Add your wards and beds to start managing admissions"
                aside={
                  <Link href="/hospital/beds" className="px-3 py-1.5 rounded-lg bg-[#0066ff] hover:bg-[#0050cb] text-white text-xs font-semibold whitespace-nowrap shadow-xs">
                    Set Up Beds
                  </Link>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2.5 mb-3.5">
                  {[
                    { label: 'Occupied', value: bedSummary.occupied },
                    { label: 'Available', value: bedSummary.available },
                    { label: 'Total Beds', value: bedSummary.total },
                  ].map((s) => (
                    <div key={s.label} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                      <div className="text-xl font-bold text-slate-900 tracking-tight">{s.value}</div>
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1.5" role="img" aria-label={`${bedSummary.occupancy}% of beds occupied`}>
                  <div className="bg-[#0066ff] h-full rounded-full" style={{ width: `${bedSummary.occupancy}%` }} />
                </div>
                <p className="text-xs text-slate-500 mb-3.5">
                  {bedSummary.occupancy}% occupancy{bedSummary.unavailable ? ` • ${bedSummary.unavailable} in cleaning/repair` : ''}
                </p>
                <ul className="flex flex-col divide-y divide-slate-100 mb-4">
                  {bedWards.slice(0, 5).map((w) => (
                    <li key={w.ward} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-800 truncate">{w.ward}</span>
                      <span className="text-slate-500 shrink-0 font-medium">
                        {w.occupied}/{w.total} occupied
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/hospital/beds"
                  className="block text-center w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Manage Bed Allocation →
                </Link>
              </>
            )}
          </div>

          {/* Department occupancy */}
          <div className={card}>
            <div className="flex items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Slot Occupancy by Dept</h2>
                <p className="text-xs text-slate-500 mt-0.5">Share of published appointment slots booked</p>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200 shrink-0">
                Next 7 Days
              </span>
            </div>
            {departments.length === 0 ? (
              <Placeholder icon={CalendarClock} title="No slots published" sub="Occupancy appears once doctors publish consultation hours" />
            ) : (
              <div className="space-y-3.5">
                {departments.map(([dept, f]) => {
                  const pct = Math.round((f.booked / f.total) * 100)
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex justify-between items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-800 truncate">{dept}</span>
                        <span className="text-slate-600 font-medium shrink-0">
                          {pct}% Full ({f.booked}/{f.total})
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 90 ? 'bg-amber-500' : 'bg-[#0066ff]'}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Doctors on duty */}
          <div className={card}>
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Doctors On Active Duty</h2>
                <p className="text-xs text-slate-500 mt-0.5">Consultants with active slots today</p>
              </div>
              {onDuty.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> {onDuty.length} Active
                </span>
              )}
            </div>
            {onDuty.length === 0 ? (
              <Placeholder icon={Stethoscope} title="No doctor on duty today" sub={`${plural(doctors.length, 'doctor')} registered on your roster`} />
            ) : (
              <div className="flex flex-col divide-y divide-slate-100">
                {onDuty.map(({ doctor: d }) => (
                  <div key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={d.name} image={d.image} className="w-9 h-9 text-xs" />
                      <div className="min-w-0">
                        <h4 className="text-xs md:text-sm font-semibold text-slate-900 leading-tight truncate">{doctorName(d.name)}</h4>
                        <span className="text-[11px] text-slate-500 font-medium truncate block mt-0.5">{d.department}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {d.staffId && (
                        <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                          #{d.staffId}
                        </span>
                      )}
                      {d.phone && (
                        <a
                          href={`tel:${d.phone.replace(/[^\d+]/g, '')}`}
                          aria-label={`Call ${doctorName(d.name)}`}
                          title={`Call ${doctorName(d.name)}`}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions - Uniform enterprise shortcuts */}
          <div className={card}>
            <h2 className="text-base font-bold text-slate-900 mb-3.5">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5">
              <QuickAction href="/hospital/doctors" icon={CalendarPlus} title="Publish Slots" sub="Duty roster" />
              <QuickAction href="/hospital/patients?view=today" icon={Users} title="Today's List" sub="Check-ins & visits" />
              <QuickAction href="/hospital/beds" icon={BedDouble} title="Inpatient Beds" sub="Admit & discharge" />
              <QuickAction href="/hospital/revenue" icon={IndianRupee} title="Financials" sub="Fees & settlements" />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}



function Placeholder({ icon: Icon, title, sub, aside }: { icon: LucideIcon; title: string; sub: string; aside?: ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800">{title}</p>
          <p className="text-[11px] text-slate-500 truncate">{sub}</p>
        </div>
      </div>
      {aside && <span className="shrink-0">{aside}</span>}
    </div>
  )
}

function AttentionTicker({ alerts }: { alerts: Alert[] }) {
  const [main, ...rest] = alerts
  if (!main) {
    return (
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Clinical Triage: All Clear</h2>
              <p className="text-xs text-slate-500">Every scheduled doctor has slots published and visits are on time.</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            Optimal
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-2 pb-3.5 mb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <h2 className="text-base font-bold text-slate-900">Clinical Attention Required</h2>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/70">
          {alerts.length} {alerts.length === 1 ? 'Item' : 'Items'} Need Action
        </span>
      </div>

      <div className="bg-slate-50/80 rounded-lg border border-slate-200/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <main.icon className="w-4 h-4" />
          </span>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900">{main.title}</span>
              {main.chip && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                  {main.chip}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-rose-700">{main.line}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-[11px]">
              {main.facts.map((f) => (
                <span key={f.label}>
                  {f.label}: <strong className="text-slate-800 font-medium">{f.value}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={main.primary.href}
            className="px-3.5 py-1.5 rounded-lg bg-[#0066ff] hover:bg-[#0050cb] text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
          >
            {main.primary.label}
          </Link>
          {main.call && (
            <a
              href={`tel:${main.call.phone.replace(/[^\d+]/g, '')}`}
              className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <PhoneCall className="w-3.5 h-3.5 text-slate-500" /> {main.call.label}
            </a>
          )}
        </div>
      </div>

      {rest.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {rest.map((a) => (
            <li key={a.key} className="pt-2 pb-1">
              <Link href={a.primary.href} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <a.icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900 truncate">{a.title}</span>
                    <span className="block text-[11px] text-slate-500 truncate">{a.line}</span>
                  </span>
                </span>
                <span className="text-xs text-[#0066ff] font-semibold shrink-0">{a.primary.label} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const QUEUE_STATUS: Record<string, { label: string; badge: string }> = {
  confirmed: { label: 'Booked', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  visited: { label: 'Checked In', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/70' },
  completed: { label: 'Completed', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  pending_payment: { label: 'Awaiting Payment', badge: 'bg-amber-50 text-amber-700 border-amber-200/70' },
}

function QueueRow({ v, doc, line, late }: { v: HospitalVisit; doc: HospitalDoctor | undefined; line: string | null; late: boolean }) {
  const s = late
    ? { label: 'Not Checked In', badge: 'bg-rose-50 text-rose-700 border-rose-200/70' }
    : QUEUE_STATUS[v.status] ?? QUEUE_STATUS.confirmed

  return (
    <div className="py-3 flex items-center justify-between gap-3 md:gap-4 hover:bg-slate-50/60 px-2 -mx-2 rounded-lg transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0">
          {initials(v.patient?.name ?? 'P')}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs md:text-sm font-semibold text-slate-900 truncate">{v.patient?.name ?? 'Patient'}</span>
            {line && <span className="text-xs text-slate-400 font-normal shrink-0">{line.replace('y • ', '')}</span>}
          </div>
          <p className="text-[11px] text-slate-500 font-mono truncate">
            {v.start ? formatTime(v.start) : 'No slot'} • #{v.code}
            <span className="sm:hidden font-sans font-medium text-slate-600">{doc ? ` • ${doctorName(doc.name)}` : ''}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 sm:gap-6 shrink-0">
        {doc && (
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-slate-800 block">{doctorName(doc.name)}</span>
            <span className="text-[11px] text-slate-500">{doc.department}</span>
          </div>
        )}
        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap ${s.badge}`}>
          {s.label}
        </span>
      </div>
    </div>
  )
}

function Session({ doctor: d, slots, now }: { doctor: HospitalDoctor; slots: Slot[]; now: number }) {
  const first = slots[0]
  const last = slots[slots.length - 1]
  const start = Date.parse(first.start)
  const end = Date.parse(last.end ?? last.start)
  const booked = slots.filter((s) => s.booked).length
  const state = now < start ? 'upcoming' : now > end ? 'done' : 'live'
  const look = {
    live: { dot: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/70', text: 'In Progress' },
    upcoming: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200', text: 'Upcoming' },
    done: { dot: 'bg-slate-300', badge: 'bg-slate-100 text-slate-500 border-slate-200', text: 'Finished' },
  }[state]

  return (
    <Link
      href={`/hospital/doctors/${d.id}/schedule`}
      className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-3 min-w-0"
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 truncate">{d.department}</span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${look.dot}`} />
        </div>
        <h3 className="text-xs md:text-sm font-semibold text-slate-900 truncate">{doctorName(d.name)}</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {plural(slots.length, 'slot')} • {booked} booked
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-200/60">
        <span className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
          {formatTime(first.start)} - {formatTime(last.end ?? last.start)}
        </span>
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap ${look.badge}`}>
          {look.text}
        </span>
      </div>
    </Link>
  )
}

function QuickAction({ href, icon: Icon, title, sub }: { href: string; icon: LucideIcon; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="p-3 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col items-center justify-center text-center group"
    >
      <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#0066ff] border border-slate-200/50 transition-colors flex items-center justify-center mb-1.5">
        <Icon className="w-4 h-4" />
      </span>
      <span className="text-xs font-semibold text-slate-900">{title}</span>
      <span className="text-[11px] text-slate-500 mt-0.5">{sub}</span>
    </Link>
  )
}
