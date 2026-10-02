import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CalendarClock, CalendarDays, CircleAlert, CircleCheck, IndianRupee, ListChecks, Phone, Stethoscope, UserRoundX, Users, type LucideIcon,
} from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatINR, formatTime, istDateKey } from '@/components/patient/format'
import { Avatar, Card, CardHeader, Chip, EmptyState, SegmentBar, StatCard } from '@/components/portal/ui'
import {
  dayOf, dayStartIso, hospitalShare, isPaidVisit, loadHospitalDoctors, loadHospitalSlots, loadHospitalVisits, requireHospital, VISIT_STATUS,
} from '../_lib/hospital'
import { AddDoctorButton } from '../_components/DoctorDialogs'

export const metadata: Metadata = { title: 'Dashboard | Hospital Portal' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000

function greeting(now: number) {
  const hour = Number(new Date(now).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hourCycle: 'h23' }))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
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

  const todays = visits.filter((v) => dayOf(v.start) === today)
  const paidToday = todays.filter(isPaidVisit)
  const n = (s: string) => paidToday.filter((v) => v.status === s).length

  const month = today.slice(0, 7)
  const lastMonth = istDateKey(Date.parse(`${month}-01T12:00:00+05:30`) - DAY).slice(0, 7)
  const paid = visits.filter(isPaidVisit)
  const firstVisit = new Map<string, string>()
  for (const v of paid) {
    const d = dayOf(v.start ?? v.createdAt)!
    if (v.patient && (!firstVisit.has(v.patient.id) || d < firstVisit.get(v.patient.id)!)) firstVisit.set(v.patient.id, d)
  }
  const patientsThisMonth = new Set(paid.filter((v) => dayOf(v.start ?? v.createdAt)?.startsWith(month)).map((v) => v.patient?.id)).size
  const newThisMonth = Array.from(firstVisit.values()).filter((d) => d.startsWith(month)).length
  const revenueIn = (key: string) =>
    visits.reduce((sum, v) => (v.payment && dayOf(v.payment.createdAt ?? v.createdAt)?.startsWith(key) ? sum + hospitalShare(v.payment) : sum), 0)
  const revenueThisMonth = revenueIn(month)
  const revenueLastMonth = revenueIn(lastMonth)

  const todaySlots = slots.filter((s) => dayOf(s.start) === today)
  const onDuty = doctors.filter((d) => todaySlots.some((s) => s.doctorId === d.id))
  const weekDoctors = new Set(slots.filter((s) => Date.parse(s.start) > now).map((s) => s.doctorId))
  const unscheduled = doctors.filter((d) => !weekDoctors.has(d.id))
  const late = paidToday.filter((v) => v.status === 'confirmed' && v.start && Date.parse(v.start) < now - 15 * 60_000)
  const unpaidToday = todays.filter((v) => v.status === 'pending_payment' && v.start && Date.parse(v.start) > now)

  // Next 7 days: how full each department's published slots are
  const deptFill = new Map<string, { booked: number; total: number }>()
  for (const s of slots) {
    if (Date.parse(s.start) < now) continue
    const dept = doctorById.get(s.doctorId)?.department ?? 'Other'
    const entry = deptFill.get(dept) ?? { booked: 0, total: 0 }
    entry.total++
    if (s.booked) entry.booked++
    deptFill.set(dept, entry)
  }
  const departments = Array.from(deptFill.entries()).sort((a, b) => b[1].total - a[1].total)
  const departmentNames = Array.from(new Set(doctors.map((d) => d.department))).sort()

  const attention = [
    late.length > 0 && { tone: 'coral' as const, icon: UserRoundX, title: `${late.length} ${late.length === 1 ? 'patient hasn’t' : 'patients haven’t'} been checked in`, sub: 'Their appointment started more than 15 minutes ago.', href: '/hospital/patients?view=today' },
    unscheduled.length > 0 && { tone: 'coral' as const, icon: CalendarClock, title: `${unscheduled.length} ${unscheduled.length === 1 ? 'doctor has' : 'doctors have'} no slots this week`, sub: unscheduled.slice(0, 3).map((d) => doctorName(d.name)).join(', ') + (unscheduled.length > 3 ? '…' : ''), href: '/hospital/doctors' },
    unpaidToday.length > 0 && { tone: 'neutral' as const, icon: IndianRupee, title: `${unpaidToday.length} booking${unpaidToday.length === 1 ? '' : 's'} today not paid yet`, sub: 'The slot is held until the patient pays online.', href: '/hospital/patients?view=today' },
  ].filter(Boolean) as { tone: 'coral' | 'neutral'; icon: LucideIcon; title: string; sub: string; href: string }[]

  return (
    <>
      {/* Header */}
      <Card className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-gutter">
        <div className="flex items-center gap-3 md:gap-gutter min-w-0">
          <span className="relative shrink-0">
            <Avatar name={hospital.name} image={hospital.image} square className="w-12 h-12 md:w-16 md:h-16 text-lg" />
            {hospital.status === 'active' && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 md:w-4 md:h-4 bg-fresh-teal rounded-full ring-2 ring-surface-container-lowest" title="Live for booking" />}
          </span>
          <div className="min-w-0">
            <span className="text-[11px] md:text-label-sm font-semibold text-secondary uppercase tracking-wider">
              {greeting(now)}, {staff.name.split(' ')[0]}
            </span>
            <h1 className="font-title-md text-[17px] md:font-headline-lg md:text-headline-lg text-indigo-gray-900 font-bold leading-tight truncate">{hospital.name}</h1>
            <p className="hidden md:block text-sm text-indigo-gray-600 truncate">
              {[hospital.address, hospital.city].filter(Boolean).join(', ') || 'Hospital portal'} • {doctors.length} doctors • {departmentNames.length} departments
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/hospital/doctors"
            className="flex items-center justify-center gap-1.5 md:gap-2 bg-surface-container-low hover:bg-surface-container text-indigo-gray-900 font-label-sm text-[12px] md:text-label-sm px-3 md:px-stack-md py-2.5 md:py-3 rounded-full"
          >
            <CalendarDays className="w-[18px] h-[18px] text-vibrant-blue" /> Duty Roster
          </Link>
          <AddDoctorButton
            departments={departmentNames}
            className="flex items-center justify-center gap-1.5 md:gap-2 bg-vibrant-blue hover:bg-primary text-on-primary font-label-sm text-[12px] md:text-label-sm px-3 md:px-stack-md py-2.5 md:py-3 rounded-full shadow-[0_4px_16px_rgba(0,102,255,0.22)] active:scale-95"
          />
        </div>
      </Card>

      {/* Metrics */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-gutter">
        <StatCard
          label="Today's Appointments"
          value={paidToday.length}
          note={todays.length > paidToday.length ? `+${todays.length - paidToday.length} unpaid` : 'booked'}
          noteTone={todays.length > paidToday.length ? 'coral' : 'teal'}
          icon={CalendarDays}
          tone="blue"
          footer={
            <div className="flex flex-col gap-1.5">
              <SegmentBar
                parts={[
                  { value: n('completed'), className: 'bg-fresh-teal', label: 'completed' },
                  { value: n('visited'), className: 'bg-vibrant-blue', label: 'checked in' },
                  { value: n('confirmed'), className: 'bg-outline-variant', label: 'still to come' },
                ]}
              />
              <span className="hidden md:block text-[11px] text-indigo-gray-600">
                {n('completed')} done • {n('visited')} checked in • {n('confirmed')} to come
              </span>
            </div>
          }
        />
        <StatCard
          label="Patients This Month"
          value={patientsThisMonth}
          note={newThisMonth ? `+${newThisMonth} new` : undefined}
          icon={Users}
          tone="coral"
          footer={<span className="text-[11px] text-indigo-gray-600">With a paid consultation</span>}
        />
        <StatCard
          label="Revenue This Month"
          value={formatINR(revenueThisMonth)}
          icon={IndianRupee}
          tone="teal"
          footer={<span className="text-[11px] text-indigo-gray-600">Fees collected • last month {formatINR(revenueLastMonth)}</span>}
        />
        <StatCard
          label="Doctors On Duty"
          value={onDuty.length}
          note={`of ${doctors.length}`}
          noteTone="neutral"
          icon={Stethoscope}
          tone="neutral"
          footer={
            <SegmentBar
              parts={[
                { value: todaySlots.filter((s) => s.booked).length, className: 'bg-vibrant-blue', label: 'slots booked today' },
                { value: todaySlots.filter((s) => !s.booked).length, className: 'bg-surface-container-highest', label: 'slots open today' },
              ]}
            />
          }
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-gutter items-start">
        <div className="lg:col-span-7 flex flex-col gap-4 md:gap-stack-md">
          {/* Needs attention */}
          <Card className="relative overflow-hidden">
            <div aria-hidden className={`absolute top-0 left-0 bottom-0 w-1.5 ${attention.some((a) => a.tone === 'coral') ? 'bg-soft-coral' : 'bg-fresh-teal'}`} />
            <CardHeader title="Needs Attention" subtitle="Things the front desk and admin can act on now" />
            {attention.length === 0 ? (
              <EmptyState icon={CircleCheck}>All clear: every doctor has slots this week and today’s patients are on track.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {attention.map((a) => (
                  <li key={a.title}>
                    <Link href={a.href} className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${a.tone === 'coral' ? 'bg-soft-coral/10 text-soft-coral' : 'bg-primary-fixed text-primary'}`}>
                        <a.icon className="w-5 h-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-title-md text-[15px] font-bold text-indigo-gray-900">{a.title}</span>
                        <span className="block text-[12px] text-indigo-gray-600 truncate">{a.sub}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Today's appointments */}
          <Card>
            <CardHeader
              title="Today's Appointments"
              subtitle="Consultations booked across your doctors"
              action={
                <Link href="/hospital/patients?view=today" className="text-vibrant-blue font-label-sm text-label-sm hover:underline shrink-0">
                  View all
                </Link>
              }
            />
            {todays.length === 0 ? (
              <EmptyState icon={CalendarDays}>No appointments today.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2.5 md:gap-3">
                {todays.slice(0, 8).map((v) => {
                  const doc = v.doctorId ? doctorById.get(v.doctorId) : undefined
                  const status = v.status === 'confirmed' && v.start && Date.parse(v.start) < now - 15 * 60_000 ? { label: 'Not checked in', tone: 'coral' as const } : VISIT_STATUS[v.status]
                  return (
                    <li key={v.id} className="p-3 md:p-4 rounded-xl bg-surface-container-low/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 shrink-0 text-right">
                          <span className="block font-title-md text-[14px] font-bold text-indigo-gray-900">{v.start ? formatTime(v.start).replace(/ (AM|PM)$/, '') : '—'}</span>
                          <span className="block text-[11px] text-indigo-gray-600">{v.start ? formatTime(v.start).slice(-2) : ''}</span>
                        </div>
                        <Avatar name={v.patient?.name ?? null} className="w-10 h-10 text-sm" />
                        <div className="min-w-0">
                          <span className="block font-title-md text-[15px] font-bold text-indigo-gray-900 truncate">{v.patient?.name ?? 'Patient'}</span>
                          <span className="block text-[12px] text-indigo-gray-600 truncate">{doc ? `${doctorName(doc.name)} • ${doc.department}` : 'Doctor'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        {status && <Chip tone={status.tone}>{status.label}</Chip>}
                        {v.patient?.phone && (
                          <a href={`tel:${v.patient.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${v.patient.name}`} className="p-2 rounded-full hover:bg-surface-container text-vibrant-blue">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4 md:gap-stack-md">
          {/* Department fill */}
          <Card>
            <CardHeader title="Bookings by Department" subtitle="Share of published slots booked, next 7 days" />
            {departments.length === 0 ? (
              <EmptyState icon={ListChecks}>No slots published for the coming week.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-3.5">
                {departments.map(([dept, f]) => {
                  const pct = Math.round((f.booked / f.total) * 100)
                  return (
                    <li key={dept} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2 text-[14px]">
                        <span className="font-semibold text-indigo-gray-900 truncate">{dept}</span>
                        <span className={`font-bold shrink-0 ${pct >= 85 ? 'text-soft-coral' : pct >= 50 ? 'text-vibrant-blue' : 'text-secondary'}`}>
                          {pct}% <span className="font-medium text-indigo-gray-600">({f.booked}/{f.total})</span>
                        </span>
                      </div>
                      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 85 ? 'bg-soft-coral' : pct >= 50 ? 'bg-vibrant-blue' : 'bg-fresh-teal'}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {/* On duty */}
          <Card>
            <CardHeader title="Doctors On Duty Today" subtitle="Doctors with slots published for today" action={<Chip tone="teal">{onDuty.length} on duty</Chip>} />
            {onDuty.length === 0 ? (
              <EmptyState icon={Stethoscope}>No doctor has slots today. Publish slots from the Roster.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {onDuty.map((d) => {
                  const mine = todaySlots.filter((s) => s.doctorId === d.id)
                  const first = mine[0]
                  const last = mine[mine.length - 1]
                  const busy = mine.some((s) => s.booked && Date.parse(s.start) <= now && Date.parse(s.end ?? s.start) > now)
                  return (
                    <li key={d.id} className="p-3 rounded-xl bg-surface-container-low/70 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={d.name} image={d.image} className="w-10 h-10 text-sm" />
                        <div className="min-w-0">
                          <span className="block font-title-md text-[14px] md:text-[15px] font-bold text-indigo-gray-900 truncate">{doctorName(d.name)}</span>
                          <span className="block text-[12px] text-indigo-gray-600 truncate">
                            {d.department} • {formatTime(first.start)}–{formatTime(last.end ?? last.start)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Chip tone={busy ? 'blue' : 'neutral'}>{busy ? 'In consultation' : `${mine.filter((s) => s.booked).length}/${mine.length} booked`}</Chip>
                        {d.phone && (
                          <a href={`tel:${d.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${doctorName(d.name)}`} className="p-2 rounded-full hover:bg-surface-container text-vibrant-blue">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {attention.length > 0 && unscheduled.length > 0 && (
            <p className="text-[12px] text-indigo-gray-600 flex items-start gap-1.5 px-1">
              <CircleAlert className="w-4 h-4 shrink-0 text-soft-coral" /> Patients can only book doctors who have published slots.
            </p>
          )}
        </div>
      </section>
    </>
  )
}
