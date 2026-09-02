import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
            // Enforce a strict 2-hour (7200 seconds) inactivity lifespan
            supabaseResponse.cookies.set(name, value, { ...options, maxAge: 7200 })
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Standard protected paths
  const isProtectedRoute = path.startsWith('/patient') || 
                           path.startsWith('/doctor/') || path === '/doctor' ||
                           path.startsWith('/executive') || 
                           path.startsWith('/hospital/') || path === '/hospital' ||
                           path.startsWith('/admin/dashboard')

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role || 'patient'

    let dashboardPath = '/patient/dashboard'
    let allowedPrefix = '/'
    
    if (role === 'doctor') {
      dashboardPath = '/doctor/dashboard'
      allowedPrefix = '/doctor'
    } else if (role === 'executive') {
      dashboardPath = '/executive/dashboard'
      allowedPrefix = '/executive'
    } else if (role === 'hospital_admin') {
      dashboardPath = '/hospital/dashboard'
      allowedPrefix = '/hospital'
    } else if (role === 'diagnostic_admin') {
      dashboardPath = '/diagnostic/dashboard'
      allowedPrefix = '/diagnostic'
    } else if (role === 'super_admin') {
      dashboardPath = '/admin/dashboard'
      allowedPrefix = '/admin'
    }

    // Always redirect logged-in users away from auth pages
    if (path === '/login' || path === '/signup' || path === '/login/patient' || path === '/login/doctor' || path === '/login/hospital' || path === '/login/executive' || path === '/login/diagnostic' || path === '/admin') {
      return NextResponse.redirect(new URL(dashboardPath, request.url))
    }

    // STRICT CONFINEMENT: If they are not a patient, they can ONLY visit their allowedPrefix
    if (role !== 'patient' && !path.startsWith(allowedPrefix) && !path.startsWith('/auth/signout')) {
      return NextResponse.redirect(new URL(dashboardPath, request.url))
    }

    // Role-based protection for patients trying to access staff routes
    if (role === 'patient') {
      const isTryingToAccessOtherRolePath = 
        path.startsWith('/doctor') || 
        path.startsWith('/executive') || 
        path.startsWith('/hospital') || 
        path.startsWith('/diagnostic') || 
        path.startsWith('/admin')
        
      if (isTryingToAccessOtherRolePath) {
        return NextResponse.redirect(new URL(dashboardPath, request.url))
      }
    }
  } else {
    // Not logged in
    if (isProtectedRoute) {
      // Redirect to homepage to trigger auth modal, or a dedicated error page
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
