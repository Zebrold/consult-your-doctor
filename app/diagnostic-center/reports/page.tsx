import { redirect } from 'next/navigation'

// Reports are uploaded from the Patients page now.
export default function DiagnosticReportsPage() {
  redirect('/diagnostic-center/patients?status=collected')
}
