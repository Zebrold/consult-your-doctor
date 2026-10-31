import type { Metadata } from 'next'
import { ART } from '../AuthShell'
import { FooterLink, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Doctor Login' }

export default function DoctorLoginPage() {
  return (
    <StaffLoginCard
      role="doctor"
      panel={{
        eyebrow: 'Doctor portal',
        title: 'Your practice, in one place',
        lead: 'See your schedule, check patients in and write prescriptions that reach their account.',
        points: ['Your schedule and waiting room', 'Signed digital prescriptions', 'Patient history and latest vitals'],
        art: ART.doctor,
      }}
      title="Doctor login"
      description="For verified medical practitioners. Use the Staff ID issued after your credentials were approved."
      footer={<>New practitioner?<FooterLink href="/signup/doctor">Apply to join our network</FooterLink></>}
    />
  )
}
