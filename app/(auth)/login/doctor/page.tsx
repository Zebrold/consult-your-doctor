'use client'

import Link from 'next/link'
import { useState, useActionState } from 'react'
import { staffLogin, sendPasswordResetOTP, verifyOTPAndUpdatePassword } from '@/app/actions/auth'
import { ArrowLeft, Loader2, KeyRound, ShieldCheck, RefreshCcw, Users, Activity, IdCard, Lock, Unlock, Building2 } from 'lucide-react'
import Image from 'next/image'

export default function DoctorLoginPage() {
  const [state, formAction, isPending] = useActionState(staffLogin, null)

  const [view, setView] = useState<'login' | 'forgot' | 'verify'>('login')
  const [staffId, setStaffId] = useState('')
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

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-4 lg:p-8 font-sans flex items-center justify-center">
      <div className="w-full max-w-xl mx-auto">
        {/* Authentication Portal */}
        <div className="bg-white rounded-[2rem] p-6 lg:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-center border border-slate-100">

          {view === 'forgot' && (
            <div>
              <button onClick={() => setView('login')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </button>
              <div className="flex flex-col items-start mb-8">
                <h2 className="text-3xl font-black text-[#0949B3] tracking-tight">Reset Password</h2>
                <p className="text-[15px] text-slate-500 font-medium mt-3 leading-relaxed">
                  Enter your Staff ID to receive a reset OTP on your registered email.
                </p>
              </div>

              {resetError && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-bold">
                  {resetError}
                </div>
              )}

              <form onSubmit={handleSendOTP} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Staff ID</label>
                  <div className="relative flex items-center">
                    <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      required
                      value={staffId}
                      onChange={e => setStaffId(e.target.value)}
                      type="text"
                      placeholder="e.g. CYDAB1234"
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#F8F9FC] border border-transparent text-[#0949B3] font-bold uppercase placeholder-slate-400 focus:border-[#0949B3] focus:ring-1 focus:ring-[#0949B3] focus:bg-white transition-all outline-none"
                    />
                  </div>
                </div>
                <button
                  disabled={isResetting || !staffId}
                  type="submit"
                  className="mt-2 w-full py-4 rounded-full bg-[#096348] text-white text-lg font-black shadow-lg hover:bg-[#075039] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
            </div>
          )}

          {view === 'verify' && (
            <div>
              <button onClick={() => setView('login')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </button>
              <div className="flex flex-col items-start mb-8">
                <h2 className="text-3xl font-black text-[#0949B3] tracking-tight">Check Your Email</h2>
                <p className="text-[15px] text-slate-500 font-medium mt-3 leading-relaxed">
                  We've sent a magic reset link to your registered email address. Click the link in the email to set a new password.
                </p>
              </div>
            </div>
          )}

          {view === 'login' && (
            <div>
              <Link href="/login/patient" className="flex w-fit items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to roles
              </Link>
              <div className="mb-10">
                <span className="text-[13px] font-black text-[#096348] uppercase tracking-widest mb-3 block">Clinician Access</span>
                <h2 className="text-4xl font-black text-[#0949B3] leading-[1.15] tracking-tight">
                  Clinical Portal Sign In
                </h2>
                <p className="text-slate-600 text-[15px] font-medium mt-4 leading-relaxed max-w-sm">
                  Restricted to authorized medical practitioners and verified health board specialists.
                </p>
              </div>

              {state?.error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-bold">
                  {state.error}
                </div>
              )}

              {resetSuccess && (
                <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100 font-bold">
                  {resetSuccess}
                </div>
              )}

              <form action={formAction} className="flex flex-col gap-6">
                <input type="hidden" name="role" value="doctor" />

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">GMC Number or Staff ID</label>
                  <div className="relative flex items-center">
                    <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      required
                      name="staffId"
                      type="text"
                      placeholder="e.g. CYDAB1234"
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#F8F9FC] border border-transparent text-[#0949B3] font-bold uppercase placeholder-slate-400 focus:border-[#0949B3] focus:ring-1 focus:ring-[#0949B3] focus:bg-white transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-bold text-slate-700">Clinical Master Password</label>
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setResetError(''); setResetSuccess('') }}
                      className="text-[13px] font-black text-[#096348] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      required
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#F8F9FC] border border-transparent text-[#0949B3] font-bold placeholder-slate-400 focus:border-[#0949B3] focus:ring-1 focus:ring-[#0949B3] focus:bg-white transition-all outline-none tracking-widest"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 mt-2">
                  <div className="pt-1">
                    <input className="w-4 h-4 rounded border-slate-300 text-[#0949B3] focus:ring-[#0949B3] cursor-pointer" id="workstationPersist" type="checkbox" />
                  </div>
                  <label className="text-sm text-slate-600 font-medium cursor-pointer leading-relaxed" htmlFor="workstationPersist">
                    Maintain active session on this secure clinical endpoint <span className="text-[#0949B3] font-bold">(Hospital intranet or registered device only)</span>
                  </label>
                </div>

                <button
                  disabled={isPending}
                  type="submit"
                  className="mt-4 w-full py-4 rounded-full bg-[#096348] text-white text-lg font-black shadow-[0_8px_20px_-8px_rgba(9,99,72,0.6)] hover:bg-[#075039] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Unlock className="w-5 h-5" />
                      Sign In to Clinical Portal
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Registration Footer Callout */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-[#0949B3]" />
              <div>
                <p className="text-sm font-black text-[#0949B3]">New practitioner?</p>
                <p className="text-xs font-bold text-slate-500">Accreditation verified via GMC checks</p>
              </div>
            </div>
            <button type="button" className="px-6 py-2.5 rounded-full border-2 border-slate-200 text-[#0949B3] text-sm font-black hover:border-[#0949B3] transition-all whitespace-nowrap">
              Register Practice
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
