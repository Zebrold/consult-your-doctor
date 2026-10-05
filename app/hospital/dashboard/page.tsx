import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  BadgeCheck, Building2, CalendarCheck, CalendarClock, CalendarPlus, CircleCheck, IndianRupee, ListFilter, Phone, PhoneCall, ShieldCheck,
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

export const metadata: Metadata = { title: 'Dashboard | Hospital Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const LATE_MS = 15 * 60_000
const card = 'bg-surface-container-lowest rounded-2xl p-4 md:p-6 shadow-[0_4px_24px_rgba(0,80,203,0.04)] border border-surface-container md:border-transparent'
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

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
  const [visits, slots] = await Promise.all([
    loadHospitalVisits(admin, hospital.id, ids),
    loadHospitalSlots(admin, ids, dayStartIso(today), new Date(Date.parse(dayStartIso(today)) + 7 * DAY).toISOString()),
  ])
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
  const revenueLastMonth = revenueIn(lastMonth)
  const revenueTrend = revenueLastMonth ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100) : null

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
      line: `${mins} min past their slot • not checked in${late.length > 1 ? ` • +${late.length - 1} more` : ''}`,
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
      line: `No slots published for the next 7 days${unscheduled.length > 1 ? ` • +${plural(unscheduled.length - 1, 'more doctor')}` : ''}`,
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
      line: 'The slot is held until the patient pays online',
      facts: [
        { label: 'Next', value: v.patient?.name ?? 'Patient' },
        { label: 'At', value: formatTime(v.start!) },
        { label: 'Booking', value: `#${v.code}` },
      ],
      primary: { href: '/hospital/patients?view=today', label: 'View Bookings' },
      call: v.patient?.phone ? { phone: v.patient.phone, label: 'Call Patient' } : undefined,
    })
  }

  const actionButton = 'flex items-center justify-center gap-2 px-4 md:px-5 py-3 rounded-full font-label-sm text-label-sm font-semibold transition-all active:scale-95'

  return (
    <>
      {/* Command header */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 md:gap-6 pt-1 md:pt-4 pb-1 md:pb-4">
        <div className="flex items-start md:items-center gap-4 md:gap-5 min-w-0">
          <div className="relative shrink-0">
            {hospital.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hospital.image} alt={hospital.name} className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover shadow-[0_8px_20px_rgba(0,102,255,0.12)]" />
            ) : (
              <span className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary-fixed to-surface-container text-primary flex items-center justify-center shadow-[0_8px_20px_rgba(0,102,255,0.12)]">
                <Building2 className="w-8 h-8 md:w-10 md:h-10" />
              </span>
            )}
            {live && (
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-fresh-teal flex items-center justify-center text-on-primary shadow-sm" title="Live for booking">
                <BadgeCheck className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1 md:mb-1.5">
              <h1 className="font-display-lg text-[24px] md:text-headline-lg text-on-surface font-extrabold tracking-tight">{staff.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm uppercase font-semibold">Hospital Admin</span>
              <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-medium ${live ? 'bg-secondary-container/50 text-on-secondary-container' : 'bg-error-container text-tertiary'}`}>
                {live ? 'Live for Booking' : 'Not Listed'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-indigo-gray-600 font-body-md text-[14px] md:text-body-md">
              <span className="flex items-center gap-1.5 font-semibold text-on-surface min-w-0">
                <Building2 className="w-[18px] h-[18px] text-vibrant-blue shrink-0" />
                <span className="truncate">{hospital.name}</span>
              </span>
              <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-outline-variant" />
              <span className="flex items-center gap-1 text-fresh-teal font-medium">
                <ShieldCheck className="w-4 h-4" /> {plural(doctors.length, 'doctor')} • {plural(departmentNames.length, 'department')}
              </span>
              {(hospital.address || hospital.city) && (
                <>
                  <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-outline-variant" />
                  <span className="hidden md:inline font-label-sm text-label-sm truncate max-w-[320px]">{[hospital.address, hospital.city].filter(Boolean).join(', ')}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-3 shrink-0">
          <Link href="/hospital/doctors" className={`${actionButton} bg-surface-container text-on-surface hover:bg-surface-container-high`}>
            <CalendarCheck className="w-[18px] h-[18px]" /> Duty Roster
          </Link>
          <AddDoctorButton
            departments={departmentNames}
            label="Add Doctor"
            className={`${actionButton} md:px-6 bg-primary-container text-on-primary font-bold shadow-[0_8px_20px_rgba(0,102,255,0.28)] hover:brightness-105`}
          />
        </div>
      </section>

      {/* Key metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5">
        <Metric label="Slot Occupancy" icon={CalendarCheck} tint="bg-primary-fixed/40 text-primary" value={String(bookedSlots)} unit={`/ ${plural(todaySlots.length, 'Slot')}`}>
          <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden mb-3" role="img" aria-label={`${slotPct}% booked`}>
            <div className="bg-vibrant-blue h-full rounded-full" style={{ width: `${slotPct}%` }} />
          </div>
          <Foot
            left={
              <span className="flex items-center text-primary font-semibold">
                <TrendingUp className="w-4 h-4 mr-0.5" /> {slotPct}% booked today
              </span>
            }
            right={<span className="text-fresh-teal font-semibold">{todaySlots.length - bookedSlots} open</span>}
          />
        </Metric>
        <Metric label="Today's Patients" icon={Users} tint="bg-soft-coral/10 text-soft-coral" value={String(paidToday.length)} unit="Booked">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {late.length > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-soft-coral/15 text-soft-coral font-label-sm text-label-sm font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-soft-coral animate-ping" /> {late.length} Not Checked In
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-fresh-teal/15 text-secondary font-label-sm text-label-sm font-bold">On Track</span>
            )}
            <span className="text-indigo-gray-600 font-label-sm text-label-sm">{checkedIn} checked in</span>
          </div>
          <Foot left="Still to come • done" right={<span className="text-on-surface font-semibold">{toCome} • {completed}</span>} />
        </Metric>
        <Metric label="Hospital Revenue" icon={Wallet} tint="bg-fresh-teal/15 text-secondary" value={formatINR(revenueToday)} unit="Today">
          <p className="font-body-md text-[14px] md:text-body-md text-indigo-gray-600 mb-2">{formatINR(revenueThisMonth)} collected this month</p>
          <Foot
            left={
              revenueTrend != null ? (
                <span className={`font-semibold flex items-center ${revenueTrend >= 0 ? 'text-fresh-teal' : 'text-soft-coral'}`}>
                  {revenueTrend >= 0 ? <TrendingUp className="w-4 h-4 mr-0.5" /> : <TrendingDown className="w-4 h-4 mr-0.5" />}
                  {revenueTrend >= 0 ? '+' : ''}
                  {revenueTrend}% vs last month
                </span>
              ) : (
                <span className="text-fresh-teal font-semibold flex items-center">
                  <CircleCheck className="w-4 h-4 mr-0.5" /> Fees after platform charges
                </span>
              )
            }
            right={plural(paymentsToday.length, 'payment') + ' today'}
          />
        </Metric>
        <Metric label="Doctors On Duty" icon={Stethoscope} tint="bg-primary-fixed text-primary" value={String(onDuty.length)} unit={`of ${plural(doctors.length, 'Doctor')}`}>
          <div className="flex items-center gap-1.5 text-fresh-teal font-label-sm text-label-sm font-bold mb-3">
            <BadgeCheck className="w-4 h-4" />
            {doctors.length ? `${Math.round((onDuty.length / doctors.length) * 100)}% have slots today` : 'Add your doctors'}
          </div>
          <Foot left="Active Departments" right={<span className="text-primary font-bold">{plural(departmentNames.length, 'Specialty', 'Specialties')}</span>} />
        </Metric>
      </section>

      {/* Workspace */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-start">
        <div className="lg:col-span-7 min-w-0 flex flex-col gap-4 md:gap-8">
          <AttentionTicker alerts={alerts} />

          {/* Today's patient queue */}
          <div className={card}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 md:pb-6 gap-3">
              <div>
                <h2 className="font-title-md text-[18px] md:text-title-md font-bold text-on-surface">Today&apos;s Patient Queue</h2>
                <p className="font-body-md text-[13px] md:text-body-md text-indigo-gray-600">Consultations booked across your doctors, in slot order</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-semibold">Total: {todays.length}</span>
                <Link href="/hospital/patients?view=today" aria-label="Open the full list" title="Open the full list" className="p-2 rounded-full hover:bg-surface-container transition-colors text-indigo-gray-600">
                  <ListFilter className="w-5 h-5" />
                </Link>
              </div>
            </div>
            {todays.length === 0 ? (
              <Placeholder icon={Users} title="No appointments today" sub="Bookings for today show here as soon as patients book" />
            ) : (
              <div className="flex flex-col gap-3 md:gap-3.5">
                {todays.slice(0, 6).map((v) => (
                  <QueueRow key={v.id} v={v} doc={v.doctorId ? doctorById.get(v.doctorId) : undefined} line={lineOf(v)} late={isLate(v)} />
                ))}
                {todays.length > 6 && (
                  <Link href="/hospital/patients?view=today" className="text-vibrant-blue font-label-sm text-label-sm hover:underline self-start">
                    +{todays.length - 6} more today →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Clinic sessions */}
          <div className={card}>
            <div className="flex items-center justify-between gap-3 mb-4 md:mb-5">
              <div>
                <h2 className="font-title-md text-[18px] md:text-title-md font-bold text-on-surface">Clinic Sessions Today</h2>
                <p className="font-body-md text-[13px] md:text-body-md text-indigo-gray-600">Each doctor&apos;s published slots for today</p>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-primary-fixed/40 text-primary font-label-sm text-label-sm font-bold flex items-center gap-1.5 shrink-0">
                <Stethoscope className="w-4 h-4" /> {plural(onDuty.length, 'Session')}
              </span>
            </div>
            {onDuty.length === 0 ? (
              <Placeholder
                icon={CalendarPlus}
                title="No sessions today"
                sub="Publish slots for your doctors from the Duty Roster"
                aside={
                  <Link href="/hospital/doctors" className="px-3 py-1.5 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-[12px] font-semibold whitespace-nowrap">
                    Duty Roster
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {onDuty.slice(0, 6).map(({ doctor, mine }) => (
                  <Session key={doctor.id} doctor={doctor} slots={mine} now={now} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 min-w-0 flex flex-col gap-4 md:gap-8">
          {/* Department occupancy */}
          <div className={card}>
            <div className="flex items-center justify-between gap-3 mb-4 md:mb-6">
              <div>
                <h2 className="font-title-md text-[18px] md:text-title-md font-bold text-on-surface">Slot Occupancy by Dept</h2>
                <p className="font-body-md text-[13px] md:text-body-md text-indigo-gray-600">Share of published slots booked</p>
              </div>
              <span className="font-label-sm text-label-sm px-2.5 py-1 rounded bg-surface-container text-on-surface-variant font-bold shrink-0">Next 7 Days</span>
            </div>
            {departments.length === 0 ? (
              <Placeholder icon={CalendarClock} title="No slots published" sub="Department occupancy shows once doctors have slots this week" />
            ) : (
              <div className="space-y-4">
                {departments.map(([dept, f]) => {
                  const pct = Math.round((f.booked / f.total) * 100)
                  const tone = pct >= 90 ? ['text-soft-coral', 'bg-soft-coral'] : pct >= 75 ? ['text-vibrant-blue', 'bg-vibrant-blue'] : pct >= 50 ? ['text-on-surface', 'bg-primary'] : pct >= 25 ? ['text-fresh-teal', 'bg-fresh-teal'] : ['text-indigo-gray-600', 'bg-indigo-gray-600/40']
                  return (
                    <div key={dept} className="space-y-1.5">
                      <div className="flex justify-between items-center gap-2 text-[14px] md:text-body-md">
                        <span className="font-bold text-on-surface truncate">{dept}</span>
                        <span className={`font-bold shrink-0 ${tone[0]}`}>
                          {pct}% Full ({f.booked}/{f.total})
                        </span>
                      </div>
                      <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                        <div className={`${tone[1]} h-full rounded-full`} style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Doctors on duty */}
          <div className={card}>
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <div>
                <h2 className="font-title-md text-[18px] md:text-title-md font-bold text-on-surface">Doctors On Active Duty</h2>
                <p className="font-body-md text-[13px] md:text-body-md text-indigo-gray-600">Consultants with slots today</p>
              </div>
              {onDuty.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-fresh-teal animate-ping shrink-0" />}
            </div>
            {onDuty.length === 0 ? (
              <Placeholder icon={Stethoscope} title="No doctor on duty today" sub={`${plural(doctors.length, 'doctor')} on your roster`} />
            ) : (
              <div className="flex flex-col gap-3">
                {onDuty.map(({ doctor: d }, i) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface hover:bg-surface-container-low transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={d.name} image={d.image} className="w-11 h-11 text-sm" />
                      <div className="min-w-0">
                        <h4 className="font-body-md text-[15px] md:text-body-md font-bold text-on-surface leading-tight truncate">{doctorName(d.name)}</h4>
                        <span className={`font-label-sm text-label-sm font-semibold truncate block ${['text-vibrant-blue', 'text-fresh-teal', 'text-indigo-gray-600', 'text-primary'][i % 4]}`}>{d.department}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {d.staffId && <span className="hidden sm:inline font-label-sm text-label-sm px-2 py-1 rounded bg-surface-container text-on-surface-variant font-mono">ID #{d.staffId}</span>}
                      {d.phone && (
                        <a href={`tel:${d.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${doctorName(d.name)}`} title={`Call ${doctorName(d.name)}`} className="p-1.5 rounded-full hover:bg-surface-container text-primary">
                          <Phone className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className={card}>
            <h2 className="font-title-md text-[18px] md:text-title-md font-bold text-on-surface mb-4">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2.5 md:gap-3">
              <QuickAction href="/hospital/doctors" icon={CalendarPlus} tint="bg-primary-fixed text-primary" title="Publish Slots" sub="Duty roster" />
              <QuickAction href="/hospital/patients?view=today" icon={Users} tint="bg-soft-coral/15 text-soft-coral" title="Today's List" sub="Check-ins & visits" />
              <QuickAction href="/hospital/revenue" icon={IndianRupee} tint="bg-fresh-teal/15 text-secondary" title="Finance" sub="Fees & payments" />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function Metric({ label, icon: Icon, tint, value, unit, children }: { label: string; icon: LucideIcon; tint: string; value: string; unit: string; children: ReactNode }) {
  return (
    <div className="bg-surface-container-lowest p-4 md:p-6 rounded-2xl shadow-[0_4px_24px_rgba(0,80,203,0.04)] border border-surface-container md:border-transparent flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,102,255,0.08)] transition-all min-w-0">
      <div>
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-indigo-gray-600">{label}</span>
          <span className={`p-2 rounded-xl ${tint}`}>
            <Icon className="w-5 h-5" />
          </span>
        </div>
        <div className="flex items-baseline flex-wrap gap-x-2 mb-2">
          <span className="font-display-lg text-[28px] md:text-headline-lg font-extrabold text-on-surface tracking-tight">{value}</span>
          <span className="font-body-md text-[14px] md:text-body-md text-indigo-gray-600 font-medium">{unit}</span>
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}

function Foot({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-indigo-gray-600 font-label-sm text-label-sm pt-1">
      <span className="min-w-0 truncate">{left}</span>
      <span className="shrink-0">{right}</span>
    </div>
  )
}

function Placeholder({ icon: Icon, title, sub, aside }: { icon: LucideIcon; title: string; sub: string; aside?: ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-surface flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-full bg-fresh-teal/15 text-secondary flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="font-body-md text-[15px] font-bold text-on-surface">{title}</p>
          <p className="font-label-sm text-label-sm text-indigo-gray-600">{sub}</p>
        </div>
      </div>
      {aside && <span className="shrink-0">{aside}</span>}
    </div>
  )
}

function AttentionTicker({ alerts }: { alerts: Alert[] }) {
  const [main, ...rest] = alerts
  const coral = main?.tone === 'coral'
  return (
    <div className={`${card} relative overflow-hidden ${main ? 'md:shadow-[0_4px_28px_rgba(244,63,94,0.08)]' : ''}`}>
      <div aria-hidden className={`absolute top-0 left-0 bottom-0 w-2 ${main ? (coral ? 'bg-soft-coral' : 'bg-vibrant-blue') : 'bg-fresh-teal'}`} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 md:mb-5 pl-2">
        <div className="flex items-center gap-3">
          {main ? (
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${coral ? 'bg-soft-coral' : 'bg-vibrant-blue'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${coral ? 'bg-soft-coral' : 'bg-vibrant-blue'}`} />
            </span>
          ) : (
            <CircleCheck className="w-5 h-5 text-fresh-teal" />
          )}
          <h2 className="font-title-md text-[18px] md:text-title-md font-bold text-on-surface">Urgent Attention Ticker</h2>
        </div>
        <span
          className={`self-start sm:self-auto px-3 py-1 rounded-full font-label-sm text-label-sm font-bold tracking-wider uppercase ${
            main ? (coral ? 'bg-soft-coral/10 text-soft-coral' : 'bg-vibrant-blue/10 text-vibrant-blue') : 'bg-fresh-teal/10 text-secondary'
          }`}
        >
          {main ? `${alerts.length} ${alerts.length === 1 ? 'Item Needs' : 'Items Need'} Action` : 'All Clear'}
        </span>
      </div>

      {main ? (
        <>
          <div className="bg-indigo-gray-50 rounded-xl p-4 md:p-5 md:pl-4 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5">
            <div className="flex items-start gap-3 md:gap-4 min-w-0">
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${coral ? 'bg-soft-coral/10 text-soft-coral' : 'bg-vibrant-blue/10 text-vibrant-blue'}`}>
                <main.icon className="w-7 h-7" />
              </span>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-title-md text-[17px] md:text-title-md font-bold text-on-surface">{main.title}</span>
                  {main.chip && <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">{main.chip}</span>}
                </div>
                <p className={`font-body-md text-[14px] md:text-body-md font-semibold ${coral ? 'text-soft-coral' : 'text-vibrant-blue'}`}>{main.line}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-indigo-gray-600 font-label-sm text-label-sm">
                  {main.facts.map((f) => (
                    <span key={f.label}>
                      {f.label}: <strong className="text-on-surface">{f.value}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex md:flex-col items-center gap-2.5 shrink-0">
              <Link href={main.primary.href} className="w-full px-4 py-2 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm font-bold hover:brightness-110 active:scale-95 transition-all text-center whitespace-nowrap">
                {main.primary.label}
              </Link>
              {main.call && (
                <a
                  href={`tel:${main.call.phone.replace(/[^\d+]/g, '')}`}
                  className="w-full px-4 py-2 rounded-full bg-soft-coral text-on-primary font-label-sm text-label-sm font-bold hover:brightness-110 active:scale-95 shadow-[0_4px_12px_rgba(244,63,94,0.3)] transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <PhoneCall className="w-4 h-4" /> {main.call.label}
                </a>
              )}
            </div>
          </div>
          {rest.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2 pl-2">
              {rest.map((a) => (
                <li key={a.key}>
                  <Link href={a.primary.href} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                    <span className="flex items-center gap-3 min-w-0">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.tone === 'coral' ? 'bg-soft-coral/10 text-soft-coral' : 'bg-vibrant-blue/10 text-vibrant-blue'}`}>
                        <a.icon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-body-md text-[14px] font-bold text-on-surface truncate">{a.title}</span>
                        <span className="block font-label-sm text-label-sm text-indigo-gray-600 truncate">{a.line}</span>
                      </span>
                    </span>
                    <span className="text-vibrant-blue font-label-sm text-label-sm font-semibold shrink-0">{a.primary.label} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <Placeholder icon={Siren} title="Nothing needs attention" sub="Every doctor has slots this week and today's patients are on track" />
      )}
    </div>
  )
}

