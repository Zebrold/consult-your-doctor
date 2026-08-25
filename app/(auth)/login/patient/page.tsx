'use client'

import { useState, useActionState, useEffect } from 'react'
import { ArrowLeft, User } from 'lucide-react'
import { sendOTP, verifyOTP } from '@/app/actions/auth'
import Link from 'next/link'
import { Suspense } from 'react'

function PatientLoginForm() {
  const [step, setStep] = useState<1 | 2>(1)

  const [sendOTPState, sendOTPAction, isSendPending] = useActionState(sendOTP, null)
  const [verifyOTPState, verifyOTPAction, isVerifyPending] = useActionState(verifyOTP, null)

  useEffect(() => {
    if (sendOTPState?.success) {
      setStep(2)
    }
  }, [sendOTPState])

  // Carry over the hidden fields to the next step
  const phoneVal = sendOTPState?.phone || ''
  const nameVal = sendOTPState?.fullName || ''
  const roleVal = sendOTPState?.role || 'patient'

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
      <div className="flex items-center justify-between mb-8">
        {step === 2 ? (
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#E31E24] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <Link href="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#E31E24] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Roles
          </Link>
        )}
      </div>

      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 bg-red-50 text-[#E31E24] rounded-2xl flex items-center justify-center mb-4 shadow-md">
          <User className="w-8 h-8" strokeWidth={2.5} />
        </div>
      </div>

      {step === 1 ? (
        <div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Patient Login / Register
            </h1>
            <p className="text-gray-500 text-sm mt-2 font-medium">
              Access your appointments and records.
            </p>
          </div>

          {sendOTPState?.error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-medium">
              {sendOTPState.error}
            </div>
          )}

          <form action={sendOTPAction} className="space-y-5">
            {/* Hardcode register=true so verifyOTP always upserts profile */}
            <input type="hidden" name="isRegister" value="true" />
            <input type="hidden" name="role" value="patient" />

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                name="fullName"
                required
                placeholder="e.g. Aman"
                className="w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Mobile Number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold border-r border-gray-300 pr-3">+91</span>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="9876543210"
                  className="w-full pl-16 pr-4 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSendPending}
              className="w-full py-3.5 bg-[#E31E24] text-white font-bold hover:bg-red-700 transition-colors mt-2 disabled:opacity-50 rounded-xl shadow-md"
            >
              {isSendPending ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Verify Number</h1>
            <p className="text-gray-500 text-sm mt-2 font-medium">
              We've sent a 6-digit OTP to <br /><span className="font-bold text-gray-900">{phoneVal}</span>
            </p>
          </div>

          {verifyOTPState?.error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-medium">
              {verifyOTPState.error}
            </div>
          )}

          <form action={verifyOTPAction} className="space-y-5">
            <input type="hidden" name="phone" value={phoneVal} />
            <input type="hidden" name="isRegister" value="true" />
            <input type="hidden" name="fullName" value={nameVal} />
            <input type="hidden" name="role" value={roleVal} />

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Enter OTP</label>
              <input
                type="text"
                name="token"
                required
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-4 text-center text-gray-900 bg-gray-50 tracking-[0.5em] text-2xl font-black border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifyPending}
              className="w-full py-3.5 bg-[#E31E24] text-white font-bold hover:bg-red-700 transition-colors mt-2 disabled:opacity-50 rounded-xl shadow-md"
            >
              {isVerifyPending ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function PatientLoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
      <PatientLoginForm />
    </Suspense>
  )
}
