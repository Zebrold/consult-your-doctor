'use server'

import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { serverFetch } from '@/lib/supabase/fetch'
import { clientIp } from '@/lib/otp-guard'
import { overLimit } from '@/lib/rate-limit'
import { TEMPORARY_PASSWORD, hasTemporaryPassword } from '@/lib/temporary-password'

// Setting a password from an emailed link (lib/password-link.ts). The link's token is checked here, on submit, with a
// Supabase client that keeps nothing: the recovery session lives only for this request, never in this browser's
// cookies, and is ended straight after. So the link works in any browser, and the person signs in afresh with the new
// password on their portal's login.

export type PasswordLinkResult = { ok: true; loginHref: string } | { ok: false; error: string; expired?: boolean }

const EXPIRED = 'This link has expired or was already used.'

/** Where each kind of account signs in. */
const LOGIN_FOR: Record<string, string> = {
  doctor: '/login/doctor',
  hospital_admin: '/login/hospital',
  diagnostic_admin: '/login/diagnostic',
  executive: '/login/executive',
  patient: '/login/patient',
}

/** The same rule as a staff member's own password (app/actions/staff-account.ts). */
function passwordProblem(next: string, confirm: string): string | null {
  if (next.length < 8) return 'Use a password of at least 8 characters.'
  if (next.length > 72) return 'Use a password of at most 72 characters.'
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return 'Use letters and at least one number.'
  if (next !== confirm) return 'The two passwords don’t match.'
  return null
}

export async function setPasswordFromLink(input: { tokenHash: string; password: string; confirm: string }): Promise<PasswordLinkResult> {
  const tokenHash = String(input?.tokenHash ?? '').trim()
  const password = String(input?.password ?? '')
  const confirm = String(input?.confirm ?? '')
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(tokenHash)) return { ok: false, expired: true, error: EXPIRED }
  const problem = passwordProblem(password, confirm)
  if (problem) return { ok: false, error: problem }

  const ip = (await clientIp()) ?? 'unknown'
  if (await overLimit(`password-link:ip:${ip}`, 10, 15 * 60_000)) return { ok: false, error: 'Too many tries. Please wait 15 minutes and try again.' }

  const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: serverFetch },
  })
  const { data, error } = await auth.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
  const user = data?.user
  if (error || !user) {
    if (error && !/expired|invalid|not found/i.test(error.message)) console.error('setPasswordFromLink verify:', error.message)
    return { ok: false, expired: true, error: EXPIRED }
  }

  const admin = createAdminClient()
  // A password chosen here is the person's own, so a temporary-password mark is cleared with it.
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password,
    ...(hasTemporaryPassword(user) ? { app_metadata: { [TEMPORARY_PASSWORD]: false } } : {}),
  })
  // The recovery session has done its job either way.
  await auth.auth.signOut({ scope: 'local' }).catch(() => {})
  if (updateError) {
    console.error('setPasswordFromLink update:', updateError.message)
    const reason = /weak|short|characters|password/i.test(updateError.message) ? `${updateError.message}. ` : ''
    return { ok: false, expired: true, error: `${reason}Your password wasn’t changed. Ask for a new link and try again.` }
  }

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return { ok: true, loginHref: LOGIN_FOR[String(profile?.role ?? '')] ?? '/login' }
}
