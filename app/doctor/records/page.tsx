import { redirect } from 'next/navigation'

// Notes and prescriptions are now shown per patient on the Patients tab.
export default function DoctorRecordsRedirect() {
  redirect('/doctor/patients')
}
