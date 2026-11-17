import type { Metadata } from 'next'
import { AuthCorner } from '../AuthShell'
import { FooterLine, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Diagnostic Center Login' }

// Diagnostic center admin accounts are created by the Consult Your Doctor team, after a center applies at /signup/diagnostic-centre.
export default function DiagnosticLoginPage() {
  return (
    <StaffLoginCard
      role="diagnostic_admin"
      art="lab"
      title="Lab login"
      subtitle="Enter your Centre Admin ID and password to continue"
      corner={<AuthCorner lead="Not a partner yet?" label="Register your centre" href="/signup/diagnostic-centre" />}
      idLabel="Centre Admin ID or work email"
      idHelp="Your Centre Admin ID is in the welcome email from our team."
      footer={
        <>
          <FooterLine lead="Booking a test?" href="/login/patient">
            Patient login
          </FooterLine>
          <FooterLine lead="Trouble signing in?" href="/contact">
            Contact our team
          </FooterLine>
        </>
      }
    />
  )
}
