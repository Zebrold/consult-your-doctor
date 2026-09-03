import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Activity, User, Phone, CheckCircle, Clock } from 'lucide-react'
import { DiagnosticCheckInModal } from '@/components/DiagnosticCheckInModal'

export default async function DiagnosticDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/diagnostic')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, diagnostic_centers(*)')
    .eq('id', user.id)
    .single()

  const centerName = profile?.diagnostic_centers?.name || 'Diagnostic Center'
  const centerId = profile?.diagnostic_center_id

  let todayBookings: any[] = []

  if (centerId) {
    const adminSupabase = createAdminClient()
    
    // Get today's date in YYYY-MM-DD format based on local time
    // For simplicity on the server, we can fetch all confirmed and filter by date, 
    // or just fetch by date string since we store it as text 'YYYY-MM-DD'
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`

    const { data } = await adminSupabase
      .from('diagnostic_bookings')
      .select(`
        *,
        profiles (
          full_name,
          phone_number
        )
      `)
      .eq('center_id', centerId)
      .eq('status', 'confirmed') // Only fetch confirmed bookings for check-in
      .eq('preferred_date', todayStr)
      .order('created_at', { ascending: false })

    if (data) {
      todayBookings = data
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to {centerName}</h1>
        <p className="text-gray-500 mt-1">Manage your diagnostic tests and appointments for today.</p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          Today's Appointments
          <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2.5 rounded-full text-sm">
            {todayBookings.length}
          </span>
        </h2>
      </div>

      {todayBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No pending check-ins</h3>
          <p className="text-gray-500">You don't have any confirmed bookings for today.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {todayBookings.map(booking => (
              <div key={booking.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{booking.profiles?.full_name || 'Unknown Patient'}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {booking.profiles?.phone_number || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 max-w-sm border-l border-gray-100 pl-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Test</p>
                  <p className="font-semibold text-gray-900 capitalize">{booking.test_name.replace(/-/g, ' ')}</p>
                </div>

                <div className="flex items-center gap-3">
                  <DiagnosticCheckInModal 
                    bookingId={booking.id} 
                    patientName={booking.profiles?.full_name || 'Patient'} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
