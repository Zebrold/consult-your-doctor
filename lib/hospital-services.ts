import { testList, type BookedTest } from '@/lib/pricing'

// A hospital's services and charges: the tests, scans and procedures patients can add when they book a doctor, paid at
// the hospital. Names and prices live in hospitals.available_tests / test_prices (what bookings read); the description,
// department, type and whether patients see each one live in hospitals.service_details
// (supabase/migrations/20261103_hospital_services.sql).

export const SERVICE_TYPES = ['Test', 'Scan', 'Lab test', 'Procedure'] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

export type HospitalService = {
  name: string
  /** Rupees, paid at the hospital; null for a service without a valid price yet. */
  price: number | null
  description: string | null
  department: string | null
  type: ServiceType | null
  /** On the hospital page and offered when booking. */
  shown: boolean
}

type Detail = { description?: unknown; department?: unknown; type?: unknown; hidden?: unknown }
type HospitalRow = { available_tests?: unknown; test_prices?: unknown; service_details?: unknown }

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ').slice(0, max) : null)
const isType = (v: unknown): v is ServiceType => SERVICE_TYPES.includes(v as ServiceType)

/** The stored details by service name; anything malformed is ignored. */
export function serviceDetails(value: unknown): Record<string, Detail> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, Detail>) : {}
}

/** Every service the hospital lists, in its own order, with what the Services & charges page shows. */
export function hospitalServices(row: HospitalRow | null | undefined): HospitalService[] {
  const order = Array.isArray(row?.available_tests) ? (row.available_tests as unknown[]).filter((t): t is string => typeof t === 'string' && !!t.trim()) : []
  const prices = row?.test_prices && typeof row.test_prices === 'object' ? (row.test_prices as Record<string, number | string>) : null
  const details = serviceDetails(row?.service_details)
  return testList(order, prices).map(({ name, price }) => {
    const d = details[name] ?? {}
    return {
      name,
      price: price != null && price > 0 ? price : null,
      description: text(d.description, 160),
      department: text(d.department, 60),
      type: isType(d.type) ? d.type : null,
      shown: d.hidden !== true,
    }
  })
}

/** What patients see and can book: the priced services the hospital shows, as name and price. */
export function patientServices(row: HospitalRow | null | undefined): BookedTest[] {
  return hospitalServices(row)
    .filter((s): s is HospitalService & { price: number } => s.shown && s.price != null)
    .map((s) => ({ name: s.name, price: s.price }))
}
