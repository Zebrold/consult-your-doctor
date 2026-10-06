import type { Metadata } from 'next'
import { Hospital } from 'lucide-react'
import { FooterLink, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Hospital Sign In' }

// Hospital admin accounts are created by the Consult Your Doctor team.
export default function HospitalLoginPage() {
  return (
    <StaffLoginCard
      role="hospital_admin"
      badge={<><Hospital /> Facility Access</>}
      title="Hospital Portal Sign In"
      description="Restricted to authorized hospital administrators. Sign in with the Staff ID issued for your hospital's account."
      submitLabel="Sign In to Hospital Portal"
      footer={<>Want to list your hospital?<FooterLink href="/contact">Contact our team</FooterLink></>}
    />
  )
}
