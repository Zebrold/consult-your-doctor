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
// The assistant button: the blue logo on a white disc with a soft halo, which reads on white pages and blue bands alike.
const launcherCircle =
  'shrink-0 rounded-full bg-white flex items-center justify-center shadow-[0_0_0_5px_rgba(255,255,255,0.35),0_0_0_6px_rgba(42,77,208,0.12),0_12px_26px_-6px_rgba(11,27,63,0.42)] active:scale-95 transition-transform print:hidden'

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
          className={`fixed z-[35] right-4 bottom-[calc(max(10px,env(safe-area-inset-bottom))+78px)] lg:right-8 lg:bottom-8 w-[52px] h-[52px] ${launcherCircle}`}
        >
          <Image src="/logo-icon.png" alt="" width={96} height={96} className="w-[30px] h-[30px] object-contain" />
        </button>
      )}

      {/* Everywhere else: "How can I help you?" beside the round logo button. */}
      {!open && !appFab && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${title}: how can I help you?`}
          className={`group fixed z-[35] right-3 sm:right-6 md:right-8 ${
            lifted ? 'bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.75rem)] md:bottom-24' : 'bottom-[max(1rem,env(safe-area-inset-bottom))] md:bottom-6'
          } flex items-center gap-2.5 sm:gap-3 rounded-full select-none focus-visible:outline-none print:hidden`}
        >
          <span className="px-3.5 py-2 sm:px-[18px] sm:py-2.5 rounded-[16px] rounded-br-[6px] bg-white text-[#0B1B3F] text-[13px] sm:text-[15px] font-bold tracking-[-0.01em] whitespace-nowrap shadow-[0_0_0_1px_rgba(11,27,63,0.06),0_10px_24px_-6px_rgba(11,27,63,0.3)] group-hover:-translate-x-0.5 group-focus-visible:ring-2 group-focus-visible:ring-[#2A4DD0] transition-transform">
            How can I help you?
          </span>
          <span className={`w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] group-hover:scale-105 group-active:scale-95 ${launcherCircle}`}>
            <Image src="/logo-icon.png" alt="" width={96} height={96} className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] object-contain" />
          </span>
        </button>
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
