'use client'

import { safeNextPath } from '@/lib/safe-redirect'
import { startTransition, useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronRight, IdCard, KeyRound, Loader2, LogIn, ShieldCheck } from 'lucide-react'
import { patientIdLogin, sendOTP, verifyOTP } from '@/app/actions/auth'
import { COUNTRY_CODES } from '@/lib/countryCodes'
import { createClient } from '@/lib/supabase/client'
import { getGoogleClientId } from '@/lib/google-auth'
import { AuthCorner, AuthShell, AuthTerms, authButton, authError, authField, authFooter, authHelp, authLabel, authLead, authLink, authRequired, authTitle, type AuthPanel } from '../AuthShell'

declare global {
  interface Window {
    google?: any
  }
}

type Mode = 'signin' | 'register'

const countryCodes = [
  ...COUNTRY_CODES.filter((c) => c.code === 'IN'),
  ...COUNTRY_CODES.filter((c) => c.code !== 'IN').sort((a, b) => a.code.localeCompare(b.code)),
]
const RESEND_SECONDS = 30

const inputClass = authField

const PANEL: AuthPanel = {
  title: 'Your health, in one place',
  lead: 'Book doctors and lab tests, and keep your reports and prescriptions together.',
  points: [
    { title: 'Book in a few taps', text: 'Pick a doctor and a time, and pay the booking fee online.' },
    { title: 'Your booking slip and token', text: 'Sent to your WhatsApp and email, with directions to the hospital.' },
    { title: 'Reports and prescriptions', text: 'Every lab report and prescription saved to your account.' },
    { title: 'Free follow-up visit', text: 'See the same doctor again within 12 days with no booking fee.' },
    { title: 'Your health insurance card', text: 'Add your policy once and the hospitals you book can see it.' },
  ],
  art: 'doctor',
}

