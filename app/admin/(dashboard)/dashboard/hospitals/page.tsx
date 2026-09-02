import { createAdminClient } from '@/lib/supabase/admin'
import { Plus, Building2, MapPin } from 'lucide-react'
import Image from 'next/image'
import { HospitalActionMenu } from '@/app/admin/(dashboard)/hospitals/HospitalActionMenu'

export const revalidate = 0

export default async function AdminHospitalsPage() {
  const supabase = createAdminClient()
  const { data: hospitals } = await supabase.from('hospitals').select('*').order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Hospitals</h1>
          <p className="text-gray-500 mt-1">View and manage partnered hospitals.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-[#E31E24] text-white font-medium rounded-full cursor-pointer hover:bg-red-700 transition-colors">
          <Plus className="w-5 h-5 mr-2" />
          Add Hospital
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
                <th className="px-6 py-4">Hospital Name</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hospitals && hospitals.length > 0 ? (
                hospitals.map((hospital) => (
                  <tr key={hospital.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-[#E31E24] relative overflow-hidden">
                        {hospital.image_url ? (
                          <Image src={hospital.image_url} alt={hospital.name} fill className="object-cover" />
                        ) : (
                          <Building2 className="w-5 h-5" />
                        )}
                      </div>
                      {hospital.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-gray-400"/> {hospital.city}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={hospital.address}>
                      {hospital.address}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <HospitalActionMenu hospitalId={hospital.id} hospitalName={hospital.name} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No hospitals found.
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
