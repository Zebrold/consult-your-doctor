import type { Metadata } from 'next'
import { PartnerSignupForm } from '../PartnerSignupForm'

export const metadata: Metadata = {
  title: 'Join as a Diagnostic Centre',
  description: 'Apply to list your diagnostic lab or imaging centre on Consult Your Doctor. Every centre is checked for registration and accreditation before patients can book.',
  alternates: { canonical: '/signup/diagnostic-centre' },
}

export default function DiagnosticCentreSignupPage() {
  return <PartnerSignupForm kind="diagnostic_center" />
}
