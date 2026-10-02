import { redirect } from 'next/navigation'

// The test menu is edited on the Schedule page now.
export default function DiagnosticTestsPage() {
  redirect('/diagnostic-center/schedule#tests')
}
