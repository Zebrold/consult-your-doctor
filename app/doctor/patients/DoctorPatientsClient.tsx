'use client'

import { useState } from 'react'
import { Search, User, Phone, CalendarDays, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { DoctorPrescriptionModal } from '@/components/DoctorPrescriptionModal'

function PatientRow({ group }: { group: any }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr 
        className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <div className="font-bold text-gray-900">{group.name}</div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2 text-gray-600 font-medium">
            <Phone className="w-4 h-4 text-gray-400" />
            {group.phone}
          </div>
        </td>
        <td className="px-6 py-4 font-medium text-gray-500">
          {group.appointments.length} Appointment{group.appointments.length !== 1 ? 's' : ''}
        </td>
        <td className="px-6 py-4 text-right">
          <button className="p-2 text-gray-400 group-hover:text-gray-600 transition-colors">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={4} className="p-0 bg-gray-50/30">
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-4 px-2">Appointment History</h4>
              <div className="space-y-2">
                {group.appointments.map((apt: any) => {
                  const hasPrescription = apt.medical_records && apt.medical_records.length > 0
                  return (
                    <div key={apt.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        {new Date(apt.schedules.start_time).toLocaleString('en-IN', { 
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                          apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                          apt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {apt.status.toUpperCase().replace('_', ' ')}
                        </span>
                        
                        <div className="w-36 flex justify-end">
                          {hasPrescription ? (
                            <div className="px-4 py-2 bg-green-50 text-green-700 font-bold text-sm rounded-xl flex items-center gap-2 w-fit">
                              <CheckCircle2 className="w-4 h-4" /> Prescribed
                            </div>
                          ) : apt.status === 'cancelled' ? null : (
                            <DoctorPrescriptionModal appointmentId={apt.id} patientName={group.name} />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function DoctorPatientsClient({ appointments }: { appointments: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Sort by date first to ensure when we group them, the latest appointment is first
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(b.schedules.start_time).getTime() - new Date(a.schedules.start_time).getTime()
  )

  // Filter before grouping
  const filteredAppointments = sortedAppointments.filter(apt => {
    const patientName = apt.patient?.full_name?.toLowerCase() || ''
    const patientPhone = apt.patient?.phone_number || ''
    const matchesSearch = patientName.includes(searchTerm.toLowerCase()) || patientPhone.includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Group by phone number
  const groupedPatientsMap = filteredAppointments.reduce((acc: any, apt) => {
    const phone = apt.patient?.phone_number || 'No Phone'
    if (!acc[phone]) {
      acc[phone] = {
        name: apt.patient?.full_name || 'Unknown',
        phone: phone,
        appointments: []
      }
    }
    acc[phone].appointments.push(apt)
    return acc
  }, {})

  const groupedPatients = Object.values(groupedPatientsMap)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filters Bar */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full max-w-md">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by patient name or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-medium"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-700 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="pending_payment">Pending Payment</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Patient Name</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Contact</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Appointments</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groupedPatients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  No patients found.
                </td>
              </tr>
            ) : (
              groupedPatients.map((group: any) => (
                <PatientRow key={group.phone} group={group} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
