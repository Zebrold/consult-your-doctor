import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { PatientAuthForm } from './PatientAuthForm'

export const metadata: Metadata = {
  title: 'Sign In or Create an Account',
}


export default function PatientLoginPage() {
  return (
    <Suspense fallback={<Loader2 className="w-8 h-8 text-vibrant-blue animate-spin" />}>
      <PatientAuthForm googleEnabled={true} />
    </Suspense>
  )
}

