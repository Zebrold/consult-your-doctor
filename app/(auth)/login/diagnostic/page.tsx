import type { Metadata } from 'next'
import { ART } from '../AuthShell'
import { FooterLink, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Diagnostic Center Login' }

// Diagnostic center admin accounts are created by the Consult Your Doctor team, after a center applies at /signup/diagnostic-centre.
export default function DiagnosticLoginPage() {
  return (
    <StaffLoginCard
      role="diagnostic_admin"
      panel={{
        eyebrow: 'Diagnostic centre portal',
        title: 'Your lab, in one place',
        lead: 'Take day-wise bookings, keep your test menu up to date and send reports to patients.',
        points: ['Day-wise bookings and walk-ins', 'Your test menu', "Reports sent to each patient's account"],
        art: ART.lab,
      }}
      title="Diagnostic centre login"
      description="For authorised diagnostic centre administrators. Use the Center Admin ID issued for your lab."
      idLabel="Center Admin ID"
      footer={<>Want to list your diagnostic centre?<FooterLink href="/signup/diagnostic-centre">Apply to join our network</FooterLink></>}
    />
  )
}
