'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { sendOTP, verifyOTPInline } from '@/app/actions/auth'
import { Loader2, X, Phone, User, KeyRound } from 'lucide-react'

interface InlineAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function SubmitButton({ children, pendingText }: { children: React.ReactNode, pendingText: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 bg-[#E31E24] text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
    >
      {pending ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {pendingText}...
        </>
      ) : (
        children
      )}
    </button>
  )
}

export function InlineAuthModal({ isOpen, onClose, onSuccess }: InlineAuthModalProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  
  // State from the first step
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  
  // Form states
  const [sendState, sendAction] = useFormState(sendOTP, null)
  const [verifyState, verifyAction] = useFormState(verifyOTPInline, null)

  // Handle successful send
  if (sendState?.success && step === 'phone') {
    setStep('otp')
  }

  // Handle successful verify
  if (verifyState?.success) {
    onSuccess()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {step === 'phone' ? 'Verify your identity' : 'Enter OTP'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {step === 'phone' 
              ? 'Please login or register to confirm your booking.' 
              : `We've sent a 6-digit code to ${phone}.`}
          </p>

          {step === 'phone' ? (
            <form action={sendAction} className="space-y-4">
              <input type="hidden" name="isRegister" value="true" />
              <input type="hidden" name="role" value="patient" />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {sendState?.error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                  {sendState.error}
                </div>
              )}

              <div className="pt-2">
                <SubmitButton pendingText="Sending OTP">Send OTP</SubmitButton>
              </div>
            </form>
          ) : (
            <form action={verifyAction} className="space-y-4">
              <input type="hidden" name="phone" value={phone} />
              <input type="hidden" name="fullName" value={fullName} />
              <input type="hidden" name="isRegister" value="true" />
              <input type="hidden" name="role" value="patient" />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">6-Digit Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="token"
                    placeholder="123456"
                    required
                    maxLength={6}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-bold tracking-widest outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white transition-all text-center"
                  />
                </div>
              </div>

              {verifyState?.error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                  {verifyState.error}
                </div>
              )}

              <div className="pt-2">
                <SubmitButton pendingText="Verifying">Verify & Continue</SubmitButton>
              </div>
              
              <button 
                type="button" 
                onClick={() => setStep('phone')}
                className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-800 mt-4"
              >
                Change Phone Number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
