import type { Metadata } from 'next'
import { Microscope } from 'lucide-react'
import { FooterLink, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Diagnostic Center Sign In' }

// Diagnostic center admin accounts are created by the Consult Your Doctor team.
export default function DiagnosticLoginPage() {
  return (
    <StaffLoginCard
      role="diagnostic_admin"
      badge={<><Microscope /> Center Access</>}
      title="Diagnostic Portal Sign In"
      description="Restricted to authorized diagnostic center administrators. Sign in with the Center Admin ID issued for your lab."
      idLabel="Center Admin ID"
      submitLabel="Sign In to Lab Portal"
      footer={<>Want to list your diagnostic center?<FooterLink href="/contact">Contact our team</FooterLink></>}
    />
  )
}
