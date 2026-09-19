'use client'

import { useState, useActionState, useEffect, useRef } from 'react'
import { ArrowLeft, User, Shield, ShieldCheck, FileText, FileCheck, Smartphone, MessageSquare, Lock, CheckCircle2 } from 'lucide-react'
import { sendOTP, verifyOTP } from '@/app/actions/auth'
import Link from 'next/link'
import { Suspense } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { COUNTRY_CODES } from '@/lib/countryCodes'

function PatientLoginForm() {
  const [step, setStep] = useState<1 | 2>(1)
  const router = useRouter()

  const [sendOTPState, sendOTPAction, isSendPending] = useActionState(sendOTP, null)
  const [verifyOTPState, verifyOTPAction, isVerifyPending] = useActionState(verifyOTP, null)

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return // Paste is handled separately
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto focus next
    if (value !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newOtp = [...otp]
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 6) newOtp[i] = pastedData[i]
    }
    setOtp(newOtp)
    const nextIndex = Math.min(pastedData.length, 5)
    otpRefs.current[nextIndex]?.focus()
  }

  useEffect(() => {
    if (sendOTPState?.success) {
      setStep(2)
      // Focus first OTP input when step changes
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    }
  }, [sendOTPState])

  const phoneVal = sendOTPState?.phone || ''
  const nameVal = sendOTPState?.fullName || ''
  const roleVal = sendOTPState?.role || 'patient'

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-4 lg:p-8 font-sans flex items-center justify-center">
      <div className="w-full max-w-xl mx-auto">
        {/* Authentication Portal */}
        <div className="bg-white rounded-[2rem] p-6 lg:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-center border border-slate-100">

          <div className="mb-10">
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 mb-6">
              <span className="text-sm font-bold text-vibrant-blue uppercase tracking-widest whitespace-nowrap">
                Authentication Portal
              </span>
              <div className="bg-[#F1F5F9] rounded-full p-1 sm:p-1.5 flex shadow-inner w-full sm:w-fit">
                <button className="flex-1 sm:flex-none bg-vibrant-blue text-white px-2 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold shadow-md whitespace-nowrap">
                  Patient Portal
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/login/doctor')}
                  className="flex-1 sm:flex-none text-slate-500 hover:text-slate-700 px-2 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
                >
                  Clinician / Staff
                </button>
              </div>
            </div>
            <h2 className="text-2xl sm:text-[28px] md:text-[32px] font-black text-[#1A2530] leading-[1.15] tracking-tight mt-4 sm:mt-0">
              Sign in with Mobile Number
            </h2>
            <p className="text-slate-500 text-lg font-medium mt-6">
              Enter your registered mobile number to receive a secure one-time verification code.
            </p>
          </div>

          <form action={step === 1 ? sendOTPAction : verifyOTPAction} className="flex flex-col gap-6">
            {(sendOTPState?.error || verifyOTPState?.error) && (
              <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-bold">
                {sendOTPState?.error || verifyOTPState?.error}
              </div>
            )}

            {/* Hidden Fields */}
            <input type="hidden" name="isRegister" value="true" />
            <input type="hidden" name="role" value="patient" />
            {step === 2 && (
              <>
                <input type="hidden" name="phone" value={phoneVal} />
                <input type="hidden" name="fullName" value={nameVal} />
              </>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                <label className="text-sm font-bold text-slate-600">Full Name</label>
                <span className="text-xs font-bold text-[#1FA67A] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Identity Match
                </span>
              </div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  name="fullName"
                  required
                  defaultValue={nameVal}
                  disabled={step === 2}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 text-[#1A2530] font-semibold placeholder-slate-300 focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                <label className="text-sm font-bold text-slate-600">Registered Mobile Number</label>
                <span className="text-xs font-bold text-[#1FA67A] flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> SMS Verification
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="relative w-[100px] sm:w-[110px] shrink-0">
                    <select
                      name="countryCode"
                      className="w-full h-full pl-3 pr-8 py-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 text-sm appearance-none outline-none focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                      defaultValue="+49"
                      disabled={step === 2}
                    >
                      {COUNTRY_CODES.sort((a, b) => a.code.localeCompare(b.code)).map((country) => (
                        <option key={country.code} value={country.dialCode}>
                          {country.code} {country.dialCode}
                        </option>
                      ))}
                    </select>
                    <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                  <div className="relative flex-1 flex min-w-0">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      name={step === 1 ? "phone" : "phoneDisplay"}
                      required
                      defaultValue={phoneVal}
                      disabled={step === 2}
                      placeholder="7123 456789"
                      className="w-full min-w-0 pl-12 pr-4 sm:pr-32 py-4 rounded-xl border border-slate-200 text-[#1A2530] font-semibold placeholder-slate-300 focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                    />
                    {step === 1 && (
                      <button
                        type="submit"
                        disabled={isSendPending}
                        className="hidden sm:block absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-blue-50 text-vibrant-blue font-bold text-sm hover:bg-blue-100 transition-colors border border-blue-100 disabled:opacity-50"
                      >
                        {isSendPending ? 'Sending...' : 'Send OTP'}
                      </button>
                    )}
                  </div>
                </div>
                {step === 1 && (
                  <button
                    type="submit"
                    disabled={isSendPending}
                    className="sm:hidden w-full py-4 rounded-xl bg-blue-50 text-vibrant-blue font-bold text-[15px] hover:bg-blue-100 transition-colors border border-blue-100 disabled:opacity-50"
                  >
                    {isSendPending ? 'Sending...' : 'Send OTP'}
                  </button>
                )}
              </div>
            </div>

            {/* OTP Fields (Visible in Step 2, or visually disabled in Step 1) */}
            <div className={`flex flex-col gap-2 mt-4 transition-opacity duration-300 ${step === 1 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                <label className="text-sm font-bold text-slate-600">6-Digit Verification Code</label>
                <span className="text-xs font-bold text-vibrant-blue">
                  Resend code in <strong className="font-black">00:45</strong>
                </span>
              </div>
              <div className="flex gap-3 justify-between">
                {/* Hidden input for full token */}
                <input type="hidden" name="token" value={otp.join('')} />
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    disabled={step === 1}
                    className="flex-1 max-w-[64px] aspect-square text-center text-xl sm:text-2xl font-black rounded-xl border border-slate-200 text-[#1A2530] focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue outline-none transition-all placeholder-slate-300 shadow-sm"
                    placeholder="•"
                  />
                ))}
              </div>
            </div>

            {/* <div className="flex items-center justify-between mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center"></div>
                <span className="text-sm font-bold text-slate-500">Remember this verified device for 30 days</span>
              </label>
              <span className="text-xs font-bold text-[#1FA67A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> 256-bit Safe
              </span>
            </div> */}

            <button
              type={step === 2 ? "submit" : "button"}
              disabled={step === 1 || isVerifyPending}
              onClick={() => { if (step === 1) alert("Please enter your mobile number and click 'Send OTP' first.") }}
              className={`w-full py-4 rounded-full text-white text-lg font-black shadow-lg transition-all flex items-center justify-center gap-2 mt-4 ${step === 2 ? 'bg-vibrant-blue hover:bg-blue-700 shadow-blue-500/30' : 'bg-slate-300 cursor-not-allowed'}`}
            >
              <Lock className="w-5 h-5" />
              <span>{isVerifyPending ? 'Verifying...' : 'Verify OTP & Sign In'}</span>
            </button>

            <div className="text-center mt-2">
              <p className="text-sm font-bold text-slate-500">
                New to Consult Your Doctor? <Link href="/signup" className="text-vibrant-blue hover:underline">Create an accredited account</Link>
              </p>
            </div>
          </form>

          <div className="mt-8 p-4 rounded-xl bg-[#F8FAFC] flex items-start gap-4 border border-slate-100">
            <ShieldCheck className="w-6 h-6 text-[#1FA67A] shrink-0" />
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Secured by GMC Verified Provider Network & UK Data Protection Act 2018. If experiencing an acute medical emergency, please call <strong className="text-[#1A2530]">999</strong> immediately. Need login assistance? <a href="#" className="text-vibrant-blue underline">Contact 24/7 Clinical Desk</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PatientLoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-vibrant-blue font-bold">Loading secure portal...</div>}>
      <PatientLoginForm />
    </Suspense>
  )
}
