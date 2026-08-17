import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Calendar, Users, IndianRupee, TrendingUp, Building2, User } from 'lucide-react'

export default async function HospitalDashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/hospital')

  // Verify hospital admin
  const { data: profile } = await supabase.from('profiles').select('hospital_id').eq('id', user.id).single()
  if (!profile || !profile.hospital_id) redirect('/')

  // Fetch doctors count
  const { data: doctors } = await supabase.from('doctors').select('id').eq('hospital_id', profile.hospital_id)
  
  // Fetch appointments for this hospital
  // Use admin client to bypass RLS for fetching related profiles (patients)
  const adminClient = createAdminClient()
  const { data: appointments } = await adminClient
    .from('appointments')
    .select(`
      id,
      status,
      created_at,
      patient:profiles!appointments_patient_id_fkey ( full_name ),
      doctor:doctors (
        profiles!doctors_profile_id_fkey ( full_name ),
        consultation_fee
      )
    `)
    .eq('hospital_id', profile.hospital_id)
    .order('created_at', { ascending: false })

  // Calculate Metrics
  const totalDoctors = doctors?.length || 0
  const totalAppointments = appointments?.length || 0
  
  // Calculate total revenue from all appointments that are completed/visited/confirmed
  let totalRevenue = 0
  appointments?.forEach(apt => {
    if (apt.status !== 'cancelled' && apt.status !== 'pending_payment') {
      totalRevenue += Number(apt.doctor.consultation_fee)
    }
  })

  const recentBookings = appointments?.slice(0, 5) || []

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hospital Operations</h1>
        <p className="text-gray-500">Overview of your hospital's performance.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue generated</p>
          <p className="text-3xl font-black text-gray-900 flex items-center gap-1">
            <span className="text-lg text-gray-400">₹</span>{totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> All time</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Consultations</p>
          <p className="text-3xl font-black text-gray-900">{totalAppointments}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><User className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Active Doctors</p>
          <p className="text-3xl font-black text-gray-900">{totalDoctors}</p>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Recent Bookings</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-sm">
                <th className="px-6 py-4 font-bold text-gray-500">Patient</th>
                <th className="px-6 py-4 font-bold text-gray-500">Doctor</th>
                <th className="px-6 py-4 font-bold text-gray-500">Amount</th>
                <th className="px-6 py-4 font-bold text-gray-500">Status</th>
                <th className="px-6 py-4 font-bold text-gray-500 text-right">Booked On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No bookings found.</td>
                </tr>
              ) : (
                recentBookings.map(apt => (
                  <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{apt.patient?.full_name || 'Unknown Patient'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-600">Dr. {apt.doctor?.profiles?.full_name?.replace('Dr. ', '') || 'Unknown Doctor'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">₹{apt.doctor?.consultation_fee || 0}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                        apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'confirmed' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {apt.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-500 font-medium">
                      {new Date(apt.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
