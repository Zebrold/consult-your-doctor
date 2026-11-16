import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * The signed-in patient for an account page (or a redirect to log in and come back to `next`), the service-role client
 * and their profile. The profile is read with the service role, as its email and phone columns aren't granted to the
 * public API.
 */
export async function patientAccount(next: string) {
  const user = await getSessionUser()
  if (!user) redirect(`/login/patient?next=${encodeURIComponent(next)}`)
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('full_name, email, phone_number').eq('id', user.id).maybeSingle()
  const profile = (data ?? null) as { full_name: string | null; email: string | null; phone_number: string | null } | null
  const name = profile?.full_name || (user.user_metadata?.full_name as string | undefined) || 'Patient'
  return { user, admin, profile, name, uhid: `CYD-${user.id.slice(0, 8).toUpperCase()}` }
}

/** Today in India, yyyy-mm-dd. */
export const istToday = (now = Date.now()) => new Date(now + 5.5 * 3600_000).toISOString().slice(0, 10)
