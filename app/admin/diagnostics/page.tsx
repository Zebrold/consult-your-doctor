import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'
import { CreateDiagnosticModal } from '@/components/CreateDiagnosticModal'
import { DiagnosticActionMenu } from './DiagnosticActionMenu'

export default async function AdminDiagnostics() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/admin')

  // Verify super admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/')

  // Fetch Diagnostic Centers
  const { data: centers } = await supabase
    .from('diagnostic_centers')
    .select(`
      id,
      name,
      city,
      contact_email,
      status
    `)
    .order('name', { ascending: true })

  // Fetch Diagnostic Admins to display their IDs
  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id, diagnostic_center_id')
    .eq('role', 'diagnostic_admin')

  const { data: authUsers } = await adminAuthClient.auth.admin.listUsers()
  const userMap = new Map(authUsers?.users.map(u => [u.id, u.email]) || [])

  const centerAdmins = new Map()
  adminProfiles?.forEach(p => {
    if (p.diagnostic_center_id) {
      const email = userMap.get(p.id) || ''
      const generatedId = email.endsWith('@cyd.internal') 
        ? email.split('@')[0].toUpperCase() 
        : null
      if (generatedId) centerAdmins.set(p.diagnostic_center_id, generatedId)
    }
  })

  return (
    <div className="p-4 sm:p-8 flex flex-col h-full">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diagnostic Centers</h1>
          <p className="text-gray-500">Manage all registered diagnostic facilities.</p>
        </div>
        <CreateDiagnosticModal />
      </div>

      {/* Centers List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="px-6 py-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search centers..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto pb-32">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="border-b border-gray-100 text-sm">
                <th className="px-6 py-4 font-bold text-gray-500">Center Details</th>
                <th className="px-6 py-4 font-bold text-gray-500">Location</th>
                <th className="px-6 py-4 font-bold text-gray-500">Status</th>
                <th className="px-6 py-4 font-bold text-gray-500 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {centers?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No diagnostic centers found.</td>
                </tr>
              ) : (
                centers?.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{c.name}</div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {centerAdmins.get(c.id) ? `Admin ID: ${centerAdmins.get(c.id)}` : c.contact_email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {c.city}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {c.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <DiagnosticActionMenu centerId={c.id} centerName={c.name} />
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
