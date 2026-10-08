'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, Eye, EyeOff, IdCard, KeyRound, UserRound } from 'lucide-react'
import { changeMyPassword, updateMyStaffDetails, updateMyStaffId } from '@/app/actions/staff-account'
import { ErrorNote, Field, PrimaryButton, deskInput } from './desk'

function Panel({ icon: Icon, title, subtitle, children }: { icon: typeof IdCard; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container md:border-transparent p-5 md:p-6 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <div>
          <h2 className="font-title-md text-[17px] font-bold text-indigo-gray-900">{title}</h2>
          <p className="text-sm text-indigo-gray-600">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function Saved({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2 p-3 rounded-lg bg-secondary-container/50 text-on-secondary-container text-sm">
      <CircleCheck className="w-4 h-4 shrink-0 mt-0.5" /> {children}
    </p>
  )
}

/** The signed-in staff member's name and phone, Staff ID and password. */
export function StaffAccount({ name, phone, staffId, roleLabel }: { name: string; phone: string | null; staffId: string | null; roleLabel: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [done, setDone] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [show, setShow] = useState(false)

  const run = (key: string, task: () => Promise<{ ok: true } | { ok: false; error: string }>, message: string, after?: () => void) =>
    start(async () => {
      const res = await task()
      if (!res.ok) {
        setErrors((e) => ({ ...e, [key]: res.error }))
        setDone(null)
        return
      }
      setErrors((e) => ({ ...e, [key]: null }))
      setDone(key + ':' + message)
      after?.()
      router.refresh()
    })

  const message = (key: string) => (done?.startsWith(key + ':') ? done.slice(key.length + 1) : null)

  const saveDetails = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    run('details', () => updateMyStaffDetails({ name: String(f.get('name')), phone: String(f.get('phone')) }), 'Your details are saved.')
  }

  const saveId = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const next = String(f.get('staffId')).trim().toUpperCase()
    run('id', () => updateMyStaffId(next), `Your Staff ID is now ${next}. Use it the next time you sign in.`)
  }

  const savePassword = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    if (f.get('next') !== f.get('confirm')) return setErrors((x) => ({ ...x, password: 'The new passwords don’t match.' }))
    run('password', () => changeMyPassword({ current: String(f.get('current')), next: String(f.get('next')) }), 'Your password is changed.', () => form.reset())
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-gutter items-start">
      <Panel icon={UserRound} title="Your details" subtitle={`${roleLabel} account`}>
        <form onSubmit={saveDetails} className="flex flex-col gap-3">
          <Field label="Full name">
            <input name="name" defaultValue={name} required minLength={2} className={deskInput} />
          </Field>
          <Field label="Phone">
            <input name="phone" defaultValue={phone ?? ''} inputMode="tel" placeholder="+91 98204 77210" className={deskInput} />
          </Field>
          <ErrorNote>{errors.details}</ErrorNote>
          {message('details') && <Saved>{message('details')}</Saved>}
          <div className="flex justify-end">
            <PrimaryButton pending={pending}>Save details</PrimaryButton>
          </div>
        </form>
      </Panel>

      <Panel icon={IdCard} title="Staff ID" subtitle="The ID you sign in with.">
        <form onSubmit={saveId} className="flex flex-col gap-3">
          <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
            <span className="text-sm text-indigo-gray-600">Current Staff ID</span>
            <span className="font-mono font-bold text-indigo-gray-900">{staffId ?? 'Not set'}</span>
          </div>
          <Field label="New Staff ID" hint="4 to 20 letters, numbers or hyphens. Your password stays the same.">
            <input name="staffId" required minLength={4} maxLength={20} pattern="[A-Za-z0-9][A-Za-z0-9\-]{3,19}" placeholder="e.g. CYDHA2041" className={`${deskInput} uppercase placeholder:normal-case font-mono`} />
          </Field>
          <ErrorNote>{errors.id}</ErrorNote>
          {message('id') && <Saved>{message('id')}</Saved>}
          <div className="flex justify-end">
            <PrimaryButton pending={pending}>Change Staff ID</PrimaryButton>
          </div>
        </form>
      </Panel>

      <Panel icon={KeyRound} title="Password" subtitle="At least 8 characters, with letters and a number.">
        <form onSubmit={savePassword} className="flex flex-col gap-3">
          <Field label="Current password">
            <input name="current" type={show ? 'text' : 'password'} required autoComplete="current-password" className={deskInput} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="New password">
              <input name="next" type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password" className={deskInput} />
            </Field>
            <Field label="Confirm new password">
              <input name="confirm" type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password" className={deskInput} />
            </Field>
          </div>
          <button type="button" onClick={() => setShow((s) => !s)} className="self-start inline-flex items-center gap-1.5 text-[13px] font-semibold text-vibrant-blue">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {show ? 'Hide passwords' : 'Show passwords'}
          </button>
          <ErrorNote>{errors.password}</ErrorNote>
          {message('password') && <Saved>{message('password')}</Saved>}
          <div className="flex justify-end">
            <PrimaryButton pending={pending}>Change password</PrimaryButton>
          </div>
        </form>
      </Panel>
    </div>
  )
}
