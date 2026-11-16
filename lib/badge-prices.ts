import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_BADGE_PRICES, validBadgePrice, type BadgePrices } from '@/lib/badges'

// The Verified badge prices the team sets on /executive/badges, kept in platform_settings under `badge_prices`. A badge
// is priced here when it is requested (app/actions/badges.ts): the amount is stored on badge_payments and the Razorpay
// order and the payment check use that stored amount, so changing a price never changes a request already made.

export const BADGE_PRICES_TAG = 'badge-prices'
const SETTING_KEY = 'badge_prices'

// 42P01 / PGRST205: the platform_settings table hasn't been created yet.
const missingTable = (error: { code?: string } | null) => ['42P01', 'PGRST205'].includes(error?.code ?? '')

/** Each price from a stored value; one that is missing or invalid gets its default. */
function parseBadgePrices(value: unknown): BadgePrices {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const pick = (subject: 'doctor' | 'hospital', plan: 'monthly' | 'yearly') => {
    const group = v[subject]
    const n = group && typeof group === 'object' ? Number((group as Record<string, unknown>)[plan]) : NaN
    return validBadgePrice(n) ? n : DEFAULT_BADGE_PRICES[subject][plan]
  }
  return {
    doctor: { monthly: pick('doctor', 'monthly'), yearly: pick('doctor', 'yearly') },
    hospital: { monthly: pick('hospital', 'monthly'), yearly: pick('hospital', 'yearly') },
  }
}

const readStored = unstable_cache(
  async (): Promise<unknown> => {
    const { data, error } = await createAdminClient().from('platform_settings').select('value').eq('key', SETTING_KEY).maybeSingle()
    // Throwing keeps a failed read out of the cache, so the next request asks the database again.
    if (error && !missingTable(error)) throw new Error(`badge prices: ${error.message}`)
    return data?.value ?? null
  },
  ['badge-prices'],
  { tags: [BADGE_PRICES_TAG], revalidate: 3600 },
)

/** The live prices. Throws when the database can't be read, so a badge is never priced on a guess. */
export async function loadBadgePrices(): Promise<BadgePrices> {
  return parseBadgePrices(await readStored())
}

/** The live prices for display, falling back to the standard ones if the database can't be read. */
export async function getBadgePrices(): Promise<BadgePrices> {
  try {
    return await loadBadgePrices()
  } catch (err) {
    console.error(err)
    return DEFAULT_BADGE_PRICES
  }
}

/** Stores new prices. The caller checks the executive role and then expires BADGE_PRICES_TAG. */
export async function saveBadgePrices(prices: BadgePrices): Promise<void> {
  const { error } = await createAdminClient().from('platform_settings').upsert({ key: SETTING_KEY, value: prices, updated_at: new Date().toISOString() })
  if (missingTable(error)) throw new Error('The database needs an update first: run supabase/migrations/20261018_booking_fees.sql.')
  if (error) throw new Error(error.message)
}
