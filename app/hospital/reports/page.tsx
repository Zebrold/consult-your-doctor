import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { loadReviewsFor } from '@/lib/reviews'
import { loadHospitalDoctors, loadHospitalVisits, requireHospital } from '../_lib/hospital'
import { HospitalReports, RANGES } from '../_components/HospitalReports'

export const metadata: Metadata = { title: 'Reports | Hospital Portal' }
export const dynamic = 'force-dynamic'

export default async function HospitalReportsPage({ searchParams }: { searchParams: Promise<{ months?: string }> }) {
  const { months } = await searchParams
  const range = RANGES.find((r) => String(r) === months) ?? 6
  const { admin, hospital } = await requireHospital()
  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const doctorIds = doctors.map((d) => d.id)
  const [visits, reviews] = await Promise.all([loadHospitalVisits(admin, hospital.id, doctorIds), loadReviewsFor(admin, { doctorIds, hospitalId: hospital.id })])
  return <HospitalReports hospital={hospital} doctors={doctors} visits={visits} reviews={reviews} now={currentTime()} range={range} />
}
