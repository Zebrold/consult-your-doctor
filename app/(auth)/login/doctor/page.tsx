import type { Metadata } from 'next'
import { AuthCorner } from '../AuthShell'
import { FooterLine, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Doctor Login' }

export default function DoctorLoginPage() {
  return (
    <StaffLoginCard
      role="doctor"
      art="doctor"
      title="Doctor login"
      subtitle="Enter your Staff ID and password to continue"
      corner={<AuthCorner lead="New practitioner?" label="Apply to join" href="/signup/doctor" />}
      idLabel="Staff ID"
      idHelp="Issued by our team after your credentials were approved. You'll find it in your welcome email."
      footer={
        <>
          <FooterLine lead="Looking to book a visit?" href="/login/patient">
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
