import { safeNextPath } from '@/lib/safe-redirect'
import { NextResponse } from 'next/server'
import { getGoogleClientId } from '@/lib/google-auth'
import { afterGoogleSignIn, signInWithGoogleIdentity } from '@/lib/google-signin'

const GOOGLE_CLIENT_ID = getGoogleClientId()

interface GoogleTokenInfo {
  aud?: string
  email?: string
  email_verified?: string | boolean
  name?: string
  picture?: string
  sub?: string
}

/**
 * Real-time Google Sign-In verification endpoint.
 * Accepts a Google ID token credential from Google Identity Services (GIS) / One Tap popup,
 * verifies it with Google, provisions/finds the Supabase user, establishes the session cookies,
 * and returns the authenticated user status and redirect URL.
 */
export async function POST(request: Request) {
  // Only this site's pages may sign someone in here. Without this, another site could post its own Google token
  // from a visitor's browser and sign them into the attacker's account.
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => null)
    const credential = body?.credential
    if (!credential || typeof credential !== 'string' || credential.length > 4096) {
      return NextResponse.json({ error: 'Missing Google credential token' }, { status: 400 })
    }

    // Verify the credential with Google's tokeninfo API
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { cache: 'no-store' }
    )
    if (!verifyRes.ok) {
      console.error('[Google Auth] tokeninfo rejected the credential:', verifyRes.status, await verifyRes.text())
      return NextResponse.json({ error: 'Google could not verify this login. Please try again.' }, { status: 401 })
    }

    const tokenInfo: GoogleTokenInfo = await verifyRes.json()

    // Verify audience matches our Client ID
    if (!GOOGLE_CLIENT_ID || tokenInfo.aud !== GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Google Client ID mismatch. Token audience does not match configured client.' },
        { status: 403 }
      )
    }

    // tokeninfo reports email_verified as a string.
    const result = await signInWithGoogleIdentity({
      email: tokenInfo.email ?? '',
      emailVerified: String(tokenInfo.email_verified) === 'true',
      name: tokenInfo.name,
      picture: tokenInfo.picture,
      sub: tokenInfo.sub,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({
      success: true,
      redirect: afterGoogleSignIn(result, safeNextPath(body?.next)),
      user: { id: result.userId, email: result.email, name: result.name, role: result.role },
    })
  } catch (err: unknown) {
    console.error('[Google Auth API Error]:', err)
    return NextResponse.json({ error: 'Google login failed. Please try again.' }, { status: 500 })
  }
}
