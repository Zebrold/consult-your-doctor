import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCityName } from '@/lib/geo'
import { DIRECTORY_TAG } from '@/lib/public-directory'

// The cities with a live partner hospital or diagnostic centre, for the footer's "Available in" and the location
// menu's "Cities we're in". Kept as long as the other public lists and expired with them (DIRECTORY_TAG) when a
// hospital, lab or doctor is added or changed, so a city shows only while a partner is there.

export const partnerCities = unstable_cache(
  async (): Promise<string[]> => {
    const admin = createAdminClient()
    const [hospitals, labs] = await Promise.all([
      admin.from('hospitals').select('city').eq('status', 'active'),
      admin.from('diagnostic_centers').select('city').eq('status', 'active'),
    ])
    const rows = [...((hospitals.data ?? []) as { city: string | null }[]), ...((labs.data ?? []) as { city: string | null }[])]
    return Array.from(new Set(rows.map((r) => formatCityName(r.city)).filter(Boolean))).sort()
  },
  ['partner-cities'],
  { tags: [DIRECTORY_TAG], revalidate: 120 },
)
