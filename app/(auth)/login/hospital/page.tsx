import type { Metadata } from 'next'
import { AuthCorner } from '../AuthShell'
import { FooterLine, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Hospital Login' }

// Hospital admin accounts are created by the Consult Your Doctor team, after a hospital applies at /signup/hospital.
export default function HospitalLoginPage() {
  return (
    <StaffLoginCard
      role="hospital_admin"
      art="hospital"
      title="Hospital login"
      subtitle="Enter your Staff ID and password to continue"
      corner={<AuthCorner lead="Not a partner yet?" label="Register your hospital" href="/signup/hospital" />}
      idLabel="Staff ID or work email"
      idHelp="Your Staff ID is in the welcome email from our team."
      footer={
        <>
          <FooterLine lead="Booking an appointment?" href="/login/patient">
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
