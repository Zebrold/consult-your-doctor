'use client'

import { useState } from 'react'
import { MoreVertical, KeyRound, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { ManageDiagnosticCredentialsModal } from '@/components/ManageDiagnosticCredentialsModal'
// Add this server action to admin.ts: export async function deleteDiagnosticCenter(id: string) { ... }
import { deleteDiagnosticCenter } from '@/app/actions/admin'

export function DiagnosticActionMenu({ centerId, centerName }: { centerId: string, centerName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showManageCreds, setShowManageCreds] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    const res = await deleteDiagnosticCenter(centerId)
    setIsDeleting(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setShowDeleteConfirm(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20">
            <button 
              onClick={() => { setShowManageCreds(true); setIsOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-blue-600" />
              Manage Credentials
            </button>
            <div className="h-px bg-gray-100 my-1 mx-2" />
            <button 
              onClick={() => { setShowDeleteConfirm(true); setIsOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              Delete Center
            </button>
          </div>
        </>
      )}

      {/* Existing Credentials Modal */}
      {showManageCreds && (
        <ManageDiagnosticCredentialsModal 
          centerId={centerId} 
          centerName={centerName} 
          onClose={() => setShowManageCreds(false)} 
          isOpen={showManageCreds}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center">Delete Center?</h2>
              <p className="text-gray-500 text-sm mt-2 text-center">
                Are you sure you want to permanently delete <strong>{centerName}</strong>? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 py-3 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
