import type { createAdminClient } from '@/lib/supabase/admin'
import { siteUrl } from '@/lib/site-url'

// The emailed links that let someone choose a password: a new doctor's or executive's activation, a new hospital or
// lab login, a hospital's "send a reset link", and Forgot password on the staff logins.
//
// Each link carries Supabase's hashed recovery token to our own /update-password page, which checks it on the server
// only when the new password is submitted (app/actions/password-link.ts). Supabase's own action link can't be used:
// it signs the browser in through a #access_token fragment, which the PKCE browser client rejects ("Link is invalid or
// has expired"), and a PKCE reset email only works in the browser that asked for it, not when it's opened from the
// Gmail app on a phone. Checking on submit also means a mail scanner that opens the link can't use it up.
//
// A new link replaces the previous one for that account; Supabase's email OTP expiry sets how long it works.

type Admin = ReturnType<typeof createAdminClient>

export const PASSWORD_PAGE = '/update-password'

/** A set-password link for this account's email, or null when Supabase couldn't make one. */
export async function passwordLink(admin: Admin, email: string, base: string = siteUrl()): Promise<string | null> {
  try {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
    const token = data?.properties?.hashed_token
    if (error || !token) {
      if (error) console.error('passwordLink:', error.message)
      return null
    }
    return `${base.replace(/\/+$/, '')}${PASSWORD_PAGE}?token_hash=${encodeURIComponent(token)}`
  } catch (err) {
    console.error('passwordLink:', err)
    return null
  }
}
