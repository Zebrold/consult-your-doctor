import { safeNextPath } from '@/lib/safe-redirect'
import { consumeOAuthState } from '@/lib/oauth-state'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ROLE_COOKIE, ROLE_COOKIE_OPTIONS, roleCookieValue } from '@/lib/role-cookie'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGoogleClientId, getGoogleClientSecret } from '@/lib/google-auth'
import { afterGoogleSignIn, signInWithGoogleIdentity } from '@/lib/google-signin'

const GOOGLE_CLIENT_ID = getGoogleClientId()
const GOOGLE_CLIENT_SECRET = getGoogleClientSecret()

/**
 * Universal OAuth callback route.
 * Handles:
 * 1. Supabase native OAuth session exchange (PKCE)
 * 2. Direct Google OAuth code exchange with client ID and secret (fallback for direct flows)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const safeNext = safeNextPath(next)

  // Resolve true origin for redirects behind reverse proxies / Vercel
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const isLocal = process.env.NODE_ENV === 'development'
  const redirectOrigin = isLocal
    ? origin
    : forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : origin

  // Catch OAuth provider level errors returned in query parameters
  const providerError = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  if (providerError) {
    console.error('[OAuth callback] Error received from provider:', providerError, errorDescription)
    return NextResponse.redirect(`${redirectOrigin}/login/patient?error=google`)
  }

  if (code) {
    const supabase = await createClient()

    // 1. Try Supabase native exchange
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('[OAuth callback] Supabase exchangeCodeForSession failed:', error.message)
      } else if (data?.user) {
        const admin = createAdminClient()
        const meta = data.user.user_metadata ?? {}
        const email = data.user.email?.toLowerCase().trim()
        const name = meta.full_name || meta.name || email?.split('@')[0] || 'Patient'
        const picture = meta.avatar_url || meta.picture || null

        // Update auth metadata if avatar was provided
        if (picture && !data.user.user_metadata?.avatar_url) {
          try {
            await admin.auth.admin.updateUserById(data.user.id, {
              user_metadata: { ...data.user.user_metadata, avatar_url: picture, full_name: name },
            })
          } catch (metaErr) {
            console.warn('[OAuth callback] Could not update user metadata avatar:', metaErr)
          }
        }

        // Locate or create profile using admin client to bypass RLS issues
        let profile: { id: string; role?: string; full_name?: string | null; phone_number?: string | null } | null = null

        const { data: profileById } = await admin
          .from('profiles')
          .select('id, role, full_name, email, phone_number')
          .eq('id', data.user.id)
          .maybeSingle()

        if (profileById) {
          profile = profileById
        } else {
          // Profile does not exist for data.user.id yet
          if (email) {
            // If another non-staff profile mistakenly holds this email, clear it to avoid 23505 unique constraint violation
            const { data: profileByEmail } = await admin
              .from('profiles')
              .select('id, staff_id')
              .ilike('email', email)
              .maybeSingle()

            if (profileByEmail && !profileByEmail.staff_id) {
              await admin.from('profiles').update({ email: null }).eq('id', profileByEmail.id)
            }
          }

          const { data: newProfile, error: profileError } = await admin
            .from('profiles')
            .insert({
              id: data.user.id,
              full_name: name,
              email: email || null,
              role: 'patient',
            })
            .select('id, role, phone_number')
            .maybeSingle()

          if (profileError) {
            console.error('[OAuth callback] Failed to insert new patient profile:', profileError)
          } else if (newProfile) {
            profile = newProfile
          }
        }

        const userRole = profile?.role || 'patient'
        // Google opens patient accounts only. A staff account signs in with its Staff ID, so this session is ended.
        if (userRole !== 'patient') {
          await supabase.auth.signOut({ scope: 'local' })
          return NextResponse.redirect(`${redirectOrigin}/login/patient?error=staff`)
        }
        const isNew = !profileById
        const isMissingPhone = !profile?.phone_number

        if (profile && name && !profile.full_name) {
          await admin.from('profiles').update({ full_name: name }).eq('id', profile.id)
        }

        const cookieStore = await cookies()
        cookieStore.set(ROLE_COOKIE, roleCookieValue(data.user.id, userRole), ROLE_COOKIE_OPTIONS)

        // For new patient accounts or patients missing a phone number, mandate profile setup
        let targetPath = safeNext
        if (userRole === 'patient' && (isNew || isMissingPhone)) {
          targetPath = `/patient/profile?setup=mandatory${safeNext && safeNext !== '/' ? `&next=${encodeURIComponent(safeNext)}` : ''}`
        }

        const response = NextResponse.redirect(`${redirectOrigin}${targetPath}`)
        response.cookies.set(ROLE_COOKIE, roleCookieValue(data.user.id, userRole), ROLE_COOKIE_OPTIONS)
        return response
      }
    } catch (exchangeEx) {
      console.error('[OAuth callback] Supabase exchange exception:', exchangeEx)
    }

    // 2. Direct Google OAuth token exchange fallback, only for a sign-in this browser started (lib/oauth-state.ts).
    const stateParam = searchParams.get('state')
    const started = await consumeOAuthState(stateParam)
    if (started) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: `${redirectOrigin}/auth/callback`,
            grant_type: 'authorization_code',
          }),
        })

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json()
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          })

          if (userinfoRes.ok) {
            const googleUser = await userinfoRes.json()
            const result = await signInWithGoogleIdentity({
              email: googleUser.email ?? '',
              emailVerified: googleUser.email_verified === true,
              name: googleUser.name,
              picture: googleUser.picture,
              sub: googleUser.sub,
            })
            if (result.ok) {
              const response = NextResponse.redirect(`${redirectOrigin}${afterGoogleSignIn(result, started.next)}`)
              response.cookies.set(ROLE_COOKIE, roleCookieValue(result.userId, result.role), ROLE_COOKIE_OPTIONS)
              return response
            }
          }
        } else {
          console.error('[OAuth callback] Direct token exchange failed:', await tokenRes.text())
        }
      } catch (e) {
        console.error('[OAuth callback direct error]:', e)
      }
    }
  }

  return NextResponse.redirect(`${redirectOrigin}/login/patient?error=google`)
}
