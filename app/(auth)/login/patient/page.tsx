import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { PatientAuthForm } from './PatientAuthForm'

export const metadata: Metadata = {
  title: 'Sign In or Create an Account',
}

// Show the Google button only when the provider is enabled in Supabase; otherwise it would lead to an error page.
async function isGoogleSignInEnabled() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return false

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return false
    const settings = await res.json()
    return Boolean(settings?.external?.google)
  } catch {
    return false
  }
}

export default async function PatientLoginPage() {
  const googleEnabled = await isGoogleSignInEnabled()

  return (
    <Suspense fallback={<Loader2 className="w-8 h-8 text-vibrant-blue animate-spin" />}>
      <PatientAuthForm googleEnabled={googleEnabled} />
    </Suspense>
  )
}
