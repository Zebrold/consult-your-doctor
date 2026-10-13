import fs from 'node:fs'
import path from 'node:path'

export type PlatformFeeItem = {
  id: string
  name: string
  amount: number
  description?: string
  appliesTo?: 'consultation' | 'diagnostic' | 'custom'
}

export type PlatformFees = {
  consultation: number
  diagnostic: number
  items: PlatformFeeItem[]
  [key: string]: any
}

export const DEFAULT_FEE_ITEMS: PlatformFeeItem[] = [
  {
    id: 'consultation',
    name: 'Doctor Consultation Platform Fee',
    amount: 49,
    description: 'Added to online doctor appointments at checkout.',
    appliesTo: 'consultation',
  },
  {
    id: 'diagnostic',
    name: 'Diagnostic Lab Platform Fee',
    amount: 29,
    description: 'Added to online diagnostic lab test bookings at checkout.',
    appliesTo: 'diagnostic',
  },
]

export const DEFAULT_FEES: PlatformFees = {
  consultation: 49,
  diagnostic: 29,
  items: DEFAULT_FEE_ITEMS,
}

function getJsonFilePath(): string {
  return path.join(process.cwd(), 'lib', 'platform-fees.json')
}

export function readLocalFees(): PlatformFees {
  try {
    const file = getJsonFilePath()
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'))
      const c = Number(parsed.consultation)
      const d = Number(parsed.diagnostic)

      const items: PlatformFeeItem[] =
        Array.isArray(parsed.items)
          ? parsed.items.map((it: any) => ({
              id: String(it.id || it.key || Math.random().toString(36).substring(2, 9)),
              name: String(it.name || 'Platform Fee').trim(),
              amount: Math.max(0, Math.round(Number(it.amount) || 0)),
              description: it.description ? String(it.description).trim() : undefined,
              appliesTo: it.appliesTo || 'custom',
            }))
          : [
              {
                id: 'consultation',
                name: 'Doctor Consultation Platform Fee',
                amount: Number.isFinite(c) && c >= 0 ? c : DEFAULT_FEES.consultation,
                description: 'Added to online doctor appointments at checkout.',
                appliesTo: 'consultation',
              },
              {
                id: 'diagnostic',
                name: 'Diagnostic Lab Platform Fee',
                amount: Number.isFinite(d) && d >= 0 ? d : DEFAULT_FEES.diagnostic,
                description: 'Added to online diagnostic lab test bookings at checkout.',
                appliesTo: 'diagnostic',
              },
            ]

      const consultItems = items.filter((it) => it.appliesTo === 'consultation' || it.id === 'consultation')
      const diagItems = items.filter((it) => it.appliesTo === 'diagnostic' || it.id === 'diagnostic')

      const consultFee =
        consultItems.length > 0
          ? consultItems.reduce((sum, it) => sum + it.amount, 0)
          : (Array.isArray(parsed.items) ? 0 : (Number.isFinite(c) && c >= 0 ? c : DEFAULT_FEES.consultation))

      const diagFee =
        diagItems.length > 0
          ? diagItems.reduce((sum, it) => sum + it.amount, 0)
          : (Array.isArray(parsed.items) ? 0 : (Number.isFinite(d) && d >= 0 ? d : DEFAULT_FEES.diagnostic))

      return {
        consultation: consultFee,
        diagnostic: diagFee,
        items,
      }
    }
  } catch {}

  return {
    ...DEFAULT_FEES,
    items: DEFAULT_FEE_ITEMS.map((item) => ({ ...item })),
  }
}

