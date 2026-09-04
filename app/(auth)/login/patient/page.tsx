'use client'

import { useState, useActionState, useEffect } from 'react'
import { ArrowLeft, User } from 'lucide-react'
import { sendOTP, verifyOTP } from '@/app/actions/auth'
import Link from 'next/link'
import { Suspense } from 'react'
import Image from 'next/image'

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
    <div className="w-full max-w-[1280px] mx-auto py-8">
      {/* Breadcrumb / Portal Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)] text-sm">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 hover:text-[var(--color-secondary)] transition-colors font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <Link href="/login" className="flex items-center gap-2 hover:text-[var(--color-secondary)] transition-colors font-bold">
              <ArrowLeft className="w-4 h-4" /> Back to Roles
            </Link>
          )}
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface-container-low)] text-[var(--color-secondary)] text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)] animate-ping"></span>
          EHR Direct Sync: Operational
        </div>
      </div>

      {/* Main Auth Experience Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT PANEL: Clinical Trust & Metrics */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-[var(--color-surface-container-low)] p-8 lg:p-10 shadow-[var(--shadow-ambient)] relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[var(--color-secondary)]/10 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-sm text-[var(--color-primary)] text-xs font-bold">
                <span className="material-symbols-outlined text-[16px]">health_and_safety</span>
                Single Sign-On (SSO)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] text-xs font-semibold">
                HIPAA & ISO 27001
              </span>
            </div>
            
            <div>
              <span className="text-xs text-[var(--color-primary)] uppercase font-bold tracking-wider block mb-2">Connected Medical Record</span>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-[var(--color-primary)] leading-tight tracking-tight">
                One secure key to your entire health journey.
              </h2>
              <p className="text-base text-[var(--color-on-surface-variant)] mt-3">
                Access real-time pathology reports, encrypted video consultations, electronic prescriptions, and synchronized vitals instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-white shadow-sm flex flex-col gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <span className="material-symbols-outlined text-[18px]">lab_profile</span>
                </div>
                <span className="text-base font-bold text-[var(--color-primary)]">Lab Reports</span>
                <span className="text-xs text-[var(--color-on-surface-variant)]">Validated results synced directly from certified diagnostics.</span>
              </div>
              <div className="p-4 rounded-xl bg-white shadow-sm flex flex-col gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--color-secondary)]/10 flex items-center justify-center text-[var(--color-secondary)]">
                  <span className="material-symbols-outlined text-[18px]">prescriptions</span>
                </div>
                <span className="text-base font-bold text-[var(--color-primary)]">e-Prescriptions</span>
                <span className="text-xs text-[var(--color-on-surface-variant)]">Instant dispensing via your local registered pharmacy network.</span>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 pt-6 mt-6 bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 relative">
                <Image src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhiYr4l1IYGZaQlp2rnYQakB4dfjWDIWWNe89JRTeo74YmhrnJbRVVK1ZqqdHW-EkQe6LYJaVfDdE8iW5Z0WVzFIZ3Nfm9Cm4Zo_K4a3ahaZRjM4ixEaN-FW2SloJutuKoYsBYIC9DR757Ry8PkYpZ0zuxRqmXokxiDcQskKqARYUE_WsaH6vyBrn3kj4ASe9OkjAHpAB1CB1_28l6Ona0UWkwCe6yZyGs5V5jVpA8SIHVRBUeJd7o_w" alt="Dr" fill className="object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[var(--color-primary)]">Dr. Aris Thorne, MD</span>
                  <span className="material-symbols-outlined text-[var(--color-secondary)] text-[14px]">check_circle</span>
                </div>
                <span className="text-xs text-[var(--color-on-surface-variant)]">Chief Medical Information Officer</span>
              </div>
            </div>
            <p className="text-sm italic text-[var(--color-on-surface-variant)]">
              "The cryptographic separation of patient EHR files allows zero-friction triage while maintaining absolute regulatory compliance."
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Form */}
        <div className="lg:col-span-7 flex flex-col justify-center rounded-2xl bg-white p-6 sm:p-10 lg:p-12 shadow-xl border border-[var(--color-surface-variant)]">
          
          <div className="flex flex-col gap-3 mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">Patient Portal</span>
            <h1 className="text-3xl font-extrabold text-[var(--color-primary)] tracking-tight">
              {step === 1 ? 'Sign in with Mobile Number' : 'Verify Mobile Number'}
            </h1>
            <p className="text-base text-[var(--color-on-surface-variant)]">
              {step === 1 
                ? 'Enter your registered mobile number to receive a secure one-time verification code.'
                : `We've sent a 6-digit OTP to ${phoneVal}`
              }
            </p>
          </div>

          {step === 1 ? (
            <form action={sendOTPAction} className="flex flex-col gap-6">
              {sendOTPState?.error && (
                <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-medium">
                  {sendOTPState.error}
                </div>
              )}
              
              <input type="hidden" name="isRegister" value="true" />
              <input type="hidden" name="role" value="patient" />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[var(--color-on-surface-variant)]">Full Name</label>
                  <span className="text-xs text-[var(--color-secondary)] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">verified</span> Identity Match
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-gray-400">person</span>
                  <input 
                    type="text" 
                    name="fullName"
                    required
                    placeholder="e.g. Eleanor Vance"
                    className="w-full pl-12 pr-4 py-3.5 rounded-full bg-gray-50 border-none text-[var(--color-primary)] placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-[var(--color-secondary)] transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[var(--color-on-surface-variant)]">Mobile Number</label>
                  <span className="text-xs text-[var(--color-secondary)] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">sms</span> SMS Verification
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-4 py-3.5 rounded-full bg-gray-50 shadow-sm flex items-center gap-2 shrink-0">
                    <span>🇮🇳</span>
                    <span className="text-sm font-bold text-[var(--color-primary)]">+91</span>
                  </div>
                  <div className="relative flex items-center flex-1">
                    <span className="material-symbols-outlined absolute left-4 text-gray-400">smartphone</span>
                    <input 
                      type="tel" 
                      name="phone"
                      required
                      placeholder="98765 43210"
                      className="w-full pl-12 pr-4 py-3.5 rounded-full bg-gray-50 border-none text-[var(--color-primary)] placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-[var(--color-secondary)] transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSendPending}
                className="mt-4 w-full py-4 px-6 rounded-full bg-[var(--color-secondary)] hover:opacity-90 text-white text-base font-bold tracking-tight shadow-[var(--shadow-ambient)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                <span>{isSendPending ? 'Sending Verification...' : 'Continue to Portal'}</span>
              </button>
            </form>
          ) : (
            <form action={verifyOTPAction} className="flex flex-col gap-6">
              {verifyOTPState?.error && (
                <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-medium">
                  {verifyOTPState.error}
                </div>
              )}
              <input type="hidden" name="phone" value={phoneVal} />
              <input type="hidden" name="isRegister" value="true" />
              <input type="hidden" name="fullName" value={nameVal} />
              <input type="hidden" name="role" value={roleVal} />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--color-on-surface-variant)]">6-Digit OTP</label>
                <input 
                  type="text" 
                  name="token"
                  required
                  placeholder="123456"
                  maxLength={6}
                  className="w-full text-center tracking-[1em] py-4 text-2xl font-black rounded-xl bg-gray-50 border border-gray-200 text-[var(--color-primary)] shadow-inner focus:ring-2 focus:ring-[var(--color-secondary)] transition-all outline-none"
                />
              </div>

              <button 
                type="submit"
                disabled={isVerifyPending}
                className="mt-4 w-full py-4 px-6 rounded-full bg-[var(--color-secondary)] hover:opacity-90 text-white text-base font-bold tracking-tight shadow-[var(--shadow-ambient)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">lock_open</span>
                <span>{isVerifyPending ? 'Verifying...' : 'Verify OTP & Sign In'}</span>
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-[var(--color-surface-variant)]">
            <div className="p-3 rounded-lg bg-[var(--color-surface-container-low)] flex items-start gap-3">
              <span className="material-symbols-outlined text-[var(--color-secondary)] text-[18px] shrink-0 mt-0.5">verified</span>
              <p className="text-xs leading-relaxed text-[var(--color-on-surface-variant)]">
                Secured by Data Protection standards. If experiencing an acute medical emergency, please call <strong>112</strong> immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
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
