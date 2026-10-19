/**
 * What Consult Your Doctor charges online: a flat booking fee for a doctor, and a share of the lab's test prices for
 * lab tests. The doctor's consultation fee is paid at the hospital counter, and the tests (and any home collection)
 * at the lab, so neither is ever part of an online payment. Executives set both on Payments (lib/booking-fees.ts).
 */
export type BookingFees = {
  /** Rupees per doctor booking. */
  consultation: number
  /** Per cent of the lab's price for each booked test. */
  diagnosticPercent: number
}

export const DEFAULT_BOOKING_FEES: BookingFees = { consultation: 119, diagnosticPercent: 11 }

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
