import { createHmac, timingSafeEqual } from 'node:crypto'
import { authSecret } from '@/lib/secrets'

// Proof that a desk confirmed a patient's one-time code. Registering a patient happens over several requests (check
// the code, then book, then pay), and the browser carries the patient between them, so the patient id travels inside
// a signed token tied to the staff member and their organisation. It can't be forged, edited or used by anyone else.

const TTL_MS = 45 * 60_000
const key = () => process.env.DESK_TOKEN_SECRET || authSecret() || ''

const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest('base64url')

/**
 * `scope` names who may use it, e.g. "hospital:<hospitalId>:<staffUserId>". `created` is true only for an account the
 * desk opened in this registration; that is the only account a desk may give a new password.
 */
export function issuePatientToken(patientId: string, scope: string, created = false) {
  if (!key()) throw new Error('Desk sign-in is not configured on this server.')
  const payload = Buffer.from(JSON.stringify({ p: patientId, s: scope, e: Date.now() + TTL_MS, c: created })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** The patient in a token issued for this scope, or null if it is forged, expired or someone else's. */
export function readPatientTokenDetails(token: string | null | undefined, scope: string): { patientId: string; created: boolean } | null {
  const [payload, signature] = String(token ?? '').split('.')
  if (!payload || !signature || !key()) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { p, s, e, c } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { p: string; s: string; e: number; c?: boolean }
    if (s !== scope || !(e > Date.now()) || typeof p !== 'string') return null
    return { patientId: p, created: c === true }
  } catch {
    return null
  }
}

/** The patient id in a token issued for this scope, or null. */
export function readPatientToken(token: string | null | undefined, scope: string): string | null {
  return readPatientTokenDetails(token, scope)?.patientId ?? null
}