const QUEUE_STATUS: Record<string, { label: string; chip: string; avatar: string }> = {
  confirmed: { label: 'Booked', chip: 'bg-primary-fixed text-primary', avatar: 'bg-primary-fixed text-primary' },
  visited: { label: 'Checked In', chip: 'bg-fresh-teal/15 text-secondary', avatar: 'bg-secondary-container/60 text-secondary' },
  completed: { label: 'Completed', chip: 'bg-surface-container-high text-on-surface-variant', avatar: 'bg-surface-container-high text-on-surface-variant' },
  pending_payment: { label: 'Awaiting Payment', chip: 'bg-soft-coral/10 text-soft-coral', avatar: 'bg-tertiary-fixed text-on-tertiary-fixed' },
}

function QueueRow({ v, doc, line, late }: { v: HospitalVisit; doc: HospitalDoctor | undefined; line: string | null; late: boolean }) {
  const s = late ? { label: 'Not Checked In', chip: 'bg-soft-coral/10 text-soft-coral', avatar: 'bg-tertiary-fixed text-on-tertiary-fixed' } : QUEUE_STATUS[v.status] ?? QUEUE_STATUS.confirmed
  return (
    <div className="p-3 md:p-4 rounded-xl bg-surface hover:bg-surface-container-low transition-all flex items-center justify-between gap-3 md:gap-4">
      <div className="flex items-center gap-3 md:gap-3.5 min-w-0">
        <span className={`w-10 h-10 rounded-full flex items-center justify-center font-title-md text-sm font-bold shrink-0 ${s.avatar}`}>{initials(v.patient?.name ?? 'P')}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-body-lg text-[15px] md:text-body-lg font-bold text-on-surface truncate">{v.patient?.name ?? 'Patient'}</span>
            {line && <span className="font-label-sm text-label-sm text-indigo-gray-600 shrink-0">{line.replace('y • ', '')}</span>}
          </div>
          <p className="font-label-sm text-label-sm text-indigo-gray-600 truncate">
            {v.start ? formatTime(v.start) : 'No slot'} • #{v.code}
            <span className="sm:hidden">{doc ? ` • ${doctorName(doc.name)}` : ''}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-4 md:gap-6 shrink-0">
        {doc && (
          <div className="text-right hidden sm:block">
            <span className="font-label-sm text-label-sm text-on-surface font-semibold block">{doctorName(doc.name)}</span>
            <span className="font-label-sm text-label-sm text-indigo-gray-600">{doc.department}</span>
          </div>
        )}
        <span className={`px-2.5 md:px-3 py-1 rounded-full font-label-sm text-[11px] md:text-label-sm font-bold whitespace-nowrap ${s.chip}`}>{s.label}</span>
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
    live: { dot: 'bg-soft-coral animate-pulse', chip: 'bg-soft-coral/10 text-soft-coral font-bold', text: 'In Progress' },
    upcoming: { dot: 'bg-fresh-teal', chip: 'bg-surface-container-high text-on-surface-variant font-bold', text: 'Upcoming' },
    done: { dot: 'bg-outline-variant', chip: 'bg-surface-container text-indigo-gray-600 font-medium', text: 'Finished' },
  }[state]
  return (
    <Link href={`/hospital/doctors/${d.id}/schedule`} className="p-4 rounded-xl bg-surface hover:bg-surface-container-low transition-colors flex flex-col justify-between gap-4 min-w-0">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-label-sm text-label-sm font-extrabold text-vibrant-blue uppercase truncate">{d.department}</span>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${look.dot}`} />
        </div>
        <h3 className="font-title-md text-[16px] md:text-body-lg font-bold text-on-surface mb-1 truncate">{doctorName(d.name)}</h3>
        <p className="font-label-sm text-label-sm text-indigo-gray-600">
          {plural(slots.length, 'slot')} • {booked} booked
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 text-indigo-gray-600 font-label-sm text-label-sm">
        <span className="font-semibold text-on-surface whitespace-nowrap">
          {formatTime(first.start)} - {formatTime(last.end ?? last.start)}
        </span>
        <span className={`px-2 py-0.5 rounded whitespace-nowrap ${look.chip}`}>{look.text}</span>
      </div>
    </Link>
  )
}

function QuickAction({ href, icon: Icon, tint, title, sub }: { href: string; icon: LucideIcon; tint: string; title: string; sub: string }) {
  return (
    <Link href={href} className="p-3 md:p-4 rounded-xl bg-surface hover:bg-surface-container transition-all flex flex-col items-center justify-center text-center group">
      <span className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform ${tint}`}>
        <Icon className="w-[22px] h-[22px]" />
      </span>
      <span className="font-label-sm text-label-sm font-bold text-on-surface">{title}</span>
      <span className="font-label-sm text-[11px] md:text-label-sm text-indigo-gray-600 mt-0.5">{sub}</span>
    </Link>
  )
}
