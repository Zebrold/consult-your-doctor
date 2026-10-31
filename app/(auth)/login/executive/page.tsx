import type { Metadata } from 'next'
import { ART } from '../AuthShell'
import { FooterLink, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Executive Login' }

// Executive accounts are created by the Consult Your Doctor team.
export default function ExecutiveLoginPage() {
  return (
    <StaffLoginCard
      role="executive"
      panel={{
        eyebrow: 'Executive portal',
        title: 'Your front desk, in one place',
        lead: 'Help patients with their bookings and keep the desk running smoothly.',
        points: ['Patients and their bookings', 'Doctors and hospitals', 'Lab bookings'],
        art: ART.hospital,
      }}
      title="Executive login"
      description="For front-desk executives and patient care coordinators. Use the Staff ID issued for your account."
      footer={<>Need an executive account?<FooterLink href="/contact">Contact our team</FooterLink></>}
    />
  )
}
