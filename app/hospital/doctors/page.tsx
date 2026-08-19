import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Plus, Search, CalendarPlus } from 'lucide-react'
import Link from 'next/link'
import { HospitalCreateDoctorModal } from '@/components/HospitalCreateDoctorModal'

export default async function HospitalDoctors() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/hospital')

  // Verify hospital admin
  const { data: profile } = await supabase.from('profiles').select('hospital_id').eq('id', user.id).single()
  if (!profile || !profile.hospital_id) redirect('/')

  // Fetch doctors for this hospital
  const { data: doctors } = await supabase
    .from('doctors')
    .select(`
      id,
      specialty,
      experience_years,
      consultation_fee,
      profiles!doctors_profile_id_fkey ( full_name, phone_number, created_at ),
      departments ( name )
    `)
    .eq('hospital_id', profile.hospital_id)
    .order('created_at', { referencedTable: 'profiles', ascending: false })

  return (
    <div className="p-4 sm:p-8 flex flex-col h-full">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Doctors</h1>
          <p className="text-gray-500">Manage physicians registered at your hospital.</p>
        </div>
        <HospitalCreateDoctorModal />
      </div>

      {/* Doctors List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="px-6 py-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search doctors by name or specialty..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="border-b border-gray-100 text-sm">
                <th className="px-6 py-4 font-bold text-gray-500">Doctor Profile</th>
                <th className="px-6 py-4 font-bold text-gray-500">Department</th>
                <th className="px-6 py-4 font-bold text-gray-500">Experience</th>
                <th className="px-6 py-4 font-bold text-gray-500">Fee</th>
                <th className="px-6 py-4 font-bold text-gray-500 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {doctors?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No doctors found.</td>
                </tr>
              ) : (
                doctors?.map(doc => {
                  const profile: any = doc.profiles
                  const department: any = doc.departments
                  return (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                          {profile.full_name.replace('Dr. ', '').charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">Dr. {profile.full_name.replace('Dr. ', '')}</div>
                          <div className="text-xs font-medium text-gray-500">{profile.phone_number || 'No contact info'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-700">{department?.name || doc.specialty}</div>
                      <div className="text-xs text-gray-500">{doc.specialty}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{doc.experience_years} Years</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">₹{doc.consultation_fee}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/hospital/doctors/${doc.id}/schedule`}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        Manage Schedule
                      </Link>
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
