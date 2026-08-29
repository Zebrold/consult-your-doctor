'use client'

import { useState } from 'react'
import { Search, FileText, CalendarDays, User, Phone, ChevronDown, ChevronUp } from 'lucide-react'

type Record = {
  id: string
  type: string
  notes: string | null
  date: string | null
  patient_name: string
  patient_phone: string
}

function PatientRecordRow({ group }: { group: any }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div 
        className="p-6 hover:bg-gray-50/50 transition-colors border-b border-gray-100 cursor-pointer group-row"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{group.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                <Phone className="w-3.5 h-3.5" />
                {group.phone}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-sm font-medium text-gray-500">
              {group.records.length} Record{group.records.length !== 1 ? 's' : ''}
            </div>
            <button className="p-2 text-gray-400 group-hover:text-gray-600 transition-colors">
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="bg-gray-50/30 p-6 border-b border-gray-100">
          <h4 className="text-sm font-bold text-gray-900 mb-4">Medical Records History</h4>
          <div className="space-y-3">
            {group.records.map((record: Record) => (
              <div key={record.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 md:items-start">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-gray-100 text-gray-700 uppercase">
                      {record.type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="pl-11">
                    <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{record.notes || 'No additional notes provided.'}</p>
                  </div>
                </div>

                <div className="md:w-48 shrink-0 flex flex-col md:items-end gap-1 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    {record.date ? new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date'}
                  </div>
                  <div className="mr-5">
                    {record.date ? new Date(record.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export function DoctorRecordsClient({ records }: { records: Record[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.patient_phone.includes(searchTerm) ||
      (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      
    const matchesType = typeFilter === 'all' || r.type === typeFilter
    
    return matchesSearch && matchesType
  })

  // Group by phone number
  const groupedRecordsMap = filteredRecords.reduce((acc: any, record) => {
    const phone = record.patient_phone || 'No Phone'
    if (!acc[phone]) {
      acc[phone] = {
        name: record.patient_name || 'Unknown',
        phone: phone,
        records: []
      }
    }
    acc[phone].records.push(record)
    return acc
  }, {})

  const groupedPatients = Object.values(groupedRecordsMap)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filters Bar */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full max-w-md">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by patient name, phone, or notes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors font-medium"
          />
        </div>
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-bold text-gray-700 outline-none"
        >
          <option value="all">All Document Types</option>
          <option value="prescription">Prescription</option>
          <option value="lab_result">Lab Result</option>
          <option value="clinical_note">Clinical Note</option>
        </select>
      </div>

      {/* List */}
      <div className="flex flex-col">
        {groupedPatients.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No medical records found.
          </div>
        ) : (
          groupedPatients.map((group: any) => (
            <PatientRecordRow key={group.phone} group={group} />
          ))
        )}
      </div>
    </div>
  )
}
