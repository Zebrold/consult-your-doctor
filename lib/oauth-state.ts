import crypto from 'crypto'
import { cookies } from 'next/headers'
import { safeNextPath } from '@/lib/safe-redirect'

// The OAuth `state` for Google sign-in: a random value kept in this browser's cookie and checked when Google sends the
// person back. Without it, anyone could hand a victim a link that finishes *their own* Google sign-in, signing the
// victim into the attacker's account (whatever health details they then enter, the attacker can read).

const COOKIE = 'cyd_oauth_state'

/** Starts a sign-in: remembers where to go afterwards and returns the value to send to Google as `state`. */
export async function issueOAuthState(next: string | null): Promise<string> {
  const nonce = crypto.randomBytes(24).toString('base64url')
  const store = await cookies()
  store.set(COOKIE, JSON.stringify({ nonce, next: safeNextPath(next) }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return nonce
}

/** Finishes a sign-in: the `state` Google returned must match this browser's; returns where to go, or null. */
export async function consumeOAuthState(state: string | null): Promise<{ next: string } | null> {
  const store = await cookies()
  const raw = store.get(COOKIE)?.value
  store.delete(COOKIE)
  if (!raw || !state) return null
  try {
    const saved = JSON.parse(raw) as { nonce?: unknown; next?: unknown }
    const expected = Buffer.from(String(saved.nonce ?? ''))
    const received = Buffer.from(state)
    if (expected.length === 0 || expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null
    return { next: safeNextPath(saved.next) }
  } catch {
    return null
  }
}
