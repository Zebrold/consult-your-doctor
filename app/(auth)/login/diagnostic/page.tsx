'use client'

import Link from 'next/link'
import { useState, useActionState } from 'react'
import { staffLogin, sendPasswordResetOTP } from '@/app/actions/auth'
import { ArrowLeft, Loader2, ShieldCheck, Database, Activity, IdCard, Lock, Unlock, Microscope, FileText } from 'lucide-react'
import Image from 'next/image'

export default function DiagnosticLoginPage() {
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
    <div className="min-h-screen bg-[#F8F9FC] p-4 lg:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mt-8">

        {/* LEFT PANEL */}
        <div className="bg-gradient-to-b from-[#F3F5FA] to-[#E9F0FA] rounded-[2rem] p-6 lg:p-14 flex flex-col justify-between relative overflow-hidden order-2 lg:order-1">
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm text-[#0949B3] text-sm font-bold">
                <ShieldCheck className="w-4 h-4 text-[#1FA67A]" />
                CAP & NABL Certified Labs
              </span>
            </div>

            <div className="mt-8">
              <h1 className="text-3xl lg:text-[42px] font-black text-[#0949B3] leading-[1.15] tracking-tight max-w-lg">
                Advanced Imaging & Lab Orchestration.
              </h1>
              <p className="text-[17px] text-slate-600 mt-6 leading-relaxed max-w-md font-medium">
                High-throughput diagnostic workflows with automated reporting and native LIS/RIS integration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <div className="p-6 rounded-2xl bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-slate-600 tracking-wider">LIS SYNC</span>
                  <Database className="w-5 h-5 text-[#1FA67A]" />
                </div>
                <h3 className="text-lg font-black text-[#0949B3] mb-1.5">HL7 Reporting</h3>
                <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1FA67A]"></span>
                  Automated Publishing
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-slate-600 tracking-wider">DAILY TESTS</span>
                  <Activity className="w-5 h-5 text-[#0949B3]" />
                </div>
                <h3 className="text-lg font-black text-[#0949B3] mb-1.5">15,000+ Processed</h3>
                <p className="text-xs text-slate-600 font-bold">zero backlog pipeline</p>
              </div>
            </div>

            <div className="mt-4 bg-white rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#0949B3]" />
                  <div>
                    <h3 className="text-sm font-black text-[#0949B3]">PACS Archive</h3>
                    <p className="text-[11px] font-bold text-slate-500">Zero-loss Compression · ISO Compliant</p>
                  </div>
                </div>
                <span className="bg-[#EAF2FF] text-[#0949B3] px-3 py-1 rounded-full text-xs font-bold">
                  Immutable
                </span>
              </div>
              <div className="bg-[#F8F9FC] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-500 tracking-wider mb-0.5">IMAGE TRANSFER</p>
                  <p className="text-[15px] font-black text-[#0949B3]">High-fidelity DICOM</p>
                </div>
                <div className="w-24 h-6 opacity-80">
                  <svg viewBox="0 0 100 24" className="w-full h-full" preserveAspectRatio="none">
                    <path d="M0,12 L15,12 L25,4 L35,20 L45,8 L55,16 L70,12 L100,12" fill="none" stroke="#0949B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8 bg-white/50 backdrop-blur-md rounded-2xl p-6 border border-white/60">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 relative shrink-0">
                <Image src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtSLQJnqS0SXW2Qht08YEdQHraPL88CJ8rc9HfESqe8xEcEz47BI6BiKO-IDrrK4uEiaEplNz6EJOdSUfINyQQdjz5gQxbb0RNGWg_z-cUIW6JyCQf9tJDLKwgy62F0VZTG1WDobNptUe0ddXPoZWArBuyTiJq699ceYshck1qKjztlf6UqjV_Z3LwAD0kAIXuLSLimaXTuLegz5WnYcKCIrlpcJz0u2w1cGbt3CsYSw0WDpFlQvAm8w" alt="Lab Director" fill className="object-cover" />
              </div>
              <div>
                <p className="text-[13px] italic text-[#0949B3] font-bold leading-relaxed mb-3">
                  "Streamlining our sample tracking and results publishing has reduced our turnaround time by 40%, directly impacting patient care quality."
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[#0949B3]">Dr. Sarah Jenkins</span>
                  <span className="text-xs font-bold text-slate-500 border-l border-slate-300 pl-2">Lab Director</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Authentication Portal */}
        <div className="bg-white rounded-[2rem] p-6 lg:p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-start border border-slate-100 order-1 lg:order-2">

          {view === 'forgot' && (
            <div>
              <button onClick={() => setView('login')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </button>
              <div className="flex flex-col items-start mb-8">
                <h2 className="text-3xl font-black text-[#0949B3] tracking-tight">Reset Password</h2>
                <p className="text-[15px] text-slate-500 font-medium mt-3 leading-relaxed">
                  Enter your Admin ID to receive a reset OTP on your registered email.
                </p>
              </div>

              {resetError && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-bold">
                  {resetError}
                </div>
              )}

              <form onSubmit={handleSendOTP} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Center Admin ID</label>
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
              <Link href="/login" className="flex w-fit items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to roles
              </Link>
              <div className="mb-10">
                <span className="text-[13px] font-black text-[#096348] uppercase tracking-widest mb-3 block">Center Access</span>
                <h2 className="text-4xl font-black text-[#0949B3] leading-[1.15] tracking-tight">
                  Diagnostic Portal
                </h2>
                <p className="text-slate-600 text-[15px] font-medium mt-4 leading-relaxed max-w-sm">
                  Restricted to authorized center administrators and lab managers.
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
                <input type="hidden" name="role" value="diagnostic_admin" />

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Center Admin ID</label>
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
                    <label className="text-sm font-bold text-slate-700">Admin Password</label>
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
                    Maintain active session on this secure endpoint <span className="text-[#0949B3] font-bold">(Lab network or registered device only)</span>
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
                      Sign In to Lab Portal
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Registration Footer Callout */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Microscope className="w-8 h-8 text-[#0949B3]" />
              <div>
                <p className="text-sm font-black text-[#0949B3]">New diagnostic center?</p>
                <p className="text-xs font-bold text-slate-500">Integrate with our lab network</p>
              </div>
            </div>
            <button type="button" className="px-6 py-2.5 rounded-full border-2 border-slate-200 text-[#0949B3] text-sm font-black hover:border-[#0949B3] transition-all whitespace-nowrap">
              Join Network
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
