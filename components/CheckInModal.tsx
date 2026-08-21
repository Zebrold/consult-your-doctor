'use client'

import { useState } from 'react'
import { X, CheckCircle2, ShieldAlert } from 'lucide-react'
import { verifyAndCheckInPatient } from '@/app/actions/executive'

export function CheckInModal({ appointmentId, currentStatus }: { appointmentId: string, currentStatus: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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
      setIsOpen(false)
      setIsLoading(false)
    }
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
                <ShieldAlert className="w-5 h-5 text-[#E31E24]" />
                <h2 className="text-lg font-black">Verify Patient</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
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
                  onClick={() => setIsOpen(false)}
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
          </div>
        </div>
      )}
    </>
  )
}