export function PatientAuthForm({ googleEnabled = true }: { googleEnabled?: boolean }) {
  const searchParams = useSearchParams()
  // Where to return after signing in, e.g. the booking page that sent the patient here.
  const rawNext = searchParams.get('next') || ''
  const next = safeNextPath(rawNext, '')
  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'register' ? 'register' : 'signin')
  const [step, setStep] = useState<1 | 2>(1)
  // Patients a diagnostic centre registered can sign in with the Patient ID and password they were given.
  const [withPatientId, setWithPatientId] = useState(false)

  const [fullName, setFullName] = useState('')
  // Codes can only be texted to Indian numbers (see sendOTP), so India comes first.
  const [countryCode, setCountryCode] = useState('+91')
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
    searchParams.get('error') === 'google' ? 'Google login could not be completed. Please try again or use your mobile number.' : ''
  )
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [gsiLoaded, setGsiLoaded] = useState(false)
  const googleBtnContainerRef = useRef<HTMLDivElement>(null)

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

  const handleGoogleCredential = async (credential: string) => {
    setIsGoogleLoading(true)
    setGoogleError('')
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, next }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setGoogleError(data.error || 'Google login could not be completed. Please try again.')
        setIsGoogleLoading(false)
        return
      }
      window.location.href = data.redirect || next || '/'
    } catch {
      setGoogleError('Connection error during Google authentication. Please try again.')
      setIsGoogleLoading(false)
    }
  }

  useEffect(() => {
    if (!googleEnabled) return

    const clientId = getGoogleClientId()
    if (!clientId) return

    function initGoogle() {
      if (!window.google?.accounts?.id) return
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              handleGoogleCredential(response.credential)
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        // Prompt Google One Tap in real time
        window.google.accounts.id.prompt()

        // Render official Google button into container
        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = ''
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: isRegister ? 'signup_with' : 'continue_with',
            shape: 'pill',
            width: 380,
            logo_alignment: 'left',
          })
          setGsiLoaded(true)
        }
      } catch (err) {
        console.error('[GIS setup error]:', err)
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      const scriptId = 'google-gsi-client'
      let script = document.getElementById(scriptId) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = scriptId
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => initGoogle()
        document.body.appendChild(script)
      } else {
        script.addEventListener('load', initGoogle)
      }
    }
  }, [googleEnabled, isRegister, next])

  const handleGoogle = async () => {
    setGoogleError('')
    setIsGoogleLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
        },
      })

      if (error) {
        console.error('[Google Auth Error]:', error)
        setGoogleError(error.message)
        setIsGoogleLoading(false)
        return
      }

      if (data?.url) {
        window.location.href = data.url
        return
      }
    } catch (err: any) {
      console.error('[Google Auth Exception]:', err)
      setGoogleError(err?.message || 'Failed to start Google login. Please try again.')
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
  const gatewayNotice = (sendState as { gatewayNotice?: string } | null)?.gatewayNotice
  const sentBy = (sendState as { channel?: string } | null)?.channel === 'sms' ? 'by text message' : 'on WhatsApp'

  return (
    <AuthShell
      panel={PANEL}
      corner={
        isRegister ? (
          <AuthCorner lead="Already have an account?" label="Log in" onClick={() => switchMode('signin')} />
        ) : (
          <AuthCorner lead="New to Consult your Doctor?" label="Create an account" onClick={() => switchMode('register')} />
        )
      }
    >
      <h1 className={authTitle}>{isRegister ? 'Create your account' : 'Sign in to Consult your Doctor'}</h1>
      <p className={authLead}>
        {step === 2 && !withPatientId
          ? `Enter the 6-digit code we sent ${sentBy}.`
          : isRegister
            ? 'Use your mobile number or Google account. It only takes a minute.'
            : 'Use your mobile number or Google account.'}
      </p>

      <div className="mt-8">
        {withPatientId ? (
          <PatientIdSignIn next={next} onBack={() => setWithPatientId(false)} />
        ) : step === 1 ? (
          <>
            {googleEnabled && (
              <>
                <div ref={googleBtnContainerRef} className="hidden" aria-hidden="true" />
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={isGoogleLoading}
                  className="w-full h-[50px] flex items-center justify-center gap-3 px-4 rounded-[10px] bg-[#F7F9FC] hover:bg-[#EEF2F8] text-[#0B1B3F] text-[15.5px] font-bold border border-[#D0D7E2] transition-colors active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1D4ED8]" />
                  ) : (
                    <svg aria-hidden="true" className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                  )}
                  <span>{isGoogleLoading ? 'Connecting to Google…' : isRegister ? 'Sign up with Google' : 'Continue with Google'}</span>
                </button>

                <div aria-hidden className="flex items-center gap-4 my-6">
                  <span className="flex-1 h-px bg-[#E6EBF3]" />
                  <span className="text-[13.5px] text-[#7A8599]">or</span>
                  <span className="flex-1 h-px bg-[#E6EBF3]" />
                </div>
              </>
            )}

            {googleError && (
              <div role="alert" className={`${authError} mb-5`}>
                {googleError}
              </div>
            )}

            <form action={sendAction} className="space-y-6">
              {showSendError && sendState?.error && (
                <div role="alert" className={authError}>
                  {sendState.error}
                </div>
              )}

              <input type="hidden" name="isRegister" value={String(isRegister)} />
              <input type="hidden" name="role" value="patient" />

              {isRegister && (
                <div>
                  <label className={authLabel} htmlFor="full-name">
                    Full name
                    {authRequired}
                  </label>
                  <input
                    id="full-name"
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`${authField} mt-2`}
                  />
                  <p className={authHelp}>As it should appear on your bookings and prescriptions.</p>
                </div>
              )}

              <div>
                <label className={authLabel} htmlFor="mobile-number">
                  Mobile number
                  {authRequired}
                </label>
                <div className="mt-2 flex h-[50px] rounded-[10px] border border-[#D0D7E2] bg-white overflow-hidden transition-shadow focus-within:border-[#1D4ED8] focus-within:ring-4 focus-within:ring-[#1D4ED8]/15">
                  {/* The dialling code shows as a short prefix; the list under it names each country. */}
                  <span className="relative shrink-0 flex items-center gap-1 pl-3.5 pr-2.5 border-r border-[#D0D7E2] bg-[#F7F9FC] text-[15px] font-semibold text-[#0B1B3F]">
                    {countryCode}
                    <ChevronDown aria-hidden className="w-3.5 h-3.5 text-[#5B667A]" strokeWidth={2.4} />
                    <select
                      name="countryCode"
                      aria-label="Country code"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    >
                      {countryCodes.map((country) => (
                        <option key={country.code} value={country.dialCode}>
                          {country.code} {country.dialCode}
                        </option>
                      ))}
                    </select>
                  </span>
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
                    aria-describedby="mobile-help"
                    className="flex-1 min-w-0 px-4 bg-transparent text-[15.5px] text-[#0B1B3F] outline-none"
                  />
                </div>
                <p id="mobile-help" className={authHelp}>
                  We&apos;ll send a 6-digit code by WhatsApp or SMS. No password needed.
                </p>
              </div>

              <button type="submit" disabled={isSendPending} className={authButton}>
                {isSendPending ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" /> Sending code…
                  </>
                ) : (
                  <>
                    Send code <ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.6} />
                  </>
                )}
              </button>

              <AuthTerms verb="continuing" />
            </form>
          </>
        ) : (
          /* Step 2: enter the code */
          <form action={verifyAction} className="space-y-6">
            <input type="hidden" name="phone" value={sendState?.phone || ''} />
            <input type="hidden" name="fullName" value={fullName} />
            <input type="hidden" name="role" value="patient" />
            <input type="hidden" name="isRegister" value={String(isRegister)} />
            <input type="hidden" name="token" value={otp.join('')} />
            <input type="hidden" name="next" value={next} />

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-[10px] bg-[#F4F7FF] border border-[#DCE6FF]">
              <span className="flex items-center gap-2.5 min-w-0 text-[14px] text-[#27324A]">
                <ShieldCheck className="w-[18px] h-[18px] text-[#1D4ED8] shrink-0" />
                <span className="truncate">
                  Code sent to <span className="font-bold text-[#0B1B3F]">{sentTo}</span>
                </span>
              </span>
              <button type="button" onClick={() => setStep(1)} className="shrink-0 inline-flex items-center gap-1 text-[13.5px] font-bold text-[#1D4ED8] hover:underline underline-offset-4">
                <ArrowLeft className="w-3.5 h-3.5" /> Change
              </button>
            </div>

            {(verifyState?.error || (showSendError && sendState?.error)) && (
              <div role="alert" className={authError}>
                {verifyState?.error || sendState?.error}
              </div>
            )}

            {gatewayNotice && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-[12.5px] rounded-[10px] leading-relaxed">
                <p className="font-semibold mb-0.5 text-amber-800">Notice</p>
                <p className="text-[12px] opacity-90">{gatewayNotice}</p>
              </div>
            )}

            <div>
              <span className={authLabel}>
                6-digit code
                {authRequired}
              </span>
              <div className="mt-2 flex justify-between gap-2" role="group" aria-label="One-time code">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el
                    }}
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
                    className="w-full max-w-[64px] h-14 text-center text-[22px] font-extrabold text-[#0B1B3F] rounded-[10px] border border-[#D0D7E2] outline-none transition-shadow focus:border-[#1D4ED8] focus:ring-4 focus:ring-[#1D4ED8]/15"
                  />
                ))}
              </div>
            </div>

            <button type="submit" disabled={isVerifyPending || otp.join('').length < 6} className={authButton}>
              {isVerifyPending ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  {isRegister ? 'Verify and create account' : 'Verify and log in'} <ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.6} />
                </>
              )}
            </button>

            <p className="text-[14px] text-[#5B667A]">
              Didn&apos;t get a code?{' '}
              {resendIn > 0 ? (
                <span className="font-bold text-[#0B1B3F]">Resend in {resendIn}s</span>
              ) : (
                <button type="button" onClick={handleResend} disabled={isSendPending} className={`${authLink} disabled:opacity-60`}>
                  {isSendPending ? 'Sending…' : 'Resend code'}
                </button>
              )}
            </p>
          </form>
        )}
      </div>

      <div className={authFooter}>
        <p>
          Need help with a booking?{' '}
          <Link href="/contact" className={authLink}>
            Help &amp; Support
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

