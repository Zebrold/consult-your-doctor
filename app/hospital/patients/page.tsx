import type { Metadata } from 'next'
import { Search } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { IST, doctorName, istDateKey, visitToken } from '@/components/patient/format'
import { ageSex, loadPatientFacts } from '@/lib/patient-facts'
import { dayOf, hospitalShare, isPaidVisit, loadHospitalDoctors, loadHospitalVisits, paymentLook, PAYMENT_METHOD, requireHospital, shiftDay } from '../_lib/hospital'
import { PatientsBoard, type BoardRow, type BoardView } from '../_components/PatientsBoard'
import { AddPatientButton } from '../_components/PatientDesk'
import { DeskHead, HosBody, HosHeader, PhoneStats, StatCard, btnPrimary, delta, plural } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Patients | Hospital Portal' }
export const dynamic = 'force-dynamic'

const VIEWS: BoardView[] = ['today', 'upcoming', 'past', 'unpaid', 'all']

export default async function HospitalPatientsPage(props: { searchParams?: Promise<{ view?: string; q?: string; walkin?: string }> }) {
  const params = (await props.searchParams) ?? {}
  const { admin, hospital, staff } = await requireHospital()
  const now = currentTime()
  const today = istDateKey(now)

  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const visits = await loadHospitalVisits(admin, hospital.id, doctors.map((d) => d.id))
  const facts = await loadPatientFacts(admin, Array.from(new Set(visits.map((v) => v.patient?.id).filter(Boolean) as string[])))
  const doctorById = new Map(doctors.map((d) => [d.id, d]))

  const rows: BoardRow[] = visits.map((v) => {
    const doc = v.doctorId ? doctorById.get(v.doctorId) : undefined
    const share = v.payment ? hospitalShare(v.payment) : null
    return {
      id: v.id,
      code: v.code,
      token: visitToken(v.id),
      status: v.status,
      start: v.start,
      day: dayOf(v.start ?? v.createdAt),
      patientName: v.patient?.name ?? 'Patient',
      phone: v.patient?.phone ?? null,
      ageSex: v.patient ? ageSex(facts[v.patient.id], now) : null,
      doctor: doc ? doctorName(doc.name) : 'Doctor',
      department: doc?.department ?? 'Other',
      payment: v.payment ? { label: PAYMENT_METHOD[v.payment.gateway ?? ''] ?? 'Paid', amount: share ?? 0 } : null,
      pay: paymentLook(v, share),
      counterDue: v.counterDue,
      fastTrack: v.fastTrack,
      services: v.services.map((s) => s.name),
    }
  })

  const paid = visits.filter(isPaidVisit)
  const paidOn = (key: string) => paid.filter((v) => dayOf(v.start) === key).length
  const paidToday = paid.filter((v) => dayOf(v.start) === today)
  const lastWeek = shiftDay(today, -7)
  const last7 = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6))
  const weekday = new Date(now).toLocaleDateString('en-US', { timeZone: IST, weekday: 'short' })

  // Patients seen for the first time in the last seven days
  const firstSeen = new Map<string, string>()
  for (const v of paid) {
    const id = v.patient?.id
    const day = dayOf(v.start ?? v.createdAt)
    if (id && day && (!firstSeen.has(id) || day < firstSeen.get(id)!)) firstSeen.set(id, day)
  }
  const newThisWeek = [...firstSeen.values()].filter((d) => d >= last7[0] && d <= today).length

  const checkedIn = paidToday.filter((v) => v.status === 'visited' || v.status === 'completed').length
  const fastToday = paidToday.filter((v) => v.fastTrack).length
  const unpaid = rows.filter((r) => r.status === 'pending_payment').length
  const doctorsToday = new Set(paidToday.map((v) => v.doctorId).filter(Boolean)).size

  const requested = VIEWS.includes(params.view as BoardView) ? (params.view as BoardView) : null
  const initialView: BoardView = requested ?? (rows.some((r) => r.day === today) ? 'today' : 'upcoming')
  const query = (params.q ?? '').trim().slice(0, 80)
  const walkIn = params.walkin === '1'

  const deskDoctors = doctors.map((d) => ({ id: d.id, name: doctorName(d.name), department: d.department, fee: d.fee }))
  const subtitle = 'Everyone booked with your doctors: today’s queue, upcoming visits and history.'

  return (
    <>
      <HosHeader staff={staff} title="Patients & appointments" subtitle={subtitle}>
        <form action="/hospital/patients" role="search" className="flex items-center gap-2.5 h-12 px-3.5 rounded-[14px] bg-white text-[#0B1B3F]">
          <Search className="w-[18px] h-[18px] text-[#5B667A] shrink-0" />
          <input type="hidden" name="view" value="all" />
          <input name="q" type="search" defaultValue={query} aria-label="Search patients" placeholder="Name, booking ID, token or phone" className="flex-1 min-w-0 bg-transparent outline-none text-[14.5px] placeholder:text-[#7A8599]" />
        </form>
      </HosHeader>
      <HosBody>
        <DeskHead
          title="Patients & appointments"
          subtitle={subtitle}
          actions={<AddPatientButton doctors={deskDoctors} label="Add walk-in patient" defaultOpen={walkIn} className={btnPrimary} />}
        />

        <PhoneStats
          cols={3}
          className="mb-3"
          stats={[
            { label: 'Patients', value: firstSeen.size, note: `+${newThisWeek} this week`, color: '#067647' },
            { label: 'Booked today', value: paidToday.length, note: plural(doctorsToday, 'doctor') },
            { label: 'Checked in', value: checkedIn, note: 'at reception' },
          ]}
        />
        <div className="lg:hidden mb-3.5">
          <AddPatientButton doctors={deskDoctors} label="Add walk-in patient" defaultOpen={walkIn} className={`${btnPrimary} w-full !h-[46px] !shadow-none`} />
        </div>

        <section className="hidden lg:grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Booked today" value={paidToday.length} change={delta(paidToday.length, paidOn(lastWeek))} note={`vs last ${weekday}`} series={last7.map(paidOn)} />
          <StatCard label="Checked in" value={checkedIn} note={`of ${paidToday.length} booked today`} />
          <StatCard label="Fast track today" value={fastToday} note="Seen ahead once checked in" />
          <StatCard label="Unpaid bookings" value={unpaid} note={unpaid ? 'Awaiting payment' : 'All bookings paid'} />
        </section>

        <PatientsBoard
          key={`${initialView}:${query}`}
          rows={rows}
          today={today}
          now={now}
          initialView={initialView}
          initialQuery={query}
          departments={Array.from(new Set(doctors.map((d) => d.department))).sort()}
        />
      </HosBody>
    </>
  )
}
