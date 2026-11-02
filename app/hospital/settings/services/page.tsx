import type { Metadata } from 'next'
import { hospitalServices } from '@/lib/hospital-services'
import { requireHospital } from '../../_lib/hospital'
import { ServicesBoard } from '../../_components/ServicesBoard'

export const metadata: Metadata = { title: 'Services & charges | Hospital Portal' }
export const dynamic = 'force-dynamic'

/** Services & charges: the tests, scans and procedures patients can add when they book a doctor, with their prices. */
export default async function HospitalServicesPage() {
  const { admin, hospital, staff } = await requireHospital()
  // `*`: service_details (the description, department, type and visibility) arrives with 20261103_hospital_services.sql.
  const { data } = await admin.from('hospitals').select('*').eq('id', hospital.id).maybeSingle()

  return <ServicesBoard hospitalName={hospital.name} staff={staff} services={hospitalServices(data)} detailsReady={!!data && 'service_details' in data} />
}
