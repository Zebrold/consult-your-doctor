'use client'

import { useState } from 'react'
import { Search, User, Phone, CalendarDays, CheckCircle2 } from 'lucide-react'
import { DoctorPrescriptionModal } from '@/components/DoctorPrescriptionModal'

export function DoctorPatientsClient({ appointments }: { appointments: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  // Sort in JS to ensure reliability
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(b.schedules.start_time).getTime() - new Date(a.schedules.start_time).getTime()
  )

  const filteredAppointments = sortedAppointments.filter(apt => {
    const patientName = apt.patient?.full_name?.toLowerCase() || ''
    const patientPhone = apt.patient?.phone_number || ''
    return patientName.includes(searchTerm.toLowerCase()) || patientPhone.includes(searchTerm)
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Search Bar */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="relative max-w-md">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by patient name or phone..." 
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
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Appointment Date</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Status</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No appointments found.
                </td>
              </tr>
            ) : (
              filteredAppointments.map(apt => {
                const patient = apt.patient
                const hasPrescription = apt.medical_records && apt.medical_records.length > 0

                return (
                  <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="font-bold text-gray-900">{patient?.full_name || 'Unknown'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {patient?.phone_number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        {new Date(apt.schedules.start_time).toLocaleString('en-IN', { 
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                        apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {apt.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex justify-end">
                      {hasPrescription ? (
                        <div className="px-4 py-2 bg-green-50 text-green-700 font-bold text-sm rounded-xl flex items-center gap-2 w-fit">
                          <CheckCircle2 className="w-4 h-4" /> Prescribed
                        </div>
                      ) : apt.status === 'cancelled' ? null : (
                        <DoctorPrescriptionModal appointmentId={apt.id} patientName={patient?.full_name || 'Unknown Patient'} />
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
