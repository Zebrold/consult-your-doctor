'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, Plus } from 'lucide-react'
import { DeskDialog, ErrorNote, Field, PrimaryButton, QuietButton, deskInput } from '@/components/portal/desk'
import { createTicketForCaller } from '@/app/actions/tickets'
import { TICKET_CATEGORIES } from '@/lib/support-desk'

/** Support's "New ticket": an executive raises a ticket for someone who called. Not linked to any account. */
export function NewTicketButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [code, setCode] = useState<string | null>(null)

  const close = () => {
    setOpen(false)
    setError('')
    setCode(null)
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pending) return
    const f = new FormData(e.currentTarget)
    setError('')
    start(async () => {
      const res = await createTicketForCaller({
        name: String(f.get('name') ?? ''),
        phone: String(f.get('phone') ?? ''),
        email: String(f.get('email') ?? ''),
        category: String(f.get('category') ?? ''),
        priority: String(f.get('priority') ?? 'medium') as 'low' | 'medium' | 'high' | 'urgent',
        description: String(f.get('description') ?? ''),
      })
      if (!res.ok) return setError(res.error)
      setCode(res.ticketCode)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[11px] text-[13.5px] font-extrabold whitespace-nowrap bg-[#2A4DD0] text-white shadow-[0_6px_14px_rgba(42,77,208,0.25)] hover:bg-[#2443B8] active:scale-[0.98] transition-all"
      >
        <Plus className="w-4 h-4" /> New ticket
      </button>
      {open && (
        <DeskDialog title="New ticket" subtitle="For someone who called. It isn’t linked to an account, and it is assigned to you." onClose={close}>
          {code ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
                  <CircleCheck className="w-6 h-6" />
                </span>
                <p className="font-semibold text-indigo-gray-900">Ticket {code} raised</p>
              </div>
              <p className="text-sm text-indigo-gray-600">It is in your “Assigned to me” view. The caller gets a confirmation by email, SMS and WhatsApp where you gave those details.</p>
              <div className="flex justify-end">
                <PrimaryButton type="button" onClick={close}>Done</PrimaryButton>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Caller’s name">
                  <input name="name" required minLength={2} maxLength={120} className={deskInput} autoComplete="off" />
                </Field>
                <Field label="Phone">
                  <input name="phone" type="tel" required inputMode="tel" maxLength={20} className={deskInput} autoComplete="off" />
                </Field>
                <Field label="Email" hint="Optional. If given, they get the confirmation by email too.">
                  <input name="email" type="email" maxLength={200} className={deskInput} autoComplete="off" />
                </Field>
                <Field label="Category">
                  <select name="category" required defaultValue="" className={deskInput}>
                    <option value="" disabled>Choose…</option>
                    {TICKET_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority" className="sm:col-span-2">
                  <select name="priority" defaultValue="medium" className={deskInput}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </Field>
                <Field label="What they need" className="sm:col-span-2">
                  <textarea name="description" required minLength={5} maxLength={5000} rows={4} className={deskInput} />
                </Field>
              </div>
              <ErrorNote>{error}</ErrorNote>
              <div className="flex justify-end gap-2">
                <QuietButton onClick={close}>Cancel</QuietButton>
                <PrimaryButton pending={pending}>Raise ticket</PrimaryButton>
              </div>
            </form>
          )}
        </DeskDialog>
      )}
    </>
  )
}
