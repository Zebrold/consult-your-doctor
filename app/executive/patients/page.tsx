import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Search, Phone, Calendar, Clock } from 'lucide-react'

export default async function ExecutivePatientsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/executive')

  // Fetch executive's hospital
  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('id', user.id)
    .single()

  if (!profile?.hospital_id) {
    return <div className="p-8">No hospital assigned.</div>
  }

  // Fetch all appointments at this hospital to get the unique patients
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      created_at,
      patient:profiles!appointments_patient_id_fkey ( id, full_name, phone_number, created_at ),
      doctor:doctors ( profiles!doctors_profile_id_fkey ( full_name ) )
    `)
    .eq('hospital_id', profile.hospital_id)
    .order('created_at', { ascending: false })

  // Extract and deduplicate patients
  const patientsMap = new Map()
  
  appointments?.forEach(apt => {
    const patient = apt.patient as any
    if (!patient) return
    
    if (!patientsMap.has(patient.id)) {
      patientsMap.set(patient.id, {
        ...patient,
        appointmentsCount: 1,
        latestAppointmentDate: apt.created_at,
        latestDoctor: (apt.doctor as any)?.profiles?.full_name || 'Unknown',
        latestStatus: apt.status
      })
    } else {
      const existing = patientsMap.get(patient.id)
      existing.appointmentsCount += 1
      // Since it's ordered by created_at desc, the first one encountered is the latest
    }
  })

  const uniquePatients = Array.from(patientsMap.values())

  return (
    <div className="p-4 sm:p-8 flex flex-col h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-[#E31E24]" />
          My Patients
        </h1>
        <p className="text-gray-500 mt-1">View and manage patients who have visited this branch.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search patients by name or phone..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto pb-32">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="border-b border-gray-100 text-sm">
                <th className="px-6 py-4 font-bold text-gray-500">Patient Details</th>
                <th className="px-6 py-4 font-bold text-gray-500">Contact</th>
                <th className="px-6 py-4 font-bold text-gray-500">Total Visits</th>
                <th className="px-6 py-4 font-bold text-gray-500">Latest Visit Status</th>
                <th className="px-6 py-4 font-bold text-gray-500 text-right">Latest Doctor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {uniquePatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No patients found for this branch.</td>
                </tr>
              ) : (
                uniquePatients.map(patient => (
                  <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0">
                          {patient.full_name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{patient.full_name || 'Unnamed Patient'}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            Registered {new Date(patient.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700 font-medium">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {patient.phone_number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full text-sm">
                        {patient.appointmentsCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wider ${
                        patient.latestStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        patient.latestStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {patient.latestStatus.replace('_', ' ')}
                      </span>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(patient.latestAppointmentDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700 font-medium">
                      Dr. {patient.latestDoctor}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
