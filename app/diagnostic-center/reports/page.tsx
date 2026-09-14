import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DiagnosticReportsUploadClient } from '@/components/DiagnosticReportsUploadClient'

export const dynamic = 'force-dynamic'

export default async function DiagnosticReportsPage() {
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

  // Fallback to active DB center for preview or demo review
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
        'X-Ray': 45,
        'CT Scan': 120,
        'MRI Scan': 180,
        'Ultrasound': 75,
        'Blood Tests': 35,
        'ECG / EKG': 40,
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
      .limit(30)

    if (bData && bData.length > 0) {
      const patientIds = Array.from(new Set(bData.map((b: any) => b.patient_id).filter(Boolean)))
      const { data: pDetails } = await adminSupabase
        .from('patient_details')
        .select('*')
        .in('id', patientIds)

      const detailsMap = new Map((pDetails || []).map((d: any) => [d.id, d]))
      bookings = bData.map((b: any) => ({
        ...b,
        patient_details: detailsMap.get(b.patient_id) || null,
      }))
    }
  }

  const directorName = profile?.full_name || 'Dr. Katherine Vance'

  return (
    <DiagnosticReportsUploadClient
      center={center}
      initialBookings={bookings}
      directorName={directorName}
    />
  )
}
