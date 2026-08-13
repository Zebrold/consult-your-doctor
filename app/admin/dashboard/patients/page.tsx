import { createAdminClient } from '@/lib/supabase/admin'
import { Users, Mail, Phone, Calendar } from 'lucide-react'

export const revalidate = 0

export default async function AdminPatientsPage() {
  const supabase = createAdminClient()
  const { data: patients } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'patient')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Patients</h1>
          <p className="text-gray-500 mt-1">View and manage registered patients on the platform.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients && patients.length > 0 ? (
                patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Users className="w-5 h-5" />
                      </div>
                      {patient.full_name || 'Anonymous User'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex flex-col gap-1">
                        {patient.phone && (
                           <span className="flex items-center gap-2 text-sm"><Phone className="w-3.5 h-3.5 text-gray-400"/> {patient.phone}</span>
                        )}
                        {patient.email && (
                           <span className="flex items-center gap-2 text-sm"><Mail className="w-3.5 h-3.5 text-gray-400"/> {patient.email}</span>
                        )}
                        {!patient.phone && !patient.email && 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400"/> {new Date(patient.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[#E31E24] font-medium text-sm hover:underline cursor-pointer">View Details</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No patients found.
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
