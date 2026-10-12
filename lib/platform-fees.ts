import fs from 'node:fs'
import path from 'node:path'

export type PlatformFees = {
  consultation: number
  diagnostic: number
}

export const DEFAULT_FEES: PlatformFees = {
  consultation: 49,
  diagnostic: 29,
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
      return {
        consultation: Number.isFinite(c) && c >= 0 ? c : DEFAULT_FEES.consultation,
        diagnostic: Number.isFinite(d) && d >= 0 ? d : DEFAULT_FEES.diagnostic,
      }
    }
  } catch {}
  return { ...DEFAULT_FEES }
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
      if (Number.isFinite(c) && Number.isFinite(d) && c >= 0 && d >= 0) {
        const fees = { consultation: c, diagnostic: d }
        writeLocalFees(fees)
        return fees
      }
    }
  } catch {
    // If Supabase table isn't migrated yet, seamlessly fall back to local file
  }

  return readLocalFees()
}

/**
 * Updates platform fees in both Supabase and local JSON store.
 */
export async function savePlatformFees(fees: PlatformFees): Promise<PlatformFees> {
  const clean: PlatformFees = {
    consultation: Math.max(0, Math.round(Number(fees.consultation) || 0)),
    diagnostic: Math.max(0, Math.round(Number(fees.diagnostic) || 0)),
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
