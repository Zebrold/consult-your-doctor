import type { Metadata } from 'next'
import { getHospitals } from '@/app/actions/doctorAuth'
import { documentsReady } from '@/lib/application-uploads'
import { DoctorSignupForm } from './DoctorSignupForm'

export const metadata: Metadata = {
  title: 'Join as a Doctor',
  description: 'Apply to join the Consult Your Doctor clinical network. Applications are verified by our credentialing team.',
}

export default async function DoctorSignupPage() {
  const [hospitals, uploads] = await Promise.all([getHospitals(), documentsReady()])
  return <DoctorSignupForm hospitals={hospitals} uploads={uploads} />
}
