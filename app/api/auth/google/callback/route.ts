import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ROLE_COOKIE, ROLE_COOKIE_OPTIONS, roleCookieValue } from '@/lib/role-cookie'

const rawClientId =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  ''
const GOOGLE_CLIENT_ID = rawClientId.replace(/^https?:\/\//i, '').trim()

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') || '/'
  const error = searchParams.get('error')
  const safeNext = state.startsWith('/') && !state.startsWith('//') ? state : '/'

  if (error || !code) {
    console.error('[Google OAuth Callback] Error from Google:', error)
    return NextResponse.redirect(`${origin}/login/patient?error=google`)
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error('[Google OAuth Token Error]:', errBody)
      return NextResponse.redirect(`${origin}/login/patient?error=google`)
    }

    const tokenData = await tokenRes.json()
    const { id_token, access_token } = tokenData

    // Fetch user info from Google
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!userinfoRes.ok) {
      console.error('[Google OAuth UserInfo Error]:', await userinfoRes.text())
      return NextResponse.redirect(`${origin}/login/patient?error=google`)
    }

    const googleUser = await userinfoRes.json()
    const email = googleUser.email?.toLowerCase().trim()
    const name = googleUser.name || email.split('@')[0]
    const picture = googleUser.picture || null

    if (!email) {
      return NextResponse.redirect(`${origin}/login/patient?error=google`)
    }

    const admin = createAdminClient()

    // 1. Locate or create Supabase user
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
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          name,
          avatar_url: picture,
          google_sub: googleUser.sub,
        },
      })

      if (createError || !newUser?.user) {
        console.error('[Google Callback] Error creating user:', createError)
        return NextResponse.redirect(`${origin}/login/patient?error=google`)
      }
      userId = newUser.user.id
    }

    // 2. Ensure profile exists in public.profiles
    const { data: profile } = await admin.from('profiles').select('id, role').eq('id', userId).maybeSingle()
    const userRole = profile?.role || 'patient'

    if (!profile) {
      await admin.from('profiles').insert({
        id: userId,
        full_name: name,
        email,
        role: 'patient',
      })
    }

    // 3. Generate session link and verify OTP to set HTTP-only cookies
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[Google Callback] Link gen error:', linkError)
      return NextResponse.redirect(`${origin}/login/patient?error=google`)
    }

    const supabase = await createClient()
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email',
    })

    if (otpError) {
      console.error('[Google Callback] Verify OTP error:', otpError)
      return NextResponse.redirect(`${origin}/login/patient?error=google`)
    }

    // 4. Set role cookie
    const cookieStore = await cookies()
    cookieStore.set(ROLE_COOKIE, roleCookieValue(userId, userRole), ROLE_COOKIE_OPTIONS)

    return NextResponse.redirect(`${origin}${safeNext}`)
  } catch (err) {
    console.error('[Google Callback Error]:', err)
    return NextResponse.redirect(`${origin}/login/patient?error=google`)
  }
}
