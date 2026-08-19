'use client'

import Link from 'next/link'
import { useState, useActionState } from 'react'
import { staffLogin, sendPasswordResetOTP, verifyOTPAndUpdatePassword } from '@/app/actions/auth'
import { Stethoscope, ArrowLeft, Loader2, KeyRound } from 'lucide-react'

export default function DoctorLoginPage() {
  const [state, formAction, isPending] = useActionState(staffLogin, null)
  
  const [view, setView] = useState<'login' | 'forgot' | 'verify'>('login')
  const [staffId, setStaffId] = useState('')
  const [emailForOTP, setEmailForOTP] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsResetting(true)
    setResetError('')
    
    const res = await sendPasswordResetOTP(staffId)
    setIsResetting(false)
    
    if (res.error) {
      setResetError(res.error)
    } else {
      setView('verify')
    }
  }

  if (view === 'forgot') {
    return (
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <button onClick={() => { setView('login'); setResetError('') }} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </button>
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">Enter your Staff ID to receive a reset OTP on your registered email.</p>
        </div>

        {resetError && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 text-center font-medium">
            {resetError}
          </div>
        )}

        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Staff ID</label>
            <input 
              required 
              value={staffId}
              onChange={e => setStaffId(e.target.value)}
              type="text" 
              placeholder="e.g. CYDAB1234" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase text-gray-900" 
            />
          </div>
          <button disabled={isResetting || !staffId} type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors mt-2 disabled:opacity-50 flex justify-center items-center gap-2">
            {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
          </button>
        </form>
      </div>
    )
  }

  if (view === 'verify') {
    return (
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <button onClick={() => { setView('forgot'); setResetError('') }} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Check Your Email</h1>
          <p className="text-gray-500 text-sm mt-4 text-center leading-relaxed">
            We've sent a magic reset link to your registered email address.<br/>
            Click the link in the email to set a new password.
          </p>
        </div>
      </div>
    )
  }

  // Default Login View
  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Roles
      </Link>
      
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Stethoscope className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Doctor Portal</h1>
        <p className="text-gray-500 text-sm mt-1">Sign in with your Staff ID to manage appointments</p>
      </div>

      {state?.error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 text-center font-medium">
          {state.error}
        </div>
      )}

      {resetSuccess && (
        <div className="mb-6 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 text-center font-medium">
          {resetSuccess}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="role" value="doctor" />
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Staff ID</label>
          <input required name="staffId" type="text" placeholder="e.g. CYDAB1234" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase text-gray-900" />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-semibold text-gray-700">Password</label>
            <button 
              type="button" 
              onClick={() => { setView('forgot'); setResetError(''); setResetSuccess('') }} 
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <input required name="password" type="password" placeholder="••••••••" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900" />
        </div>
        <button disabled={isPending} type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors mt-2 disabled:opacity-50 flex justify-center items-center gap-2">
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
