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
                           path.startsWith('/doctor') || 
                           path.startsWith('/executive') || 
                           path.startsWith('/hospital') ||
                           path.startsWith('/admin/dashboard')

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role || 'patient'

    let dashboardPath = '/patient/dashboard'
    if (role === 'doctor') dashboardPath = '/doctor/dashboard'
    else if (role === 'executive') dashboardPath = '/executive/dashboard'
    else if (role === 'hospital_admin') dashboardPath = '/hospital/dashboard'
    else if (role === 'super_admin') dashboardPath = '/admin/dashboard'

    if (path === '/login' || path === '/signup' || path === '/login/patient' || path === '/login/doctor' || path === '/login/hospital' || path === '/login/executive' || path === '/login/admin') {
      return NextResponse.redirect(new URL(dashboardPath, request.url))
    }

    // If they hit the home page, redirect staff to their dashboard, but allow patients and super admins
    if (path === '/' && role !== 'super_admin' && role !== 'patient') {
      return NextResponse.redirect(new URL(dashboardPath, request.url))
    }

    // Role-based protection
    if (path.startsWith('/patient') && role !== 'patient') {
      return NextResponse.redirect(new URL(dashboardPath, request.url))
    }
    if (path.startsWith('/doctor') && role !== 'doctor') {
       return NextResponse.redirect(new URL(dashboardPath, request.url))
    }
    if (path.startsWith('/executive') && role !== 'executive') {
       return NextResponse.redirect(new URL(dashboardPath, request.url))
    }
    if (path.startsWith('/hospital') && role !== 'hospital_admin') {
       return NextResponse.redirect(new URL(dashboardPath, request.url))
    }
    if (path.startsWith('/admin/dashboard') && role !== 'super_admin') {
       return NextResponse.redirect(new URL(dashboardPath, request.url))
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
