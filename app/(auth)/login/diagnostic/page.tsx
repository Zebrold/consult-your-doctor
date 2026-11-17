import type { Metadata } from 'next'
import { AuthCorner } from '../AuthShell'
import { FooterLine, StaffLoginCard } from '../StaffLoginCard'
import { AuthCorner as DeskAuthCorner } from '../_desk/AuthShell'
import { DeskStaffLoginCard, FooterLine as DeskFooterLine } from '../_desk/StaffLoginCard'

export const metadata: Metadata = { title: 'Diagnostic Center Login' }

// Diagnostic center admin accounts are created by the Consult Your Doctor team, after a center applies at /signup/diagnostic-centre.
// Phones and tablets get the login design with the blue header; desktops keep the split-screen login (_desk).
export default function DiagnosticLoginPage() {
  return (
    <>
      <div className="lg:hidden">
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
      </div>
      <div className="hidden lg:block">
        <DeskStaffLoginCard
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
          corner={<DeskAuthCorner lead="Not a partner yet?" label="Register your centre" href="/signup/diagnostic-centre" />}
          title="Sign in to the diagnostic portal"
          description="For staff at partner labs and imaging centres."
          idLabel="Centre Admin ID or work email"
          idHelp="Your Centre Admin ID is in the welcome email from our team."
          footer={
            <>
              <DeskFooterLine lead="Booking a test?" href="/login/patient">
                Patient login
              </DeskFooterLine>
              <DeskFooterLine lead="Trouble signing in?" href="/contact">
                Contact our team
              </DeskFooterLine>
            </>
          }
        />
      </div>
    </>
  )
}
