/** Fees added on top of the doctor's or lab's own price at checkout. */
export const CONSULTATION_PLATFORM_FEE = 49
export const DIAGNOSTIC_PLATFORM_FEE = 29

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
