import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, Clock, MapPin, User, Stethoscope } from 'lucide-react'
import { ExecutiveStatusSelect } from '@/components/ExecutiveStatusSelect'

export default async function ExecutiveDashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/executive')

  // Fetch all appointments assigned to this executive
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      patient:profiles!appointments_patient_id_fkey ( full_name, phone_number ),
      doctor:doctors (
        specialty,
        profiles!doctors_profile_id_fkey ( full_name )
      ),
      schedules (
        start_time,
        end_time
      )
    `)
    .eq('executive_id', user.id)
    .order('created_at', { ascending: false })

  // Statistics
  const todayStart = new Date()
  todayStart.setHours(0,0,0,0)
  
  const totalAssigned = appointments?.length || 0
  const todayAppointments = appointments?.filter(apt => new Date(apt.schedules.start_time) >= todayStart).length || 0
  const pendingCheckins = appointments?.filter(apt => apt.status === 'confirmed').length || 0

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Assigned</p>
          <p className="text-3xl font-black text-gray-900">{totalAssigned}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Today's Schedule</p>
          <p className="text-3xl font-black text-gray-900">{todayAppointments}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E31E24]/20 shadow-sm bg-red-50/30">
          <p className="text-sm font-medium text-[#E31E24] mb-1">Pending Check-ins</p>
          <p className="text-3xl font-black text-[#E31E24]">{pendingCheckins}</p>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Assigned Patients</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {appointments?.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No patients assigned to you yet.</p>
            </div>
          ) : (
            appointments?.map(apt => {
              const date = new Date(apt.schedules.start_time)
              return (
                <div key={apt.id} className="p-6 flex flex-col md:flex-row gap-6 md:items-center hover:bg-gray-50/50 transition-colors">
                  
                  {/* Patient Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{apt.patient.full_name}</h3>
                      <ExecutiveStatusSelect appointmentId={apt.id} currentStatus={apt.status} />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">{apt.patient.phone_number}</p>
                  </div>

                  {/* Doctor Info */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Dr. {apt.doctor.profiles.full_name}</p>
                      <p className="text-xs text-gray-500">{apt.doctor.specialty}</p>
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-xl p-3 flex gap-4">
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-0.5">Date</p>
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#E31E24]" />
                          {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-0.5">Time</p>
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#E31E24]" />
                          {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
