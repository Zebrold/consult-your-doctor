import type { Metadata } from 'next'
import { Headset } from 'lucide-react'
import { FooterLink, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Executive Login' }

// Executive accounts are created by the Consult Your Doctor team.
export default function ExecutiveLoginPage() {
  return (
    <StaffLoginCard
      role="executive"
      badge={<><Headset /> Executive Access</>}
      title="Executive Portal Login"
      description="Restricted to front-desk executives and patient care coordinators. Log in with the Staff ID issued for your account."
      submitLabel="Log In to Executive Portal"
      footer={<>Need an executive account?<FooterLink href="/contact">Contact our team</FooterLink></>}
    />
  )
}
