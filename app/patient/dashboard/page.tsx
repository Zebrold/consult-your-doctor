import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Calendar, Clock, MapPin, Building2, User, FileText, Download, Activity } from 'lucide-react'
import { PatientPrescriptionModal } from '@/components/PatientPrescriptionModal'

export default async function PatientDashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/patient')

  // Fetch all appointments for this patient
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      doctors (
        specialty,
        profiles ( full_name )
      ),
      hospitals (
        name,
        city
      ),
      schedules (
        start_time
      ),
      medical_records (
        id,
        notes,
        file_url
      )
    `)
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch all diagnostic bookings
  const { data: diagnosticBookings } = await supabase
    .from('diagnostic_bookings')
    .select(`
      id,
      status,
      test_name,
      preferred_date,
      diagnostic_centers (
        name,
        city,
        address
      )
    `)
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 py-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
            <p className="text-gray-600 mt-2">Manage your upcoming consultations and medical history.</p>
          </div>
        </div>

        {appointments?.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No appointments yet</h3>
            <p className="text-gray-500">You haven't booked any consultations yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appointments?.map(apt => {
              const doctor: any = apt.doctors
              const hospital: any = apt.hospitals
              const schedule: any = apt.schedules
              const records: any = apt.medical_records
              const date = new Date(schedule.start_time)
              const isPassed = date.getTime() < new Date().getTime()
              const hasPrescription = records && records.length > 0
              
              return (
                <div key={apt.id} className={`rounded-2xl shadow-sm border p-6 flex flex-col transition-all ${
                  isPassed ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-100'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1.5">
                      <span className={`w-fit px-3 py-1 text-[10px] font-bold rounded-full tracking-wider ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-700' :
                        apt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {apt.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {isPassed && (
                        <span className="w-fit px-3 py-1 text-[10px] font-bold rounded-full tracking-wider bg-gray-200 text-gray-600">
                          PAST APPOINTMENT
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Booking ID</span>
                      <span className="text-lg font-black text-gray-900 tracking-wider bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
                        {apt.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1 mt-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPassed ? 'bg-gray-200' : 'bg-blue-50'}`}>
                        <User className={`w-5 h-5 ${isPassed ? 'text-gray-500' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <p className={`font-bold ${isPassed ? 'text-gray-700' : 'text-gray-900'}`}>Dr. {doctor.profiles.full_name}</p>
                        <p className="text-xs text-gray-500">{doctor.specialty}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4 shrink-0 text-gray-400" />
                      <span className="truncate">{hospital.name}, {hospital.city}</span>
                    </div>

                    <div className={`flex items-center gap-4 p-3 rounded-xl mt-4 ${isPassed ? 'bg-gray-200/50' : 'bg-gray-50'}`}>
                      <div className={`flex items-center gap-2 text-sm font-semibold ${isPassed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        <Calendar className={`w-4 h-4 ${isPassed ? 'text-gray-400' : 'text-[#E31E24]'}`} />
                        {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className={`flex items-center gap-2 text-sm font-semibold ${isPassed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        <Clock className={`w-4 h-4 ${isPassed ? 'text-gray-400' : 'text-[#E31E24]'}`} />
                        {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  {apt.status === 'pending_payment' && (
                    <a href={`/patient/checkout/${apt.id}`} className="mt-6 block w-full py-2.5 bg-[#E31E24] text-white text-center font-semibold rounded-xl hover:bg-red-700 transition-colors">
                      Complete Payment
                    </a>
                  )}

                  {/* Prescription Section */}
                  {hasPrescription && (
                    <PatientPrescriptionModal 
                      record={records[0]} 
                      doctorName={doctor.profiles.full_name} 
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {diagnosticBookings && diagnosticBookings.length > 0 && (
          <div className="mt-16">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Diagnostic Tests</h2>
                <p className="text-gray-600 mt-2">Your booked diagnostic tests and checkups.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {diagnosticBookings.map(booking => {
                const center: any = booking.diagnostic_centers
                const date = new Date(booking.preferred_date)
                
                return (
                  <div key={booking.id} className="rounded-2xl shadow-sm border p-6 flex flex-col transition-all bg-white border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`w-fit px-3 py-1 text-[10px] font-bold rounded-full tracking-wider ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {booking.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Booking ID</span>
                        <span className="text-lg font-black text-gray-900 tracking-wider bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
                          {booking.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 flex-1 mt-2">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-purple-50">
                          <Activity className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 capitalize">{booking.test_name.replace(/-/g, ' ')}</p>
                          <p className="text-xs text-gray-500">Diagnostic Test</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4 shrink-0 text-gray-400" />
                        <span className="truncate">{center.name}, {center.city}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4 shrink-0 text-gray-400 mt-0.5" />
                        <span className="line-clamp-2 text-xs">{center.address}</span>
                      </div>

                      <div className="flex items-center gap-4 p-3 rounded-xl mt-4 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <Calendar className="w-4 h-4 text-[#E31E24]" />
                          {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
