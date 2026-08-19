'use client'

import { useState } from 'react'
import { Search, User, Phone, CalendarDays } from 'lucide-react'

type Patient = {
  id: string
  full_name: string
  phone_number: string
  total_visits: number
  last_visit: string | null
  status: string
}

export function DoctorPatientsClient({ patients }: { patients: Patient[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPatients = patients.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone_number.includes(searchTerm)
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Search Bar */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="relative max-w-md">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search patients by name or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-medium"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Patient Name</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Contact</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Total Visits</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Last Visit</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Recent Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No patients found.
                </td>
              </tr>
            ) : (
              filteredPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="font-bold text-gray-900">{patient.full_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600 font-medium">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {patient.phone_number}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 bg-gray-100 inline-flex items-center justify-center px-3 py-1 rounded-lg">
                      {patient.total_visits}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600 font-medium">
                      <CalendarDays className="w-4 h-4 text-gray-400" />
                      {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                      patient.status === 'completed' ? 'bg-green-100 text-green-700' :
                      patient.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {patient.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
