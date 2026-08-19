import { createAdminClient } from '@/lib/supabase/admin'
import { Plus, Stethoscope, Star } from 'lucide-react'
import Image from 'next/image'
import { UpdateDoctorEmailModal } from './UpdateDoctorEmailModal'

export const revalidate = 0

export default async function AdminDoctorsPage() {
  const supabase = createAdminClient()
  const { data: doctors } = await supabase
    .from('doctors')
    .select(`
      *,
      hospitals (name),
      profiles!doctors_profile_id_fkey ( email )
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Doctors</h1>
          <p className="text-gray-500 mt-1">View and manage doctor profiles across all hospitals.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-[#E31E24] text-white font-medium rounded-full cursor-pointer hover:bg-red-700 transition-colors">
          <Plus className="w-5 h-5 mr-2" />
          Add Doctor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
                <th className="px-6 py-4">Doctor Info</th>
                <th className="px-6 py-4">Speciality</th>
                <th className="px-6 py-4">Hospital</th>
                <th className="px-6 py-4">Experience</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {doctors && doctors.length > 0 ? (
                doctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-red-50 flex items-center justify-center text-[#E31E24] flex-shrink-0">
                        {doctor.image_url ? (
                           <Image src={doctor.image_url} alt={doctor.name} width={40} height={40} className="object-cover" />
                        ) : (
                           <Stethoscope className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{doctor.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400"/> 
                          {doctor.rating} ({doctor.reviews_count} reviews)
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full">
                        {doctor.speciality}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {doctor.hospitals?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {doctor.experience_years} Years
                    </td>
                    <td className="px-6 py-4 text-right">
                      <UpdateDoctorEmailModal doctorId={doctor.id} currentEmail={doctor.profiles?.email} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No doctors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