function PatientIdSignIn({ next, onBack }: { next: string; onBack: () => void }) {
  const [state, action, pending] = useActionState(patientIdLogin, null)
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <p className="text-[14.5px] text-[#5B667A]">Use the Patient ID and password your diagnostic centre gave you.</p>
      {state?.error && (
        <div role="alert" className={authError}>
          {state.error}
        </div>
      )}
      <label className="block">
        <span className={`block mb-2 ${authLabel}`}>Patient ID</span>
        <span className="relative block">
          <IdCard className="w-[18px] h-[18px] text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input name="patientId" required autoComplete="username" placeholder="PT482193" className={`${inputClass} pl-11 pr-4 uppercase font-mono`} />
        </span>
      </label>
      <label className="block">
        <span className={`block mb-2 ${authLabel}`}>Password</span>
        <span className="relative block">
          <KeyRound className="w-[18px] h-[18px] text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input name="password" type="password" required autoComplete="current-password" className={`${inputClass} pl-11 pr-4`} />
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className={authButton}
      >
        {pending ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <LogIn className="w-[18px] h-[18px]" />} Login
      </button>
      <button type="button" onClick={onBack} className="w-full inline-flex items-center justify-center gap-1 text-[13.5px] font-bold text-[#1D4ED8] hover:underline underline-offset-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Use my mobile number instead
      </button>
    </form>
  )
}
