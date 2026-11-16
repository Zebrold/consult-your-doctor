import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { HospitalPageView, type HospitalPageQuery } from './HospitalPageView'

export const revalidate = 0

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const params = await props.params
  const id = params.id
  const supabase = await createClient()

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('name, city, address')
    .eq('id', id)
    .single()

  if (!hospital) {
    return { title: 'Hospital Not Found | Consult Your Doctor' }
  }

  return {
    title: `${hospital.name} in ${hospital.city} | Consult Your Doctor`,
    description: `Book consultations at ${hospital.name} located at ${[hospital.address, hospital.city].filter(Boolean).join(', ')}. View affiliated doctors and specialties.`,
  }
}

export default async function HospitalProfilePage(props: { params: Promise<{ id: string }>; searchParams?: Promise<HospitalPageQuery> }) {
  const { id } = await props.params
  const query = (await props.searchParams) ?? {}
  return <HospitalPageView id={id} query={query} />
}
