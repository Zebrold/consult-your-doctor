import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DiagnosticDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/diagnostic')

  const { data: profile } = await supabase.from('profiles').select('*, diagnostic_centers(*)').eq('id', user.id).single()

  const centerName = profile?.diagnostic_centers?.name || 'Diagnostic Center'

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to {centerName}</h1>
        <p className="text-gray-500 mt-1">Manage your diagnostic tests and appointments here.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 shadow-sm">
        <p>Dashboard features for diagnostic centers will be available soon.</p>
      </div>
    </div>
  )
}
