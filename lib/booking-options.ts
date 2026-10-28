import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Fast track and hospital services on doctor bookings live in two appointment columns, booking_type and services
// (supabase/migrations/20261028_fast_track_services.sql). Until the migration runs, every booking is general and the
// hospital page doesn't offer either choice. Pages that show them read appointments with `*` (a narrow table), so a
// database without the columns just returns rows without them.

const probe = unstable_cache(
  async () => {
    const { error } = await createAdminClient().from('appointments').select('booking_type, services').limit(1)
    // Throwing keeps "not yet" out of the cache, so pages offer the choices as soon as the migration runs.
    if (error) throw new Error(error.message)
    return true
  },
  ['booking-options'],
  { revalidate: 86400 },
)

/** True once bookings can store fast track and hospital services. */
export async function bookingOptionsReady(): Promise<boolean> {
  try {
    return await probe()
  } catch {
    return false
  }
}
