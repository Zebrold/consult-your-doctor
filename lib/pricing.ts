/**
 * What Consult Your Doctor charges online: a flat booking fee for a doctor (a higher one for fast track), and a share
 * of the lab's test prices for lab tests. The doctor's consultation fee and any hospital services are paid at the
 * hospital counter, and the tests (and any home collection) at the lab, so none of them is ever part of an online
 * payment. Executives set the fees on Payments (lib/booking-fees.ts).
 */
export type BookingFees = {
  /** Rupees per general doctor booking. */
  consultation: number
  /** Rupees per fast-track doctor booking: seen ahead of general patients once checked in. */
  fastTrack: number
  /** Per cent of the lab's price for each booked test. */
  diagnosticPercent: number
}

export const DEFAULT_BOOKING_FEES: BookingFees = { consultation: 119, fastTrack: 349, diagnosticPercent: 11 }

/** A doctor booking's type (appointments.booking_type): the normal queue, or fast track. */
export type BookingType = 'general' | 'fast_track'

export const isFastTrack = (type: unknown) => type === 'fast_track'

/** The online booking fee for a doctor booking of this type. */
export const doctorBookingFee = (fees: BookingFees, type: unknown) => (isFastTrack(type) ? fees.fastTrack : fees.consultation)

// Worked in whole paise and hundredths of a per cent, so 11% of ₹350 is exactly ₹38.50 and not a float next to it.
const testFeePaise = (price: number, percent: number) => Math.round((Math.round(price * 100) * Math.round(percent * 100)) / 10_000)

/** The booking fee for one lab test: its share of the test's price, to the paisa. */
export const labTestBookingFee = (price: number, percent: number) => testFeePaise(price, percent) / 100

/** The booking fee for a lab booking: each test's fee added up, so the lines a patient sees always sum to the charge. */
export const labBookingFee = (tests: BookedTest[], percent: number) =>
  tests.reduce((sum, t) => sum + testFeePaise(t.price, percent), 0) / 100

/** "11%" or "10.5%". */
export const formatPercent = (percent: number) => `${Number(percent.toFixed(2))}%`

/** What a patient still pays in person after paying the booking fee online, said without an amount. */
export const payAtVenueNote = (isConsultation: boolean) =>
  isConsultation
    ? 'The consultation fee is set by the hospital and paid at the hospital counter.'
    : 'The test charges are paid to the lab, not online.'

/** An amount as it is posted to PayU and signed in the hash: rupees with two decimals, e.g. "38.50". */
export const payuAmount = (amount: number) => amount.toFixed(2)

type PriceList = Record<string, number | string> | null | undefined

export type BookedTest = { name: string; price: number }

// Ignore case, spaces and dashes so "complete-blood-count" (old slug bookings) matches "Complete Blood Count".
const normalize = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '')

/** Tests a lab lists with a price, in the lab's own order. */
export function pricedTests(prices: PriceList): BookedTest[] {
  return Object.entries(prices ?? {})
    .map(([name, price]) => ({ name, price: Number(price) }))
    .filter((t) => Number.isFinite(t.price) && t.price > 0)
}

/**
 * Resolves a booking's stored test_name (one test, or several joined with ", ") against the lab's price list.
 * Test names can contain commas themselves ("Thyroid Profile (T3, T4, TSH)"), so the comma-separated pieces
 * are regrouped until every group is a test the lab prices. Returns null when the name can't be fully matched.
 */
export function matchBookedTests(testName: string, prices: PriceList): BookedTest[] | null {
  const byKey = new Map(pricedTests(prices).map((t) => [normalize(t.name), t]))
  const parts = testName.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return null

  // best[i] = a way to cover parts[0..i) with priced tests
  const best: (BookedTest[] | null)[] = [[], ...parts.map(() => null)]
  for (let end = 1; end <= parts.length; end++) {
    for (let start = end - 1; start >= 0 && !best[end]; start--) {
      const prefix = best[start]
      const test = byKey.get(normalize(parts.slice(start, end).join(',')))
      if (prefix && test) best[end] = [...prefix, test]
    }
  }
  return best[parts.length]
}

export const sumPrices = (tests: BookedTest[]) => tests.reduce((sum, t) => sum + t.price, 0)

/**
 * The tests a lab booking was made for, at the prices it was booked at (diagnostic_bookings.priced_tests, written since
 * 20261031_audit_fixes.sql). Null for older bookings and anything malformed.
 */
export function bookedTestsSnapshot(value: unknown): BookedTest[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const tests = value.map((t) => ({ name: String(t?.name ?? '').trim(), price: Number(t?.price) }))
  return tests.every((t) => t.name && Number.isFinite(t.price) && t.price > 0) ? tests : null
}

/**
 * The tests of a lab booking with their prices: the snapshot taken when it was booked, so renaming or repricing a test
 * later can't change what the patient was charged. Bookings made before the snapshot fall back to matching the name.
 */
export function bookedTestsFor(booking: { test_name: string | null; priced_tests?: unknown }, prices: PriceList): BookedTest[] | null {
  return bookedTestsSnapshot(booking.priced_tests) ?? matchBookedTests(booking.test_name || '', prices)
}

/** What a lab charges to collect samples at home when it hasn't set its own fee. */
export const DEFAULT_DOORSTEP_FEE = 100

/**
 * The lab's listed home-collection fee: its own (0 means free), or the default when it hasn't set one. The patient pays
 * it to the lab with the tests; it is never part of the online booking fee.
 */
export function labDoorstepFee(center: { doorstep_fee?: number | string | null } | null | undefined): number {
  const fee = Number(center?.doorstep_fee)
  return center?.doorstep_fee != null && Number.isFinite(fee) ? Math.max(0, Math.round(fee)) : DEFAULT_DOORSTEP_FEE
}

/**
 * The hospital services stored on a doctor booking (appointments.services), as [{ name, price }]. Anything malformed
 * is dropped, so a bad row never breaks a page.
 */
export function bookedServices(value: unknown): BookedTest[] {
  if (!Array.isArray(value)) return []
  return value
    .map((s) => ({ name: String(s?.name ?? '').trim(), price: Number(s?.price) }))
    .filter((s) => s.name && Number.isFinite(s.price) && s.price >= 0)
}

/**
 * A price list in its own order: `order` (available_tests) gives the order, `prices` (test_prices) the amounts.
 * Tests without a valid amount come back with price null.
 */
export function testList(order: string[] | null | undefined, prices: PriceList): { name: string; price: number | null }[] {
  const amounts: Record<string, number> = {}
  for (const [name, price] of Object.entries(prices ?? {})) {
    const n = Number(price)
    if (Number.isFinite(n)) amounts[name] = n
  }
  return Array.from(new Set([...(order ?? []), ...Object.keys(amounts)])).map((name) => ({ name, price: name in amounts ? amounts[name] : null }))
}
