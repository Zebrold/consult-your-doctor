'use client'

import { useState } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { updatePatientProfile } from '@/app/actions/patient_profile'

export function EditProfileModal({ 
  isOpen, 
  onClose, 
  user, 
  profile, 
  patientDetails 
}: { 
  isOpen: boolean
  onClose: () => void
  user: any
  profile: any
  patientDetails: any
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await updatePatientProfile(formData)
      if (result.success) {
        onClose()
      } else {
        setError(result.error || 'Failed to update profile')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-indigo-gray-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/30">
          <h2 className="font-title-lg text-title-lg text-indigo-gray-900 font-bold">Edit Profile</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            
            {error && (
              <div className="p-3 rounded-lg bg-error/10 text-error font-label-sm">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div>
              <h3 className="font-title-md font-bold text-on-surface mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-sm text-on-surface-variant">Full Legal Name</label>
                  <input 
                    name="full_name"
                    defaultValue={profile?.full_name || ''}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-sm text-on-surface-variant">Phone Number (Read-only)</label>
                  <input 
                    value={user?.phone || profile?.phone_number || ''}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low text-on-surface-variant cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <hr className="border-outline-variant/30" />

            {/* Biological Details */}
            <div>
              <h3 className="font-title-md font-bold text-on-surface mb-4">Biological Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-sm text-on-surface-variant">Blood Group</label>
                  <select 
                    name="blood_group"
                    defaultValue={patientDetails?.blood_group || ''}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/50"
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-sm text-on-surface-variant">Date of Birth</label>
                  <input 
                    type="date"
                    name="date_of_birth"
                    defaultValue={patientDetails?.date_of_birth || ''}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-sm text-on-surface-variant">Gender</label>
                  <select 
                    name="gender"
                    defaultValue={patientDetails?.gender || ''}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/50"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <hr className="border-outline-variant/30" />

            {/* Address */}
            <div>
              <h3 className="font-title-md font-bold text-on-surface mb-4">Contact Details</h3>
              <div className="space-y-1.5">
                <label className="font-label-sm text-on-surface-variant">Registered Residential Address</label>
                <textarea 
                  name="address"
                  defaultValue={patientDetails?.address || ''}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/50 resize-none"
                />
              </div>
            </div>

            <hr className="border-outline-variant/30" />

            {/* Emergency Contact */}
            <div>
              <h3 className="font-title-md font-bold text-on-surface mb-4">Primary Emergency Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-sm text-on-surface-variant">Name</label>
                  <input 
                    name="emergency_contact_name"
                    defaultValue={patientDetails?.emergency_contact_name || ''}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-sm text-on-surface-variant">Relationship</label>
                  <input 
                    name="emergency_contact_relation"
                    defaultValue={patientDetails?.emergency_contact_relation || ''}
                    placeholder="e.g. Spouse, Parent"
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-sm text-on-surface-variant">Phone</label>
                  <input 
                    name="emergency_contact_phone"
                    defaultValue={patientDetails?.emergency_contact_phone || ''}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-vibrant-blue/50"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="p-6 border-t border-outline-variant/30 flex justify-end gap-3 bg-surface-container-lowest rounded-b-2xl">
            <button 
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-full bg-surface-container hover:bg-surface-variant text-indigo-gray-900 font-label-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-full bg-vibrant-blue hover:bg-primary text-white font-label-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
