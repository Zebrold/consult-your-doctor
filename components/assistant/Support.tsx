'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Maximize2, RotateCcw, Stethoscope, X } from 'lucide-react'
import { ChatThread, Composer, LanguagePicker, chatKey, useChat, useLanguage } from './chat'

// Common support questions per role. Every answer exists on the site (see lib/assistant/knowledge.ts).
const SUGGESTIONS: Record<string, string[]> = {
  visitor: ['Book a lab test', 'Track a booking or refund', 'Book a doctor or hospital visit'],
  patient: ['Book a lab test', 'Track a booking or refund', 'Book a doctor or hospital visit'],
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

const pill = 'max-w-[300px] px-4 py-[9px] rounded-[20px] border-[1.5px] border-[#2A4DD0] text-[14px] font-semibold leading-[1.35] text-left transition-colors'
const headerButton = 'w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 hover:bg-[#F0F2F5] transition-colors'

/**
 * The help-center chat behind the assistant button on every page, answered by Zebrold AI, after the Care Assistant
 * chat design. Each panel (patient, doctor, lab, hospital, front desk) and each signed-in person keeps a separate
 * conversation.
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
  const isPatient = key === 'patient' || key === 'visitor'
  const title = isPatient ? 'Care Assistant' : 'Zebrold AI'
  const lifted = BAR_PREFIXES.some((p) => pathname.startsWith(p)) || (pathname === '/' && key === 'patient')
  const hidden = isAiPage(pathname)
  // Patient pages show the app's round Care Assistant button above the tab bar.
  const appFab = isPatient && (APP_PREFIXES.some((p) => pathname.startsWith(p)) || (pathname === '/' && key === 'patient'))

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
          aria-label={`Open ${title}`}
          title={title}
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
            aria-label={`${title}: how can I help you?`}
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
              alt=""
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
          aria-label={title}
          className="fixed z-[70] inset-0 md:inset-auto md:right-6 md:bottom-6 md:w-[400px] md:h-[min(720px,calc(100dvh-48px))] bg-white text-[#1A1F2B] font-(family-name:--font-manrope) md:rounded-[22px] md:shadow-[0_0_0_1px_#E4E7EC,0_16px_48px_rgba(15,23,42,0.12)] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] print:hidden"
        >
          <header className="shrink-0 flex items-center gap-3 pl-5 pr-4 pt-[calc(env(safe-area-inset-top)+16px)] md:pt-4 pb-3.5 border-b border-[#E8EAEE]">
            <span aria-hidden className="w-8 h-8 rounded-full bg-[#2A4DD0] text-white flex items-center justify-center shrink-0">
              <Stethoscope className="w-[18px] h-[18px]" strokeWidth={2.2} />
            </span>
            <h2 className="flex-1 min-w-0 text-[17px] font-extrabold tracking-[-0.01em] truncate">{title}</h2>
            <LanguagePicker value={language} onChange={setLanguage} className="!h-9 min-w-9 !rounded-[10px] !bg-transparent hover:!bg-[#F0F2F5] !text-[#5A6272]" />
            <button type="button" onClick={chat.reset} disabled={chat.messages.length === 0} title="Restart conversation" aria-label="Restart conversation" className={`${headerButton} text-[#2A4DD0] disabled:opacity-40 disabled:hover:bg-transparent`}>
              <RotateCcw className="w-[19px] h-[19px]" strokeWidth={2.3} />
            </button>
            {aiHref && (
              <Link href={aiHref} onClick={close} title="Expand chat" aria-label="Expand chat" className={`${headerButton} hidden md:flex text-[#5A6272]`}>
                <Maximize2 className="w-[18px] h-[18px]" strokeWidth={2.1} />
              </Link>
            )}
            <button type="button" onClick={close} title="Close" aria-label="Close chat" className={`${headerButton} text-[#5A6272]`}>
              <X className="w-[18px] h-[18px]" strokeWidth={2.2} />
            </button>
          </header>

          <ChatThread
            chat={chat}
            icon={Stethoscope}
            name={title}
            today
            onNavigate={closeOnPhone}
            intro={[
              isPatient ? (
                <p key="hi">Hi! I&apos;m your Care Assistant from Consult your Doctor. I&apos;ll help you book care today.</p>
              ) : (
                <p key="hi">Hi! I&apos;m Zebrold AI. I can help with your portal: bookings, slots, payments and more.</p>
              ),
              <p key="ask">What can I help you with?</p>,
            ]}
            empty={
              <div className="flex flex-col items-end gap-2 mt-1.5 mb-2">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => void chat.send(s)} className={`${pill} bg-white text-[#2A4DD0] hover:bg-[#2A4DD0] hover:text-white`}>
                    {s}
                  </button>
                ))}
                {contactHref && (
                  <Link href={contactHref} onClick={close} className={`${pill} bg-white text-[#2A4DD0] hover:bg-[#2A4DD0] hover:text-white`}>
                    Talk to our team
                  </Link>
                )}
                {isPatient && <p className="mt-1 text-[11.5px] text-[#6B7280]">In a medical emergency, call 108.</p>}
              </div>
            }
          />
          <Composer
            chat={chat}
            placeholder="Type a message…"
            autoFocus
            note={
              <>
                Powered by <strong className="text-[#1A1F2B]">Consult your Doctor</strong>
              </>
            }
          />
        </section>
      )}
    </>
  )
}
