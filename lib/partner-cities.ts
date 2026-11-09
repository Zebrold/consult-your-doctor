import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCityName } from '@/lib/geo'

// The cities with a live partner hospital or diagnostic centre, for the footer's "Available in" (the same cities the
// home page offers). Cached for an hour, so the footer doesn't cost a query on every page.

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
  { revalidate: 3600 },
)
