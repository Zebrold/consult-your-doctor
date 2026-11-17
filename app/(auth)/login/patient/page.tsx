import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { PatientAuthForm } from './PatientAuthForm'
import { DeskPatientAuthForm } from '../_desk/PatientAuthForm'

export const metadata: Metadata = {
  title: 'Log In or Create an Account',
}

// Phones and tablets get the login design with the blue header (PatientAuthForm); desktops keep the split-screen
// login (_desk/PatientAuthForm). CSS shows one of them, so nothing jumps while the page loads.
export default function PatientLoginPage() {
  return (
    <Suspense fallback={<Loader2 className="w-8 h-8 text-vibrant-blue animate-spin" />}>
      <div className="lg:hidden">
        <PatientAuthForm googleEnabled={true} />
      </div>
      <div className="hidden lg:block">
        <DeskPatientAuthForm googleEnabled={true} />
      </div>
    </Suspense>
  )
}
