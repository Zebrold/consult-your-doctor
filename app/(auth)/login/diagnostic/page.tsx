import type { Metadata } from 'next'
import { Microscope } from 'lucide-react'
import { FooterLink, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Diagnostic Center Login' }

// Diagnostic center admin accounts are created by the Consult Your Doctor team, after a center applies at /signup/diagnostic-centre.
export default function DiagnosticLoginPage() {
  return (
    <StaffLoginCard
      role="diagnostic_admin"
      badge={<><Microscope /> Center Access</>}
      title="Diagnostic Portal Login"
      description="Restricted to authorized diagnostic center administrators. Log in with the Center Admin ID issued for your lab."
      idLabel="Center Admin ID"
      submitLabel="Log In to Lab Portal"
      footer={<>Want to list your diagnostic center?<FooterLink href="/signup/diagnostic-centre">Apply to join our network</FooterLink></>}
    />
  )
}
