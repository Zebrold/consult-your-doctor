'use client'

import Link from 'next/link'
import { useState, useActionState, type ReactNode } from 'react'
import { staffLogin, sendPasswordResetOTP } from '@/app/actions/auth'
import { ArrowLeft, ArrowRight, IdCard, Loader2, Lock, MailCheck } from 'lucide-react'
import { AuthShell, authButton, authError, authField, authLabel, authLink, type AuthPanel } from './AuthShell'

const inputClass = `${authField} pl-11 pr-4`
const iconClass = 'absolute left-4 w-[18px] h-[18px] text-[#9AA4B5] pointer-events-none'

/** The sign-in every staff portal uses (doctor, hospital, executive, diagnostic center): Staff ID and password, with a
 * password reset by email, beside the portal's blue panel. */
export function StaffLoginCard({
  role,
  panel,
  title,
  description,
  footer,
  idLabel = 'Staff ID',
}: {
  /** The account role this portal accepts; staffLogin turns other roles away. */
  role: 'doctor' | 'hospital_admin' | 'executive' | 'diagnostic_admin'
  /** The blue panel beside the form: which portal this is and what's inside. */
  panel: AuthPanel
  title: string
  description: string
  /** The line under the form, e.g. how to get an account. */
  footer: ReactNode
  idLabel?: string
}) {
  const [state, formAction, isPending] = useActionState(staffLogin, null)

  const [view, setView] = useState<'login' | 'forgot' | 'verify'>('login')
  const [staffId, setStaffId] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState('')

  const handleSendReset = async (e: React.FormEvent) => {
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
    <AuthShell panel={panel}>
      {view !== 'login' && (
        <button
          type="button"
          onClick={() => setView('login')}
          className="self-start inline-flex items-center gap-1.5 mb-6 text-[13.5px] font-bold text-[#5B667A] hover:text-[#0B1B3F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>
      )}

      {view === 'login' && (
        <>
          <h1 className="text-[28px] md:text-[32px] leading-[1.15] font-extrabold tracking-[-0.025em]">{title}</h1>
          <p className="mt-2 text-[15px] leading-[1.6] text-[#5B667A]">{description}</p>

          <form action={formAction} className="mt-7 space-y-5">
            <input type="hidden" name="role" value={role} />

            {state?.error && (
              <div role="alert" className={authError}>
                {state.error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className={authLabel} htmlFor="staff-id">{idLabel}</label>
              <div className="relative flex items-center">
                <IdCard className={iconClass} />
                <input id="staff-id" required name="staffId" type="text" autoComplete="username" placeholder="e.g. CYDAB1234" className={`${inputClass} uppercase placeholder:normal-case`} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className={authLabel} htmlFor="password">Password</label>
                <button
                  type="button"
                  onClick={() => { setView('forgot'); setResetError('') }}
                  className="text-[13px] font-bold text-[#1D4ED8] hover:underline underline-offset-4"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className={iconClass} />
                <input id="password" required name="password" type="password" autoComplete="current-password" placeholder="••••••••" className={inputClass} />
              </div>
            </div>

            <button disabled={isPending} type="submit" className={`${authButton} mt-1`}>
              {isPending ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] animate-spin" /> Logging in...
                </>
              ) : (
                <>
                  Log in <ArrowRight className="w-[18px] h-[18px]" strokeWidth={2.4} />
                </>
              )}
            </button>

            <p className="text-center text-[12.5px] leading-normal text-[#7A8599]">
              By logging in, you agree to our{' '}
              <Link className="font-bold text-[#27324A] hover:underline" href="/terms-of-use">
                Terms &amp; Conditions
              </Link>{' '}
              and{' '}
              <Link className="font-bold text-[#27324A] hover:underline" href="/privacy-policy">
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <div className="mt-7 pt-6 border-t border-[#EEF2F7] space-y-2 text-[14px] text-[#5B667A]">
            <p>{footer}</p>
            <p>
              Looking to book a visit?{' '}
              <Link href="/login/patient" className={authLink}>
                Patient login
              </Link>
            </p>
          </div>
        </>
      )}

      {view === 'forgot' && (
        <>
          <h1 className="text-[26px] md:text-[30px] leading-[1.15] font-extrabold tracking-[-0.025em]">Reset your password</h1>
          <p className="mt-2 text-[15px] leading-[1.6] text-[#5B667A]">
            Enter your {idLabel} and we&apos;ll email a reset link to the address registered on your account.
          </p>

          <form onSubmit={handleSendReset} className="mt-7 space-y-5">
            {resetError && (
              <div role="alert" className={authError}>
                {resetError}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className={authLabel} htmlFor="reset-staff-id">{idLabel}</label>
              <div className="relative flex items-center">
                <IdCard className={iconClass} />
                <input
                  id="reset-staff-id"
                  required
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  type="text"
                  placeholder="e.g. CYDAB1234"
                  className={`${inputClass} uppercase placeholder:normal-case`}
                />
              </div>
            </div>
            <button disabled={isResetting || !staffId} type="submit" className={authButton}>
              {isResetting ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : 'Send reset link'}
            </button>
          </form>
        </>
      )}

      {view === 'verify' && (
        <div className="text-center">
          <span className="mx-auto mb-5 w-14 h-14 rounded-full bg-[#E7F7EE] text-[#067647] flex items-center justify-center">
            <MailCheck className="w-7 h-7" />
          </span>
          <h1 className="text-[26px] md:text-[30px] leading-[1.15] font-extrabold tracking-[-0.025em]">Check your email</h1>
          <p className="mt-2 text-[15px] leading-[1.6] text-[#5B667A]">
            We&apos;ve sent a password reset link to your registered email address. Open it to set a new password.
          </p>
        </div>
      )}
    </AuthShell>
  )
}

/** A link in the line under the form, e.g. "Apply to join our network". */
export function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${authLink} ml-1`}>
      {children}
    </Link>
  )
}
