import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// OAuth (Google) sign-in lands here with a one-time code to exchange for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      // First Google sign-in: create the patient profile that phone registration would have created.
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
      cookieStore.set('user-role', profile?.role || 'patient', { maxAge: 7200, path: '/' })

      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/login/patient?error=google`)
}
