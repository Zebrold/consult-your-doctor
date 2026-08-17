import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Building2, Users, IndianRupee, Calendar } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/admin')

  // Fetch Global Data
  const { data: hospitals } = await supabase.from('hospitals').select('id')
  const { data: users } = await supabase.from('profiles').select('id')
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      created_at,
      patient:profiles!appointments_patient_id_fkey ( full_name ),
      doctor:doctors (
        profiles!doctors_profile_id_fkey ( full_name ),
        consultation_fee
      ),
      hospital:hospitals ( name )
    `)
    .order('created_at', { ascending: false })

  // Calculate Metrics
  const totalHospitals = hospitals?.length || 0
  const totalUsers = users?.length || 0
  const totalAppointments = appointments?.length || 0
  
  let totalRevenue = 0
  appointments?.forEach(apt => {
    if (apt.status !== 'cancelled' && apt.status !== 'pending_payment') {
      totalRevenue += Number(apt.doctor.consultation_fee)
    }
  })

  const recentBookings = appointments?.slice(0, 8) || []

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500">Global metrics across all hospitals and users.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><IndianRupee className="w-16 h-16 text-indigo-600" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Platform Revenue</p>
          <p className="text-3xl font-black text-gray-900 flex items-center gap-1">
            <span className="text-lg text-gray-400">₹</span>{totalRevenue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Building2 className="w-16 h-16 text-indigo-600" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Active Hospitals</p>
          <p className="text-3xl font-black text-gray-900">{totalHospitals}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Users className="w-16 h-16 text-indigo-600" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Registered Users</p>
          <p className="text-3xl font-black text-gray-900">{totalUsers}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Calendar className="w-16 h-16 text-indigo-600" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Appointments</p>
          <p className="text-3xl font-black text-gray-900">{totalAppointments}</p>
        </div>
      </div>

      {/* Global Activity Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Global Recent Bookings</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-sm bg-white">
                <th className="px-6 py-4 font-bold text-gray-500">Hospital</th>
                <th className="px-6 py-4 font-bold text-gray-500">Patient</th>
                <th className="px-6 py-4 font-bold text-gray-500">Doctor</th>
                <th className="px-6 py-4 font-bold text-gray-500">Status</th>
                <th className="px-6 py-4 font-bold text-gray-500 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No bookings across the platform.</td>
                </tr>
              ) : (
                recentBookings.map(apt => (
                  <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-indigo-700">{apt.hospital.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{apt.patient.full_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-600">Dr. {apt.doctor.profiles.full_name.replace('Dr. ', '')}</div>
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
