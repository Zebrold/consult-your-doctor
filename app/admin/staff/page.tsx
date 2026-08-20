import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Search, Building2, User, MoreVertical } from 'lucide-react'
import { CreateStaffModal } from '@/components/CreateStaffModal'
import { StaffListClient } from './StaffListClient'

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

      <StaffListClient initialStaff={staffWithIds || []} hospitals={hospitals || []} />
    </div>
  )
}
