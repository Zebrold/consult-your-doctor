'use client'

import { useState } from 'react'
import { updateDoctorEmail } from '@/app/actions/admin'
import { Mail, Loader2, X } from 'lucide-react'

export function UpdateDoctorEmailModal({ doctorId, currentEmail }: { doctorId: string, currentEmail?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState(currentEmail || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const res = await updateDoctorEmail(doctorId, email)
    setIsSubmitting(false)
    
    if (res.error) {
      alert(res.error)
    } else {
      setIsOpen(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-[#E31E24] font-medium text-sm hover:underline cursor-pointer flex items-center justify-end gap-1"
      >
        <Mail className="w-4 h-4" /> Edit Email
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Update Doctor Email</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Real Contact Email</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  placeholder="doctor@example.com"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This email will be used for sending Password Reset OTPs to the doctor.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
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
    </>
  )
}