export function writeLocalFees(fees: PlatformFees): void {
  try {
    const file = getJsonFilePath()
    fs.writeFileSync(file, JSON.stringify(fees, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write local platform fees:', err)
  }
}

/**
 * Loads the active platform fees. Checks Supabase platform_settings first,
 * then falls back to local JSON file, then default constants.
 */
export async function getPlatformFees(): Promise<PlatformFees> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { data } = await admin
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_fees')
      .maybeSingle()

    if (data?.value && typeof data.value === 'object') {
      const v = data.value as Record<string, unknown>
      const c = Number(v.consultation)
      const d = Number(v.diagnostic)

      const rawItems = Array.isArray(v.items) ? v.items : null
      const items: PlatformFeeItem[] =
        rawItems !== null
          ? rawItems.map((it: any) => ({
              id: String(it.id || it.key || Math.random().toString(36).substring(2, 9)),
              name: String(it.name || 'Platform Fee').trim(),
              amount: Math.max(0, Math.round(Number(it.amount) || 0)),
              description: it.description ? String(it.description).trim() : undefined,
              appliesTo: it.appliesTo || 'custom',
            }))
          : [
              {
                id: 'consultation',
                name: 'Doctor Consultation Platform Fee',
                amount: Number.isFinite(c) && c >= 0 ? c : DEFAULT_FEES.consultation,
                description: 'Added to online doctor appointments at checkout.',
                appliesTo: 'consultation',
              },
              {
                id: 'diagnostic',
                name: 'Diagnostic Lab Platform Fee',
                amount: Number.isFinite(d) && d >= 0 ? d : DEFAULT_FEES.diagnostic,
                description: 'Added to online diagnostic lab test bookings at checkout.',
                appliesTo: 'diagnostic',
              },
            ]

      const consultItems = items.filter((it) => it.appliesTo === 'consultation' || it.id === 'consultation')
      const diagItems = items.filter((it) => it.appliesTo === 'diagnostic' || it.id === 'diagnostic')

      const consultFee =
        consultItems.length > 0
          ? consultItems.reduce((sum, it) => sum + it.amount, 0)
          : (rawItems !== null ? 0 : (Number.isFinite(c) && c >= 0 ? c : DEFAULT_FEES.consultation))

      const diagFee =
        diagItems.length > 0
          ? diagItems.reduce((sum, it) => sum + it.amount, 0)
          : (rawItems !== null ? 0 : (Number.isFinite(d) && d >= 0 ? d : DEFAULT_FEES.diagnostic))

      const fees: PlatformFees = {
        consultation: consultFee,
        diagnostic: diagFee,
        items,
      }
      writeLocalFees(fees)
      return fees
    }
  } catch {
    // If Supabase table isn't migrated yet, seamlessly fall back to local file
  }

  return readLocalFees()
}

/**
 * Updates platform fees in both Supabase and local JSON store.
 */
export async function savePlatformFees(
  fees: Partial<PlatformFees> & { items?: PlatformFeeItem[] }
): Promise<PlatformFees> {
  let items: PlatformFeeItem[]

  if (Array.isArray(fees.items)) {
    items = fees.items.map((it) => ({
      id: String(
        it.id || it.name?.toLowerCase().replace(/[^a-z0-9]+/g, '_') || Math.random().toString(36).substring(2, 9)
      ),
      name: String(it.name || 'Platform Fee').trim(),
      amount: Math.max(0, Math.round(Number(it.amount) || 0)),
      description: it.description ? String(it.description).trim() : undefined,
      appliesTo: (it.appliesTo as 'consultation' | 'diagnostic' | 'custom') || 'custom',
    }))
  } else {
    items = [
      {
        id: 'consultation',
        name: 'Doctor Consultation Platform Fee',
        amount: Math.max(0, Math.round(Number(fees.consultation) ?? DEFAULT_FEES.consultation)),
        description: 'Added to online doctor appointments at checkout.',
        appliesTo: 'consultation',
      },
      {
        id: 'diagnostic',
        name: 'Diagnostic Lab Platform Fee',
        amount: Math.max(0, Math.round(Number(fees.diagnostic) ?? DEFAULT_FEES.diagnostic)),
        description: 'Added to online diagnostic lab test bookings at checkout.',
        appliesTo: 'diagnostic',
      },
    ]
  }

  const consultItems = items.filter((it) => it.appliesTo === 'consultation' || it.id === 'consultation')
  const diagItems = items.filter((it) => it.appliesTo === 'diagnostic' || it.id === 'diagnostic')

  const consultFee =
    consultItems.length > 0
      ? consultItems.reduce((sum, it) => sum + it.amount, 0)
      : (fees.items ? 0 : Math.max(0, Math.round(Number(fees.consultation) || 0)))

  const diagFee =
    diagItems.length > 0
      ? diagItems.reduce((sum, it) => sum + it.amount, 0)
      : (fees.items ? 0 : Math.max(0, Math.round(Number(fees.diagnostic) || 0)))

  const clean: PlatformFees = {
    consultation: consultFee,
    diagnostic: diagFee,
    items,
  }

  // 1. Write to local file for zero-latency retrieval
  writeLocalFees(clean)

  // 2. Write to Supabase if table exists
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    await admin
      .from('platform_settings')
      .upsert({
        key: 'platform_fees',
        value: clean,
        updated_at: new Date().toISOString(),
      })
  } catch (err) {
    console.warn('Note: Supabase platform_settings table not yet created; persisted to local storage.', err)
  }

  return clean
}
