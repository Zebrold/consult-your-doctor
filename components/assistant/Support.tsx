'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrainCircuit, Headset, MessageSquareText, RotateCcw, X } from 'lucide-react'
import { ChatThread, Composer, LanguagePicker, chatKey, useChat, useLanguage } from './chat'

// Common support questions per role. Every answer exists on the site (see lib/assistant/knowledge.ts).
const SUGGESTIONS: Record<string, string[]> = {
  visitor: ['I didn’t get my sign-in code', 'How do I book a lab test?', 'How do refunds work?'],
  patient: ['My payment didn’t go through', 'Where is my lab report?', 'How do I cancel a booking?'],
  doctor: ['A patient isn’t in my schedule', 'Who sets my slots?', 'How do I upload a prescription file?'],
  diagnostic_admin: ['A test can’t be booked online', 'How do I upload a report?', 'How do I book a walk-in?'],
  hospital_admin: ['Patients can’t book our doctor', 'How do I publish slots?', 'Where do I see revenue?'],
  executive: ['How do desk payments work?', 'A patient’s booking is missing', 'How do I book a walk-in?'],
  super_admin: ['What can each portal do?', 'How do hospitals publish slots?', 'How do lab reports reach patients?'],
}

/** Each section's full-page Zebrold AI tab. */
const AI_PAGE: Record<string, string> = {
  visitor: '/ai',
  patient: '/ai',
  doctor: '/doctor/ai',
  diagnostic_admin: '/diagnostic-center/ai',
  hospital_admin: '/hospital/ai',
  executive: '/executive/ai',
}

// Inside a staff portal the portal itself says who is asking (the middleware keeps everyone else out), even before
// the role cookie the layout reads has been written.
const PORTAL_ROLE: [string, string][] = [
  ['/doctor/', 'doctor'],
  ['/diagnostic-center/', 'diagnostic_admin'],
  ['/hospital/', 'hospital_admin'],
  ['/executive/', 'executive'],
]

const isAiPage = (path: string) => /^\/(?:(?:doctor|diagnostic-center|hospital|executive)\/)?ai$/.test(path)

// Pages with the navigation pill along the bottom: lift the button above it.
const BAR_PREFIXES = ['/doctor', '/diagnostic-center', '/hospital', '/executive', '/patient', '/find', '/book']

/**
 * The help-center chat behind the Human AI button on every page, answered by Zebrold AI. Each panel (patient, doctor,
 * lab, hospital, front desk) and each signed-in person keeps a separate conversation.
 */
