import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Lock } from 'lucide-react'
import { ScheduleAccordionList } from './ScheduleAccordionList'

export default async function DoctorSchedulesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/doctor')

  const { data: doctor } = await supabase
    .from('doctors')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!doctor) redirect('/login/doctor')

  // Fetch upcoming slots for the next 14 days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()
  
  const twoWeeksLater = new Date(today)
  twoWeeksLater.setDate(today.getDate() + 14)
  const maxDateStr = twoWeeksLater.toISOString()

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('doctor_id', doctor.id)
    .gte('start_time', todayStr)
    .lte('start_time', maxDateStr)
    .order('start_time', { ascending: true })

  // Group by date
  const groupedSchedules: Record<string, any[]> = {}
  
  schedules?.forEach(schedule => {
    // start_time is UTC, we assume local display
    const dateKey = new Date(schedule.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (!groupedSchedules[dateKey]) {
      groupedSchedules[dateKey] = []
    }
    groupedSchedules[dateKey].push(schedule)
  })

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto h-full">
      <div className="mb-8">
        <Link href="/doctor/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              My Schedule (Next 14 Days)
            </h1>
            <p className="text-gray-500 mt-1">
              Your hospital admin generates these slots. You can block unbooked time slots if you have an emergency or need a break.
            </p>
          </div>
        </div>
      </div>

      <ScheduleAccordionList groupedSchedules={groupedSchedules} />
    </div>
  )
}
