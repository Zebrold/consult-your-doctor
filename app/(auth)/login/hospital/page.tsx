import type { Metadata } from 'next'
import { AuthCorner } from '../AuthShell'
import { FooterLine, StaffLoginCard } from '../StaffLoginCard'
import { AuthCorner as DeskAuthCorner } from '../_desk/AuthShell'
import { DeskStaffLoginCard, FooterLine as DeskFooterLine } from '../_desk/StaffLoginCard'

export const metadata: Metadata = { title: 'Hospital Login' }

// Hospital admin accounts are created by the Consult Your Doctor team, after a hospital applies at /signup/hospital.
// Phones and tablets get the login design with the blue header; desktops keep the split-screen login (_desk).
export default function HospitalLoginPage() {
  return (
    <>
      <div className="lg:hidden">
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
      </div>
      <div className="hidden lg:block">
        <DeskStaffLoginCard
          role="hospital_admin"
          panel={{
            title: 'Your hospital, in one place',
            lead: 'The hospital portal for the admin and front desk team at partner hospitals.',
            points: [
              { title: 'Live patient queue', text: 'Online bookings, walk-ins and fast track in one list.' },
              { title: 'Doctors and slots', text: "Publish each doctor's slots and set their consultation fee." },
              { title: 'Beds and admissions', text: 'Add wards and beds, then admit, move and discharge patients.' },
              { title: 'Desk registration', text: 'Register walk-ins with a one-time code and take UPI or cash.' },
              { title: 'Earnings and payouts', text: 'Your share of every booking, withdrawn to your bank or UPI.' },
            ],
            art: 'hospital',
          }}
          corner={<DeskAuthCorner lead="Not a partner yet?" label="Register your hospital" href="/signup/hospital" />}
          title="Sign in to the hospital portal"
          description="For the admin and front desk team at partner hospitals."
          idLabel="Staff ID or work email"
          idHelp="Your Staff ID is in the welcome email from our team."
          footer={
            <>
              <DeskFooterLine lead="Booking an appointment?" href="/login/patient">
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
