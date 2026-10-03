import { createClient } from '@/lib/supabase/server'
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
  response.cookies.delete('user-role')
  return response
}
