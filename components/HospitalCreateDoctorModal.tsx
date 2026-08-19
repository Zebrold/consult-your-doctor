'use client'

import { useState } from 'react'
import { Plus, X, User, Loader2, CheckCircle2 } from 'lucide-react'
import { createHospitalDoctor } from '@/app/actions/hospital'

export function HospitalCreateDoctorModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<{ id: string, name: string } | null>(null)
  const [specialty, setSpecialty] = useState('')
  const [customSpecialty, setCustomSpecialty] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    const fullName = formData.get('fullName') as string
    
    const result = await createHospitalDoctor(formData)
    
    if (result.error) {
      setError(result.error)
    } else {
      setSuccessData({ id: result.doctorId as string, name: fullName })
    }
    
    setIsPending(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Doctor
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <User className="w-7 h-7 text-emerald-600" />
                Add New Doctor
              </h2>
              <button 
                onClick={() => { setIsOpen(false); setSuccessData(null); setError(''); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {successData ? (
                <div className="text-center space-y-6 py-8">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Doctor Added!</h3>
                    <p className="text-gray-500 font-medium">Please securely share these login credentials with {successData.name}.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl p-6 text-left border border-gray-100 shadow-inner max-w-sm mx-auto">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Doctor Login ID</p>
                      <p className="text-2xl font-black text-emerald-600 font-mono tracking-wide">{successData.id}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setIsOpen(false)
                      setSuccessData(null)
                      setSpecialty('')
                      setCustomSpecialty('')
                    }}
                    className="w-full max-w-sm mx-auto py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors block"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-200">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Doctor's Full Name</label>
                      <input 
                        required 
                        type="text" 
                        name="fullName"
                        className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-900 bg-white" 
                        placeholder="e.g. Jane Doe" 
                      />
                      <p className="text-xs text-gray-500 mt-1.5">We will generate their unique CYD ID based on their name.</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Account Password</label>
                      <input 
                        required 
                        type="text" 
                        name="password"
                        className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-900 bg-white" 
                        placeholder="Set a secure password" 
                      />
                    </div>

                    <div className="md:col-span-2 pt-4 border-t border-gray-100">
                      <h3 className="font-bold text-gray-900 mb-4">Medical Profile</h3>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Specialty</label>
                      <select 
                        required={specialty !== 'Other'}
                        name={specialty === 'Other' ? '' : 'specialty'} 
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-900 bg-white"
                      >
                        <option value="">Select Specialty</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Orthopaedics">Orthopaedics</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="General Medicine">General Medicine</option>
                        <option value="Dermatology">Dermatology</option>
                        <option value="Gynecology">Gynecology</option>
                        <option value="General Surgery">General Surgery</option>
                        <option value="Ophthalmology">Ophthalmology</option>
                        <option value="ENT">ENT</option>
                        <option value="Other">Other (Please specify)</option>
                      </select>
                      
                      {specialty === 'Other' && (
                        <input 
                          required 
                          type="text" 
                          name="specialty"
                          value={customSpecialty}
                          onChange={(e) => setCustomSpecialty(e.target.value)}
                          className="w-full mt-3 border border-gray-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-900 bg-white" 
                          placeholder="Type custom specialty..." 
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Experience (Years)</label>
                      <input 
                        required 
                        type="number" 
                        name="experienceYears"
                        min="0"
                        className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-900 bg-white" 
                        placeholder="e.g. 10" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Consultation Fee (₹)</label>
                      <input 
                        required 
                        type="number" 
                        name="consultationFee"
                        min="0"
                        step="50"
                        className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-900 bg-white" 
                        placeholder="e.g. 500" 
                      />
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-gray-100">
                    <button 
                      disabled={isPending}
                      type="submit" 
                      className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Doctor'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
