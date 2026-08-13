import { createAdminClient } from '@/lib/supabase/admin'
import { Activity, Building2, Stethoscope, Users } from 'lucide-react'

export const revalidate = 0 // Disable caching for admin dashboard

export default async function AdminDashboardOverview() {
  const supabase = createAdminClient()

  // Fetch quick stats
  const [
    { count: patientsCount },
    { count: doctorsCount },
    { count: hospitalsCount },
    { count: appointmentsCount }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
    supabase.from('doctors').select('*', { count: 'exact', head: true }),
    supabase.from('hospitals').select('*', { count: 'exact', head: true }),
    supabase.from('appointments').select('*', { count: 'exact', head: true })
  ])

  const stats = [
    { name: 'Total Patients', value: patientsCount || 0, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { name: 'Active Doctors', value: doctorsCount || 0, icon: Stethoscope, color: 'bg-green-50 text-green-600' },
    { name: 'Partner Hospitals', value: hospitalsCount || 0, icon: Building2, color: 'bg-purple-50 text-purple-600' },
    { name: 'Appointments', value: appointmentsCount || 0, icon: Activity, color: 'bg-orange-50 text-orange-600' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">A high-level view of the entire platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Could add Recent Activity or Charts here later */}
    </div>
  )
}
