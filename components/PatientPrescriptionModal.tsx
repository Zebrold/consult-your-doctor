'use client'

import { useState } from 'react'
import { FileText, Download, X } from 'lucide-react'

interface MedicalRecord {
  notes: string
  file_url: string
}

export function PatientPrescriptionModal({ record, doctorName }: { record: MedicalRecord, doctorName: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-colors"
      >
        <FileText className="w-5 h-5" />
        View Prescription
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Prescription</h3>
                  <p className="text-sm text-gray-500">Dr. {doctorName}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Doctor's Notes</h4>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap font-medium">
                    {record.notes}
                  </p>
                </div>
              </div>

              {record.file_url && record.file_url !== 'none' && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Attached Document</h4>
                  <a 
                    href={record.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download PDF / Image
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
