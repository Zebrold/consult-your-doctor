import type { Metadata } from 'next'
import { AuthCorner } from '../AuthShell'
import { FooterLine, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Doctor Login' }

export default function DoctorLoginPage() {
  return (
    <StaffLoginCard
      role="doctor"
      panel={{
        title: 'Your practice, in one place',
        lead: 'The doctor portal for verified medical practitioners on Consult your Doctor.',
        points: [
          { title: 'Your schedule and waiting room', text: "See today's appointments, walk-ins and who has checked in." },
          { title: 'Signed digital prescriptions', text: "Write it on screen with your signature. It reaches the patient's account." },
          { title: 'Patient history and latest vitals', text: 'Earlier visits, notes and vitals for every patient.' },
          { title: 'Your inpatients', text: 'Patients admitted under you, with ward and bed, updated live.' },
          { title: 'Your public profile', text: 'Education, insurance accepted and reviews from your patients.' },
        ],
        art: 'doctor',
      }}
      corner={<AuthCorner lead="New practitioner?" label="Apply to join" href="/signup/doctor" />}
      title="Sign in to the doctor portal"
      description="For verified medical practitioners."
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
