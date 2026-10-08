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
 * Handles both:
 * 1. Supabase native OAuth session exchange
 * 2. Direct Google OAuth code exchange with client ID and secret
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  if (code) {
    const supabase = await createClient()

    // 1. Try Supabase native exchange
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!profile) {
          const meta = data.user.user_metadata ?? {}
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            full_name: meta.full_name || meta.name || null,
            email: data.user.email,
            role: 'patient',
          })
          if (profileError) {
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/login/patient?error=google`)
          }
        }

        const cookieStore = await cookies()
        cookieStore.set(ROLE_COOKIE, roleCookieValue(data.user.id, profile?.role || 'patient'), ROLE_COOKIE_OPTIONS)

        return NextResponse.redirect(`${origin}${safeNext}`)
      }
    } catch {
      // Continue to direct Google OAuth fallback below
    }

    // 2. Direct Google OAuth token exchange fallback
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: `${origin}/auth/callback`,
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
          const name = googleUser.name || email.split('@')[0]
          const picture = googleUser.picture || null

          if (email) {
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
                return NextResponse.redirect(`${origin}${safeNext}`)
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('[OAuth callback direct error]:', e)
    }
  }

  return NextResponse.redirect(`${origin}/login/patient?error=google`)
}
