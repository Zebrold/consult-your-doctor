'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react'
import { setMyFirstPassword } from '@/app/actions/staff-account'

const input =
  'w-full h-12 px-4 rounded-xl bg-white text-[15px] text-[#0B1B3F] shadow-[inset_0_0_0_1px_#D6DDE8] outline-none focus:shadow-[inset_0_0_0_1.5px_#2A4DD0] transition-shadow'

/**
 * Shown instead of the portal while a staff login is still on its temporary password (lib/temporary-password.ts):
 * the person picks their own password, then the portal opens.
 */
export function FirstPassword({ name, staffId, portal }: { name: string; staffId: string | null; portal: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    start(async () => {
      const res = await setMyFirstPassword({ next: String(f.get('next') ?? ''), confirm: String(f.get('confirm') ?? '') })
      if (!res.ok) return setError(res.error)
      setError(null)
      router.refresh()
    })
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10 bg-[#F4F6FA] text-[#0B1B3F] font-(family-name:--font-manrope)">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <Image src="/logo-icon.png" alt="" width={96} height={96} sizes="32px" className="w-8 h-8 object-contain" />
          <span className="font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[19px] font-bold tracking-[-0.01em]">Consult your Doctor</span>
        </div>
        <form onSubmit={submit} className="p-6 sm:p-8 rounded-[20px] bg-white shadow-[0_0_0_1px_#E6EBF3,0_18px_40px_-20px_rgba(11,27,63,0.25)]">
          <span className="w-12 h-12 rounded-full bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center">
            <KeyRound className="w-[22px] h-[22px]" />
          </span>
          <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.01em]">Set your own password</h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#5B667A]">
            Welcome{name ? `, ${name}` : ''}. You signed in with a temporary password. Choose your own to open the {portal}.
          </p>
          {staffId && (
            <p className="mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#F7F9FC] text-[13.5px]">
              <span className="text-[#5B667A]">Your Staff ID</span>
              <span className="font-mono font-bold">{staffId}</span>
            </p>
          )}

          <label className="block mt-5">
            <span className="block mb-1.5 text-[13px] font-bold">
              New password <span className="text-[#D92D20]" aria-hidden="true">*</span>
            </span>
            <input name="next" type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password" autoFocus className={input} />
            <span className="block mt-1.5 text-[12px] text-[#5B667A]">At least 8 characters, with letters and a number.</span>
          </label>
          <label className="block mt-4">
            <span className="block mb-1.5 text-[13px] font-bold">
              Confirm new password <span className="text-[#D92D20]" aria-hidden="true">*</span>
            </span>
            <input name="confirm" type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password" className={input} />
          </label>
          <button type="button" onClick={() => setShow((s) => !s)} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#2A4DD0]">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {show ? 'Hide passwords' : 'Show passwords'}
          </button>

          {error && (
            <p role="alert" className="mt-4 p-3 rounded-xl bg-[#FEF3F2] text-[13px] font-bold text-[#B42318]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full h-12 rounded-xl bg-[#2A4DD0] hover:bg-[#2340B0] text-white text-[15px] font-extrabold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
          >
            {pending && <LoaderCircle className="w-[18px] h-[18px] animate-spin" />}
            {pending ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
        <form action="/auth/signout" method="post" className="mt-5 text-center">
          <button type="submit" className="text-[13.5px] font-bold text-[#5B667A] hover:text-[#0B1B3F] hover:underline underline-offset-4">
            Log out
          </button>
        </form>
      </div>
    </main>
  )
}
