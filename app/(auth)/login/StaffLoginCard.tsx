'use client'

import Link from 'next/link'
import { useState, useActionState, type ReactNode } from 'react'
import { staffLogin, sendPasswordResetOTP } from '@/app/actions/auth'
import { ArrowLeft, ArrowRight, IdCard, Loader2, Lock, MailCheck, User } from 'lucide-react'

const inputClass =
  'w-full pl-10 pr-4 py-3 bg-surface-container-lowest text-on-surface text-[14px] rounded-xl border border-outline-variant/60 outline-none focus:border-vibrant-blue focus:ring-2 focus:ring-vibrant-blue/20 transition-all placeholder:text-outline/70'

const primaryButtonClass =
  'w-full py-3.5 px-6 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary font-title-md text-[15px] font-semibold transition-all duration-200 shadow-[0_4px_14px_rgba(0,102,255,0.3)] hover:shadow-[0_6px_20px_rgba(0,102,255,0.4)] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60'

/** The sign-in card every staff portal uses (doctor, hospital, executive, diagnostic center): Staff ID and password,
 * with a password reset by email. */
export function StaffLoginCard({
  role,
  badge,
  title,
  description,
  submitLabel,
  footer,
  idLabel = 'Staff ID',
}: {
  /** The account role this portal accepts; staffLogin turns other roles away. */
  role: 'doctor' | 'hospital_admin' | 'executive' | 'diagnostic_admin'
  /** The small pill above the title: an icon and a label. */
  badge: ReactNode
  title: string
  description: string
  submitLabel: string
  /** The strip under the form, e.g. how to get an account. */
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
    <div className="w-full max-w-[480px] flex flex-col items-center">
      <div className="w-full bg-surface-container-lowest rounded-2xl shadow-[0_12px_40px_-8px_rgba(0,102,255,0.08),0_2px_12px_rgba(0,0,0,0.03)] p-6 sm:p-9 relative z-10">
        {view !== 'login' && (
          <button
            type="button"
            onClick={() => setView('login')}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-on-surface-variant hover:text-on-surface mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </button>
        )}

        {view === 'login' && (
          <>
            <div className="text-center mb-7">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm uppercase tracking-wider mb-4 [&_svg]:w-3.5 [&_svg]:h-3.5">
                {badge}
              </span>
              <h1 className="font-display-lg text-[28px] sm:text-[32px] leading-[38px] font-bold text-on-surface tracking-tight mb-2">{title}</h1>
              <p className="text-on-surface-variant text-[14px] leading-relaxed max-w-[390px] mx-auto">{description}</p>
            </div>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="role" value={role} />

              {state?.error && (
                <div role="alert" className="p-3 bg-error-container/60 text-on-error-container text-[13px] rounded-xl font-semibold">
                  {state.error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-indigo-gray-600 pl-1" htmlFor="staff-id">{idLabel}</label>
                <div className="relative flex items-center">
                  <IdCard className="absolute left-3.5 w-[18px] h-[18px] text-outline pointer-events-none" />
                  <input id="staff-id" required name="staffId" type="text" autoComplete="username" placeholder="e.g. CYDAB1234" className={`${inputClass} uppercase placeholder:normal-case`} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between pl-1">
                  <label className="font-label-sm text-label-sm text-indigo-gray-600" htmlFor="password">Password</label>
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setResetError('') }}
                    className="text-[12px] font-semibold text-vibrant-blue hover:text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-[18px] h-[18px] text-outline pointer-events-none" />
                  <input id="password" required name="password" type="password" autoComplete="current-password" placeholder="••••••••" className={inputClass} />
                </div>
              </div>

              <button disabled={isPending} type="submit" className={`${primaryButtonClass} mt-2`}>
                {isPending ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" /> Signing in...
                  </>
                ) : (
                  <>
                    {submitLabel} <ArrowRight className="w-[18px] h-[18px]" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {view === 'forgot' && (
          <>
            <div className="mb-7">
              <h1 className="font-display-lg text-[26px] leading-[34px] font-bold text-on-surface tracking-tight mb-2">Reset Password</h1>
              <p className="text-on-surface-variant text-[14px] leading-relaxed">
                Enter your {idLabel} and we&apos;ll email a reset link to the address registered on your account.
              </p>
            </div>

            <form onSubmit={handleSendReset} className="space-y-4">
              {resetError && (
                <div role="alert" className="p-3 bg-error-container/60 text-on-error-container text-[13px] rounded-xl font-semibold">
                  {resetError}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm text-indigo-gray-600 pl-1" htmlFor="reset-staff-id">{idLabel}</label>
                <div className="relative flex items-center">
                  <IdCard className="absolute left-3.5 w-[18px] h-[18px] text-outline pointer-events-none" />
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
              <button disabled={isResetting || !staffId} type="submit" className={`${primaryButtonClass} mt-2`}>
                {isResetting ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        {view === 'verify' && (
          <div className="text-center">
            <span className="mx-auto mb-4 w-14 h-14 rounded-full bg-fresh-teal/10 text-fresh-teal flex items-center justify-center">
              <MailCheck className="w-7 h-7" />
            </span>
            <h1 className="font-display-lg text-[26px] leading-[34px] font-bold text-on-surface tracking-tight mb-2">Check Your Email</h1>
            <p className="text-on-surface-variant text-[14px] leading-relaxed">
              We&apos;ve sent a password reset link to your registered email address. Open it to set a new password.
            </p>
          </div>
        )}

        {view === 'login' && (
          <div className="mt-6 -mx-6 -mb-6 sm:-mx-9 sm:-mb-9 px-6 py-4 bg-surface-container-low/50 rounded-b-2xl text-center">
            <p className="text-[13px] text-on-surface-variant">{footer}</p>
          </div>
        )}
      </div>

      <div className="w-full mt-6 flex items-center gap-3 rounded-2xl bg-surface-container-lowest/80 px-5 py-4 shadow-sm">
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container text-primary shrink-0">
          <User className="w-[18px] h-[18px]" />
        </span>
        <p className="text-[13px] text-on-surface-variant leading-snug">
          <span className="font-semibold text-on-surface">Looking to book a consultation?</span>{' '}
          <Link href="/login/patient" className="text-vibrant-blue font-semibold hover:underline">Patient sign in</Link>
        </p>
      </div>
    </div>
  )
}

/** A link styled like the doctor page's "Apply to join our network", for the footer strip. */
export function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-title-md text-[13px] text-vibrant-blue hover:text-primary font-semibold ml-1 underline underline-offset-2">
      {children}
    </Link>
  )
}
