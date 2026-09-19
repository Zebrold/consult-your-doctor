import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { IndianRupee, TrendingUp, Calendar } from 'lucide-react'

export default async function HospitalRevenue() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/hospital')

  // Verify hospital admin
  const { data: profile } = await supabase.from('profiles').select('hospital_id').eq('id', user.id).single()
  if (!profile || !profile.hospital_id) redirect('/')

  // Fetch appointments for this hospital
  const adminClient = createAdminClient()
  const { data: appointments } = await adminClient
    .from('appointments')
    .select(`
      id,
      status,
      created_at,
      doctor:doctors (
        consultation_fee
      )
    `)
    .eq('hospital_id', profile.hospital_id)

  let todayRevenue = 0
  let thisMonthRevenue = 0
  let totalRevenue = 0

  const todayStr = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  appointments?.forEach(apt => {
    const isCompletedOrConfirmed = apt.status !== 'cancelled' && apt.status !== 'pending_payment'
    if (isCompletedOrConfirmed) {
      const doctor: any = apt.doctor
      const fee = Number(doctor?.consultation_fee) || 0
      totalRevenue += fee

      const aptDate = new Date(apt.created_at)
      if (aptDate.toISOString().split('T')[0] === todayStr) {
        todayRevenue += fee
      }

      if (aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear) {
        thisMonthRevenue += fee
      }
    }
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:border-[#0949B3]/30 hover:shadow-[0_8px_30px_rgb(9,73,179,0.08)] transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Today's Revenue</p>
          <p className="text-3xl font-black text-gray-900 flex items-center gap-1">
            <span className="text-lg text-gray-400">₹</span>{todayRevenue.toLocaleString('en-IN')}
          </p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:border-[#0949B3]/30 hover:shadow-[0_8px_30px_rgb(9,73,179,0.08)] transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Calendar className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">This Month</p>
          <p className="text-3xl font-black text-gray-900 flex items-center gap-1">
            <span className="text-lg text-gray-400">₹</span>{thisMonthRevenue.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:border-[#0949B3]/30 hover:shadow-[0_8px_30px_rgb(9,73,179,0.08)] transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total All-Time Revenue</p>
          <p className="text-3xl font-black text-gray-900 flex items-center gap-1">
            <span className="text-lg text-gray-400">₹</span>{totalRevenue.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-[#0949B3] mb-4">
          <IndianRupee className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Detailed Reports Coming Soon</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          We are currently integrating deeper financial reporting capabilities. You will soon be able to download tax-ready PDF invoices and month-by-month historical data.
        </p>
      </div>
    </div>
  )
}
