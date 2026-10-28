'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrainCircuit, Headset, MessageSquareText, RotateCcw, Stethoscope, X } from 'lucide-react'
import { ChatThread, Composer, LanguagePicker, chatKey, useChat, useLanguage } from './chat'

// Common support questions per role. Every answer exists on the site (see lib/assistant/knowledge.ts).
const SUGGESTIONS: Record<string, string[]> = {
  visitor: ['I didn’t get my sign-in code', 'How do I book a lab test?', 'How do refunds work?'],
  patient: ['My payment didn’t go through', 'Where is my lab report?', 'How do I cancel a booking?'],
  doctor: ['A patient isn’t in my schedule', 'Who sets my slots?', 'How do I upload a prescription file?'],
  diagnostic_admin: ['A test can’t be booked online', 'How do I upload a report?', 'How do I book a walk-in?'],
  hospital_admin: ['Patients can’t book our doctor', 'How do I publish slots?', 'Where do I see revenue?'],
  executive: ['How do desk payments work?', 'A patient’s booking is missing', 'How do I book a walk-in?'],
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
const APP_PREFIXES = ['/patient', '/find', '/book', '/hospitals', '/doctors', '/diagnostics', '/specialities']

const BAR_PREFIXES = ['/doctor', '/doctors', '/diagnostic-center', '/hospital', '/executive', '/patient', '/find', '/book']

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
  // Patient pages show the app's round Care Assistant button above the tab bar.
  const appFab = (key === 'patient' || key === 'visitor') && (APP_PREFIXES.some((p) => pathname.startsWith(p)) || (pathname === '/' && key === 'patient'))

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
      {!open && appFab && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Care Assistant"
          title="Care Assistant"
          className="fixed z-[35] right-4 bottom-[calc(max(10px,env(safe-area-inset-bottom))+78px)] lg:right-8 lg:bottom-8 w-[52px] h-[52px] rounded-full bg-[#2A4DD0] text-white flex items-center justify-center shadow-[0_0_0_4px_rgba(42,77,208,0.18),0_10px_22px_rgba(11,27,63,0.28)] hover:bg-[#2443B8] active:scale-95 transition-all print:hidden"
        >
          <Stethoscope className="w-6 h-6" />
        </button>
      )}

      {!open && !appFab && (
        <div
          className={`fixed z-[35] right-3 sm:right-6 md:right-8 ${
            lifted ? 'bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.75rem)] md:bottom-24' : 'bottom-[max(1rem,env(safe-area-inset-bottom))] md:bottom-6'
          } flex flex-col items-end print:hidden select-none pointer-events-none`}
        >
          {/* Launcher: Thought bubble stacked vertically above the Doctor character, never extending left into the dock */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Doctor Assistant - How can I help you?"
            className="pointer-events-auto flex flex-col items-end gap-1 p-0 bg-transparent border-0 outline-none cursor-pointer select-none transition-transform duration-200 active:scale-95 group focus-visible:outline-none shrink-0"
          >
            {/* Thinking text bubble - sits neatly ABOVE the doctor */}
            <div className="relative bg-white text-slate-800 text-[11px] sm:text-[12.5px] font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl shadow-[0_4px_16px_rgba(15,23,42,0.08)] border border-slate-200/90 flex items-center gap-1.5 whitespace-nowrap mb-0.5 group-hover:shadow-[0_6px_20px_rgba(15,23,42,0.12)]">
              <span>How can I help you?</span>
              {/* Bubble indicator pointing down to doctor */}
              <span className="absolute right-4 -bottom-1 w-2 h-2 rounded-full bg-white border-r border-b border-slate-200" />
            </div>

            {/* Doctor avatar */}
            <Image
              src="/images/ai-doctor.png"
              alt="Doctor Assistant"
              width={208}
              height={190}
              sizes="(min-width: 768px) 84px, (min-width: 640px) 76px, 56px"
              className="w-14 sm:w-[76px] md:w-[84px] h-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.16)] group-hover:scale-105 transition-transform"
            />
          </button>
        </div>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Doctor Assistant"
          className="fixed z-[70] inset-0 md:inset-auto md:right-6 md:bottom-6 md:w-[400px] md:h-[min(640px,calc(100dvh-48px))] bg-background md:rounded-2xl shadow-[0_16px_48px_rgba(15,23,42,0.09)] md:border md:border-outline-variant/40 flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] print:hidden"
        >
          <header className="bg-gradient-to-r from-primary via-[#0052cc] to-vibrant-blue text-on-primary px-4 py-3 flex items-center justify-between gap-3 shrink-0 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                <Image src="/images/ai-doctor.png" alt="Doctor Assistant" width={88} height={80} sizes="44px" className="w-full h-full object-contain drop-shadow-sm" />
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
                <p className="mt-1.5 text-on-surface-variant text-[12px]">For medical emergencies, please call 108 immediately.</p>
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
