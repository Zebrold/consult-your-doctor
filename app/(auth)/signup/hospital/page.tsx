import type { Metadata } from 'next'
import { documentsReady } from '@/lib/application-uploads'
import { PartnerSignupForm } from '../PartnerSignupForm'

export const metadata: Metadata = {
  title: 'Join as a Hospital',
  description: 'Apply to list your hospital on Consult Your Doctor. Our operations team verifies every hospital before patients can book.',
  alternates: { canonical: '/signup/hospital' },
}

export default async function HospitalSignupPage() {
  return <PartnerSignupForm kind="hospital" uploads={await documentsReady()} />
}
