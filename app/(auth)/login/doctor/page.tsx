import type { Metadata } from 'next'
import { Stethoscope } from 'lucide-react'
import { FooterLink, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Doctor Login' }

export default function DoctorLoginPage() {
  return (
    <StaffLoginCard
      role="doctor"
      badge={<><Stethoscope /> Clinician Access</>}
      title="Clinical Portal Login"
      description="Restricted to verified medical practitioners. Log in with the Staff ID issued after your credentials were approved."
      submitLabel="Log In to Clinical Portal"
      footer={<>New practitioner?<FooterLink href="/signup/doctor">Apply to join our network</FooterLink></>}
    />
  )
}
