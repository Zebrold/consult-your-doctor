import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { CalendarClock, User, Phone, MapPin } from 'lucide-react'
import { CheckInModal } from '@/components/CheckInModal'

export default async function ExecutiveTodayAppointments() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/executive')

  const { data: profile } = await supabase.from('profiles').select('hospital_id').eq('id', user.id).single()
  if (!profile || !profile.hospital_id) redirect('/')

  // Fetch appointments for today
  // Get start and end of current day in local timezone or UTC depending on DB setup. 
  // For simplicity, we can fetch all and filter in JS if the volume is small, or use Supabase filter.
  // Using Supabase filter for today (UTC matching local day can be tricky, let's use a wide window or JS filter)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const adminClient = createAdminClient()
  const { data: appointments } = await adminClient
    .from('appointments')
    .select(`
      id,
      status,
      created_at,
      patient:profiles!appointments_patient_id_fkey ( full_name, phone_number ),
      doctor:doctors (
        specialty,
        profiles!doctors_profile_id_fkey ( full_name ),
        departments ( name )
      ),
      schedule:schedules!inner ( start_time, end_time )
    `)
    .eq('hospital_id', profile.hospital_id)
    .gte('schedule.start_time', today.toISOString())
    .lt('schedule.start_time', tomorrow.toISOString())
    .order('schedule(start_time)', { ascending: true })

  return (
    <div className="p-4 sm:p-8 flex flex-col h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <CalendarClock className="w-7 h-7 text-[#E31E24]" />
          Today's Appointments
        </h1>
        <p className="text-gray-500 mt-1">Verify patients and check them in for their appointments today.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xl">
            {appointments?.length || 0}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Today</p>
            <p className="text-gray-900 font-bold">Scheduled</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-black text-xl">
            {appointments?.filter(a => a.status === 'visited' || a.status === 'completed').length || 0}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Checked In</p>
            <p className="text-gray-900 font-bold">Arrived</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 font-black text-xl">
            {appointments?.filter(a => a.status === 'confirmed').length || 0}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Waiting</p>
            <p className="text-gray-900 font-bold">To Arrive</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-gray-50 shadow-sm z-10">
              <tr className="border-b border-gray-100 text-sm">
                <th className="px-6 py-4 font-bold text-gray-500">Patient</th>
                <th className="px-6 py-4 font-bold text-gray-500">Schedule</th>
                <th className="px-6 py-4 font-bold text-gray-500">Doctor & Dept</th>
                <th className="px-6 py-4 font-bold text-gray-500">Booked On</th>
                <th className="px-6 py-4 font-bold text-gray-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!appointments || appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <CalendarClock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No appointments scheduled for today.</p>
                  </td>
                </tr>
              ) : (
                appointments.map(apt => {
                  const pat = apt.patient as any
                  const doc = apt.doctor as any
                  const sched = apt.schedule as any
                  
                  const startTime = new Date(sched.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  const endTime = new Date(sched.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  const bookedOn = new Date(apt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  
                  return (
                    <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{pat?.full_name || 'Unknown Patient'}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {pat?.phone_number || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold text-sm">
                          {startTime} - {endTime}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">Dr. {doc?.profiles?.full_name}</div>
                        <div className="text-xs text-gray-500">{doc?.departments?.name} • {doc?.specialty}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-500">{bookedOn}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <CheckInModal appointmentId={apt.id} currentStatus={apt.status} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
