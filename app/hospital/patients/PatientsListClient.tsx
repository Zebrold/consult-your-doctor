'use client'

import { useState } from 'react'
import { Search, Calendar, User, Stethoscope, Phone, ChevronDown, ChevronUp } from 'lucide-react'

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

function PatientGroupRow({ group }: { group: any }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr 
        className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="font-bold text-gray-900">{group.name}</div>
              <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3.5 h-3.5" />
                {group.phone}
              </div>
            </div>
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
          <td colSpan={3} className="p-0 bg-gray-50/30">
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-4 px-2">Appointment History</h4>
              <div className="space-y-3">
                {group.appointments.map((apt: Appointment) => (
                  <div key={apt.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="font-bold text-gray-900">Dr. {apt.doctor?.profiles?.full_name?.replace('Dr. ', '') || 'Unknown Doctor'}</div>
                        <div className="text-sm text-emerald-600 font-medium flex items-center gap-1 mt-1">
                          <Stethoscope className="w-3.5 h-3.5" />
                          {apt.doctor?.departments?.name || 'Unknown Dept'}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {apt.schedules?.start_time ? new Date(apt.schedules.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date'}
                        </div>
                        <div className="text-sm text-gray-500 font-medium pl-5.5 mt-1">
                          {apt.schedules?.start_time ? new Date(apt.schedules.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="shrink-0 flex items-center justify-end">
                      <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                        apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {apt.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
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

  // Sort by date first to ensure when we group them, the latest appointment is first
  const sortedAppointments = [...appointments].sort((a, b) => {
    const aTime = a.schedules?.start_time ? new Date(a.schedules.start_time).getTime() : 0;
    const bTime = b.schedules?.start_time ? new Date(b.schedules.start_time).getTime() : 0;
    return bTime - aTime;
  });

  // Filter the appointments
  const filteredAppointments = sortedAppointments.filter((apt) => {
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
              <th className="px-6 py-4 font-bold text-gray-500 text-sm">Appointments</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-sm text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groupedPatients.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center">
                  <div className="text-gray-400 mb-2">No patients match your filters</div>
                </td>
              </tr>
            ) : (
              groupedPatients.map((group: any) => (
                <PatientGroupRow key={group.phone} group={group} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
