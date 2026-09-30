'use client'

import { startTransition, useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, ChevronDown, Loader2, LogIn, MessageSquare, Stethoscope, User, UserPlus } from 'lucide-react'
import { sendOTP, verifyOTP } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { COUNTRY_CODES } from '@/lib/countryCodes'

type Mode = 'signin' | 'register'

const countryCodes = [...COUNTRY_CODES].sort((a, b) => a.code.localeCompare(b.code))
const RESEND_SECONDS = 30

const inputClass =
  'w-full py-3 bg-surface-container-lowest text-on-surface text-[14px] rounded-xl border border-outline-variant/60 outline-none focus:border-vibrant-blue focus:ring-2 focus:ring-vibrant-blue/20 transition-all placeholder:text-outline/70 disabled:opacity-60'

export function PatientAuthForm({ googleEnabled }: { googleEnabled: boolean }) {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'register' ? 'register' : 'signin')
  const [step, setStep] = useState<1 | 2>(1)

  const [fullName, setFullName] = useState('')
  const [countryCode, setCountryCode] = useState('+49')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const [showSendError, setShowSendError] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [sendState, sendAction, isSendPending] = useActionState(
    async (prev: Awaited<ReturnType<typeof sendOTP>> | null, formData: FormData) => {
      const result = await sendOTP(prev, formData)
      if (result.success) {
        setStep(2)
        setResendIn(RESEND_SECONDS)
      }
      setShowSendError(!result.success)
      return result
    },
    null
  )
  const [verifyState, verifyAction, isVerifyPending] = useActionState(verifyOTP, null)

  const [googleError, setGoogleError] = useState(
    searchParams.get('error') === 'google' ? 'Google sign-in could not be completed. Please try again or use your mobile number.' : ''
  )
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const isRegister = mode === 'register'

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  const switchMode = (next: Mode) => {
    setMode(next)
    setStep(1)
    setShowSendError(false)
    setOtp(['', '', '', '', '', ''])
  }

  const handleGoogle = async () => {
    setGoogleError('')
    setIsGoogleLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setGoogleError(error.message)
      setIsGoogleLoading(false)
    }
  }

  const handleResend = () => {
    const formData = new FormData()
    formData.set('phone', phone)
    formData.set('countryCode', countryCode)
    formData.set('fullName', fullName)
    formData.set('role', 'patient')
    formData.set('isRegister', String(isRegister))
    startTransition(() => sendAction(formData))
  }

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...otp]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setOtp(next)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const sentTo = sendState?.phone || `${countryCode} ${phone}`

  return (
    <div className="w-full max-w-[480px] flex flex-col items-center">
      <div className="w-full bg-surface-container-lowest rounded-2xl shadow-[0_12px_40px_-8px_rgba(0,102,255,0.08),0_2px_12px_rgba(0,0,0,0.03)] p-6 sm:p-9 relative z-10">
        <div className="text-center mb-7">
          <h1 className="font-display-lg text-[28px] sm:text-[32px] leading-[38px] font-bold text-on-surface tracking-tight mb-2">
            Welcome to Consult Your Doctor
          </h1>
          <p className="text-on-surface-variant text-[14px] leading-relaxed max-w-[390px] mx-auto">
            Sign in or create an account to book consultations, access lab reports, and manage family health records.
          </p>
        </div>

        {step === 1 ? (
          <>
            {/* Segmented tab switcher */}
            <div className="bg-surface-container-low p-1 rounded-full flex mb-7" role="tablist" aria-label="Account">
              {([
                { id: 'signin', label: 'Sign In', icon: LogIn },
                { id: 'register', label: 'Create Account', icon: UserPlus },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => switchMode(id)}
                  className={`w-1/2 py-2.5 rounded-full font-title-md text-[14px] leading-none font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    mode === id ? 'text-on-primary bg-vibrant-blue shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {googleEnabled && (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full bg-surface-container-lowest hover:bg-surface-container-low text-on-surface text-[14px] font-semibold ring-1 ring-outline-variant/50 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-all active:scale-[0.99] disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg aria-hidden="true" className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                  )}
                  {isRegister ? 'Sign up with Google' : 'Continue with Google'}
                </button>

                <div className="relative flex items-center justify-center my-6">
                  <div className="w-full h-px bg-surface-container" />
                  <span className="px-3 text-[12px] font-label-sm text-on-surface-variant uppercase tracking-wider shrink-0">
                    {isRegister ? 'or register with mobile number' : 'or sign in with mobile number'}
                  </span>
                  <div className="w-full h-px bg-surface-container" />
                </div>
              </>
            )}

            {googleError && (
              <div role="alert" className="mb-4 p-3 bg-error-container/60 text-on-error-container text-[13px] rounded-xl font-semibold">
                {googleError}
              </div>
            )}

            <form action={sendAction} className="space-y-4">
              {showSendError && sendState?.error && (
                <div role="alert" className="p-3 bg-error-container/60 text-on-error-container text-[13px] rounded-xl font-semibold">
                  {sendState.error}
                </div>
              )}

              <input type="hidden" name="isRegister" value={String(isRegister)} />
              <input type="hidden" name="role" value="patient" />

              {isRegister && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm text-indigo-gray-600 pl-1" htmlFor="full-name">
                    Full Legal Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-[18px] h-[18px] text-outline pointer-events-none" />
                    <input
                      id="full-name"
                      name="fullName"
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className={`${inputClass} pl-10 pr-4`}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-indigo-gray-600 pl-1" htmlFor="mobile-number">
                  Mobile Number
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative shrink-0">
                    <select
                      name="countryCode"
                      aria-label="Country code"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="appearance-none bg-surface-container-low hover:bg-surface-container text-on-surface font-title-md text-[13px] font-semibold py-3 pl-3 pr-8 rounded-xl outline-none cursor-pointer transition-colors focus:ring-2 focus:ring-vibrant-blue/40"
                    >
                      {countryCodes.map((country) => (
                        <option key={country.code} value={country.dialCode}>
                          {country.code} {country.dialCode}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  </div>
                  <input
                    id="mobile-number"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    required
                    maxLength={15}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter your mobile number"
                    className={`${inputClass} px-4 flex-1 min-w-0`}
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant/90 pl-1 mt-0.5 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-fresh-teal shrink-0" />
                  We&apos;ll send a 6-digit One Time Password (OTP) via SMS
                </p>
              </div>

              <button
                type="submit"
                disabled={isSendPending}
                className="w-full mt-2 py-3.5 px-6 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary font-title-md text-[15px] font-semibold transition-all duration-200 shadow-[0_4px_14px_rgba(0,102,255,0.3)] hover:shadow-[0_6px_20px_rgba(0,102,255,0.4)] active:scale-[0.99] flex items-center justify-center gap-2 group disabled:opacity-70"
              >
                {isSendPending ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" /> Sending OTP...
                  </>
                ) : (
                  <>
                    {isRegister ? 'Register & Receive OTP' : 'Get OTP & Continue'}
                    <ArrowRight className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-on-surface-variant/80 pt-1 leading-normal">
                By continuing, you agree to our{' '}
                <Link className="text-primary hover:underline font-medium" href="/terms-of-use">Terms of Service</Link> &amp;{' '}
                <Link className="text-primary hover:underline font-medium" href="/privacy-policy">Privacy Policy</Link>.
              </p>
            </form>
          </>
        ) : (
          /* Step 2: enter the OTP */
          <form action={verifyAction} className="space-y-5">
            <input type="hidden" name="phone" value={sendState?.phone || ''} />
            <input type="hidden" name="fullName" value={fullName} />
            <input type="hidden" name="role" value="patient" />
            <input type="hidden" name="isRegister" value={String(isRegister)} />
            <input type="hidden" name="token" value={otp.join('')} />

            <div className="text-center">
              <p className="text-[14px] text-on-surface-variant">
                Enter the 6-digit code we sent to <span className="font-semibold text-on-surface">{sentTo}</span>
              </p>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-vibrant-blue hover:text-primary"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change number
              </button>
            </div>

            {(verifyState?.error || (showSendError && sendState?.error)) && (
              <div role="alert" className="p-3 bg-error-container/60 text-on-error-container text-[13px] rounded-xl font-semibold">
                {verifyState?.error || sendState?.error}
              </div>
            )}

            <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="One-time password">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { otpRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  autoFocus={index === 0}
                  aria-label={`Digit ${index + 1}`}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold text-on-surface rounded-xl border border-outline-variant/60 outline-none focus:border-vibrant-blue focus:ring-2 focus:ring-vibrant-blue/20 transition-all"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isVerifyPending || otp.join('').length < 6}
              className="w-full py-3.5 px-6 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary font-title-md text-[15px] font-semibold transition-all duration-200 shadow-[0_4px_14px_rgba(0,102,255,0.3)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:shadow-none"
            >
              {isVerifyPending ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] animate-spin" /> Verifying...
                </>
              ) : isRegister ? 'Verify & Create Account' : 'Verify & Sign In'}
            </button>

            <p className="text-center text-[13px] text-on-surface-variant">
              Didn&apos;t get a code?{' '}
              {resendIn > 0 ? (
                <span className="font-semibold">Resend in {resendIn}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isSendPending}
                  className="font-semibold text-vibrant-blue hover:text-primary underline underline-offset-2 disabled:opacity-60"
                >
                  {isSendPending ? 'Sending...' : 'Resend OTP'}
                </button>
              )}
            </p>
          </form>
        )}

        {/* Contextual switch prompt */}
        <div className="mt-6 -mx-6 -mb-6 sm:-mx-9 sm:-mb-9 px-6 py-4 bg-surface-container-low/50 rounded-b-2xl text-center">
          <p className="text-[13px] text-on-surface-variant">
            {isRegister ? 'Already have an account?' : 'New to Consult Your Doctor?'}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? 'signin' : 'register')}
              className="font-title-md text-[13px] text-vibrant-blue hover:text-primary font-semibold ml-1 underline underline-offset-2"
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </div>

      {/* Clinician portal link */}
      <div className="w-full mt-6 flex items-center gap-3 rounded-2xl bg-surface-container-lowest/80 px-5 py-4 shadow-sm">
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container text-primary shrink-0">
          <Stethoscope className="w-[18px] h-[18px]" />
        </span>
        <p className="text-[13px] text-on-surface-variant leading-snug">
          <span className="font-semibold text-on-surface">Are you a doctor?</span>{' '}
          <Link href="/login/doctor" className="text-vibrant-blue font-semibold hover:underline">Clinician sign in</Link>
          {' · '}
          <Link href="/signup/doctor" className="text-vibrant-blue font-semibold hover:underline">Apply to join</Link>
        </p>
      </div>
    </div>
  )
}
