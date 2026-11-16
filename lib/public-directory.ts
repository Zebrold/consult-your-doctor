import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadHospitals } from '@/components/home/data'
import type { HomeHospital } from '@/components/home/types'
import { loadAvailability, type Availability } from '@/components/patient/data'

// The lists every visitor sees the same way, kept for a short while across requests and server instances instead of
// read from the database on every page view: the partner hospitals, the doctors, their open slots and ratings, and the
// partner labs. The home page, Find, the speciality pages and the doctor directory all draw on them, and before this
// each of those pages read them again in three or four rounds one after another.
//
// They are read with the public key and no session, so they hold only what a visitor may see. Bookings never rely on
// them: the booking pages and actions read the doctor, slot and pause state themselves.
//
// Actions that change what these lists show (a hospital's profile, pausing a doctor, a lab's details, a published
// review) expire DIRECTORY_TAG; anything else shows within REVALIDATE seconds. A failed read throws inside the cache,
// so it is never kept, and the exported loaders then return an empty list for that one request, as before.

export const DIRECTORY_TAG = 'public-directory'
const REVALIDATE = 120
/** Open slots change with every booking, so they are kept for a shorter time. */
const SLOTS_REVALIDATE = 60

const publicClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

async function orElse<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read()
  } catch (err) {
    console.error(err)
    return fallback
  }
}

const cachedHospitals = unstable_cache(async () => loadHospitals(publicClient(), { strict: true }), ['public-hospitals-v1'], {
  tags: [DIRECTORY_TAG],
  revalidate: REVALIDATE,
})

/** Every active partner hospital (loadHospitals), photos first. */
export const loadPublicHospitals = (): Promise<HomeHospital[]> => orElse(cachedHospitals, [])

const cachedAvailability = unstable_cache(async () => loadAvailability(publicClient(), Date.now(), undefined, { strict: true }), ['public-availability-v1'], {
  tags: [DIRECTORY_TAG],
  revalidate: SLOTS_REVALIDATE,
})

/** Each doctor's next open slot and how many are left today, as of when the list was read. */
export const loadPublicAvailability = (): Promise<Record<string, Availability>> => orElse(cachedAvailability, {})

export type PublicDoctorRow = {
  id: string
  specialty: string | null
  experience_years: number | null
  consultation_fee: number | null
  image_url: string | null
  qualifications: string | null
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
  hospitals: { id: string; name: string; city: string | null; address: string | null } | { id: string; name: string; city: string | null; address: string | null }[] | null
}

const cachedDoctorRows = unstable_cache(
  async (): Promise<PublicDoctorRow[]> => {
    const { data, error } = await publicClient()
      .from('doctors')
      .select(`
        id, specialty, experience_years, consultation_fee, image_url, qualifications,
        profiles!doctors_profile_id_fkey ( full_name ),
        hospitals ( id, name, city, address )
      `)
    if (error) throw new Error(`doctors list: ${error.message}`)
    return (data ?? []) as unknown as PublicDoctorRow[]
  },
  ['public-doctors-v1'],
  { tags: [DIRECTORY_TAG], revalidate: REVALIDATE },
)

/** Every doctor with their name and hospital, for the home page and Find. Paused doctors are left to the caller. */
export const loadPublicDoctorRows = (): Promise<PublicDoctorRow[]> => orElse(cachedDoctorRows, [])

const cachedDoctorRatings = unstable_cache(
  async (ids: string[]): Promise<Record<string, { sum: number; count: number }>> => {
    const { data, error } = await createAdminClient().from('doctor_reviews').select('doctor_id, rating').in('doctor_id', ids).eq('is_published', true)
    if (error) throw new Error(`doctor ratings: ${error.message}`)
    const out: Record<string, { sum: number; count: number }> = {}
    for (const r of (data ?? []) as { doctor_id: string; rating: number }[]) {
      const entry = (out[r.doctor_id] ??= { sum: 0, count: 0 })
      entry.sum += Number(r.rating) || 0
      entry.count++
    }
    return out
  },
  ['public-doctor-ratings-v1'],
  { tags: [DIRECTORY_TAG], revalidate: REVALIDATE },
)

/** Published patient ratings of these doctors: the average and how many, by doctor id (none for doctors without any). */
export async function loadDoctorRatings(ids: string[]): Promise<Map<string, { rating: number; count: number }>> {
  const result = new Map<string, { rating: number; count: number }>()
  if (ids.length === 0) return result
  // Sorted, so the same doctors make the same cache entry whatever order they come in.
  const rows = await orElse(() => cachedDoctorRatings([...new Set(ids)].sort()), {})
  for (const [id, { sum, count }] of Object.entries(rows)) if (count) result.set(id, { rating: sum / count, count })
  return result
}

export type PublicLabRow = {
  id: string
  name: string
  city: string | null
  address: string | null
  image_url: string | null
  test_prices: Record<string, unknown> | null
  latitude?: unknown
  longitude?: unknown
}

const cachedLabs = unstable_cache(
  async (): Promise<PublicLabRow[]> => {
    const supabase = publicClient()
    // Map pins come from a later migration; without them the labs still list.
    const withPins = await supabase.from('diagnostic_centers').select('id, name, city, address, image_url, test_prices, latitude, longitude').eq('status', 'active')
    const res = withPins.error ? await supabase.from('diagnostic_centers').select('id, name, city, address, image_url, test_prices').eq('status', 'active') : withPins
    if (res.error) throw new Error(`labs list: ${res.error.message}`)
    return (res.data ?? []) as PublicLabRow[]
  },
  ['public-labs-v1'],
  { tags: [DIRECTORY_TAG], revalidate: REVALIDATE },
)

/** Every active partner lab with its tests and map pin. */
export const loadPublicLabs = (): Promise<PublicLabRow[]> => orElse(cachedLabs, [])
