import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/supabase/server'
import { ROLE_COOKIE, readRoleCookie } from '@/lib/role-cookie'
import type { HomeAccount } from '@/components/home/types'
import { SiteHeader } from '@/components/site/SiteHeader'

// Each staff account's own portal, for the header's Dashboard button.
const PORTAL_HOME: Record<string, string> = {
  doctor: '/doctor/dashboard',
  hospital_admin: '/hospital/dashboard',
  diagnostic_admin: '/diagnostic-center/dashboard',
  executive: '/executive/dashboard',
}

export async function Header() {
  // Shares the root layout's check of the session and its role cookie, so the header costs no extra request.
  const user = await getCurrentUser()
  const role = user ? (readRoleCookie((await cookies()).get(ROLE_COOKIE)?.value, user.id) ?? (user.user_metadata?.role as string | undefined) ?? null) : null
  const account: HomeAccount = !user
    ? { kind: 'guest' }
    : role && PORTAL_HOME[role]
      ? { kind: 'staff', href: PORTAL_HOME[role] }
      : { kind: 'patient', name: (user.user_metadata?.full_name as string | undefined) ?? null, email: user.email ?? null }

  return <SiteHeader account={account} />
}
