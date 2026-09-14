import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DiagnosticAddTestClient } from '@/components/DiagnosticAddTestClient'

export const dynamic = 'force-dynamic'

export default async function DiagnosticTestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminSupabase = createAdminClient()
  let centerId: string | null = null
  let profile: any = null

  if (user) {
    const { data: userProfile } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (userProfile) {
      profile = userProfile
      centerId = userProfile.diagnostic_center_id || null
    }
  }

  let center: any = null
  if (centerId) {
    const { data: c } = await adminSupabase
      .from('diagnostic_centers')
      .select('*')
      .eq('id', centerId)
      .maybeSingle()
    if (c) center = c
  }

  // Fallback to active DB center
  if (!center) {
    const { data: firstCenter } = await adminSupabase
      .from('diagnostic_centers')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    center = firstCenter || {
      id: 'default',
      name: 'Apex Diagnostics & Imaging',
      city: 'Central Hub',
      address: 'Main Pathology & Radiology Lab, Central Complex',
      available_tests: ['X-Ray', 'CT Scan', 'MRI Scan', 'Ultrasound', 'Blood Tests', 'ECG / EKG'],
      test_prices: {
        'X-Ray': 1000,
        'CT Scan': 4500,
        'MRI Scan': 7500,
        'Ultrasound': 2200,
        'Blood Tests': 550,
        'ECG / EKG': 850,
      },
    }
  }

  const directorName = profile?.full_name || 'Dr. Katherine Vance'

  return (
    <DiagnosticAddTestClient
      center={center}
      directorName={directorName}
    />
  )
}
