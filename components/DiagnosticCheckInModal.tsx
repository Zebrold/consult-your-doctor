'use client'

import { useState } from 'react'
import { verifyAndCheckInDiagnostic } from '@/app/actions/booking'
import { Loader2, UserCheck, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function DiagnosticCheckInModal({ bookingId, patientName }: { bookingId: string, patientName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputId, setInputId] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()

  const handleVerify = async () => {
    setError('')
    if (inputId.length !== 8) {
      setError('Please enter the 8-character Booking ID')
      return
    }

    setIsVerifying(true)
    const result = await verifyAndCheckInDiagnostic(bookingId, inputId)
    setIsVerifying(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
        router.refresh() // Refresh the dashboard to reflect the updated status
      }, 1500)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2"
      >
        <UserCheck className="w-4 h-4" />
        Check In
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Check In Patient</h3>
              {!success && (
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="p-6">
              {success ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-lg">Verified!</h4>
                  <p className="text-sm text-gray-500 mt-1">{patientName} has been checked in.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Please ask <strong>{patientName}</strong> for their 8-character Booking ID to verify and check them in.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        placeholder="e.g. 537C0FAB"
                        value={inputId}
                        onChange={(e) => setInputId(e.target.value.toUpperCase())}
                        maxLength={8}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl font-mono text-center text-lg tracking-widest uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      />
                    </div>
                    
                    {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

                    <button
                      onClick={handleVerify}
                      disabled={isVerifying || inputId.length !== 8}
                      className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
                    >
                      {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
                      Verify & Check In
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
