import type { Metadata } from 'next'
import { AuthCorner } from '../AuthShell'
import { FooterLine, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Diagnostic Center Login' }

// Diagnostic center admin accounts are created by the Consult Your Doctor team, after a center applies at /signup/diagnostic-centre.
export default function DiagnosticLoginPage() {
  return (
    <StaffLoginCard
      role="diagnostic_admin"
      panel={{
        title: 'Your lab, in one place',
        lead: 'The diagnostic portal for partner labs and imaging centres.',
        points: [
          { title: 'Test bookings by day', text: 'Every booked test with its day, patient and payment.' },
          { title: 'Walk-in and phone patients', text: 'Book them straight in with Direct Patient Fast Booking.' },
          { title: 'Reports straight to patients', text: "Upload a report and it appears in the patient's account." },
          { title: 'Test menu and prices', text: 'Keep your tests and prices up to date. Priced tests can be booked online.' },
          { title: 'Test-wise amounts', text: "Each test's bookings and amount, this month and overall." },
        ],
        art: 'lab',
      }}
      corner={<AuthCorner lead="Not a partner yet?" label="Register your centre" href="/signup/diagnostic-centre" />}
      title="Sign in to the diagnostic portal"
      description="For staff at partner labs and imaging centres."
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
