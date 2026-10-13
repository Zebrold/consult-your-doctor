import { headers } from 'next/headers'
import type { createAdminClient } from '@/lib/supabase/admin'

// Server-side state for patient sign-in codes (table: supabase/migrations/20261013_auth_otp_challenges.sql). The code
// itself is still sent by WhatsApp or SMS and signed with a server secret; this adds what a cookie can't: a limit on
// wrong guesses, single use, and caps on how many codes are sent.

type Admin = ReturnType<typeof createAdminClient>

const TABLE = 'auth_otp_challenges'
const MAX_GUESSES = 5
const LIMITS = { perNumber10Min: 3, perNumberDay: 10, perNetwork10Min: 10 }
const TEN_MINUTES = 10 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000

type DbError = { code?: string; message?: string } | null

/** The table hasn't been created yet: callers fall back to the signed cookie on its own. */
function missingTable(error: DbError) {
  return !!error && (error.code === '42P01' || error.code === 'PGRST205' || /auth_otp_challenges/.test(error.message ?? ''))
}

let warned = false
function warnMissing() {
  if (warned) return
  warned = true
  console.error('[otp-guard] Table auth_otp_challenges is missing: sign-in codes have no guess limit or send cap. Run supabase/migrations/20261013_auth_otp_challenges.sql.')
}

/** The visitor's address as the host reports it (Vercel sets these; they can't be supplied by the browser there). */
export async function clientIp(): Promise<string | null> {
  const h = await headers()
  return h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || null
}

const since = (ms: number) => new Date(Date.now() - ms).toISOString()

/** Whether another code may be sent to this number from this address right now. */
export async function otpSendAllowed(admin: Admin, phone: string, ip: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const count = async (column: 'phone' | 'ip', value: string, windowMs: number) => {
    const { count, error } = await admin.from(TABLE).select('id', { count: 'exact', head: true }).eq(column, value).gte('created_at', since(windowMs))
    if (missingTable(error)) {
      warnMissing()
      return 0
    }
    return count ?? 0
  }

  if ((await count('phone', phone, TEN_MINUTES)) >= LIMITS.perNumber10Min) {
    return { ok: false, error: 'Several codes have been sent to this number. Please wait 10 minutes before asking for another.' }
  }
  if ((await count('phone', phone, DAY)) >= LIMITS.perNumberDay) {
    return { ok: false, error: 'Too many codes have been sent to this number today. Please try again tomorrow, or continue with Google.' }
  }
  if (ip && (await count('ip', ip, TEN_MINUTES)) >= LIMITS.perNetwork10Min) {
    return { ok: false, error: 'Too many sign-in attempts from this network. Please wait a few minutes and try again.' }
  }
  return { ok: true }
}

/** Stores a sent code; returns its id for the cookie, or null when the table isn't set up yet. */
export async function recordOtpChallenge(admin: Admin, input: { phone: string; hash: string; expiresAt: number; ip: string | null }): Promise<string | null> {
  const { data, error } = await admin
    .from(TABLE)
    .insert({ phone: input.phone, code_hash: input.hash, expires_at: new Date(input.expiresAt).toISOString(), ip: input.ip })
    .select('id')
    .single()
  if (missingTable(error)) {
    warnMissing()
    return null
  }
  if (error) console.error('[otp-guard] could not record the code:', error)
  // Old codes are only needed for the daily cap.
  void admin.from(TABLE).delete().lt('created_at', since(2 * DAY)).then(() => undefined, () => undefined)
  return data?.id ?? null
}

export type OtpVerdict = 'valid' | 'invalid' | 'locked'

/**
 * Checks a guess against a stored code. `matches` tells whether the guess fits a code hash and expiry. Each guess
 * takes one of the code's attempts before it is checked, and the attempts filter on the update means guesses sent at
 * the same moment compete for the same attempt, so a code can never be checked more than MAX_GUESSES times.
 * Returns 'unavailable' when the table isn't set up yet.
 */
export async function checkOtpChallenge(
  admin: Admin,
  id: string,
  phone: string,
  matches: (hash: string, expiresAt: number) => boolean,
): Promise<OtpVerdict | 'unavailable'> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return 'invalid'
  const { data: row, error } = await admin.from(TABLE).select('phone, code_hash, expires_at, attempts, consumed_at').eq('id', id).maybeSingle()
  if (missingTable(error)) {
    warnMissing()
    return 'unavailable'
  }
  if (error || !row || row.phone !== phone || row.consumed_at) return 'invalid'
  const expiresAt = Date.parse(row.expires_at)
  if (!(expiresAt > Date.now())) return 'invalid'
  if (row.attempts >= MAX_GUESSES) return 'locked'

  const { data: claimed } = await admin.from(TABLE).update({ attempts: row.attempts + 1 }).eq('id', id).eq('attempts', row.attempts).select('id')
  if (!claimed?.length) return 'invalid'

  if (!matches(row.code_hash, expiresAt)) return row.attempts + 1 >= MAX_GUESSES ? 'locked' : 'invalid'

  const { data: used } = await admin.from(TABLE).update({ consumed_at: new Date().toISOString() }).eq('id', id).is('consumed_at', null).select('id')
  return used?.length ? 'valid' : 'invalid'
}

/** Whether the table exists (so a cookie without a challenge id is refused rather than trusted). */
export async function otpTableReady(admin: Admin): Promise<boolean> {
  const { error } = await admin.from(TABLE).select('id', { head: true }).limit(1)
  if (missingTable(error)) {
    warnMissing()
    return false
  }
  return true
}