export function Support({ role, viewer }: { role: string | null; viewer: string | null }) {
  const pathname = usePathname() ?? '/'
  const [open, setOpen] = useState(false)
  const key = PORTAL_ROLE.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? role ?? 'visitor'
  const [language, setLanguage] = useLanguage()
  const chat = useChat(chatKey('support', key, viewer), 'support', language)

  const suggestions = SUGGESTIONS[key] ?? SUGGESTIONS.visitor
  const aiHref = AI_PAGE[key]
  // Staff accounts can only open their own portal, so the public contact pages are offered to patients and visitors.
  const contactHref = key === 'patient' ? '/patient/support' : key === 'visitor' ? '/contact' : null
  const lifted = BAR_PREFIXES.some((p) => pathname.startsWith(p)) || (pathname === '/' && key === 'patient')
  const hidden = isAiPage(pathname)

  useEffect(() => {
    if (!open || hidden) return
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    // Full-screen on phones: keep the page behind it from scrolling.
    const previous = document.body.style.overflow
    if (window.matchMedia('(max-width: 767px)').matches) document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, hidden])

  // The Zebrold AI pages are a full-screen chat already.
  if (hidden) return null

  const close = () => setOpen(false)
  const closeOnPhone = () => {
    if (window.matchMedia('(max-width: 767px)').matches) setOpen(false)
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Human AI"
          className={`fixed z-[70] right-4 md:right-6 ${lifted ? 'bottom-[calc(92px+env(safe-area-inset-bottom))] md:bottom-[100px]' : 'bottom-5 md:bottom-6'} h-12 w-12 sm:w-auto sm:pl-3 sm:pr-5 rounded-full bg-gradient-to-r from-primary to-vibrant-blue text-on-primary shadow-[0_8px_24px_rgba(0,102,255,0.35)] flex items-center justify-center gap-2 font-label-sm text-label-sm font-bold hover:scale-[1.03] active:scale-95 transition-transform print:hidden`}
        >
          <span className="sm:w-8 sm:h-8 sm:rounded-full sm:bg-on-primary/15 flex items-center justify-center">
            <Headset className="w-5 h-5" />
          </span>
          <span className="hidden sm:inline">Human AI</span>
          {chat.messages.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-fresh-teal ring-2 ring-surface-container-lowest" />}
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Human AI"
          className="fixed z-[70] inset-0 md:inset-auto md:right-6 md:bottom-6 md:w-[400px] md:h-[min(640px,calc(100vh-48px))] bg-background md:rounded-2xl shadow-[0_16px_48px_rgba(0,50,140,0.22)] md:border md:border-outline-variant/40 flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] print:hidden"
        >
          <header className="bg-gradient-to-r from-primary to-vibrant-blue text-on-primary px-4 py-3 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-on-primary/15 ring-1 ring-on-primary/25 flex items-center justify-center shrink-0">
                <Headset className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="font-title-md text-[16px] font-bold leading-tight">Human AI</p>
                <p className="text-[11px] text-on-primary/80 truncate">Help center • answered by Zebrold AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <LanguagePicker value={language} onChange={setLanguage} tone="onPrimary" />
              {aiHref && (
                <Link href={aiHref} onClick={close} title="Open Zebrold AI" aria-label="Open Zebrold AI" className="w-8 h-8 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4" />
                </Link>
              )}
              {chat.messages.length > 0 && (
                <button type="button" onClick={chat.reset} title="New chat" aria-label="Start a new chat" className="w-8 h-8 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button type="button" onClick={close} title="Close" aria-label="Close Human AI" className="w-8 h-8 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          <ChatThread
            chat={chat}
            icon={Headset}
            onNavigate={closeOnPhone}
            intro={
              <>
                <p className="font-semibold">Hey there, welcome to Consult Your Doctor.</p>
                <p className="mt-1.5">Tell me what you need help with, like signing in, a booking, a payment, a report or using your portal, and I’ll walk you through it. Pick a language at the top to get answers in it.</p>
                <p className="mt-1.5 text-on-surface-variant text-[13px]">Answers come from Zebrold AI, not a person, and it isn’t a doctor. In an emergency, call 112.</p>
              </>
            }
            empty={
              <div className="pl-9 flex flex-col gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Common questions</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void chat.send(s)}
                        className="px-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/50 text-[12px] font-semibold text-primary hover:bg-primary-fixed/40 transition-colors text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {(aiHref || contactHref) && (
                  <div className="flex flex-col gap-2">
                    {aiHref && (
                      <Link href={aiHref} onClick={close} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40 hover:border-primary/30 hover:bg-primary-fixed/20 transition-colors">
                        <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-vibrant-blue text-on-primary flex items-center justify-center shrink-0">
                          <BrainCircuit className="w-4 h-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-bold text-on-surface">Open Zebrold AI</span>
                          <span className="block text-[11.5px] text-on-surface-variant">The full-page assistant, for searching and PDFs</span>
                        </span>
                      </Link>
                    )}
                    {contactHref && (
                      <Link href={contactHref} onClick={close} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40 hover:border-primary/30 hover:bg-primary-fixed/20 transition-colors">
                        <span className="w-9 h-9 rounded-lg bg-secondary-fixed/60 text-on-secondary-fixed flex items-center justify-center shrink-0">
                          <MessageSquareText className="w-4 h-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-bold text-on-surface">Contact our team</span>
                          <span className="block text-[11.5px] text-on-surface-variant">For refunds, cancellations and account changes</span>
                        </span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            }
          />
          <Composer chat={chat} placeholder="Describe your problem or question…" autoFocus />
        </section>
      )}
    </>
  )
}
