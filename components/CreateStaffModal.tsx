'use client'

import { useState } from 'react'
import { createStaffAccount } from '@/app/actions/admin'
import { Plus, X, Loader2 } from 'lucide-react'

export function CreateStaffModal({ hospitals }: { hospitals: { id: string, name: string }[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [role, setRole] = useState('executive')
  const [error, setError] = useState('')
  const [createdInfo, setCreatedInfo] = useState<{ adminId: string, password?: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await createStaffAccount(formData)
      if (res.error) {
        setError(res.error)
      } else if (res.adminId) {
        setCreatedInfo({ adminId: res.adminId, password: res.password })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
      >
        <Plus className="w-4 h-4" /> Provision Staff
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Create Staff Account</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-6 p-4 bg-red-50 text-red-600 font-bold text-sm rounded-xl">
                {error}
              </div>
            )}

            {createdInfo ? (
              <div className="p-8 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Staff Created!</h3>
                  <p className="text-gray-500 mb-6">Please save these login credentials securely. They will not be shown again.</p>
                  
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-left space-y-3">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Staff ID / Login</p>
                      <p className="text-xl font-black text-indigo-600 font-mono tracking-wide">{createdInfo.adminId}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Temporary Password</p>
                      <p className="text-lg font-bold text-gray-900 font-mono">{createdInfo.password}</p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => { setIsOpen(false); setCreatedInfo(null); }}
                  className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                  <input required name="fullName" type="text" className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 placeholder-gray-400" placeholder="e.g. John Doe" />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Temporary Password</label>
                    <input required name="password" type="text" className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 placeholder-gray-400" placeholder="Pass@123" />
                  </div>
                </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Assign to Hospital</label>
                <select required name="hospitalId" className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white">
                  <option value="">Select a hospital...</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Platform Role</label>
                <select required name="role" value={role} onChange={e => setRole(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white">
                  <option value="executive">Hospital Executive</option>
                  <option value="doctor">Doctor</option>
                  <option value="hospital_admin">Hospital Admin</option>
                </select>
              </div>

              {role === 'doctor' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-indigo-900 mb-1.5">Specialty</label>
                    <select required name="specialty" className="w-full border border-indigo-200 rounded-xl p-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 bg-white">
                      <option value="">Select Specialty</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Orthopaedics">Orthopaedics</option>
                      <option value="General Medicine">General Medicine</option>
                      <option value="Pediatrics">Pediatrics</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-indigo-900 mb-1.5">Consultation Fee (₹)</label>
                    <input required name="fee" type="number" defaultValue="500" className="w-full border border-indigo-200 rounded-xl p-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-indigo-900 mb-1.5">Experience (Years)</label>
                    <input required name="experience" type="number" defaultValue="5" className="w-full border border-indigo-200 rounded-xl p-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900" />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Account
                </button>
              </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
