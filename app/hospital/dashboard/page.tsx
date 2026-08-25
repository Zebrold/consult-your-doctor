import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Calendar, Users, IndianRupee, TrendingUp, Building2, User } from 'lucide-react'
import { RevenueChart } from '@/components/RevenueChart'
import { BookingsChart } from '@/components/BookingsChart'

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

  let totalRevenue = 0

  // Aggregate chart data
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { date: d.toISOString().split('T')[0], formatted: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: 0 }
  })

  const doctorBookingsMap = new Map<string, number>()

  appointments?.forEach(apt => {
    const doctor: any = apt.doctor
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
      const docName = doctor?.profiles?.full_name?.replace('Dr. ', '') || 'Unknown'
      doctorBookingsMap.set(docName, (doctorBookingsMap.get(docName) || 0) + 1)
    }
  })

  const revenueData = last7Days.map(d => ({ date: d.formatted, revenue: d.revenue }))

  const bookingsData = Array.from(doctorBookingsMap.entries())
    .map(([name, bookings]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, bookings }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5) // Top 5 doctors

  const recentBookings = appointments?.slice(0, 5) || []

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hospital Operations</h1>
        <p className="text-gray-500">Overview of your hospital's performance.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:border-[#E31E24]/30 hover:shadow-[0_8px_30px_rgb(227,30,36,0.08)] transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue generated</p>
          <p className="text-3xl font-black text-gray-900 flex items-center gap-1">
            <span className="text-lg text-gray-400">₹</span>{totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> All time</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:border-[#E31E24]/30 hover:shadow-[0_8px_30px_rgb(227,30,36,0.08)] transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Consultations</p>
          <p className="text-3xl font-black text-gray-900">{totalAppointments}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:border-[#E31E24]/30 hover:shadow-[0_8px_30px_rgb(227,30,36,0.08)] transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10"><User className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Active Doctors</p>
          <p className="text-3xl font-black text-gray-900">{totalDoctors}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Hospital Revenue (Last 7 Days)</h2>
          <div className="h-72">
            <RevenueChart data={revenueData} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Top Doctors by Consultations</h2>
          <div className="h-72">
            <BookingsChart data={bookingsData} color="#E31E24" />
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
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
                recentBookings.map(apt => {
                  const patient: any = apt.patient
                  const doctor: any = apt.doctor
                  return (
                    <tr key={apt.id} className="hover:bg-gradient-to-r from-gray-50 to-white transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{patient?.full_name || 'Unknown Patient'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-600">Dr. {doctor?.profiles?.full_name?.replace('Dr. ', '') || 'Unknown Doctor'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">₹{doctor?.consultation_fee || 0}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${apt.status === 'completed' ? 'bg-green-100 text-green-700' :
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
