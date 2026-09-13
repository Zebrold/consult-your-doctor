import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DiagnosticDashboardClient } from '@/components/DiagnosticDashboardClient'

export const dynamic = 'force-dynamic'

export default async function DiagnosticDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let centerId: string | null = null
  let profile: any = null

  if (user) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (userProfile) {
      profile = userProfile
      centerId = userProfile.diagnostic_center_id || null
    }
  }

  const adminSupabase = createAdminClient()

  let center: any = null
  if (centerId) {
    const { data: c } = await adminSupabase
      .from('diagnostic_centers')
      .select('*')
      .eq('id', centerId)
      .maybeSingle()
    if (c) center = c
  }

  // If no center from user session, fetch the first active center in DB
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
      city: 'New Delhi',
      address: 'Main Pathology & Radiology Lab, Central Complex',
      available_tests: ['X-Ray', 'CT Scan', 'MRI Scan', 'Ultrasound', 'Blood Tests', 'ECG / EKG'],
      test_prices: {
        'X-Ray': 1000,
        'CT Scan': 4500,
        'MRI Scan': 7500,
        'Ultrasound': 2200,
        'Blood Tests': 550,
        'ECG / EKG': 850
      }
    }
  }

  // Fetch real diagnostic bookings for this center from DB
  let bookings: any[] = []
  if (center?.id) {
    const { data: bData } = await adminSupabase
      .from('diagnostic_bookings')
      .select(`
        *,
        profiles (
          id,
          full_name,
          phone_number,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(25)

    if (bData && bData.length > 0) {
      bookings = bData
    }
  }

  const directorName = profile?.full_name || 'Dr. Katherine Vance'

  return (
    <DiagnosticDashboardClient
      center={center}
      initialBookings={bookings}
      directorName={directorName}
    />
  )
}
