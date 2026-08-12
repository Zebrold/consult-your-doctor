'use client'

import { useState, useActionState, useEffect } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import { sendOTP, verifyOTP } from '@/app/actions/auth'

type AuthModalProps = {
  isOpen: boolean
  onClose: () => void
  initialType?: 'login' | 'signup'
}

export function AuthModal({ isOpen, onClose, initialType = 'login' }: AuthModalProps) {
  const [type, setType] = useState<'login' | 'signup'>(initialType)
  const [step, setStep] = useState<1 | 2>(1)
  
  const [sendOTPState, sendOTPAction, isSendPending] = useActionState(sendOTP, null)
  const [verifyOTPState, verifyOTPAction, isVerifyPending] = useActionState(verifyOTP, null)
  
  useEffect(() => {
    if (sendOTPState?.success) {
      setStep(2)
    }
  }, [sendOTPState])

  const handleTypeChange = (newType: 'login' | 'signup') => {
    setType(newType)
    setStep(1)
  }
  
  if (!isOpen) return null

  // Carry over the hidden fields to the next step
  const phoneVal = sendOTPState?.phone || ''
  const nameVal = sendOTPState?.fullName || ''
  const roleVal = sendOTPState?.role || 'patient'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        {step === 2 && (
          <button 
            onClick={() => setStep(1)}
            className="absolute top-4 left-4 p-1 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {step === 1 ? (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {type === 'login' ? 'Welcome Back' : 'Create an Account'}
              </h1>
              <p className="text-gray-500 text-sm mt-2">
                {type === 'login' ? 'Log in using your mobile number.' : 'Join Consult Your Doctor today.'}
              </p>
            </div>

            {sendOTPState?.error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                {sendOTPState.error}
              </div>
            )}

            <form action={sendOTPAction} className="space-y-4">
              <input type="hidden" name="isRegister" value={type === 'signup' ? 'true' : 'false'} />

              {type === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      name="fullName" 
                      required
                      placeholder="John Doe"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
                    <select 
                      name="role" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none bg-white transition-all"
                    >
                      <option value="patient">Patient</option>
                      <option value="doctor">Doctor</option>
                      <option value="executive">Executive</option>
                      <option value="hospital_admin">Hospital Admin</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium border-r border-gray-300 pr-2">+91</span>
                  <input 
                    type="tel" 
                    name="phone" 
                    required
                    placeholder="9876543210"
                    className="w-full pl-14 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={isSendPending}
                className="w-full py-2.5 bg-[#E31E24] text-white rounded-md font-semibold hover:bg-red-700 transition-colors mt-4 disabled:opacity-50"
              >
                {isSendPending ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              {type === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button onClick={() => handleTypeChange('signup')} className="text-[#E31E24] font-semibold hover:underline">
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button onClick={() => handleTypeChange('login')} className="text-[#E31E24] font-semibold hover:underline">
                    Log in here
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Verify Mobile Number</h1>
              <p className="text-gray-500 text-sm mt-2">
                We've sent a 6-digit OTP to <br/><span className="font-semibold text-gray-900">{phoneVal}</span>
              </p>
            </div>

            {verifyOTPState?.error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                {verifyOTPState.error}
              </div>
            )}

            <form action={verifyOTPAction} className="space-y-4">
              <input type="hidden" name="phone" value={phoneVal} />
              <input type="hidden" name="isRegister" value={type === 'signup' ? 'true' : 'false'} />
              <input type="hidden" name="fullName" value={nameVal} />
              <input type="hidden" name="role" value={roleVal} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                <input 
                  type="text" 
                  name="token" 
                  required
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-4 py-3 text-center tracking-[0.5em] text-xl font-semibold border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
                />
              </div>
              
              <button 
                type="submit"
                disabled={isVerifyPending}
                className="w-full py-2.5 bg-[#E31E24] text-white rounded-md font-semibold hover:bg-red-700 transition-colors mt-4 disabled:opacity-50"
              >
                {isVerifyPending ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
