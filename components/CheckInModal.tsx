'use client'

import { useState } from 'react'
import { X, CheckCircle2, ShieldAlert, Navigation, ArrowRight, User } from 'lucide-react'
import { verifyAndCheckInPatient } from '@/app/actions/executive'

interface CheckInModalProps {
  appointmentId: string;
  currentStatus: string;
  patientName: string;
  doctorName: string;
  departmentName: string;
}

export function CheckInModal({ appointmentId, currentStatus, patientName, doctorName, departmentName }: CheckInModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGuidedPhase, setIsGuidedPhase] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState('')

  if (currentStatus === 'visited' || currentStatus === 'completed' || currentStatus === 'cancelled') {
    return (
      <button 
        disabled
        className="px-3 py-1.5 text-xs font-bold text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed uppercase tracking-wider"
      >
        {currentStatus}
      </button>
    )
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    if (bookingId.length !== 8) {
      setError('Booking ID must be exactly 8 characters long.')
      setIsLoading(false)
      return
    }

    const result = await verifyAndCheckInPatient(appointmentId, bookingId)
    
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setIsLoading(false)
      setIsGuidedPhase(true)
    }
  }

  function handleClose() {
    setIsOpen(false)
    setTimeout(() => setIsGuidedPhase(false), 300)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-bold text-white bg-[#E31E24] hover:bg-red-700 rounded-lg shadow-sm transition-colors"
      >
        Verify & Check-In
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2 text-gray-900">
                {isGuidedPhase ? (
                  <Navigation className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-[#E31E24]" />
                )}
                <h2 className="text-lg font-black">{isGuidedPhase ? 'Guidance Required' : 'Verify Patient'}</h2>
              </div>
              <button 
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {isGuidedPhase ? (
              <div className="p-6">
                <div className="mb-6 text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-1">Check-In Successful!</h3>
                  <p className="text-sm text-gray-500">The patient's identity has been verified.</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Guidance Slip</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Patient Name</p>
                        <p className="font-bold text-gray-900">{patientName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                        <ArrowRight className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Guide To</p>
                        <p className="font-bold text-gray-900">Dr. {doctorName}</p>
                        <p className="text-sm font-medium text-gray-600">{departmentName} Department</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full flex justify-center items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                >
                  Patient Guided & Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="p-6">
                <p className="text-sm text-gray-600 mb-6">
                  Ask the patient for their 8-character Booking ID (visible on their dashboard) to verify their identity before check-in.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold border border-red-100 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                    {error}
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Booking ID</label>
                  <input
                    type="text"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value.toUpperCase())}
                    placeholder="e.g. DA8AF0A5"
                    maxLength={8}
                    className="w-full px-4 py-3 text-lg font-black tracking-widest text-center border border-gray-200 rounded-xl outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 uppercase transition-all"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || bookingId.length !== 8}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Verifying...' : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Verify ID
                      </>
                    )}
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
