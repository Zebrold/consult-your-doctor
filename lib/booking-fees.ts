import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_BOOKING_FEES, bookedTestsFor, labBookingFee, onlinePayable, type BookingFees } from '@/lib/pricing'
import { appointmentBookingFee } from '@/lib/wallet'

// The booking fees executives set on Payments, kept in platform_settings (supabase/migrations/20261018_booking_fees.sql).
// Every page, the Razorpay order and the payment callback read them from here, so the fee a patient is shown is the fee Razorpay
// collects and the fee the callback checks.

export const BOOKING_FEES_TAG = 'booking-fees'
const SETTING_KEY = 'booking_fees'

export const MAX_CONSULTATION_BOOKING_FEE = 10_000
export const validConsultationBookingFee = (n: number) => Number.isInteger(n) && n >= 0 && n <= MAX_CONSULTATION_BOOKING_FEE
export const validDiagnosticPercent = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100 && Math.round(n * 100) === n * 100

/** The payment convenience fee: a per cent of the booking fee, at most 20%. */
export const MAX_CONVENIENCE_PERCENT = 20
export const validConveniencePercent = (n: number) => validDiagnosticPercent(n) && n <= MAX_CONVENIENCE_PERCENT

/**
 * The fees in a stored value, or null when they aren't valid. Settings saved before fast track or the convenience fee
 * existed don't have them and get the standard ones.
 */
function parseBookingFees(value: unknown): BookingFees | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const consultation = Number(v.consultation)
  const fastTrack = v.fastTrack == null ? DEFAULT_BOOKING_FEES.fastTrack : Number(v.fastTrack)
  const diagnosticPercent = Number(v.diagnosticPercent)
  const conveniencePercent = v.conveniencePercent == null ? DEFAULT_BOOKING_FEES.conveniencePercent : Number(v.conveniencePercent)
  return validConsultationBookingFee(consultation) && validConsultationBookingFee(fastTrack) && validDiagnosticPercent(diagnosticPercent) && validConveniencePercent(conveniencePercent)
    ? { consultation, fastTrack, diagnosticPercent, conveniencePercent }
    : null
}

// 42P01 / PGRST205: the platform_settings table hasn't been created yet.
const missingTable = (error: { code?: string } | null) => ['42P01', 'PGRST205'].includes(error?.code ?? '')

// Caches the stored value as it is and parses it on the way out, so an entry cached before a fee was added (the data
// cache outlives deploys) still gets that fee's default instead of coming back without it.
const readStoredFees = unstable_cache(
  async (): Promise<unknown> => {
    const { data, error } = await createAdminClient().from('platform_settings').select('value').eq('key', SETTING_KEY).maybeSingle()
    // Throwing keeps a failed read out of the cache, so the next request asks the database again.
    if (error && !missingTable(error)) throw new Error(`booking fees: ${error.message}`)
    return data?.value ?? null
  },
  ['booking-fees'],
  { tags: [BOOKING_FEES_TAG], revalidate: 3600 },
)

/** The live booking fees. Throws when the database can't be read, so a payment never starts on a guessed amount. */
export async function loadBookingFees(): Promise<BookingFees> {
  return parseBookingFees(await readStoredFees()) ?? DEFAULT_BOOKING_FEES
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
  /** `amount` is what is collected online: the booking fee and the payment convenience fee on it. */
  | { amount: number; bookingFee: number; convenience: number; patientId: string; status: string }
  | { error: string; status: number }

const charged = (bookingFee: number, fees: BookingFees) => {
  const payable = onlinePayable(bookingFee, fees.conveniencePercent)
  return { amount: payable.total, bookingFee: payable.bookingFee, convenience: payable.convenience }
}

/**
 * What is collected online (through Razorpay) for a booking: the doctor booking fee (general or fast track), or the lab booking fee on the tests
 * booked, plus the payment convenience fee on it. It is worked out from the booking itself, never taken from the
 * browser. The consultation fee, hospital services, the test prices and any home-collection fee are paid at the hospital
 * or lab and are never added.
 */
export async function onlineChargeFor(db: SupabaseClient, product: string, id: string, fees: BookingFees): Promise<OnlineCharge> {
  if (product === 'Consultation') {
    // `*` and not named columns: booking_type is missing until 20261028_fast_track_services.sql runs (lib/booking-options.ts).
    const { data } = await db.from('appointments').select('*').eq('id', id).maybeSingle()
    if (!data) return { error: 'Appointment not found.', status: 404 }
    // The fee the booking was made at (0 for a free follow-up); bookings from before it was stored use today's fee.
    return { ...charged(appointmentBookingFee(data, fees), fees), patientId: data.patient_id, status: data.status }
  }

  if (product === 'Diagnostic') {
    const { data } = await db.from('diagnostic_bookings').select('patient_id, status, test_name, diagnostic_centers ( test_prices )').eq('id', id).maybeSingle()
    if (!data) return { error: 'Booking not found.', status: 404 }
    const center = one(data.diagnostic_centers as Joined<{ test_prices: Record<string, number> | null }>)
    // The prices the tests were booked at (priced_tests, from 20261031_audit_fixes.sql); older bookings match by name.
    const { data: snapshot } = await db.from('diagnostic_bookings').select('priced_tests').eq('id', id).maybeSingle()
    const tests = bookedTestsFor({ test_name: data.test_name, priced_tests: snapshot?.priced_tests }, center?.test_prices)
    if (!tests) return { error: "We couldn't price this booking. Please contact support.", status: 422 }
    return { ...charged(labBookingFee(tests, fees.diagnosticPercent), fees), patientId: data.patient_id, status: data.status }
  }

  return { error: 'Unknown product.', status: 400 }
}
