import { createClient } from '@/lib/supabase/server'
import { ROLE_COOKIE } from '@/lib/role-cookie'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  const response = NextResponse.redirect(new URL('/', request.url), {
    status: 302,
  })
  // The proxy routes by this cookie; clear it so the next login isn't routed with a stale role.
  response.cookies.delete(ROLE_COOKIE)
  return response
}

// Portal guards send a signed-in user here when their account can't use that portal (wrong role, no hospital or
// doctor record). Ending this browser's session breaks what would otherwise be an endless redirect between the
// portal and the page the middleware routes them to.
export async function GET(request: Request) {
  const url = new URL(request.url)
  // Only same-site destinations ("/\evil.com" and "//evil.com" resolve to other hosts, so compare origins).
  const requested = new URL(url.searchParams.get('next') || '/', url)
  const target = requested.origin === url.origin ? requested : new URL('/', url)

  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })

  const response = NextResponse.redirect(target, { status: 302 })
  response.cookies.delete(ROLE_COOKIE)
  return response
}
