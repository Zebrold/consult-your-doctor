import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import { PRIVACY } from '@/lib/legal'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { ROLE_COOKIE, readRoleCookie } from '@/lib/role-cookie'

export const metadata: Metadata = {
  title: 'Privacy Policy | Consult Your Doctor',
  description: 'How Consult Your Doctor collects, uses, shares and protects your personal and health information, and your rights.',
  alternates: { canonical: '/privacy-policy' },
}

// Open to everyone, signed in or not. Passes user context when authenticated.
export default async function PrivacyPage() {
  const cookieStore = await cookies()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userContext = null
  if (user) {
    let role = readRoleCookie(cookieStore.get(ROLE_COOKIE)?.value, user.id)
    let name: string | null = null
    if (!role) {
      const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
      role = profile?.role || 'patient'
      name = profile?.full_name || null
    } else {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      name = profile?.full_name || null
    }
    userContext = { email: user.email, role, name }
  }

  return <LegalPage doc={PRIVACY} current="/privacy-policy" user={userContext} />
}
