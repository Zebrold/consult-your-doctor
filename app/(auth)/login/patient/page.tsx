'use client'

import { useState, useActionState, useEffect } from 'react'
import { ArrowLeft, User, Shield, ShieldCheck, FileText, FileCheck, Smartphone, MessageSquare, Lock, CheckCircle2 } from 'lucide-react'
import { sendOTP, verifyOTP } from '@/app/actions/auth'
import Link from 'next/link'
import { Suspense } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

function PatientLoginForm() {
  const [step, setStep] = useState<1 | 2>(1)
  const router = useRouter()

  const [sendOTPState, sendOTPAction, isSendPending] = useActionState(sendOTP, null)
  const [verifyOTPState, verifyOTPAction, isVerifyPending] = useActionState(verifyOTP, null)

  useEffect(() => {
    if (sendOTPState?.success) {
      setStep(2)
    }
  }, [sendOTPState])

  const phoneVal = sendOTPState?.phone || ''
  const nameVal = sendOTPState?.fullName || ''
  const roleVal = sendOTPState?.role || 'patient'

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-4 lg:p-8 font-sans">
      {/* Top Status Bar */}
      <div className="max-w-[1400px] mx-auto hidden lg:flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
          <ShieldCheck className="w-5 h-5 text-vibrant-blue" />
          <span>Secure Gateway 4.2 <span className="text-slate-400 mx-2">•</span> TLS 1.3 / AES-256 GCM</span>
        </div>
        <div className="bg-[#EAF5F8] text-[#0A87A8] px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
          EHR Direct Sync: Operational (32ms)
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* LEFT PANEL */}
        <div className="bg-gradient-to-b from-[#F2F5FB] to-[#E3F8F9] rounded-[2rem] p-6 lg:p-14 flex flex-col justify-between relative overflow-hidden order-2 lg:order-1">
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm text-vibrant-blue text-sm font-bold">
                <Shield className="w-4 h-4" />
                Single Sign-On (SSO)
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D6EFE5] text-[#1D7F5C] text-sm font-bold">
                HIPAA & ISO 27001
              </span>
            </div>
            
            <div className="mt-6 lg:mt-8">
              <span className="text-sm text-vibrant-blue font-black uppercase tracking-[0.1em] block mb-4">Connected Medical Record</span>
              <h1 className="text-4xl lg:text-6xl font-black text-[#1A2530] leading-[1.1] tracking-tight">
                One secure key<br className="hidden lg:block"/>to your entire<br className="hidden lg:block"/>health journey.
              </h1>
              <p className="text-lg text-slate-600 mt-6 leading-relaxed max-w-md font-medium">
                Access real-time pathology reports, encrypted video consultations, electronic prescriptions, and synchronized vitals instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <div className="p-6 rounded-2xl bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="w-10 h-10 rounded-full bg-[#EAF2FF] flex items-center justify-center text-vibrant-blue mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-[#1A2530] mb-2">Lab Reports</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">Validated results synced directly from certified diagnostics.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="w-10 h-10 rounded-full bg-[#E5F7ED] flex items-center justify-center text-[#1FA67A] mb-4">
                  <FileCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-[#1A2530] mb-2">e-Prescriptions</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">Instant dispensing via your local registered pharmacy network.</p>
              </div>
            </div>

            <div className="mt-4 bg-white rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">Active Encryption Throughput</p>
                <p className="text-2xl font-black text-[#1A2530]">99.98% Integrity</p>
              </div>
              <div className="w-32 h-10 opacity-70">
                <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
                  <path d="M0,25 C20,25 30,5 50,15 C70,25 80,10 100,5" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 mt-8 bg-white/40 backdrop-blur-md rounded-2xl p-6 border border-white/60">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 relative shrink-0">
                <Image src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhiYr4l1IYGZaQlp2rnYQakB4dfjWDIWWNe89JRTeo74YmhrnJbRVVK1ZqqdHW-EkQe6LYJaVfDdE8iW5Z0WVzFIZ3Nfm9Cm4Zo_K4a3ahaZRjM4ixEaN-FW2SloJutuKoYsBYIC9DR757Ry8PkYpZ0zuxRqmXokxiDcQskKqARYUE_WsaH6vyBrn3kj4ASe9OkjAHpAB1CB1_28l6Ona0UWkwCe6yZyGs5V5jVpA8SIHVRBUeJd7o_w" alt="Dr" fill className="object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base font-bold text-[#1A2530]">Dr. Aris Thorne, MD</span>
                  <CheckCircle2 className="w-4 h-4 text-[#1FA67A] fill-current text-white" />
                </div>
                <span className="text-sm font-bold text-slate-500">Chief Medical Information Officer</span>
              </div>
            </div>
            <p className="text-sm italic text-slate-700 font-medium leading-relaxed">
              "The cryptographic separation of patient EHR files allows clinicians zero-friction triage while maintaining absolute regulatory compliance."
            </p>
          </div>
        </div>

        {/* RIGHT PANEL - Authentication Portal */}
        <div className="bg-white rounded-[2rem] p-6 lg:p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-center border border-slate-100 order-1 lg:order-2">
          
          <div className="mb-10">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
              <span className="text-sm font-bold text-vibrant-blue uppercase tracking-widest text-center xl:text-left">Authentication Portal</span>
              <div className="bg-[#F1F5F9] rounded-full p-1.5 flex shadow-inner shrink-0 w-fit">
                <button className="bg-vibrant-blue text-white px-6 py-2 rounded-full text-sm font-bold shadow-md">
                  Patient Portal
                </button>
                <button 
                  type="button"
                  onClick={() => router.push('/login/doctor')}
                  className="text-slate-500 hover:text-slate-700 px-6 py-2 rounded-full text-sm font-bold transition-colors"
                >
                  Clinician / Staff
                </button>
              </div>
            </div>
            <h2 className="text-2xl sm:text-[28px] md:text-[32px] lg:text-[34px] xl:text-[40px] font-black text-[#1A2530] leading-[1.15] tracking-tight sm:whitespace-nowrap mt-4 xl:mt-0">
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
            {step === 2 && (
              <>
                <input type="hidden" name="phone" value={phoneVal} />
                <input type="hidden" name="fullName" value={nameVal} />
                <input type="hidden" name="role" value={roleVal} />
              </>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
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
              <div className="flex items-center justify-between">
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
                      defaultValue="+44"
                      disabled={step === 2}
                    >
                      <option value="+44">GB +44</option>
                      <option value="+1">US +1</option>
                      <option value="+91">IN +91</option>
                      <option value="+61">AU +61</option>
                    </select>
                    <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                  <div className="relative flex-1 flex">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="tel" 
                      name={step === 1 ? "phone" : "phoneDisplay"}
                      required
                      defaultValue={phoneVal}
                      disabled={step === 2}
                      placeholder="7123 456789"
                      className="w-full pl-12 pr-4 sm:pr-32 py-4 rounded-xl border border-slate-200 text-[#1A2530] font-semibold placeholder-slate-300 focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
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
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-600">6-Digit Verification Code</label>
                <span className="text-xs font-bold text-vibrant-blue">
                  Resend code in <strong className="font-black">00:45</strong>
                </span>
              </div>
              <div className="flex gap-3 justify-between">
                {[1,2,3,4,5,6].map((i) => (
                  <input 
                    key={i}
                    type="text"
                    maxLength={1}
                    name={i === 1 ? "token" : undefined}
                    disabled={step === 1}
                    className="flex-1 max-w-[64px] aspect-square text-center text-xl sm:text-2xl font-black rounded-xl border border-slate-200 text-[#1A2530] focus:border-vibrant-blue focus:ring-1 focus:ring-vibrant-blue outline-none transition-all placeholder-slate-300 shadow-sm"
                    placeholder="•"
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center"></div>
                <span className="text-sm font-bold text-slate-500">Remember this verified device for 30 days</span>
              </label>
              <span className="text-xs font-bold text-[#1FA67A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> 256-bit Safe
              </span>
            </div>

            <button 
              type={step === 2 ? "submit" : "button"}
              disabled={step === 1 || isVerifyPending}
              onClick={() => { if(step === 1) alert("Please enter your mobile number and click 'Send OTP' first.") }}
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
