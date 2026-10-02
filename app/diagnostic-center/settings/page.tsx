import { redirect } from 'next/navigation'

// Center details are edited on the Profile page now.
export default function DiagnosticSettingsPage() {
  redirect('/diagnostic-center/profile')
}
