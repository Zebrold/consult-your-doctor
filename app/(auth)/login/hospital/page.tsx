import type { Metadata } from 'next'
import { ART } from '../AuthShell'
import { FooterLink, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Hospital Login' }

// Hospital admin accounts are created by the Consult Your Doctor team, after a hospital applies at /signup/hospital.
export default function HospitalLoginPage() {
  return (
    <StaffLoginCard
      role="hospital_admin"
      panel={{
        eyebrow: 'Hospital portal',
        title: 'Your hospital, in one place',
        lead: "Run your OPD, publish your doctors' slots and manage the desk and beds.",
        points: ["Doctors' slots and duty roster", 'Patient check-in at the desk', 'Inpatient beds'],
        art: ART.hospital,
      }}
      title="Hospital login"
      description="For authorised hospital administrators. Use the Staff ID issued for your hospital's account."
      footer={<>Want to list your hospital?<FooterLink href="/signup/hospital">Apply to join our network</FooterLink></>}
    />
  )
}
