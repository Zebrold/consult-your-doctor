import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DiagnosticPatientsDirectoryClient } from '@/components/DiagnosticPatientsDirectoryClient'

export const dynamic = 'force-dynamic'

export default async function DiagnosticPatientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminSupabase = createAdminClient()
  let centerId: string | null = null

  if (user) {
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('diagnostic_center_id')
      .eq('id', user.id)
      .maybeSingle()
    centerId = profile?.diagnostic_center_id || null
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
      address: 'Main Pathology & Radiology Lab',
    }
  }

  // Fetch real diagnostic bookings for this center from DB
  const { data: bookings } = await adminSupabase
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

  let mappedBookings = bookings || []
  if (mappedBookings.length > 0) {
    const patientIds = Array.from(new Set(mappedBookings.map((b: any) => b.patient_id).filter(Boolean)))
    const { data: pDetails } = await adminSupabase
      .from('patient_details')
      .select('*')
      .in('id', patientIds)

    const detailsMap = new Map((pDetails || []).map((d: any) => [d.id, d]))
    mappedBookings = mappedBookings.map((b: any) => ({
      ...b,
      patient_details: detailsMap.get(b.patient_id) || null,
    }))
  }

  return (
    <DiagnosticPatientsDirectoryClient
      center={center}
      initialBookings={mappedBookings}
    />
  )
}
