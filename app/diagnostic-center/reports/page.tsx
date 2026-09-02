import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DiagnosticReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/diagnostic')

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">View and manage diagnostic reports and analytics.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 shadow-sm">
        <p>Reporting features for diagnostic centers will be available soon.</p>
      </div>
    </div>
  )
}
