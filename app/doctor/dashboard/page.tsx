import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Calendar, Clock, User, FileText, CheckCircle2 } from 'lucide-react'
import { DoctorPrescriptionModal } from '@/components/DoctorPrescriptionModal'

export default async function DoctorDashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/doctor')

  // Verify doctor
  const { data: doctor } = await supabase.from('doctors').select('id, profiles!doctors_profile_id_fkey ( full_name )').eq('profile_id', user.id).single()
  if (!doctor) redirect('/')

  // Fetch today's appointments for this doctor
  const todayStart = new Date()
  todayStart.setHours(0,0,0,0)
  
  // Actually, we'll fetch all appointments for demo purposes, since we pushed seed data 7 days into the future.
  const adminClient = createAdminClient()
  const { data: appointments } = await adminClient
    .from('appointments')
    .select(`
      id,
      status,
      patient:profiles!appointments_patient_id_fkey ( full_name, phone_number ),
      schedules (
        start_time,
        end_time
      ),
      medical_records (
        id,
        notes
      )
    `)
    .eq('doctor_id', doctor.id)
    .order('created_at', { ascending: false })

  const totalPatients = appointments?.length || 0
  const completed = appointments?.filter(a => a.status === 'completed').length || 0
  const pending = totalPatients - completed

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, Dr. {(doctor.profiles as any).full_name.replace('Dr. ', '')}</h1>
        <p className="text-gray-500">Here is your schedule overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Appointments</p>
          <p className="text-3xl font-black text-gray-900">{totalPatients}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-blue-600 mb-1">Pending Consultations</p>
          <p className="text-3xl font-black text-blue-600">{pending}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-green-600 mb-1">Completed Today</p>
          <p className="text-3xl font-black text-green-600">{completed}</p>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Your Patients</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {appointments?.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No appointments scheduled.</p>
            </div>
          ) : (
            appointments?.map(apt => {
              const schedule: any = apt.schedules
              const patient: any = apt.patient
              const date = new Date(schedule.start_time)
              const hasPrescription = apt.medical_records && apt.medical_records.length > 0
              
              return (
                <div key={apt.id} className="p-6 flex flex-col md:flex-row gap-6 md:items-center hover:bg-gray-50/50 transition-colors">
                  
                  {/* Time Info */}
                  <div className="w-32">
                    <p className="text-xl font-black text-gray-900">{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-xs font-bold text-gray-500">{date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{patient?.full_name || 'Unknown Patient'}</h3>
                      <p className="text-sm text-gray-500 font-medium">{patient?.phone_number || 'No phone number'}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-1 flex items-center justify-center">
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${
                      apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                      apt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {apt.status.replace('_', ' ')}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="flex-1 flex justify-end">
                    {apt.status === 'completed' || hasPrescription ? (
                      <div className="px-4 py-2 bg-green-50 text-green-700 font-bold text-sm rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Prescribed
                      </div>
                    ) : (
                      <DoctorPrescriptionModal appointmentId={apt.id} patientName={patient?.full_name || 'Unknown Patient'} />
                    )}
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
