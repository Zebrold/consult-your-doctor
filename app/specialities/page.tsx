import type { Metadata } from 'next'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadHospitals } from '@/components/home/data'
import { BrowseSpecialities } from '@/components/home/BrowseSpecialities'
import { PatientDock } from '@/components/PatientDock'

export const metadata: Metadata = {
  title: 'Browse specialities: hospitals and doctors near you',
  description:
    'Choose a speciality, from general physicians and cardiology to dental and eye care, and see the partner hospitals near you with doctors for it. Book a visit online.',
}

// Where "Hospital booking" on the home page leads: every speciality, then partner hospitals near the patient.
export default async function SpecialitiesPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  const [profile, hospitals] = await Promise.all([
    user ? createAdminClient().from('profiles').select('role, full_name, email').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    loadHospitals(supabase),
  ])
  const role = profile.data?.role ?? null
  const isPatient = !!user && (!role || role === 'patient')
  const isStaff = !!user && !isPatient
  const name = isPatient ? (profile.data?.full_name ?? user?.user_metadata?.full_name ?? null) : null
  // Only hospitals with doctors on the platform can be booked.
  const bookable = hospitals.filter((h) => h.doctors > 0)
  const cities = Array.from(new Set(bookable.map((h) => h.city).filter(Boolean) as string[])).sort()

  return (
    <div className="bg-[#F6F8FC] lg:bg-transparent min-h-screen">
      <BrowseSpecialities isSignedIn={isPatient} name={name} email={isPatient ? (profile.data?.email ?? user?.email ?? null) : null} hospitals={bookable} cities={cities} />
      {!isStaff && <PatientDock activeTab="find" isSignedIn={isPatient} name={name} detail={isPatient && user ? `UHID CYD-${user.id.slice(0, 8).toUpperCase()}` : null} />}
    </div>
  )
}
