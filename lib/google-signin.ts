import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { findAuthUserId } from '@/lib/auth-users'
import { ROLE_COOKIE, ROLE_COOKIE_OPTIONS, roleCookieValue } from '@/lib/role-cookie'

/** What Google told us about the person, after the token or code was verified with Google. */
export type GoogleIdentity = { email: string; emailVerified: boolean; name?: string | null; picture?: string | null; sub?: string | null }

export type GoogleSignIn =
  | { ok: true; userId: string; role: string; email: string; name: string; needsSetup: boolean }
  | { ok: false; error: string }

/**
 * Signs this browser in as the account with the Google address, creating a patient account for a new address.
 * Shared by Google One Tap (/api/auth/google) and the redirect flows (/api/auth/google/callback, /auth/callback).
 */
export async function signInWithGoogleIdentity(identity: GoogleIdentity): Promise<GoogleSignIn> {
  const email = identity.email?.toLowerCase().trim()
  // Accounts are matched by email, so only an address Google has verified.
  if (!email || !identity.emailVerified) return { ok: false, error: 'Your Google account has no verified email address.' }
  const name = identity.name?.trim() || email.split('@')[0]
  const picture = identity.picture || null

  const admin = createAdminClient()

  // 1. The sign-in account for this address, or a new one.
  let userId = await findAuthUserId(admin, { email })
  if (userId) {
    if (picture) {
      const { data: existing } = await admin.auth.admin.getUserById(userId)
      const meta = existing.user?.user_metadata ?? {}
      if (!meta.avatar_url) {
        await admin.auth.admin.updateUserById(userId, { user_metadata: { ...meta, avatar_url: picture, full_name: meta.full_name || name } })
      }
    }
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name, name, avatar_url: picture, ...(identity.sub ? { google_sub: identity.sub } : {}) },
    })
    // Two sign-ins at once can both get here; the second finds the account the first created.
    userId = created?.user?.id ?? (createError ? await findAuthUserId(admin, { email }) : null)
    if (!userId) {
      console.error('[Google login] Could not create the account:', createError)
      return { ok: false, error: 'We could not create your account. Please try again.' }
    }
  }

  // 2. Every account has a profile; a new one is a patient.
  const { data: profile } = await admin.from('profiles').select('role, phone_number').eq('id', userId).maybeSingle()
  const role: string = profile?.role || 'patient'
  if (!profile) {
    // If another non-staff profile mistakenly holds this verified Google email (e.g. stale demo or old profile), free it up
    const { data: conflict } = await admin
      .from('profiles')
      .select('id, staff_id')
      .ilike('email', email)
      .neq('id', userId)
      .maybeSingle()

    if (conflict && !conflict.staff_id) {
      await admin.from('profiles').update({ email: null }).eq('id', conflict.id)
    }

    const { error: profileError } = await admin.from('profiles').insert({ id: userId, full_name: name, email, role: 'patient' })
    if (profileError) console.error('[Google login] Could not create the profile:', profileError)
  }

  // 3. A one-time sign-in link, redeemed here, writes this browser's session cookies.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkError || !link?.properties?.hashed_token) {
    console.error('[Google login] Could not create the session link:', linkError)
    return { ok: false, error: 'We could not sign you in. Please try again.' }
  }
  const supabase = await createClient()
  const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'email' })
  if (otpError) {
    console.error('[Google login] Could not start the session:', otpError)
    return { ok: false, error: 'We could not sign you in. Please try again.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(ROLE_COOKIE, roleCookieValue(userId, role), ROLE_COOKIE_OPTIONS)

  // New patients, and patients without a mobile number, finish their profile first.
  return { ok: true, userId, role, email, name, needsSetup: role === 'patient' && (!profile || !profile.phone_number) }
}

/** Where to send a signed-in Google user: profile setup first when it is needed, then `next`. */
export function afterGoogleSignIn(result: { needsSetup: boolean }, next: string) {
  if (!result.needsSetup) return next
  return `/patient/profile?setup=mandatory${next && next !== '/' ? `&next=${encodeURIComponent(next)}` : ''}`
}
