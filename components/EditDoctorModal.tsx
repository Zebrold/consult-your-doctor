'use client'

import { useState } from 'react'
import { Edit2, X, MapPin, FileText, Award, Phone } from 'lucide-react'
import { updateDoctorDetails } from '@/app/actions/admin'

type EditDoctorModalProps = {
  doctor: {
    id: string // Doctor ID
    profile_id: string
    specialty: string
    experience_years: number
    consultation_fee: number
    address?: string | null
    bio?: string | null
    qualifications?: string | null
    profiles: {
      full_name: string
      phone_number: string | null
    }
  }
}

export function EditDoctorModal({ doctor }: EditDoctorModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.append('doctorId', doctor.id)
    formData.append('profileId', doctor.profile_id)
    
    const result = await updateDoctorDetails(formData)
    
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setIsOpen(false)
      setIsLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Edit2 className="w-4 h-4" />
        Edit Details
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900">Edit Doctor Profile</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Doctor Name</label>
                  <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-medium cursor-not-allowed">
                    {doctor.profiles.full_name}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Name cannot be changed here.</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={doctor.profiles.phone_number || ''}
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Specialty</label>
                  <input
                    name="specialty"
                    type="text"
                    required
                    defaultValue={doctor.specialty}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Experience (Years)</label>
                  <input
                    name="experience"
                    type="number"
                    required
                    min="0"
                    defaultValue={doctor.experience_years}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Consultation Fee (₹)</label>
                  <input
                    name="fee"
                    type="number"
                    required
                    min="0"
                    defaultValue={doctor.consultation_fee}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    Clinic / Office Address
                  </label>
                  <textarea
                    name="address"
                    rows={2}
                    defaultValue={doctor.address || ''}
                    placeholder="Enter the full address where the doctor consults..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <Award className="w-4 h-4 text-gray-400" />
                    Qualifications
                  </label>
                  <input
                    name="qualifications"
                    type="text"
                    defaultValue={doctor.qualifications || ''}
                    placeholder="e.g. MBBS, MD (Cardiology), FACC"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    Biography / About
                  </label>
                  <textarea
                    name="bio"
                    rows={4}
                    defaultValue={doctor.bio || ''}
                    placeholder="Brief description about the doctor's expertise and background..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 sticky bottom-0 bg-white pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-[#E31E24] hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
