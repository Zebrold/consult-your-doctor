import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DiagnosticPortalNav } from '@/components/DiagnosticPortalNav'

export const metadata: Metadata = {
  title: 'Diagnostic Center Hub | Consult Your Doctor',
  description: 'Real-time telemetry, automated digital dispatch, and diagnostic triage stream.',
}

export default async function DiagnosticLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminSupabase = createAdminClient()
  let center: any = null
  let profile: any = null

  if (user) {
    const { data: userProfile } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (userProfile?.diagnostic_center_id) {
      profile = userProfile
      const { data: c } = await adminSupabase
        .from('diagnostic_centers')
        .select('*')
        .eq('id', userProfile.diagnostic_center_id)
        .maybeSingle()
      if (c) center = c
    }
  }

  // Fallback to active DB center for instant preview or demo review
  if (!center) {
    const { data: firstCenter } = await adminSupabase
      .from('diagnostic_centers')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    center = firstCenter
  }

  const directorName = profile?.full_name || 'Dr. Katherine Vance'
  const centerName = center?.name || 'Apex Diagnostics & Imaging'
  const centerCity = center?.city || 'Main Pathology & Radiology Lab'

  return (
    <DiagnosticPortalNav
      centerName={centerName}
      centerCity={centerCity}
      directorName={directorName}
    >
      {children}
    </DiagnosticPortalNav>
  )
}
