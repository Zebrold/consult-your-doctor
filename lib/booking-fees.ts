import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_BOOKING_FEES, labBookingFee, matchBookedTests, type BookingFees } from '@/lib/pricing'

// The booking fees executives set on Payments, kept in platform_settings (supabase/migrations/20261018_booking_fees.sql).
// Every page, the PayU hash and the PayU callback read them from here, so the fee a patient is shown is the fee PayU
// collects and the fee the callback checks.

export const BOOKING_FEES_TAG = 'booking-fees'
const SETTING_KEY = 'booking_fees'

export const MAX_CONSULTATION_BOOKING_FEE = 10_000
export const validConsultationBookingFee = (n: number) => Number.isInteger(n) && n >= 0 && n <= MAX_CONSULTATION_BOOKING_FEE
export const validDiagnosticPercent = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100 && Math.round(n * 100) === n * 100

/** The fees in a stored value, or null when it isn't a valid pair. */
function parseBookingFees(value: unknown): BookingFees | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const consultation = Number(v.consultation)
  const diagnosticPercent = Number(v.diagnosticPercent)
  return validConsultationBookingFee(consultation) && validDiagnosticPercent(diagnosticPercent) ? { consultation, diagnosticPercent } : null
}

// 42P01 / PGRST205: the platform_settings table hasn't been created yet.
const missingTable = (error: { code?: string } | null) => ['42P01', 'PGRST205'].includes(error?.code ?? '')

const readStoredFees = unstable_cache(
  async (): Promise<BookingFees | null> => {
    const { data, error } = await createAdminClient().from('platform_settings').select('value').eq('key', SETTING_KEY).maybeSingle()
    // Throwing keeps a failed read out of the cache, so the next request asks the database again.
    if (error && !missingTable(error)) throw new Error(`booking fees: ${error.message}`)
    return parseBookingFees(data?.value)
  },
  ['booking-fees'],
  { tags: [BOOKING_FEES_TAG], revalidate: 3600 },
)

/** The live booking fees. Throws when the database can't be read, so a payment never starts on a guessed amount. */
export async function loadBookingFees(): Promise<BookingFees> {
  return (await readStoredFees()) ?? DEFAULT_BOOKING_FEES
}

/** The live booking fees for display, falling back to the standard fees if the database can't be read. */
export async function getBookingFees(): Promise<BookingFees> {
  try {
    return await loadBookingFees()
  } catch (err) {
    console.error(err)
    return DEFAULT_BOOKING_FEES
  }
}

/** Stores new fees. The caller checks the executive role and then expires BOOKING_FEES_TAG. */
export async function saveBookingFees(fees: BookingFees): Promise<void> {
  const { error } = await createAdminClient()
    .from('platform_settings')
    .upsert({ key: SETTING_KEY, value: fees, updated_at: new Date().toISOString() })
  if (missingTable(error)) throw new Error('The database needs an update first: run supabase/migrations/20261018_booking_fees.sql.')
  if (error) throw new Error(error.message)
}

export type OnlineProduct = 'Consultation' | 'Diagnostic'

type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

export type OnlineCharge =
  | { amount: number; patientId: string; status: string }
  | { error: string; status: number }

/**
 * What PayU collects for a booking: the doctor booking fee, or the lab booking fee on the tests booked. It is worked out
 * from the booking itself, never taken from the browser. The consultation fee, the test prices and any home-collection
 * fee are paid at the hospital or lab and are never added.
 */
export async function onlineChargeFor(db: SupabaseClient, product: string, id: string, fees: BookingFees): Promise<OnlineCharge> {
  if (product === 'Consultation') {
    const { data } = await db.from('appointments').select('patient_id, status').eq('id', id).maybeSingle()
    if (!data) return { error: 'Appointment not found.', status: 404 }
    return { amount: fees.consultation, patientId: data.patient_id, status: data.status }
  }

  if (product === 'Diagnostic') {
    const { data } = await db.from('diagnostic_bookings').select('patient_id, status, test_name, diagnostic_centers ( test_prices )').eq('id', id).maybeSingle()
    if (!data) return { error: 'Booking not found.', status: 404 }
    const center = one(data.diagnostic_centers as Joined<{ test_prices: Record<string, number> | null }>)
    const tests = matchBookedTests(data.test_name || '', center?.test_prices)
    if (!tests) return { error: "We couldn't price this booking. Please contact support.", status: 422 }
    return { amount: labBookingFee(tests, fees.diagnosticPercent), patientId: data.patient_id, status: data.status }
  }

  return { error: 'Unknown product.', status: 400 }
}
