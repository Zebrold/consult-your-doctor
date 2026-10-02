import type { Metadata } from 'next'
import { CalendarCheck, CalendarDays, CircleDollarSign, UserCheck, Users, type LucideIcon } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, istDateKey } from '@/components/patient/format'
import { ageSex, loadPatientFacts } from '@/lib/patient-facts'
import { dayOf, hospitalShare, isPaidVisit, loadHospitalDoctors, loadHospitalVisits, PAYMENT_METHOD, requireHospital } from '../_lib/hospital'
import { PatientsBoard, type BoardRow, type BoardView } from '../_components/PatientsBoard'

export const metadata: Metadata = { title: 'Patients | Hospital Portal' }
export const dynamic = 'force-dynamic'

const VIEWS: BoardView[] = ['today', 'upcoming', 'past', 'unpaid', 'all']
const DAY = 86_400_000

function Counter({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: string }) {
  return (
    <div className="min-w-[132px] flex-1 p-3.5 md:p-4 rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container md:border-transparent flex items-center justify-between gap-2">
      <div>
        <div className="font-label-sm text-[11px] md:text-label-sm text-indigo-gray-600">{label}</div>
        <div className={`font-headline-lg text-[24px] md:text-headline-lg font-bold tracking-tight mt-0.5 ${tone}`}>{value}</div>
      </div>
      <span className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </span>
    </div>
  )
}

export default async function HospitalPatientsPage(props: { searchParams?: Promise<{ view?: string }> }) {
  const params = (await props.searchParams) ?? {}
  const { admin, hospital } = await requireHospital()
  const now = currentTime()
  const today = istDateKey(now)

  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const visits = await loadHospitalVisits(admin, hospital.id, doctors.map((d) => d.id))
  const facts = await loadPatientFacts(admin, Array.from(new Set(visits.map((v) => v.patient?.id).filter(Boolean) as string[])))
  const doctorById = new Map(doctors.map((d) => [d.id, d]))

  const rows: BoardRow[] = visits.map((v) => {
    const doc = v.doctorId ? doctorById.get(v.doctorId) : undefined
    return {
      id: v.id,
      code: v.code,
      status: v.status,
      start: v.start,
      day: dayOf(v.start ?? v.createdAt),
      patientName: v.patient?.name ?? 'Patient',
      phone: v.patient?.phone ?? null,
      ageSex: v.patient ? ageSex(facts[v.patient.id], now) : null,
      doctor: doc ? doctorName(doc.name) : 'Doctor',
      department: doc?.department ?? 'Other',
      payment: v.payment ? { label: PAYMENT_METHOD[v.payment.gateway ?? ''] ?? 'Paid', amount: hospitalShare(v.payment) } : null,
    }
  })

  const paid = visits.filter(isPaidVisit)
  const todayRows = rows.filter((r) => r.day === today)
  const weekEnd = istDateKey(now + 7 * DAY)
  const counters = {
    patients: new Set(paid.map((v) => v.patient?.id).filter(Boolean)).size,
    today: todayRows.filter((r) => r.status !== 'pending_payment').length,
    upcoming: rows.filter((r) => r.day && r.day > today && r.day <= weekEnd && r.status !== 'pending_payment').length,
    checkedIn: todayRows.filter((r) => r.status === 'visited').length,
    unpaid: rows.filter((r) => r.status === 'pending_payment').length,
  }

  const requested = VIEWS.includes(params.view as BoardView) ? (params.view as BoardView) : null
  const initialView: BoardView = requested ?? (todayRows.length ? 'today' : 'upcoming')

  return (
    <>
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm uppercase tracking-wider">Outpatient consultations</span>
          <h1 className="font-headline-lg text-[24px] md:text-headline-lg text-indigo-gray-900 font-bold tracking-tight mt-1.5">Patients &amp; Appointments</h1>
          <p className="text-sm md:text-body-md text-indigo-gray-600">Everyone booked with your doctors: today’s queue, upcoming visits and history.</p>
        </div>
      </section>

      <section className="flex md:grid md:grid-cols-5 gap-2.5 md:gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <Counter icon={Users} label="Patients" value={counters.patients} tone="text-indigo-gray-900" />
        <Counter icon={CalendarDays} label="Today" value={counters.today} tone="text-vibrant-blue" />
        <Counter icon={UserCheck} label="Checked in" value={counters.checkedIn} tone="text-secondary" />
        <Counter icon={CalendarCheck} label="Next 7 days" value={counters.upcoming} tone="text-primary" />
        <Counter icon={CircleDollarSign} label="Unpaid bookings" value={counters.unpaid} tone={counters.unpaid ? 'text-soft-coral' : 'text-indigo-gray-900'} />
      </section>

      <PatientsBoard
        key={initialView}
        rows={rows}
        today={today}
        now={now}
        initialView={initialView}
        departments={Array.from(new Set(doctors.map((d) => d.department))).sort()}
      />
    </>
  )
}
