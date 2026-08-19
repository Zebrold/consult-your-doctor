import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Search, Building2, User, MoreVertical } from 'lucide-react'
import { CreateStaffModal } from '@/components/CreateStaffModal'
import { StaffActionMenu } from './StaffActionMenu'

export default async function AdminStaff() {
  const supabase = await createClient()
  
  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/admin')

  // Verify super admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/')

  // Fetch Hospitals for the dropdown
  const { data: hospitals } = await supabase.from('hospitals').select('id, name').order('name')

  // Fetch Staff
  const { data: staff } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      created_at,
      hospital:hospitals ( name )
    `)
    .in('role', ['executive', 'doctor', 'hospital_admin'])
    .order('created_at', { ascending: false })

  // Fetch emails from auth.users to extract the generated Staff IDs
  const { data: authUsers } = await adminAuthClient.auth.admin.listUsers()
  const userMap = new Map(authUsers?.users.map(u => [u.id, u.email]) || [])

  const staffWithIds = staff?.map(s => {
    const email = userMap.get(s.id) || ''
    // Real email is the one from the profile or auth if it doesn't end with cyd.internal
    const realEmail = email.endsWith('@cyd.internal') ? '' : email;
    // If email is like cydak1234@cyd.internal, extract cydak1234
    const generatedId = email.endsWith('@cyd.internal') 
      ? email.split('@')[0].toUpperCase() 
      : s.id.slice(0, 8) + '...'
    
    return { ...s, generatedId, email: realEmail }
  })

  return (
    <div className="p-4 sm:p-8 flex flex-col h-full">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500">Provision and manage internal platform users.</p>
        </div>
        {hospitals && <CreateStaffModal hospitals={hospitals} />}
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="px-6 py-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search staff by name or role..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto pb-32">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="border-b border-gray-100 text-sm">
                <th className="px-6 py-4 font-bold text-gray-500">User Profile</th>
                <th className="px-6 py-4 font-bold text-gray-500">System Role</th>
                <th className="px-6 py-4 font-bold text-gray-500">Assigned Hospital</th>
                <th className="px-6 py-4 font-bold text-gray-500 text-right">Joined</th>
                <th className="px-6 py-4 font-bold text-gray-500 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staffWithIds?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No staff accounts found.</td>
                </tr>
              ) : (
                staffWithIds?.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                          {s.full_name?.replace('Dr. ', '').charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{s.full_name || 'Unnamed User'}</div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID: {s.generatedId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                        s.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
                        s.role === 'hospital_admin' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {s.role.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700 font-medium">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {s.hospital?.name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-500 font-medium">
                      {new Date(s.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <StaffActionMenu profileId={s.id} staffId={s.generatedId} currentEmail={s.email} />
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
