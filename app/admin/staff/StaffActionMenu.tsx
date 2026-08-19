'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Edit, Trash2, Mail, X, Loader2 } from 'lucide-react'
import { updateStaffEmail } from '@/app/actions/admin'

export function StaffActionMenu({ profileId, staffId, currentEmail }: { profileId: string, staffId: string, currentEmail: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [email, setEmail] = useState(currentEmail)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleEditEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const res = await updateStaffEmail(profileId, email, staffId)
    setIsSubmitting(false)
    
    if (res.error) {
      alert(res.error)
    } else {
      setIsEditModalOpen(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          <button 
            onClick={() => {
              setIsOpen(false)
              setIsEditModalOpen(true)
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Mail className="w-4 h-4" /> Edit Email
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            onClick={() => {
              setIsOpen(false)
              alert("Delete functionality coming soon!")
            }}
          >
            <Trash2 className="w-4 h-4" /> Delete Staff
          </button>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Update Staff Email</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditEmail} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Real Contact Email</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  placeholder="staff@example.com"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This email will be used for sending Password Reset OTPs to this staff member.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#E31E24] text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
