import type { Metadata } from 'next'
import { getSessionUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadPublicHospitals } from '@/lib/public-directory'
import { BrowseSpecialities } from '@/components/home/BrowseSpecialities'
import { PatientDock } from '@/components/PatientDock'

export const metadata: Metadata = {
  title: 'Find a specialist: hospitals and doctors near you',
  description:
    'Choose a speciality, from general physicians and cardiology to dental and eye care, and see the partner hospitals near you with doctors for it. Book a visit online.',
}

// Find a specialist, where "Hospital booking" on the home page and the In-Person tab lead: every speciality, then
// partner hospitals near the patient.
export default async function SpecialitiesPage(props: { searchParams: Promise<{ q?: string | string[] }> }) {
  // Words searched elsewhere (the search boxes send what matches no suggestion here).
  const raw = (await props.searchParams).q
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 80)
  const user = await getSessionUser()
  const [profile, hospitals] = await Promise.all([
    user ? createAdminClient().from('profiles').select('role, full_name').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    loadPublicHospitals(),
  ])
  const role = profile.data?.role ?? null
  const isPatient = !!user && (!role || role === 'patient')
  const isStaff = !!user && !isPatient
  const name = isPatient ? (profile.data?.full_name ?? user?.user_metadata?.full_name ?? null) : null
  // Only hospitals with doctors on the platform can be booked.
  const bookable = hospitals.filter((h) => h.doctors > 0)
  const cities = Array.from(new Set(bookable.map((h) => h.city).filter(Boolean) as string[])).sort()

  return (
    // White under the banner on phones, as in the Find a specialist design.
    <div className="bg-white lg:bg-transparent min-h-screen">
      <BrowseSpecialities key={q} initialQuery={q} hospitals={bookable} cities={cities} />
      {!isStaff && <PatientDock activeTab="find" isSignedIn={isPatient} name={name} detail={isPatient && user ? `UHID CYD-${user.id.slice(0, 8).toUpperCase()}` : null} />}
    </div>
  )
}
