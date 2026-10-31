import { createAdminClient } from '@/lib/supabase/admin'

// Attempt limits for sign-in and public forms (staff and Patient ID passwords, password resets, desk codes, support
// tickets, doctor applications). These calls reach Supabase from the server, so Supabase's own per-address limits count
// the server, not the visitor; without a limit here, passwords could be guessed as fast as requests can be sent.
//
// The counts live in the rate_limit_hits table (supabase/migrations/20261031_audit_fixes.sql), so every server instance
// shares them. Until that table exists, each instance counts in its own memory, which slows a guesser down rather than
// stopping one outright.

const TABLE = 'rate_limit_hits'
const hits = new Map<string, number[]>()
let warnedMissing = false

function prune(now: number) {
  if (hits.size < 10_000) return
  for (const [key, times] of hits) if (times.every((t) => now - t > 60 * 60_000)) hits.delete(key)
}

function memoryOverLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  prune(now)
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  recent.push(now)
  hits.set(key, recent)
  return recent.length > limit
}

const missingTable = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205' || /rate_limit_hits/.test(error.message ?? ''))

/**
 * Records one attempt under `key`; true when there have been more than `limit` in the last `windowMs`. Attempts over
 * the limit are still recorded, so continuing to guess keeps the window closed.
 */
export async function overLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const since = new Date(Date.now() - windowMs).toISOString()
    const { count, error: countError } = await admin.from(TABLE).select('id', { count: 'exact', head: true }).eq('key', key).gte('created_at', since)
    if (countError) throw countError
    const { error: insertError } = await admin.from(TABLE).insert({ key })
    if (insertError) throw insertError
    // Old rows are only needed for the windows above; clear them now and then.
    if (Math.random() < 0.02) {
      void admin.from(TABLE).delete().lt('created_at', new Date(Date.now() - 24 * 60 * 60_000).toISOString()).then(() => undefined, () => undefined)
    }
    return (count ?? 0) + 1 > limit
  } catch (err) {
    const error = err as { code?: string; message?: string }
    if (missingTable(error) && !warnedMissing) {
      warnedMissing = true
      console.error('[rate-limit] Table rate_limit_hits is missing: limits count per instance. Run supabase/migrations/20261031_audit_fixes.sql.')
    } else if (!missingTable(error)) {
      console.error('[rate-limit] could not record an attempt, counting in memory instead:', error)
    }
    return memoryOverLimit(key, limit, windowMs)
  }
}

/** Forgets the attempts under `key` (after a successful sign-in). */
export async function clearAttempts(key: string) {
  hits.delete(key)
  try {
    await createAdminClient().from(TABLE).delete().eq('key', key)
  } catch {
    // The memory count is cleared above; a stale database row only keeps the window closed a little longer.
  }
}
