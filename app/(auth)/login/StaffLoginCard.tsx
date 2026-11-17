'use client'

import { useEffect, useState, useActionState, type ReactNode } from 'react'
import Link from 'next/link'
import { staffLogin, sendPasswordResetOTP } from '@/app/actions/auth'
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from 'lucide-react'
import { AuthShell, AuthTerms, authButton, authError, authField, authHelp, authLabel, authLink, type AuthArt } from './AuthShell'

/** The sign-in every staff portal uses (doctor, hospital, executive, diagnostic centre): Staff ID (or work email) and
 * password, with a password reset by email, under the portal's blue header. */
export function StaffLoginCard({
  role,
  art,
  title,
  subtitle,
  backHref = '/corporate',
  corner,
  idLabel,
  idHelp,
  footer,
}: {
  /** The account role this portal accepts; staffLogin turns other roles away. */
  role: 'doctor' | 'hospital_admin' | 'executive' | 'diagnostic_admin'
  /** The sign on the header's clipboard. */
  art: AuthArt
  /** The header's name, shown in capitals: "Doctor login". */
  title: string
  /** The line under it, e.g. "Sign in with your Staff ID to continue". */
  subtitle: string
  backHref?: string
  /** The line under the form, e.g. how to register. */
  corner?: ReactNode
  /** The first field's label, e.g. "Staff ID or work email". */
  idLabel: string
  idHelp: string
  /** The lines at the foot, e.g. the patient login and help. */
  footer: ReactNode
}) {
  const [state, formAction, isPending] = useActionState(staffLogin, null)
  // Signed in: open the portal with a full page load, so it starts fresh with the new session.
  const opening = !!state && 'to' in state && !!state.to
  useEffect(() => {
    if (state && 'to' in state && state.to) window.location.assign(state.to)
  }, [state])
  const busy = isPending || opening
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

  const header =
    view === 'forgot'
      ? { title: 'Reset password', subtitle: 'We’ll email a reset link to the address on your account' }
      : view === 'verify'
        ? { title: 'Check your email', subtitle: 'Open the link we sent to set a new password' }
        : { title, subtitle }

  return (
    <AuthShell
      title={header.title}
      subtitle={header.subtitle}
      art={art}
      backHref={backHref}
      corner={view === 'login' ? corner : undefined}
      footer={view === 'login' ? footer : undefined}
    >
      {view !== 'login' && (
        <button
          type="button"
          onClick={() => setView('login')}
          className="inline-flex items-center gap-1.5 mb-7 text-[14px] font-bold text-[#5B667A] hover:text-[#0B1B3F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>
      )}

      {view === 'login' && (
        <>
          <form action={formAction} className="space-y-7">
            <input type="hidden" name="role" value={role} />

            {state?.error && (
              <div role="alert" className={authError}>
                {state.error}
              </div>
            )}

            <div>
              <label className={authLabel} htmlFor="staff-id">
                {idLabel}
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
                className={`${authField} mt-1`}
              />
              <p id="staff-id-help" className={authHelp}>
                {idHelp}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className={authLabel} htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot')
                    setResetError('')
                  }}
                  className="text-[13.5px] font-bold text-[#2A4DD0] hover:underline underline-offset-4"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-1">
                <input
                  id="password"
                  required
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`${authField} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-[#5B667A] hover:bg-[#F2F5FC] hover:text-[#2A4DD0]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button disabled={busy} type="submit" className={authButton}>
              {busy ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] animate-spin" /> Logging in…
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <AuthTerms verb="logging in" />
        </>
      )}

      {view === 'forgot' && (
        <form onSubmit={handleSendReset} className="space-y-7">
          {resetError && (
            <div role="alert" className={authError}>
              {resetError}
            </div>
          )}
          <div>
            <label className={authLabel} htmlFor="reset-staff-id">
              Staff ID or work email
            </label>
            <input
              id="reset-staff-id"
              required
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className={`${authField} mt-1`}
            />
            <p className={authHelp}>It&apos;s in the welcome email from our team.</p>
          </div>
          <button disabled={isResetting || !staffId} type="submit" className={authButton}>
            {isResetting ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : 'Send reset link'}
          </button>
        </form>
      )}

      {view === 'verify' && (
        <div className="text-center">
          <span className="mx-auto mb-5 w-14 h-14 rounded-full bg-[#E7F7EE] text-[#067647] flex items-center justify-center">
            <MailCheck className="w-7 h-7" />
          </span>
          <p className="text-[15px] leading-[1.6] text-[#4A5878]">We&apos;ve sent a password reset link to your registered email address. Open it to set a new password.</p>
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
