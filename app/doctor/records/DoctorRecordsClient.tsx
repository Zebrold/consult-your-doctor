'use client'

import { useState } from 'react'
import { Search, FileText, CalendarDays, User } from 'lucide-react'

type Record = {
  id: string
  type: string
  notes: string | null
  date: string | null
  patient_name: string
}

export function DoctorRecordsClient({ records }: { records: Record[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRecords = records.filter(r => 
    r.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Search Bar */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="relative max-w-md">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by patient name or notes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-medium"
          />
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No medical records found.
          </div>
        ) : (
          filteredRecords.map(record => (
            <div key={record.id} className="p-6 hover:bg-gray-50/50 transition-colors">
              <div className="flex flex-col md:flex-row gap-4 md:items-start">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{record.patient_name}</h3>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-gray-100 text-gray-700 uppercase">
                      {record.type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="pl-11">
                    <p className="text-gray-700 whitespace-pre-wrap">{record.notes || 'No additional notes provided.'}</p>
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
            </div>
          ))
        )}
      </div>
    </div>
  )
}
