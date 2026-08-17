import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Search, MapPin, MoreVertical } from 'lucide-react'
import { CreateHospitalModal } from '@/components/CreateHospitalModal'
import { ManageHospitalCredentialsModal } from '@/components/ManageHospitalCredentialsModal'

export default async function AdminHospitals() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/admin')

  // Verify super admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/')

  // Fetch Hospitals
  const { data: hospitals } = await supabase
    .from('hospitals')
    .select(`
      id,
      name,
      city,
      contact_email,
      status,
      doctors ( id )
    `)
    .order('name', { ascending: true })

  // Fetch Hospital Admins to display their IDs
  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id, hospital_id')
    .eq('role', 'hospital_admin')

  const { data: authUsers } = await adminAuthClient.auth.admin.listUsers()
  const userMap = new Map(authUsers?.users.map(u => [u.id, u.email]) || [])

  const hospitalAdmins = new Map()
  adminProfiles?.forEach(p => {
    if (p.hospital_id) {
      const email = userMap.get(p.id) || ''
      const generatedId = email.endsWith('@cyd.internal') 
        ? email.split('@')[0].toUpperCase() 
        : null
      if (generatedId) hospitalAdmins.set(p.hospital_id, generatedId)
    }
  })

  return (
    <div className="p-4 sm:p-8 flex flex-col h-full">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Hospitals</h1>
          <p className="text-gray-500">Manage all registered hospital facilities.</p>
        </div>
        <CreateHospitalModal />
      </div>

      {/* Hospital List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="px-6 py-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search hospitals..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="border-b border-gray-100 text-sm">
                <th className="px-6 py-4 font-bold text-gray-500">Hospital Details</th>
                <th className="px-6 py-4 font-bold text-gray-500">Location</th>
                <th className="px-6 py-4 font-bold text-gray-500 text-center">Active Doctors</th>
                <th className="px-6 py-4 font-bold text-gray-500">Status</th>
                <th className="px-6 py-4 font-bold text-gray-500 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {hospitals?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No hospitals found.</td>
                </tr>
              ) : (
                hospitals?.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{h.name}</div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {hospitalAdmins.get(h.id) ? `Admin ID: ${hospitalAdmins.get(h.id)}` : h.contact_email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {h.city}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold text-indigo-600 bg-indigo-50 inline-block px-3 py-1 rounded-full">{h.doctors?.length || 0}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                        h.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {h.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <ManageHospitalCredentialsModal hospitalId={h.id} hospitalName={h.name} />
                      </div>
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
