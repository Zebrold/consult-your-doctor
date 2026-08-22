import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Building2, Users, IndianRupee, Calendar } from 'lucide-react'
import { RevenueChart } from '@/components/RevenueChart'
import { BookingsChart } from '@/components/BookingsChart'

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
  
  // Aggregate chart data
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { date: d.toISOString().split('T')[0], formatted: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: 0 }
  })
  
  const hospitalBookingsMap = new Map<string, number>()

  appointments?.forEach(apt => {
    const doctor: any = apt.doctor
    const hospital: any = apt.hospital
    const isCompletedOrConfirmed = apt.status !== 'cancelled' && apt.status !== 'pending_payment'
    
    if (isCompletedOrConfirmed) {
      const fee = Number(doctor.consultation_fee) || 0
      totalRevenue += fee
      
      const aptDate = new Date(apt.created_at).toISOString().split('T')[0]
      const dayData = last7Days.find(d => d.date === aptDate)
      if (dayData) {
        dayData.revenue += fee
      }
    }

    if (apt.status !== 'cancelled') {
      const hName = hospital.name
      hospitalBookingsMap.set(hName, (hospitalBookingsMap.get(hName) || 0) + 1)
    }
  })

  const revenueData = last7Days.map(d => ({ date: d.formatted, revenue: d.revenue }))
  
  const bookingsData = Array.from(hospitalBookingsMap.entries())
    .map(([name, bookings]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, bookings }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5) // Top 5 hospitals

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Revenue (Last 7 Days)</h2>
          <div className="h-72">
            <RevenueChart data={revenueData} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Top Hospitals by Bookings</h2>
          <div className="h-72">
            <BookingsChart data={bookingsData} color="#4f46e5" />
          </div>
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
                recentBookings.map(apt => {
                  const hospital: any = apt.hospital
                  const patient: any = apt.patient
                  const doctor: any = apt.doctor
                  return (
                  <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-indigo-700">{hospital.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{patient.full_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-600">Dr. {doctor.profiles.full_name.replace('Dr. ', '')}</div>
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
                )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
