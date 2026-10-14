import { consumeOAuthState } from '@/lib/oauth-state'
import { NextResponse } from 'next/server'
import { getGoogleClientId, getGoogleClientSecret } from '@/lib/google-auth'
import { afterGoogleSignIn, signInWithGoogleIdentity } from '@/lib/google-signin'

const GOOGLE_CLIENT_ID = getGoogleClientId()
const GOOGLE_CLIENT_SECRET = getGoogleClientSecret()

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  // Only a sign-in this browser started (see lib/oauth-state.ts).
  const started = await consumeOAuthState(searchParams.get('state'))
  const safeNext = started?.next ?? '/'

  if (error || !code || !started) {
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
      console.error('[Google OAuth Token Error]:', await tokenRes.text())
      return NextResponse.redirect(`${origin}/login/patient?error=google`)
    }

    const { access_token } = await tokenRes.json()

    // Fetch user info from Google
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!userinfoRes.ok) {
      console.error('[Google OAuth UserInfo Error]:', await userinfoRes.text())
      return NextResponse.redirect(`${origin}/login/patient?error=google`)
    }

    const googleUser = await userinfoRes.json()
    const result = await signInWithGoogleIdentity({
      email: googleUser.email ?? '',
      emailVerified: googleUser.email_verified === true,
      name: googleUser.name,
      picture: googleUser.picture,
      sub: googleUser.sub,
    })
    if (!result.ok) return NextResponse.redirect(`${origin}/login/patient?error=google`)

    return NextResponse.redirect(`${origin}${afterGoogleSignIn(result, safeNext)}`)
  } catch (err) {
    console.error('[Google Callback Error]:', err)
    return NextResponse.redirect(`${origin}/login/patient?error=google`)
  }
}
