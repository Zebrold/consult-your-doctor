import { createHmac, timingSafeEqual } from 'node:crypto'

// Proof that a desk confirmed a patient's one-time code. Registering a patient happens over several requests (check
// the code, then book, then pay), and the browser carries the patient between them, so the patient id travels inside
// a signed token tied to the staff member and their organisation. It can't be forged, edited or used by anyone else.

const TTL_MS = 45 * 60_000
const key = () => process.env.DESK_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest('base64url')

/** `scope` names who may use it, e.g. "hospital:<hospitalId>:<staffUserId>". */
export function issuePatientToken(patientId: string, scope: string) {
  const payload = Buffer.from(JSON.stringify({ p: patientId, s: scope, e: Date.now() + TTL_MS })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** The patient id in a token issued for this scope, or null if it is forged, expired or someone else's. */
export function readPatientToken(token: string | null | undefined, scope: string): string | null {
  const [payload, signature] = String(token ?? '').split('.')
  if (!payload || !signature || !key()) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { p, s, e } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { p: string; s: string; e: number }
    return s === scope && e > Date.now() && typeof p === 'string' ? p : null
  } catch {
    return null
  }
}
