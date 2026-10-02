import { redirect } from 'next/navigation'

// The schedule moved to its own tab.
export default function DoctorSchedulesRedirect() {
  redirect('/doctor/schedule')
}
