'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { CircleCheck, LoaderCircle, MessageCircleQuestion, Send, X } from 'lucide-react'
import { raiseSupportTicket } from '@/app/actions/support'

const TOPICS = ['Booking or appointment', 'Payment or refund', 'Prescription or report', 'Account or sign-in', 'Something else']
const field = 'w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 text-[15px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-vibrant-blue/30'

/** The "Raise Ticket" button and its form. */
export function SupportTicketButton({ bookings }: { bookings: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<'sent' | 'mail' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const close = () => {
    setOpen(false)
    setDone(null)
    setError(null)
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    start(async () => {
      const res = await raiseSupportTicket({ topic: String(f.get('topic')), bookingId: String(f.get('bookingId') || ''), message: String(f.get('message')) })
      if (!res.ok) return setError(res.error)
      setError(null)
      if (res.sent) return setDone('sent')
      window.location.href = res.mailto
      setDone('mail')
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 py-2 px-6 rounded-full bg-surface-container-low text-on-surface font-bold text-label-sm border border-outline-variant/50 hover:bg-surface-container-high transition-colors">
        Raise Ticket
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Raise a support ticket">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-indigo-gray-900/50 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full sm:max-w-lg bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-title-md text-title-md font-bold text-on-surface flex items-center gap-2">
                  <MessageCircleQuestion className="w-5 h-5 text-fresh-teal" /> Raise a ticket
                </h3>
                <p className="text-sm text-on-surface-variant">For billing, booking, report and account issues. Our team replies by phone or email.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col gap-4">
                <p role="status" className="p-4 rounded-xl bg-fresh-teal/10 text-on-surface text-sm flex items-start gap-2">
                  <CircleCheck className="w-5 h-5 text-secondary shrink-0" />
                  {done === 'sent' ? 'Your ticket has been sent. The support team will get back to you soon.' : 'Your email app should now be open with the ticket ready to send.'}
                </p>
                <div className="flex justify-end">
                  <button type="button" onClick={close} className="px-5 py-2.5 rounded-full bg-vibrant-blue text-on-primary text-sm font-bold">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Topic</span>
                  <select name="topic" defaultValue={TOPICS[0]} className={field}>
                    {TOPICS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Booking (optional)</span>
                  <select name="bookingId" defaultValue="" className={field}>
                    <option value="">Not about a booking</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">What happened?</span>
                  <textarea name="message" required minLength={10} rows={4} placeholder="Describe the issue. Don’t include one-time codes or card numbers." className={`${field} resize-none`} />
                </label>
                {error && <p role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={close} className="px-5 py-2.5 rounded-full text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
                    Cancel
                  </button>
                  <button type="submit" disabled={pending} className="px-5 py-2.5 rounded-full bg-vibrant-blue hover:bg-primary text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                    {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send ticket
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
