'use client'

import { useState } from 'react'
import { Search, Calendar, User, Stethoscope, Phone } from 'lucide-react'

type Appointment = {
  id: string
  status: string
  schedules: {
    start_time: string
    end_time: string
  } | null
  patient: {
    id: string
    full_name: string
    phone_number: string
  } | null
  doctor: {
    profiles: {
      full_name: string
    } | null
    departments: {
      name: string
    } | null
    consultation_fee: number
  } | null
}

export function PatientsListClient({
  appointments,
  doctorsList,
  departmentsList
}: {
  appointments: any[]
  doctorsList: string[]
  departmentsList: string[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [doctorFilter, setDoctorFilter] = useState('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')

  // Filter the appointments
  const filteredAppointments = appointments.filter((apt) => {
    const patientName = apt.patient?.full_name?.toLowerCase() || ''
    const patientPhone = apt.patient?.phone_number || ''
    const doctorName = apt.doctor?.profiles?.full_name?.replace('Dr. ', '') || 'Unknown'
    const deptName = apt.doctor?.departments?.name || 'Unknown'
    const aptDateStr = apt.schedules?.start_time ? new Date(apt.schedules.start_time).toISOString().split('T')[0] : ''

    const matchesSearch = patientName.includes(searchTerm.toLowerCase()) || patientPhone.includes(searchTerm)
    const matchesDoctor = doctorFilter === 'All' || doctorName === doctorFilter
    const matchesDept = departmentFilter === 'All' || deptName === departmentFilter
    const matchesDate = !dateFilter || aptDateStr === dateFilter

    return matchesSearch && matchesDoctor && matchesDept && matchesDate
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filters Section */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search */}
          <div className="relative">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Search Patient</label>
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Name or Phone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium"
              />
            </div>
          </div>

          {/* Doctor Filter */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Doctor</label>
            <div className="relative">
              <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select 
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium appearance-none"
              >
                <option value="All">All Doctors</option>
                {doctorsList.map(doc => (
                  <option key={doc} value={doc}>Dr. {doc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Department</label>
            <div className="relative">
              <Stethoscope className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select 
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium appearance-none"
              >
                <option value="All">All Departments</option>
                {departmentsList.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Date</label>
            <div className="relative">
              <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium"
              />
            </div>
          </div>

        </div>
        
        {/* Reset Filters */}
        {(searchTerm || doctorFilter !== 'All' || departmentFilter !== 'All' || dateFilter) && (
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => {
                setSearchTerm('')
                setDoctorFilter('All')
                setDepartmentFilter('All')
                setDateFilter('')
              }}
              className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Patient Details</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Doctor & Dept</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Schedule</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="text-gray-400 mb-2">No patients match your filters</div>
                </td>
              </tr>
            ) : (
              filteredAppointments.map((apt: Appointment) => (
                <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{apt.patient?.full_name || 'Unknown Patient'}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      {apt.patient?.phone_number || 'No Phone'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">Dr. {apt.doctor?.profiles?.full_name?.replace('Dr. ', '') || 'Unknown Doctor'}</div>
                    <div className="text-sm text-emerald-600 font-medium mt-1">{apt.doctor?.departments?.name || 'Unknown Dept'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">
                      {apt.schedules?.start_time ? new Date(apt.schedules.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date'}
                    </div>
                    <div className="text-sm text-gray-500 font-medium mt-1">
                      {apt.schedules?.start_time ? new Date(apt.schedules.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                      apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                      apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                      apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {apt.status.toUpperCase().replace('_', ' ')}
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
