import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { loadVisits, requireDoctor } from '../_lib/doctor'
import { DoctorReports } from '../_components/DoctorReports'

export const metadata: Metadata = { title: 'Reports | Doctor Portal' }
export const dynamic = 'force-dynamic'

export default async function DoctorReportsPage() {
  const { admin, doctor } = await requireDoctor()
  return <DoctorReports doctor={doctor} visits={await loadVisits(admin, doctor.id)} now={currentTime()} />
}
