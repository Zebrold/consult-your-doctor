import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ROLE_COOKIE, ROLE_COOKIE_OPTIONS, roleCookieValue } from '@/lib/role-cookie'
import { getGoogleClientId } from '@/lib/google-auth'

const GOOGLE_CLIENT_ID = getGoogleClientId()

interface GoogleTokenInfo {
  aud?: string
  email?: string
  email_verified?: string | boolean
  name?: string
  picture?: string
  sub?: string
  error?: string
  error_description?: string
}

/**
 * Real-time Google Sign-In verification endpoint.
 * Accepts a Google ID token credential from Google Identity Services (GIS) / One Tap popup,
 * verifies it with Google, provisions/finds the Supabase user, establishes the session cookies,
 * and returns the authenticated user status and redirect URL.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { credential, next } = body

    if (!credential || typeof credential !== 'string') {
      return NextResponse.json({ error: 'Missing Google credential token' }, { status: 400 })
    }

    // Verify the credential with Google's tokeninfo API
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { cache: 'no-store' }
    )

    if (!verifyRes.ok) {
      const errText = await verifyRes.text()
      return NextResponse.json({ error: 'Invalid Google token: ' + errText }, { status: 401 })
    }

    const tokenInfo: GoogleTokenInfo = await verifyRes.json()

    // Verify audience matches our Client ID
    const audMatches = Boolean(GOOGLE_CLIENT_ID && tokenInfo.aud === GOOGLE_CLIENT_ID)

    if (!audMatches) {
      return NextResponse.json(
        { error: 'Google Client ID mismatch. Token audience does not match configured client.' },
        { status: 403 }
      )
    }

    const email = tokenInfo.email?.toLowerCase().trim()
    if (!email) {
      return NextResponse.json({ error: 'Google account has no associated email' }, { status: 400 })
    }

    const name = tokenInfo.name || email.split('@')[0]
    const picture = tokenInfo.picture || null

    const admin = createAdminClient()

    // 1. Locate or create the Supabase auth user
    let userId: string

    // Query existing users by email
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers()
    if (listError) {
      console.error('[Google Auth] Error listing users:', listError)
    }

    const existingUser = usersData?.users?.find((u) => u.email?.toLowerCase() === email)

    if (existingUser) {
      userId = existingUser.id
      // Update metadata with avatar if not present
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
          google_sub: tokenInfo.sub,
        },
      })

      if (createError || !newUser?.user) {
        console.error('[Google Auth] Error creating user:', createError)
        return NextResponse.json(
          { error: createError?.message || 'Failed to create user account' },
          { status: 500 }
        )
      }
      userId = newUser.user.id
    }

    // 2. Ensure public profile exists
    const { data: profile } = await admin.from('profiles').select('id, role').eq('id', userId).maybeSingle()
    const userRole = profile?.role || 'patient'

    if (!profile) {
      const { error: profileError } = await admin.from('profiles').insert({
        id: userId,
        full_name: name,
        email,
        role: 'patient',
      })
      if (profileError) {
        console.error('[Google Auth] Error inserting profile:', profileError)
      }
    }

    // 3. Generate a magiclink token to establish valid Supabase session cookies
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[Google Auth] Error generating session link:', linkError)
      return NextResponse.json(
        { error: 'Could not generate Supabase authentication session' },
        { status: 500 }
      )
    }

    // 4. Verify OTP using the server Supabase client to write HTTP-only session cookies
    const supabase = await createClient()
    const { data: authData, error: otpError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email',
    })

    if (otpError) {
      console.error('[Google Auth] OTP verification error:', otpError)
      return NextResponse.json({ error: otpError.message }, { status: 500 })
    }

    // 5. Set user-role cookie
    const cookieStore = await cookies()
    cookieStore.set(ROLE_COOKIE, roleCookieValue(userId, userRole), ROLE_COOKIE_OPTIONS)

    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'

    return NextResponse.json({
      success: true,
      redirect: safeNext,
      user: {
        id: userId,
        email,
        name,
        role: userRole,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    console.error('[Google Auth API Error]:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
