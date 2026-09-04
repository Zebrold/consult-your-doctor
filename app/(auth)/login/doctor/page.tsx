'use client'

import Link from 'next/link'
import { useState, useActionState } from 'react'
import { staffLogin, sendPasswordResetOTP, verifyOTPAndUpdatePassword } from '@/app/actions/auth'
import { ArrowLeft, Loader2, KeyRound } from 'lucide-react'
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
    <div className="w-full max-w-[1280px] mx-auto py-8">
      {/* Breadcrumb / Portal Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)] text-sm">
          {view !== 'login' ? (
            <button
              onClick={() => { setView('login'); setResetError('') }}
              className="flex items-center gap-2 hover:text-[var(--color-secondary)] transition-colors font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </button>
          ) : (
            <Link href="/login" className="flex items-center gap-2 hover:text-[var(--color-secondary)] transition-colors font-bold">
              <ArrowLeft className="w-4 h-4" /> Back to Roles
            </Link>
          )}
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface-container-low)] text-[var(--color-secondary)] text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)] animate-ping"></span>
          Clinical Node: Active
        </div>
      </div>

      {/* Main Workstation Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Panel: Trust & Enterprise Infrastructure Showcase */}
        <div className="lg:col-span-6 flex flex-col justify-between p-8 sm:p-10 rounded-2xl bg-[var(--color-surface-container-low)] shadow-[var(--shadow-ambient)] relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[var(--color-secondary)]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white text-[var(--color-primary)] rounded-full text-xs font-bold shadow-sm mb-6">
              <span className="material-symbols-outlined text-[var(--color-secondary)] text-[16px]">verified_user</span>
              GMC & State Medical Board Verified
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-[var(--color-primary)] tracking-tight mb-4 leading-tight">
              Integrated Workstation for Accredited Specialists.
            </h1>
            <p className="text-base text-[var(--color-on-surface-variant)] mb-8 max-w-lg">
              Zero-latency multi-disciplinary clinical operations. Instant patient triage, PACS telemetry, and native EHR orchestration inside an encrypted enclave.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider font-bold">Sync State</span>
                  <span className="material-symbols-outlined text-[var(--color-secondary)] text-[20px]">sync_saved_locally</span>
                </div>
                <div className="text-lg font-bold text-[var(--color-primary)]">Epic & Cerner</div>
                <span className="text-xs text-[var(--color-secondary)] font-bold flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)]"></span> Realtime HL7 / FHIR
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider font-bold">Active Faculty</span>
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px]">groups</span>
                </div>
                <div className="text-lg font-bold text-[var(--color-primary)]">1,740+ Doctors</div>
                <span className="text-xs text-[var(--color-on-surface-variant)] font-semibold flex items-center gap-1 mt-1">
                  across 42 specialties
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm mb-8 border border-[var(--color-surface-variant)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-container-high)] flex items-center justify-center text-[var(--color-primary)]">
                    <span className="material-symbols-outlined text-[20px]">radiology</span>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-primary)] font-bold leading-tight">Cloud PACS Telemetry</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">DICOM 3.0 Compatible · 256-bit AES Enclave</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-[var(--color-surface-container-high)] text-[var(--color-primary)] rounded-full text-[11px] font-bold">
                  0.12s Latency
                </span>
              </div>
              <div className="w-full bg-[var(--color-surface-container-low)] rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[var(--color-on-surface-variant)] uppercase font-bold">Throughput</span>
                  <span className="text-sm text-[var(--color-primary)] font-bold">9.8 GB/s Diagnostic Stream</span>
                </div>
                <svg className="w-24 h-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 120 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 16L20 16L30 4L42 22L54 8L66 18L80 12L92 15L104 7L120 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 bg-white p-5 rounded-xl shadow-sm mt-auto border border-[var(--color-surface-variant)]">
            <div className="flex gap-4 items-center">
              <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 relative bg-gray-200">
                <Image src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6uhXvtzWITDpDpJT9SrPzufUry7hJFYJC2y7Qjy-oD1HI6z6Z9eYzOF9iVadJzQLjQ5BwX7-XRPtbZQUa0WjtAPXJjrVfpq5YtnmaIk3IvKL7Bunvi1GNnIfshpiwOXOzA3Mc69SxnuXW-z2I8Tq9ZycrFUuStuU_1yV_vnqxDV8fva3d5p1oao_NVL7DYwmlpOMrg7eqqOk3iz6rTk-fnoV2UdViTwH1zQGTq6uyejVK25diQLX6oA" alt="Chief Medical Officer" fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-primary)] italic line-clamp-2 leading-relaxed mb-1">
                  "The speed of accessing synchronous multi-disciplinary records while maintaining full GMC compliance has set a new gold standard for our surgical department."
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <p className="text-xs text-[var(--color-primary)] font-bold">Prof. Eleanor Vance, MD, FRCS</p>
                  <span className="text-[11px] text-[var(--color-on-surface-variant)]">Chief Medical Officer</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Doctor Sign In Workstation Form */}
        <div className="lg:col-span-6 bg-white p-8 sm:p-12 rounded-2xl shadow-xl flex flex-col justify-center border border-[var(--color-surface-variant)]">
          {view === 'forgot' && (
            <div>
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] rounded-full flex items-center justify-center mb-4">
                  <KeyRound className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--color-primary)] tracking-tight">Reset Password</h2>
                <p className="text-sm text-[var(--color-on-surface-variant)] mt-2 text-center">
                  Enter your Staff ID to receive a reset OTP on your registered email.
                </p>
              </div>

              {resetError && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-bold text-center">
                  {resetError}
                </div>
              )}

              <form onSubmit={handleSendOTP} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[var(--color-on-surface-variant)]">Staff ID</label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-gray-400">badge</span>
                    <input 
                      required
                      value={staffId}
                      onChange={e => setStaffId(e.target.value)}
                      type="text" 
                      placeholder="e.g. CYDAB1234"
                      className="w-full pl-12 pr-4 py-3.5 rounded-full bg-gray-50 border-none text-[var(--color-primary)] uppercase placeholder-gray-400 shadow-inner focus:ring-2 focus:ring-[var(--color-secondary)] transition-all outline-none"
                    />
                  </div>
                </div>
                <button 
                  disabled={isResetting || !staffId} 
                  type="submit" 
                  className="mt-4 w-full py-4 px-6 rounded-full bg-[var(--color-secondary)] text-white text-base font-bold tracking-tight shadow-[var(--shadow-ambient)] hover:opacity-90 transition-all flex justify-center items-center gap-2 group disabled:opacity-50"
                >
                  {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">mail</span>
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {view === 'verify' && (
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] rounded-full flex items-center justify-center mb-4">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold text-[var(--color-primary)] tracking-tight">Check Your Email</h2>
              <p className="text-sm text-[var(--color-on-surface-variant)] mt-4 text-center leading-relaxed max-w-sm">
                We've sent a magic reset link to your registered email address.<br />
                Click the link in the email to set a new password.
              </p>
            </div>
          )}

          {view === 'login' && (
            <div>
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">Clinician Access</span>
                <h2 className="text-3xl font-extrabold text-[var(--color-primary)] tracking-tight mt-1 mb-2">
                  Clinical Portal Sign In
                </h2>
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  Restricted to authorized medical practitioners and verified health board specialists.
                </p>
              </div>

              {state?.error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 text-center font-bold">
                  {state.error}
                </div>
              )}

              {resetSuccess && (
                <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100 text-center font-bold">
                  {resetSuccess}
                </div>
              )}

              <form action={formAction} className="flex flex-col gap-6">
                <input type="hidden" name="role" value="doctor" />
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[var(--color-on-surface-variant)]">GMC Number or Staff ID</label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-gray-400">badge</span>
                    <input 
                      required 
                      name="staffId" 
                      type="text" 
                      placeholder="e.g. CYDAB1234" 
                      className="w-full pl-12 pr-4 py-3.5 rounded-full bg-gray-50 border-none text-[var(--color-primary)] uppercase placeholder-gray-400 shadow-inner focus:ring-2 focus:ring-[var(--color-secondary)] transition-all outline-none" 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-[var(--color-on-surface-variant)]">Clinical Master Password</label>
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setResetError(''); setResetSuccess('') }}
                      className="text-xs font-bold text-[var(--color-secondary)] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-gray-400">lock</span>
                    <input 
                      required 
                      name="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="w-full pl-12 pr-4 py-3.5 rounded-full bg-gray-50 border-none text-[var(--color-primary)] placeholder-gray-400 shadow-inner focus:ring-2 focus:ring-[var(--color-secondary)] transition-all outline-none" 
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input className="mt-1 w-4 h-4 rounded text-[var(--color-secondary)] focus:ring-[var(--color-secondary)] cursor-pointer accent-[var(--color-secondary)]" id="workstationPersist" type="checkbox"/>
                  <label className="text-xs text-[var(--color-on-surface-variant)] leading-snug cursor-pointer font-medium" htmlFor="workstationPersist">
                    Maintain active session on this secure clinical endpoint <span className="text-[var(--color-primary)] font-bold">(Hospital intranet or registered device only)</span>
                  </label>
                </div>

                <button 
                  disabled={isPending} 
                  type="submit" 
                  className="mt-2 w-full py-4 px-6 rounded-full bg-[var(--color-secondary)] text-white text-base font-bold tracking-tight shadow-[var(--shadow-ambient)] hover:opacity-90 transition-all flex justify-center items-center gap-2 group disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">lock_open</span>
                      Sign In to Clinical Portal
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Registration Footer Callout */}
          <div className="mt-8 pt-6 border-t border-[var(--color-surface-variant)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-[var(--color-primary)] shrink-0">
                <span className="material-symbols-outlined text-[20px]">domain_add</span>
              </div>
              <div>
                <p className="text-sm text-[var(--color-primary)] font-bold">New practitioner?</p>
                <p className="text-xs text-[var(--color-on-surface-variant)]">Accreditation verified via GMC checks</p>
              </div>
            </div>
            <button type="button" className="px-4 py-2 rounded-full border-2 border-[var(--color-outline-variant)] text-[var(--color-primary)] text-sm font-bold shadow-sm hover:bg-[var(--color-surface-container-low)] transition-all whitespace-nowrap">
              Register Practice
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
