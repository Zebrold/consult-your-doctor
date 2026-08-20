'use client'

import { useState } from 'react'
import { Search, Building2 } from 'lucide-react'
import { StaffActionMenu } from './StaffActionMenu'

type StaffMember = {
  id: string
  full_name: string
  role: string
  created_at: string
  hospital: { name: string } | null
  generatedId: string
  email: string
}

type Hospital = {
  id: string
  name: string
}

export function StaffListClient({ initialStaff, hospitals }: { initialStaff: StaffMember[], hospitals: Hospital[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'doctor' | 'hospital_admin' | 'executive'>('all')
  const [hospitalFilter, setHospitalFilter] = useState<string>('all')

  const filteredStaff = initialStaff.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.generatedId.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || s.role === roleFilter
    
    // Only apply hospital filter if we are specifically looking at doctors (per requirements)
    // Or we could apply it generally. The user said: "When doctor is toggled, then display the option to view all the hospitals"
    const matchesHospital = hospitalFilter === 'all' || (s.hospital as any)?.name === hospitals.find(h => h.id === hospitalFilter)?.name

    return matchesSearch && matchesRole && matchesHospital
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col min-h-0">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-4">
        
        {/* Top Row: Search and Role Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search staff by name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto w-full sm:w-auto">
            {['all', 'doctor', 'hospital_admin', 'executive'].map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role as any)
                  if (role !== 'doctor') setHospitalFilter('all') // Reset hospital filter if not doctor
                }}
                className={`px-4 py-1.5 text-sm font-bold rounded-md whitespace-nowrap transition-all ${
                  roleFilter === role 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {role === 'all' ? 'All Staff' : role === 'hospital_admin' ? 'Hospitals' : role.charAt(0).toUpperCase() + role.slice(1) + 's'}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Row: Hospital Filter (Only visible if Doctors is selected) */}
        {roleFilter === 'doctor' && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-bold text-gray-700">Filter by Hospital:</span>
            <select
              value={hospitalFilter}
              onChange={(e) => setHospitalFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 bg-white"
            >
              <option value="all">All Hospitals</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-auto pb-32">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white shadow-sm z-10">
            <tr className="border-b border-gray-100 text-sm">
              <th className="px-6 py-4 font-bold text-gray-500">User Profile</th>
              <th className="px-6 py-4 font-bold text-gray-500">System Role</th>
              <th className="px-6 py-4 font-bold text-gray-500">Assigned Hospital</th>
              <th className="px-6 py-4 font-bold text-gray-500 text-right">Joined</th>
              <th className="px-6 py-4 font-bold text-gray-500 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                  No staff matching your filters.
                </td>
              </tr>
            ) : (
              filteredStaff.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                        {s.full_name?.replace('Dr. ', '').charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{s.full_name || 'Unnamed User'}</div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID: {s.generatedId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                      s.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
                      s.role === 'hospital_admin' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {s.role.toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {(s.hospital as any)?.name || 'Unassigned'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500 font-medium">
                    {new Date(s.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <StaffActionMenu profileId={s.id} staffId={s.generatedId} currentEmail={s.email} />
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
