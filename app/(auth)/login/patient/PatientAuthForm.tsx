'use client'

import { safeNextPath } from '@/lib/safe-redirect'
import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ChevronDown, Loader2, ShieldCheck } from 'lucide-react'
import { patientIdLogin, sendOTP, verifyOTP } from '@/app/actions/auth'
import { COUNTRY_CODES } from '@/lib/countryCodes'
import { createClient } from '@/lib/supabase/client'
import { getGoogleClientId } from '@/lib/google-auth'
import { AuthCorner, AuthOr, AuthShell, AuthTerms, authButton, authButtonOutline, authError, authField, authHelp, authLabel, authLink } from '../AuthShell'

// The slice of the Google Identity Services client this form uses.
type GoogleIdentity = {
  accounts?: {
    id?: {
      initialize: (config: {
        client_id: string
        callback: (response: { credential?: string }) => void
        auto_select: boolean
        cancel_on_tap_outside: boolean
      }) => void
      prompt: () => void
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

type Mode = 'signin' | 'register'

const countryCodes = [
  ...COUNTRY_CODES.filter((c) => c.code === 'IN'),
  ...COUNTRY_CODES.filter((c) => c.code !== 'IN').sort((a, b) => a.code.localeCompare(b.code)),
]
const RESEND_SECONDS = 30

/** A country's flag before its dialling code: India's drawn (Windows shows flag emoji as letters), others as emoji. */
function Flag({ iso }: { iso: string }) {
  if (iso === 'IN') {
    return (
      <svg aria-hidden viewBox="0 0 30 20" className="w-[30px] h-5 rounded-[3px] shadow-[0_0_0_1px_rgba(11,27,63,0.12)] shrink-0">
        <rect width="30" height="20" fill="#fff" />
        <rect width="30" height="6.67" fill="#FF9933" />
        <rect y="13.33" width="30" height="6.67" fill="#138808" />
        <circle cx="15" cy="10" r="2.5" fill="none" stroke="#000080" strokeWidth="0.7" />
        <circle cx="15" cy="10" r="0.6" fill="#000080" />
      </svg>
    )
  }
  const emoji = String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
  return (
    <span aria-hidden className="text-[20px] leading-none shrink-0">
      {emoji}
    </span>
  )
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
  // Codes can only be texted to Indian numbers (see sendOTP), so India comes first. The list picks a country (several
  // share a dialling code); the form sends its dialling code.
  const [countryIso, setCountryIso] = useState('IN')
  const countryCode = countryCodes.find((c) => c.code === countryIso)?.dialCode ?? '+91'
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

  const handleGoogleCredential = useCallback(async (credential: string) => {
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
  }, [next])

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
  }, [googleEnabled, isRegister, handleGoogleCredential])

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
    } catch (err) {
      console.error('[Google Auth Exception]:', err)
      setGoogleError((err instanceof Error && err.message) || 'Failed to start Google login. Please try again.')
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

  const header = withPatientId
    ? { title: 'Login', subtitle: 'Use the Patient ID your diagnostic centre gave you' }
    : step === 2
      ? { title: 'Verify', subtitle: `Enter the 6-digit code we sent ${sentBy}` }
      : isRegister
        ? { title: 'Sign up', subtitle: 'Enter your name and phone number to continue' }
        : { title: 'Login', subtitle: 'Enter your phone number to continue' }

  return (
    <AuthShell
      title={header.title}
      subtitle={header.subtitle}
      art="patient"
      backHref={next || '/'}
      footer={
        <p>
          Need help with a booking?{' '}
          <Link href="/contact" className={authLink}>
            Help &amp; Support
          </Link>
        </p>
      }
      corner={
        step === 2 || withPatientId ? undefined : isRegister ? (
          <AuthCorner lead="Already have an account?" label="Log in" onClick={() => switchMode('signin')} />
        ) : (
          <AuthCorner lead="New to Consult your Doctor?" label="Create an account" onClick={() => switchMode('register')} />
        )
      }
    >
      {withPatientId ? (
        <PatientIdSignIn next={next} onBack={() => setWithPatientId(false)} />
      ) : step === 1 ? (
        <>
          {googleError && (
            <div role="alert" className={`${authError} mb-6`}>
              {googleError}
            </div>
          )}

          <form action={sendAction} className="space-y-7">
            {showSendError && sendState?.error && (
              <div role="alert" className={authError}>
                {sendState.error}
              </div>
            )}

            <input type="hidden" name="isRegister" value={String(isRegister)} />
            <input type="hidden" name="role" value="patient" />
            <input type="hidden" name="countryCode" value={countryCode} />

            {isRegister && (
              <div>
                <label className={authLabel} htmlFor="full-name">
                  Full name
                </label>
                <input
                  id="full-name"
                  name="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="As on your ID"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`${authField} mt-1`}
                />
              </div>
            )}

            <div>
              <label className={authLabel} htmlFor="mobile-number">
                Phone number
              </label>
              <div className="mt-1 flex items-center h-[52px] border-b-2 border-[#D5DCE8] transition-colors focus-within:border-[#2A4DD0]">
                {/* The flag and dialling code; the list under them names each country. */}
                <span className="relative shrink-0 flex items-center gap-2.5 pr-2.5 text-[17px] font-bold text-[#0B1B3F]">
                  <Flag iso={countryIso} />
                  {countryCode}
                  <ChevronDown aria-hidden className="w-3.5 h-3.5 text-[#7A8599]" strokeWidth={2.4} />
                  <select
                    aria-label="Country"
                    value={countryIso}
                    onChange={(e) => setCountryIso(e.target.value)}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  >
                    {countryCodes.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.code} {country.dialCode}
                      </option>
                    ))}
                  </select>
                </span>
                <span aria-hidden className="w-px h-6 bg-[#D5DCE8] mr-3" />
                <input
                  id="mobile-number"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                  maxLength={15}
                  placeholder="Mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  aria-describedby="mobile-help"
                  className="flex-1 min-w-0 h-full bg-transparent text-[17px] font-semibold tracking-[0.02em] text-[#0B1B3F] placeholder:font-normal placeholder:tracking-normal placeholder:text-[#A3ADBF] outline-none"
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
                'Continue'
              )}
            </button>
          </form>

          {googleEnabled && (
            <>
              <AuthOr />
              <div ref={googleBtnContainerRef} className="hidden" aria-hidden="true" />
              <button type="button" onClick={handleGoogle} disabled={isGoogleLoading} className={authButtonOutline}>
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#2A4DD0]" />
                ) : (
                  <svg aria-hidden="true" className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Connecting to Google…' : isRegister ? 'Sign up with Google' : 'Continue with Google'}</span>
              </button>
            </>
          )}

          <AuthTerms />
        </>
      ) : (
        /* Step 2: enter the code */
        <form action={verifyAction} className="space-y-7">
          <input type="hidden" name="phone" value={sendState?.phone || ''} />
          <input type="hidden" name="fullName" value={fullName} />
          <input type="hidden" name="role" value="patient" />
          <input type="hidden" name="isRegister" value={String(isRegister)} />
          <input type="hidden" name="token" value={otp.join('')} />
          <input type="hidden" name="next" value={next} />

          <div className="flex items-center justify-between gap-3 p-3.5 rounded-[12px] bg-[#F4F7FF] border border-[#DCE6FF]">
            <span className="flex items-center gap-2.5 min-w-0 text-[14px] text-[#27324A]">
              <ShieldCheck className="w-[18px] h-[18px] text-[#2A4DD0] shrink-0" />
              <span className="truncate">
                Code sent to <span className="font-bold text-[#0B1B3F]">{sentTo}</span>
              </span>
            </span>
            <button type="button" onClick={() => setStep(1)} className="shrink-0 inline-flex items-center gap-1 text-[13.5px] font-bold text-[#2A4DD0] hover:underline underline-offset-4">
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
            <span className={authLabel}>6-digit code</span>
            <div className="mt-3 flex justify-between gap-2" role="group" aria-label="One-time code">
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
                  className="w-full max-w-[60px] h-14 text-center text-[22px] font-extrabold text-[#0B1B3F] rounded-[12px] border-2 border-[#D5DCE8] bg-white outline-none transition-colors focus:border-[#2A4DD0]"
                />
              ))}
            </div>
          </div>

          <button type="submit" disabled={isVerifyPending || otp.join('').length < 6} className={authButton}>
            {isVerifyPending ? (
              <>
                <Loader2 className="w-[18px] h-[18px] animate-spin" /> Verifying…
              </>
            ) : isRegister ? (
              'Verify & create account'
            ) : (
              'Verify & login'
            )}
          </button>

          <p className="text-center text-[14px] text-[#5B667A]">
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
    </AuthShell>
  )
}

function PatientIdSignIn({ next, onBack }: { next: string; onBack: () => void }) {
  const [state, action, pending] = useActionState(patientIdLogin, null)
  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="next" value={next} />
      {state?.error && (
        <div role="alert" className={authError}>
          {state.error}
        </div>
      )}
      <div>
        <label htmlFor="patient-id" className={authLabel}>
          Patient ID
        </label>
        <input id="patient-id" name="patientId" required autoComplete="username" placeholder="PT482193" className={`${authField} mt-1 uppercase font-mono`} />
      </div>
      <div>
        <label htmlFor="patient-password" className={authLabel}>
          Password
        </label>
        <input id="patient-password" name="password" type="password" required autoComplete="current-password" className={`${authField} mt-1`} />
      </div>
      <button type="submit" disabled={pending} className={authButton}>
        {pending ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : 'Login'}
      </button>
      <button type="button" onClick={onBack} className="w-full inline-flex items-center justify-center gap-1 text-[14px] font-bold text-[#2A4DD0] hover:underline underline-offset-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Use my phone number instead
      </button>
    </form>
  )
}
