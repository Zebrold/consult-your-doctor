import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, ShieldAlert } from 'lucide-react'
import { BlockSlotButton } from './BlockSlotButton'

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

      <div className="space-y-8">
        {Object.entries(groupedSchedules).length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No Upcoming Slots</h3>
            <p className="text-gray-500 mt-1">Your hospital admin has not generated any schedule for you yet.</p>
          </div>
        ) : (
          Object.entries(groupedSchedules).map(([dateLabel, slots]) => (
            <div key={dateLabel} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  {dateLabel}
                </h2>
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {slots.length} Slots
                </span>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {slots.map(slot => {
                    const startTime = new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const endTime = new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    
                    return (
                      <div 
                        key={slot.id} 
                        className={`group relative rounded-xl border p-3 flex flex-col items-center justify-center transition-all ${
                          slot.is_booked 
                            ? 'bg-red-50 border-red-200 text-red-900 cursor-not-allowed' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold mb-1 opacity-70">
                          <Clock className="w-3 h-3" />
                          {startTime}
                        </div>
                        
                        {slot.is_booked ? (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full mt-1">
                            Booked
                          </span>
                        ) : (
                          <div className="mt-1 w-full flex justify-center">
                            <BlockSlotButton scheduleId={slot.id} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
