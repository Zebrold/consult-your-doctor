import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = request.nextUrl
  const path = url.pathname

  // Super Admin custom session check
  const superAdminSession = request.cookies.get('super_admin_session')
  if (path.startsWith('/admin/dashboard')) {
    if (!superAdminSession) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return supabaseResponse
  }
  
  if (path === '/admin') {
    if (superAdminSession) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return supabaseResponse
  }

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

  const { data: { user } } = await supabase.auth.getUser()

  // Standard protected paths
  const isProtectedRoute = path.startsWith('/patient') || 
                           path.startsWith('/doctor') || 
                           path.startsWith('/executive') || 
                           path.startsWith('/hospital')

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role || 'patient'

    // Determine correct dashboard path
    let dashboardPath = '/patient/dashboard'
    if (role === 'doctor') dashboardPath = '/doctor/dashboard'
    else if (role === 'executive') dashboardPath = '/executive/dashboard'
    else if (role === 'hospital_admin') dashboardPath = '/hospital/dashboard'

    if (path === '/login' || path === '/signup' || path === '/login/patient' || path === '/login/doctor' || path === '/login/hospital' || path === '/login/executive') {
      return NextResponse.redirect(new URL('/', request.url))
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
