import type { Metadata } from 'next'
import { getHospitals } from '@/app/actions/doctorAuth'
import { DoctorSignupForm } from './DoctorSignupForm'

export const metadata: Metadata = {
  title: 'Doctor Registration',
  description: 'Apply to join the Consult Your Doctor clinical network. Applications are verified by our credentialing team.',
}

export default async function DoctorSignupPage() {
  const hospitals = await getHospitals()
  return <DoctorSignupForm hospitals={hospitals} />
}
