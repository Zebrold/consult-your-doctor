'use client'

import { useState, useActionState, type ReactNode } from 'react'
import Link from 'next/link'
import { staffLogin, sendPasswordResetOTP } from '@/app/actions/auth'
import { ArrowLeft, ChevronRight, Loader2, MailCheck } from 'lucide-react'
import {
  AuthShell,
  AuthTerms,
  authButton,
  authError,
  authField,
  authFooter,
  authHelp,
  authLabel,
  authLead,
  authLink,
  authRequired,
  authTitle,
  type AuthPanel,
} from './AuthShell'

/** The sign-in every staff portal uses (doctor, hospital, executive, diagnostic centre): Staff ID (or work email) and
 * password, with a password reset by email, beside the portal's blue half. */
export function StaffLoginCard({
  role,
  panel,
  corner,
  title,
  description,
  idLabel,
  idHelp,
  footer,
}: {
  /** The account role this portal accepts; staffLogin turns other roles away. */
  role: 'doctor' | 'hospital_admin' | 'executive' | 'diagnostic_admin'
  /** The blue half: what the portal is and what's inside. */
  panel: AuthPanel
  /** The line at the top right, e.g. how to register. */
  corner?: ReactNode
  title: string
  description: string
  /** The first field's label, e.g. "Staff ID or work email". */
  idLabel: string
  idHelp: string
  /** The lines under the form, e.g. the patient login and help. */
  footer: ReactNode
}) {
  const [state, formAction, isPending] = useActionState(staffLogin, null)
  const [showPassword, setShowPassword] = useState(false)

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
    if (res.error) setResetError(res.error)
    else setView('verify')
  }

  return (
    <AuthShell panel={panel} corner={corner}>
      {view !== 'login' && (
        <button
          type="button"
          onClick={() => setView('login')}
          className="inline-flex items-center gap-1.5 mb-6 text-[14px] font-bold text-[#5B667A] hover:text-[#0B1B3F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>
      )}

      {view === 'login' && (
        <>
          <h1 className={authTitle}>{title}</h1>
          <p className={authLead}>{description}</p>

          <form action={formAction} className="mt-8 space-y-6">
            <input type="hidden" name="role" value={role} />

            {state?.error && (
              <div role="alert" className={authError}>
                {state.error}
              </div>
            )}

            <div>
              <label className={authLabel} htmlFor="staff-id">
                {idLabel}
                {authRequired}
              </label>
              <input
                id="staff-id"
                required
                name="staffId"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="staff-id-help"
                className={`${authField} mt-2`}
              />
              <p id="staff-id-help" className={authHelp}>
                {idHelp}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className={authLabel} htmlFor="password">
                  Password
                  {authRequired}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot')
                    setResetError('')
                  }}
                  className="text-[14px] font-bold text-[#1D4ED8] hover:underline underline-offset-4"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-2">
                <input
                  id="password"
                  required
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`${authField} pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-3 rounded-lg text-[14px] font-bold text-[#1D4ED8] hover:bg-[#F2F6FF]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button disabled={isPending} type="submit" className={authButton}>
              {isPending ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] animate-spin" /> Logging in…
                </>
              ) : (
                <>
                  Log in <ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.6} />
                </>
              )}
            </button>

            <AuthTerms />
          </form>

          <div className={authFooter}>{footer}</div>
        </>
      )}

      {view === 'forgot' && (
        <>
          <h1 className={authTitle}>Reset your password</h1>
          <p className={authLead}>Enter your Staff ID and we&apos;ll email a reset link to the address registered on your account.</p>

          <form onSubmit={handleSendReset} className="mt-8 space-y-6">
            {resetError && (
              <div role="alert" className={authError}>
                {resetError}
              </div>
            )}
            <div>
              <label className={authLabel} htmlFor="reset-staff-id">
                Staff ID
                {authRequired}
              </label>
              <input
                id="reset-staff-id"
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                type="text"
                autoCapitalize="characters"
                className={`${authField} mt-2 uppercase`}
              />
              <p className={authHelp}>It&apos;s in the welcome email from our team.</p>
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
          <h1 className={authTitle}>Check your email</h1>
          <p className={authLead}>We&apos;ve sent a password reset link to your registered email address. Open it to set a new password.</p>
        </div>
      )}
    </AuthShell>
  )
}

/** A line under the form, e.g. "Booking an appointment? Patient login". */
export function FooterLine({ lead, href, children }: { lead: string; href: string; children: ReactNode }) {
  return (
    <p>
      {lead}{' '}
      <Link href={href} className={authLink}>
        {children}
      </Link>
    </p>
  )
}
