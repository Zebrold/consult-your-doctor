import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { loadHospitals } from '@/components/home/data'
import { findSpeciality, isOf } from '@/components/home/specialities'
import { SpecialityHospitals, type SpecialityHospital } from '@/components/home/SpecialityHospitals'
import { PatientDock } from '@/components/PatientDock'

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const speciality = findSpeciality((await props.params).slug)
  if (!speciality) return { title: 'Speciality not found' }
  return {
    title: `${speciality.name} hospitals and doctors`,
    description: `${speciality.desc} Find partner hospitals with ${speciality.name} doctors near you and book a visit online.`,
  }
}

export default async function SpecialityPage(props: { params: Promise<{ slug: string }> }) {
  const speciality = findSpeciality((await props.params).slug)
  if (!speciality) notFound()

  const supabase = await createClient()
  const user = await getCurrentUser()
  let role: string | null = null
  let name: string | null = null
  if (user) {
    const { data } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
    role = data?.role ?? null
    name = data?.full_name ?? null
  }
  const isPatient = !!user && (!role || role === 'patient')

  const hospitals = await loadHospitals(supabase)

  // The hospitals with doctors under this speciality, and the name most of those doctors are listed under (the
  // doctors list filters by exact name).
  const byName = new Map<string, number>()
  const offering: SpecialityHospital[] = []
  for (const h of hospitals) {
    const matched = h.specialties.filter((sp) => isOf(speciality, sp.name))
    if (!matched.length) continue
    for (const sp of matched) byName.set(sp.name, (byName.get(sp.name) ?? 0) + sp.count)
    offering.push({ ...h, specialityDoctors: matched.reduce((n, sp) => n + sp.count, 0), matched: matched.map((sp) => sp.name) })
  }
  const topName = [...byName].sort((a, b) => b[1] - a[1])[0]?.[0]
  const findHref = topName ? `/find?specialty=${encodeURIComponent(topName)}` : `/find?q=${encodeURIComponent(speciality.name)}`
  const cities = Array.from(new Set(hospitals.map((h) => h.city).filter(Boolean) as string[])).sort()

  return (
    <>
      <SpecialityHospitals
        speciality={{ slug: speciality.slug, name: speciality.name, desc: speciality.desc }}
        hospitals={offering}
        cities={cities}
        findHref={findHref}
        doctorCount={[...byName.values()].reduce((a, b) => a + b, 0)}
      />
      {isPatient && <PatientDock activeTab="find" isSignedIn name={name} />}
    </>
  )
}
