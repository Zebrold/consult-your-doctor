import { safeNextPath } from '@/lib/safe-redirect'
import { consumeOAuthState } from '@/lib/oauth-state'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ROLE_COOKIE, ROLE_COOKIE_OPTIONS, roleCookieValue } from '@/lib/role-cookie'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGoogleClientId, getGoogleClientSecret } from '@/lib/google-auth'

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
        } else if (email) {
          // If profile exists by email under a different id (e.g. from previous phone sign-in), link/reuse it
          const { data: profileByEmail } = await admin
            .from('profiles')
            .select('id, role, full_name, email, phone_number')
            .ilike('email', email)
            .maybeSingle()

          if (profileByEmail) {
            profile = profileByEmail
          }
        }

        const userRole = profile?.role || 'patient'
        const isNew = !profile
        const isMissingPhone = !profile?.phone_number

        if (!profile) {
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
        } else if (name && !profile.full_name) {
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
            const email = googleUser.email?.toLowerCase().trim()
            const name = googleUser.name || email?.split('@')[0] || 'Patient'
            const picture = googleUser.picture || null

            if (email && googleUser.email_verified === true) {
              const admin = createAdminClient()
              let userId: string
              const { data: usersData } = await admin.auth.admin.listUsers()
              const existingUser = usersData?.users?.find((u) => u.email?.toLowerCase() === email)

              if (existingUser) {
                userId = existingUser.id
                if (picture && !existingUser.user_metadata?.avatar_url) {
                  await admin.auth.admin.updateUserById(userId, {
                    user_metadata: { ...existingUser.user_metadata, avatar_url: picture, full_name: name },
                  })
                }
              } else {
                const { data: newUser } = await admin.auth.admin.createUser({
                  email,
                  email_confirm: true,
                  user_metadata: { full_name: name, avatar_url: picture },
                })
                userId = newUser?.user?.id || ''
              }

              if (userId) {
                const { data: profile } = await admin.from('profiles').select('id, role').eq('id', userId).maybeSingle()
                const userRole = profile?.role || 'patient'
                if (!profile) {
                  await admin.from('profiles').insert({ id: userId, full_name: name, email, role: 'patient' })
                }

                const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
                if (linkData?.properties?.hashed_token) {
                  await supabase.auth.verifyOtp({ token_hash: linkData.properties.hashed_token, type: 'email' })
                  const cookieStore = await cookies()
                  cookieStore.set(ROLE_COOKIE, roleCookieValue(userId, userRole), ROLE_COOKIE_OPTIONS)
                  const response = NextResponse.redirect(`${redirectOrigin}${started.next}`)
                  response.cookies.set(ROLE_COOKIE, roleCookieValue(userId, userRole), ROLE_COOKIE_OPTIONS)
                  return response
                }
              }
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
