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
        <div
          className={`fixed z-[70] right-3 sm:right-6 ${
            lifted ? 'bottom-[calc(80px+env(safe-area-inset-bottom))] md:bottom-[90px]' : 'bottom-3 sm:bottom-4'
          } flex items-end gap-2 print:hidden group select-none`}
        >
          {/* Friendly chat callout bubble */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="How can I help you?"
            className="cursor-pointer relative bg-white/95 dark:bg-surface-container-highest/95 backdrop-blur-md text-slate-800 dark:text-slate-100 px-3.5 py-2 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.12)] border border-slate-200/80 dark:border-outline-variant/50 text-[13px] sm:text-[13.5px] font-semibold leading-tight flex items-center hover:scale-105 active:scale-95 transition-all duration-200 mb-2.5 focus-visible:outline-none"
          >
            <span>How can I help you?</span>
            {/* Pointer arrow directed towards the bot */}
            <span className="absolute -right-1.5 bottom-3 w-3 h-3 bg-white dark:bg-surface-container-highest border-t border-r border-slate-200/80 dark:border-outline-variant/50 rotate-45" />
          </button>

          {/* Standalone bot image */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Doctor Assistant"
            className="p-0 bg-transparent border-0 outline-none cursor-pointer select-none transition-transform duration-200 hover:scale-105 active:scale-95 group focus-visible:outline-none shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/ai-doctor.png"
              alt="Doctor Assistant"
              className="w-16 sm:w-20 md:w-22 h-auto object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.18)] group-hover:drop-shadow-[0_12px_24px_rgba(0,102,255,0.3)] transition-all duration-200"
            />
          </button>
        </div>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Doctor Assistant"
          className="fixed z-[70] inset-0 md:inset-auto md:right-6 md:bottom-6 md:w-[400px] md:h-[min(640px,calc(100vh-48px))] bg-background md:rounded-2xl shadow-[0_16px_48px_rgba(0,50,140,0.22)] md:border md:border-outline-variant/40 flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] print:hidden"
        >
          <header className="bg-gradient-to-r from-primary via-[#0052cc] to-vibrant-blue text-on-primary px-4 py-3 flex items-center justify-between gap-3 shrink-0 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/ai-doctor.png"
                  alt="Doctor Assistant"
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
              <div className="min-w-0">
                <p className="font-title-md text-[15px] font-bold leading-tight">
                  Doctor Assistant
                </p>
                <p className="text-[11.5px] text-on-primary/80 truncate">How can I help you today?</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <LanguagePicker value={language} onChange={setLanguage} tone="onPrimary" />
              {aiHref && (
                <Link href={aiHref} onClick={close} title="Open Help Center" aria-label="Open Help Center" className="w-8 h-8 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4" />
                </Link>
              )}
              {chat.messages.length > 0 && (
                <button type="button" onClick={chat.reset} title="New chat" aria-label="Start a new chat" className="w-8 h-8 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button type="button" onClick={close} title="Close" aria-label="Close Assistant" className="w-8 h-8 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center">
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
                <p className="font-semibold text-primary text-[15px]">Hello! How can I help you today?</p>
                <p className="mt-1.5">Ask questions about finding doctors, booking appointments, lab tests, or managing your health records.</p>
                <p className="mt-1.5 text-on-surface-variant text-[12px]">For medical emergencies, please call 112 immediately.</p>
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
                          <span className="block text-[13px] font-bold text-on-surface">Health Knowledge Base</span>
                          <span className="block text-[11.5px] text-on-surface-variant">Browse health guides, diagnostic info, and FAQs</span>
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
