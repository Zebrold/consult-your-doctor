import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLE_COOKIE, ROLE_COOKIE_OPTIONS, readRoleCookie, roleCookieValue } from '@/lib/role-cookie'

const AUTH_PAGES = ['/login', '/signup', '/signup/doctor', '/login/patient', '/login/doctor', '/login/hospital', '/login/executive', '/login/diagnostic', '/admin']

/** Where each role lands after signing in, and the part of the site staff are confined to. */
function homeFor(role: string) {
  if (role === 'doctor') return { dashboardPath: '/doctor/dashboard', allowedPrefix: '/doctor' }
  if (role === 'executive') return { dashboardPath: '/executive/dashboard', allowedPrefix: '/executive' }
  if (role === 'hospital_admin') return { dashboardPath: '/hospital/dashboard', allowedPrefix: '/hospital' }
  if (role === 'diagnostic_admin') return { dashboardPath: '/diagnostic-center/dashboard', allowedPrefix: '/diagnostic' }
  if (role === 'super_admin') return { dashboardPath: '/admin/dashboard', allowedPrefix: '/admin' }
  return { dashboardPath: '/patient/profile', allowedPrefix: '/' }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = request.nextUrl
  const path = url.pathname

  // We will handle all admin paths via standard Supabase auth below


  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // A redirect is a new response, so copy over the cookies set on supabaseResponse (a refreshed session, the role
  // cookie, a cleared session). Without this the browser keeps its old tokens and retries with them.
  const redirectTo = (target: string) => {
    const response = NextResponse.redirect(new URL(target, request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
  }

  // getSession() reads the JWT from the cookie without verifying it with Supabase (no network request).
  // That's fine for this optimistic routing gate, but it is NOT an authorization check: every server
  // action / page that reads or writes data must call getUser() and re-check the role from the DB.
  const { data: { session } } = await supabase.auth.getSession()
  let user = session?.user ?? null

  // Pages reject a session Supabase has ended (signed out elsewhere, revoked, user removed) even while the cookie
  // still looks valid. Redirecting a "signed-in" user on the cookie alone while the page sends them back is what
  // caused "too many redirects", so confirm with Supabase before any redirect of a signed-in user.
  // 'unknown' means Supabase couldn't be reached: don't redirect and don't sign anyone out over a network blip.
  const confirmUser = async (): Promise<'valid' | 'invalid' | 'unknown'> => {
    const { data, error } = await supabase.auth.getUser()
    if (data.user) return 'valid'
    const status = (error as { status?: number } | null)?.status
    if (error && error.name !== 'AuthSessionMissingError' && (!status || status >= 500)) return 'unknown'
    // Clear the dead session from the browser so the next request starts signed out.
    await supabase.auth.signOut({ scope: 'local' })
    user = null
    return 'invalid'
  }

  // Standard protected paths
  const isProtectedRoute = path.startsWith('/patient') ||
                           path.startsWith('/doctor/') || path === '/doctor' ||
                           path.startsWith('/executive') ||
                           path.startsWith('/hospital/') || path === '/hospital' ||
                           path.startsWith('/diagnostic-center') || path.startsWith('/diagnostic/') || path === '/diagnostic' ||
                           path.startsWith('/admin/dashboard')

  if (user) {
    // The cookie only counts if it was written for this user; otherwise look the role up and rewrite it.
    let role = readRoleCookie(request.cookies.get(ROLE_COOKIE)?.value, user.id)
    if (!role) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      const fresh: string = profile?.role || 'patient'
      supabaseResponse.cookies.set(ROLE_COOKIE, roleCookieValue(user.id, fresh), ROLE_COOKIE_OPTIONS)
      role = fresh
    }

    const { dashboardPath, allowedPrefix } = homeFor(role)
    let target: string | null = null

    // Always redirect logged-in users away from auth pages
    if (AUTH_PAGES.includes(path)) {
      target = dashboardPath
    // STRICT CONFINEMENT: If they are not a patient, they can ONLY visit their allowedPrefix
    } else if (role !== 'patient' && !path.startsWith(allowedPrefix) && !path.startsWith('/auth/signout')) {
      target = dashboardPath
    // Role-based protection for patients trying to access staff routes
    } else if (role === 'patient') {
      const isTryingToAccessOtherRolePath =
        path.startsWith('/doctor/') || path === '/doctor' ||
        path.startsWith('/executive') ||
        path.startsWith('/hospital/') || path === '/hospital' ||
        path.startsWith('/diagnostic-center') ||
        path.startsWith('/admin')
      if (isTryingToAccessOtherRolePath) target = dashboardPath
    }

    if (target) {
      const verdict = await confirmUser()
      if (verdict === 'valid') return redirectTo(target)
      if (verdict === 'unknown') return supabaseResponse
      // 'invalid': carry on below as a signed-out visitor.
    }
  }

  if (!user) {
    // A role cookie without a session is stale; drop it.
    if (request.cookies.has(ROLE_COOKIE)) supabaseResponse.cookies.delete(ROLE_COOKIE)

    // Not logged in
    if (isProtectedRoute) {
      if (request.nextUrl.searchParams.get('preview') === 'patient' && path.startsWith('/patient')) {
        return supabaseResponse
      }
      // Redirect to homepage to trigger auth modal, or a dedicated error page
      return redirectTo('/')
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
