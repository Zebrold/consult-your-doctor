import { NextResponse } from 'next/server'

import { getGoogleClientId } from '@/lib/google-auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') || '/'
  const callbackPath = searchParams.get('callback') || '/auth/callback'
  const redirectUri = `${origin}${callbackPath}`
  const GOOGLE_CLIENT_ID = getGoogleClientId()

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: next,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}
