import type { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toLatLng } from '@/lib/geo'
import type { HomeHospital } from './types'

type Supabase = Awaited<ReturnType<typeof createClient>>

/** A facility that says the hospital never closes: "24/7 Emergency", "24 hours pharmacy", "Round-the-clock ICU". */
const ALWAYS_OPEN = /24\s*[x×/*]\s*7|24\s*hours?|round[\s-]the[\s-]clock/i

// Facilities (20261009_beds_reviews_profiles.sql) and map pins (20261014_facility_locations.sql) come with later
// migrations; until a database has them, the same list loads without them.
const SELECTS = [
  'id, name, city, address, image_url, facilities, latitude, longitude, doctors ( id, specialty )',
  'id, name, city, address, image_url, facilities, doctors ( id, specialty )',
  'id, name, city, address, image_url, doctors ( id, specialty )',
]

type HospitalRow = {
  id: string
  name: string
  city: string | null
  address: string | null
  image_url: string | null
  facilities?: string[] | null
  latitude?: number | null
  longitude?: number | null
  doctors: { id: string; specialty: string | null }[] | null
}

/** Every active partner hospital, those with photos first, with its doctors' specialties and published rating. */
export async function loadHospitals(supabase: Supabase): Promise<HomeHospital[]> {
  let rows: HospitalRow[] = []
  for (const select of SELECTS) {
    const { data, error } = await supabase
      .from('hospitals')
      .select(select)
      .eq('status', 'active')
      .order('image_url', { ascending: false, nullsFirst: false })
    if (!error) {
      rows = (data ?? []) as unknown as HospitalRow[]
      break
    }
  }

  // Published patient ratings. The table comes with 20261015_hospital_reviews_and_doorstep.sql; without it no
  // hospital shows a rating.
  const ratings = new Map<string, number[]>()
  if (rows.length) {
    const { data, error } = await createAdminClient()
      .from('hospital_reviews')
      .select('hospital_id, rating')
      .in('hospital_id', rows.map((h) => h.id))
      .eq('is_published', true)
    if (!error) {
      for (const r of (data ?? []) as { hospital_id: string; rating: number }[]) {
        ratings.set(r.hospital_id, [...(ratings.get(r.hospital_id) ?? []), r.rating])
      }
    }
  }

  return rows.map((h) => {
    const counts = new Map<string, number>()
    for (const d of h.doctors ?? []) {
      const name = d.specialty?.trim()
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    const facilities = (h.facilities ?? []).map((f) => f.trim()).filter(Boolean)
    const pin = toLatLng(h.latitude, h.longitude)
    const scores = ratings.get(h.id) ?? []
    return {
      id: h.id,
      name: h.name,
      city: h.city,
      address: h.address,
      image: h.image_url,
      doctors: h.doctors?.length ?? 0,
      specialties: Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      open247: facilities.some((f) => ALWAYS_OPEN.test(f)),
      facility: facilities.find((f) => !ALWAYS_OPEN.test(f)) ?? null,
      rating: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      reviewCount: scores.length,
      lat: pin?.lat ?? null,
      lng: pin?.lng ?? null,
    }
  })
}
