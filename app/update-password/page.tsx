'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { setPasswordFromLink } from '@/app/actions/password-link'
import { clearMyTemporaryPassword } from '@/app/actions/staff-account'

// Choosing a password from an emailed link. New links carry ?token_hash=… (lib/password-link.ts), which is checked on
// the server only when the password is submitted, so they work in any browser. Older emails may still hold Supabase's
// own link, which lands here with #access_token=… (or ?code=… from a Forgot password made before the change); those
// are signed in here in the browser, as far as they still can be.

type Mode =
  | { kind: 'checking' }
  | { kind: 'link'; tokenHash: string }
  | { kind: 'session' }
  | { kind: 'expired'; message?: string }
  | { kind: 'done'; loginHref: string }

const RULE = 'At least 8 characters, with letters and at least one number.'

function problemWith(next: string, confirm: string): string | null {
  if (next.length < 8) return 'Use a password of at least 8 characters.'
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return 'Use letters and at least one number.'
  if (next !== confirm) return 'The two passwords don’t match.'
  return null
}

/**
 * Takes the link's tokens out of the address bar so they aren't left in the history. A tick later, because on the
 * first render the app router writes the address it started with back after the page's own effects have run.
 */
function tidyAddress() {
  window.setTimeout(() => window.history.replaceState(null, '', window.location.pathname), 0)
}

export default function UpdatePasswordPage() {
  const [supabase] = useState(() => createClient())
  const [mode, setMode] = useState<Mode>({ kind: 'checking' })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const settle = (next: Mode) => {
      if (!cancelled) setMode(next)
    }
    const run = async () => {
      const query = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))

      const tokenHash = query.get('token_hash')
      if (tokenHash) return settle({ kind: 'link', tokenHash })

      // Supabase sends people back with the reason when its own link had already expired or been used.
      if (hash.get('error') || hash.get('error_code') || query.get('error')) {
        tidyAddress()
        return settle({ kind: 'expired' })
      }

      // An older link: Supabase signed the browser in through the address fragment.
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        tidyAddress()
        return settle(sessionError ? { kind: 'expired' } : { kind: 'session' })
      }

      // ?code=… is exchanged by the browser client as it starts, when this is the browser that asked for the reset.
      const { data } = await supabase.auth.getSession()
      if (query.get('code')) tidyAddress()
      settle(data.session ? { kind: 'session' } : { kind: 'expired' })
    }
    run()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const problem = problemWith(password, confirm)
    if (problem) return setError(problem)
    setError('')
    setSaving(true)
    try {
      if (mode.kind === 'link') {
        const res = await setPasswordFromLink({ tokenHash: mode.tokenHash, password, confirm })
        // The token stays in the address until it's used, so a reload before saving still works.
        if (res.ok) {
          tidyAddress()
          setMode({ kind: 'done', loginHref: res.loginHref })
        } else if (res.expired) {
          tidyAddress()
          setMode({ kind: 'expired', message: res.error })
        } else setError(res.error)
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) return setError(updateError.message)
      // A password set here is their own, so a doctor's temporary-password step is done.
      await clearMyTemporaryPassword().catch(() => {})
      // They sign in again with their Staff ID and the new password.
      await supabase.auth.signOut()
      setMode({ kind: 'done', loginHref: '/login' })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const input =
    'block w-full h-12 px-4 rounded-xl border border-[#D6DDE8] bg-white text-[15px] text-[#0B1B3F] placeholder:text-[#8A94A6] outline-none focus:border-[#2A4DD0] focus:ring-2 focus:ring-[#2A4DD0]/15'

  return (
    <main className="min-h-[70dvh] bg-[#F5F7FB] flex flex-col items-center justify-center px-4 py-10 font-(family-name:--font-manrope) text-[#0B1B3F]">
      <div className="w-full max-w-md bg-white px-6 py-8 sm:px-8 rounded-[22px] shadow-[0_0_0_1px_#E6EAF0,0_12px_32px_rgba(11,27,63,0.06)]">
        {mode.kind === 'checking' ? (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="w-9 h-9 animate-spin text-[#2A4DD0] mb-4" />
            <p className="text-[15px] font-semibold text-[#5B667A]">Checking your link…</p>
          </div>
        ) : mode.kind === 'done' ? (
          <div className="flex flex-col items-center text-center py-4">
            <span className="w-16 h-16 rounded-full bg-[#ECFDF3] text-[#067647] flex items-center justify-center mb-5">
              <CheckCircle2 className="w-8 h-8" />
            </span>
            <h1 className="text-[24px] font-extrabold tracking-[-0.01em]">Password saved</h1>
            <p className="mt-2 mb-7 text-[15px] leading-relaxed text-[#5B667A]">Log in with your Staff ID (or work email) and the new password.</p>
            <Link href={mode.loginHref} className="w-full h-12 rounded-xl bg-[#2A4DD0] text-white text-[15px] font-extrabold flex items-center justify-center hover:bg-[#2443B8] transition-colors">
              Go to login
            </Link>
          </div>
        ) : mode.kind === 'expired' ? (
          <div className="flex flex-col items-center text-center py-4">
            <span className="w-16 h-16 rounded-full bg-[#FEF3F2] text-[#B42318] flex items-center justify-center mb-5">
              <TriangleAlert className="w-8 h-8" />
            </span>
            <h1 className="text-[24px] font-extrabold tracking-[-0.01em]">This link no longer works</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#5B667A]">{mode.message ?? 'It has expired or was already used.'}</p>
            <p className="mt-2 mb-7 text-[14px] leading-relaxed text-[#5B667A]">
              Each link works once, for a limited time, and only the newest one counts. Open your portal’s login and choose <b className="text-[#27324A]">Forgot password</b> to get a new one.
            </p>
            <Link href="/login" className="w-full h-12 rounded-xl bg-[#2A4DD0] text-white text-[15px] font-extrabold flex items-center justify-center hover:bg-[#2443B8] transition-colors">
              Go to login
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center mb-7">
              <span className="w-16 h-16 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center mb-4">
                <KeyRound className="w-8 h-8" />
              </span>
              <h1 className="text-[24px] font-extrabold tracking-[-0.01em]">Choose a new password</h1>
              <p className="mt-1.5 text-[14.5px] text-[#5B667A]">You’ll use it with your Staff ID to log in.</p>
            </div>
            <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
              <label className="block">
                <span className="block mb-1.5 text-[13.5px] font-extrabold text-[#27324A]">New password</span>
                <span className="relative block">
                  <input
                    required
                    autoFocus
                    autoComplete="new-password"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${input} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center text-[#5B667A] hover:bg-[#F4F6FA]"
                  >
                    {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </span>
                <span className="block mt-1.5 text-[12.5px] text-[#5B667A]">{RULE}</span>
              </label>
              <label className="block">
                <span className="block mb-1.5 text-[13.5px] font-extrabold text-[#27324A]">Type it again</span>
                <input required autoComplete="new-password" type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
              </label>
              {error && (
                <p role="alert" className="p-3 rounded-xl bg-[#FEF3F2] text-[#B42318] text-[13.5px] font-bold">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={saving || !password || !confirm}
                className="mt-1 h-12 rounded-xl bg-[#2A4DD0] text-white text-[15px] font-extrabold flex items-center justify-center gap-2 hover:bg-[#2443B8] disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save password'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
