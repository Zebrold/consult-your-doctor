import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { DiagnosticPatientList } from '@/components/DiagnosticPatientList'

export default async function DiagnosticPatientsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/diagnostic')

  const { data: profile } = await supabase
    .from('profiles')
    .select('diagnostic_center_id')
    .eq('id', user.id)
    .single()

  if (!profile?.diagnostic_center_id) {
    return <div className="p-8">No diagnostic center assigned.</div>
  }

  // Fetch bookings for this diagnostic center using the admin client to bypass profiles RLS
  const adminSupabase = createAdminClient()
  const { data: bookings } = await adminSupabase
    .from('diagnostic_bookings')
    .select(`
      *,
      profiles (
        full_name,
        phone_number,
        email
      )
    `)
    .eq('center_id', profile.diagnostic_center_id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients & Bookings</h1>
          <p className="text-gray-500 mt-1">Manage all diagnostic test bookings for your center.</p>
        </div>
      </div>

      <DiagnosticPatientList bookings={bookings || []} />
    </div>
  )
}
