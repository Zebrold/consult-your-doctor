'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ClipboardCheck,
  FileText,
  FlaskConical,
  IndianRupee,
  Languages,
  ListChecks,
  MessageSquareText,
  Microscope,
  RotateCcw,
  Search,
  ShieldCheck,
  Stethoscope,
  Tag,
  Upload,
  UserPlus,
  UserRoundCheck,
  Wallet,
} from 'lucide-react'
import { ChatThread, Composer, LanguageMenu, PdfCard, chatKey, useChat, useLanguage } from './chat'

type Prompt = { text: string; icon: LucideIcon }

// Starting points per role. Each one is answerable from the site's real data or features.
const PROMPTS: Record<string, Prompt[]> = {
  visitor: [
    { text: 'Find a cardiologist in Mumbai with an open slot', icon: Search },
    { text: 'Which labs offer an MRI, and what does it cost?', icon: Microscope },
    { text: 'Make a PDF of orthopedic doctors in New Delhi', icon: FileText },
    { text: 'How do booking and payment work?', icon: CalendarCheck },
  ],
  patient: [
    { text: 'Show my upcoming bookings', icon: CalendarCheck },
    { text: 'Find a skin specialist with a slot this week', icon: Search },
    { text: 'Which labs offer a blood test, and what does it cost?', icon: FlaskConical },
    { text: 'Make a PDF of my bookings', icon: FileText },
  ],
  doctor: [
    { text: 'Walk me through checking in a patient', icon: UserRoundCheck },
    { text: 'How do I write a prescription with vitals?', icon: ClipboardCheck },
    { text: 'Why can’t patients book me right now?', icon: CalendarClock },
    { text: 'Make a PDF checklist of my consultation workflow', icon: FileText },
  ],
  diagnostic_admin: [
    { text: 'How do I upload a report to a patient?', icon: Upload },
    { text: 'How do I add and price a new test?', icon: Tag },
    { text: 'Book a walk-in patient, step by step', icon: UserPlus },
    { text: 'Make a PDF guide for our front desk', icon: FileText },
  ],
  hospital_admin: [
    { text: 'How do I add a doctor to the roster?', icon: UserPlus },
    { text: 'How do I publish a doctor’s slots?', icon: CalendarPlus },
    { text: 'Where do I see revenue and payouts?', icon: Wallet },
    { text: 'Make a PDF onboarding guide for new staff', icon: FileText },
  ],
  executive: [
    { text: 'Find a doctor with a slot today', icon: Stethoscope },
    { text: 'How do I book a walk-in at the counter?', icon: UserPlus },
    { text: 'How do desk payments work?', icon: IndianRupee },
    { text: 'Make a PDF of lab test prices for the desk', icon: FileText },
  ],
}

/** Staff portals: what the header says the assistant helps with, and what it offers in its greeting. */
const STAFF: Record<string, { sub: string; portal: string; offer: string }> = {
  doctor: {
    sub: 'Help with your doctor portal',
    portal: 'your doctor portal',
    offer: 'I can explain check-ins, prescriptions and your schedule, look up doctors and labs, or make a PDF.',
  },
  diagnostic_admin: {
    sub: 'Help with your lab portal',
    portal: 'your lab portal',
    offer: 'I can explain bookings, walk-ins, reports and your test menu, or make a PDF for your team.',
  },
  hospital_admin: {
    sub: 'Help with your hospital portal',
    portal: 'your hospital portal',
    offer: 'I can explain how any page works, look up doctors and slots, or make a PDF for your team.',
  },
  executive: {
    sub: 'Help with the front desk',
    portal: 'the front desk',
    offer: 'I can find doctors with open slots, labs and test prices, help with walk-ins and desk payments, or make a PDF.',
  },
}

const TITLE = 'Care Assistant'

/**
 * A section's Care Assistant page. The conversation belongs to this section and `viewer` (the signed-in user's id),
 * so searches in one panel never appear in another. Staff portals get the full-width chat from the user's hospital
 * design; patients keep the chat with the "what it can do" cards beside it.
 */
export function AssistantPage({ role, viewer, name }: { role: string | null; viewer: string | null; name?: string | null }) {
  const key = role ?? 'visitor'
  const [language, setLanguage] = useLanguage()
  const chat = useChat(chatKey('ai', key, viewer), 'assistant', language)
  const prompts = PROMPTS[key] ?? PROMPTS.visitor
  const staff = STAFF[key]

  // Suggestions, right-aligned like the patient's own replies, until the conversation starts.
  const chips = (
    <div className="flex flex-col items-end gap-2 mt-1.5 mb-1">
      {prompts.map(({ text }) => (
        <button
          key={text}
          type="button"
          onClick={() => void chat.send(text)}
          className="max-w-[300px] px-4 py-[9px] rounded-[20px] border-[1.5px] border-[#2A4DD0] bg-white text-[#2A4DD0] text-[14px] font-semibold leading-[1.35] text-left hover:bg-[#2A4DD0] hover:text-white transition-colors"
        >
          {text}
        </button>
      ))}
    </div>
  )

  const restart = (
    <button
      type="button"
      onClick={chat.reset}
      disabled={chat.messages.length === 0}
      aria-label="Restart conversation"
      title="New chat"
      className="shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center text-[#2A4DD0] hover:bg-[#F0F2F5] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <RotateCcw className="w-[19px] h-[19px]" strokeWidth={2.3} />
    </button>
  )

  if (staff) {
    const first = name?.trim().replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, '').split(/\s+/)[0]
    return (
      <section
        aria-label={TITLE}
        className="flex flex-col bg-white overflow-hidden min-h-[440px] rounded-[20px] border border-[#E6EAF0] shadow-[0_1px_2px_rgba(11,27,63,0.04)] h-[calc(100dvh-13.5rem-var(--strip-h)-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-9rem)] max-h-[960px] font-(family-name:--font-manrope)"
      >
        <header className="shrink-0 flex items-center gap-3 pl-4 md:pl-5 pr-3 md:pr-4 py-3 border-b border-[#E8EAEE]">
          <span aria-hidden className="shrink-0 w-10 h-10 rounded-full bg-[#2A4DD0] text-white flex items-center justify-center">
            <Stethoscope className="w-5 h-5" strokeWidth={2.3} />
          </span>
          <span className="flex-1 min-w-0">
            <h2 className="text-[17px] font-extrabold tracking-[-0.01em] text-[#1A1F2B] leading-tight">{TITLE}</h2>
            <span className="block text-[13px] text-[#6B7280] truncate">{staff.sub}</span>
          </span>
          <LanguageMenu value={language} onChange={setLanguage} />
          {restart}
        </header>
        <ChatThread
          chat={chat}
          icon={Stethoscope}
          name={TITLE}
          today
          wide
          intro={[
            <p key="hi">
              Hi{first ? ` ${first}` : ''}! I&apos;m the Care Assistant for {staff.portal}. {staff.offer}
            </p>,
            // The question goes once the conversation starts.
            ...(chat.messages.length ? [] : [<p key="ask">What can I help you with?</p>]),
          ]}
          empty={chips}
        />
        <Composer
          chat={chat}
          wide
          autoFocus
          placeholder="Type a message…"
          note={
            <>
              Powered by <strong className="font-extrabold text-[#1A1F2B]">Consult your Doctor</strong> · The Care Assistant can make mistakes and isn&apos;t a doctor · Never
              share passwords or one-time codes · Need a person?{' '}
              <Link href="/contact" className="font-bold text-[#2A4DD0] hover:underline underline-offset-2">
                Contact support
              </Link>
            </>
          }
        />
      </section>
    )
  }

  const pdfs = chat.messages.flatMap((m) => (m.pdf ? [m.pdf] : []))
  const capabilities: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: Search, title: 'Live answers', text: 'Doctors, open slots, labs and test prices, straight from the site.' },
    { icon: FileText, title: 'PDFs on request', text: 'Doctor lists, price sheets and step-by-step guides to download.' },
    key === 'patient'
      ? { icon: CalendarCheck, title: 'Your bookings', text: 'Reads your own appointments and lab tests, and nobody else’s.' }
      : { icon: ListChecks, title: 'Your bookings', text: 'Log in and it can read your own appointments and lab tests.' },
    { icon: Languages, title: 'Your language', text: 'Choose Hindi, Telugu, Tamil, Bengali and more at the top, or translate any answer.' },
  ]

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 lg:gap-6 items-start font-(family-name:--font-manrope)">
      <section
        aria-label={TITLE}
        className="flex flex-col bg-white overflow-hidden min-h-[440px] h-[calc(100dvh-78px-var(--strip-h)-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-72px-3.5rem)] lg:max-h-[920px] lg:rounded-2xl lg:shadow-[0_0_0_1px_#E6EAF0,0_1px_2px_rgba(11,27,63,0.04)]"
      >
        <header className="shrink-0 flex items-center gap-2.5 pr-3 lg:pr-4 pb-3 border-b border-[#E8EAEE] pl-2 lg:pl-5 pt-[calc(env(safe-area-inset-top)+14px)] lg:pt-3.5">
          <Link href="/" aria-label="Back to home" className="lg:hidden shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[#1A1F2B] active:bg-[#F0F2F5]">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
          </Link>
          <span aria-hidden className="shrink-0 w-9 h-9 rounded-full bg-[#2A4DD0] text-white flex items-center justify-center">
            <Stethoscope className="w-[19px] h-[19px]" strokeWidth={2.3} />
          </span>
          <span className="flex-1 min-w-0">
            <h2 className="text-[16.5px] font-extrabold tracking-[-0.01em] text-[#1A1F2B] leading-tight">{TITLE}</h2>
            <span className="flex items-center gap-[5px] text-[12px] font-bold text-[#067647] truncate">
              <span className="w-[7px] h-[7px] rounded-full bg-[#17B26A]" />
              Online · Patient assistant
            </span>
          </span>
          <LanguageMenu value={language} onChange={setLanguage} />
          {chat.messages.length > 0 && restart}
        </header>
        <ChatThread
          chat={chat}
          icon={Stethoscope}
          wide
          intro={[
            <p key="hi">Hi! I&apos;m your Care Assistant from Consult your Doctor. I can find doctors, hospitals and labs, check fees and open slots, and help you book.</p>,
            // The question goes once the conversation starts.
            ...(chat.messages.length ? [] : [<p key="ask">What can I help you with?</p>]),
          ]}
          empty={
            <>
              {chips}
              <p className="mt-auto pt-4 text-center text-[12px] text-[#6B7280]">
                The Care Assistant isn&apos;t a doctor. In an emergency, call{' '}
                <a href="tel:108" className="font-extrabold text-[#B42318]">
                  108
                </a>
                .
              </p>
            </>
          }
        />
        <Composer chat={chat} wide autoFocus placeholder="Type a message…" />
      </section>
      <aside className="hidden lg:flex flex-col gap-4">
        <div className="rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0,0_1px_2px_rgba(11,27,63,0.04)] p-5">
          <h3 className="text-[15px] font-extrabold text-[#0B1B3F] mb-3.5">What the {TITLE} can do</h3>
          <ul className="flex flex-col gap-3.5">
            {capabilities.map(({ icon: Icon, title: heading, text }) => (
              <li key={heading} className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-extrabold text-[#0B1B3F]">{heading}</span>
                  <span className="block text-[12px] text-[#5B667A] leading-snug">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0,0_1px_2px_rgba(11,27,63,0.04)] p-5">
          <h3 className="text-[15px] font-extrabold text-[#0B1B3F] mb-3 flex items-center justify-between">
            PDFs from this chat
            {pdfs.length > 0 && <span className="text-[11px] font-extrabold text-[#2A4DD0] bg-[#EEF3FF] rounded-full px-2 py-0.5">{pdfs.length}</span>}
          </h3>
          {pdfs.length ? (
            <div className="flex flex-col gap-2">
              {pdfs.map((doc, i) => (
                <PdfCard key={`${i}-${doc.title}`} doc={doc} />
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-[#5B667A] leading-snug">Ask for a PDF, for example “make a PDF of this”, and it will be listed here to download.</p>
          )}
        </div>
        <div className="rounded-2xl bg-[#EEF3FF] p-5 flex flex-col gap-3">
          <h3 className="text-[15px] font-extrabold text-[#1F3FB8] flex items-center gap-2">
            <ShieldCheck className="w-[18px] h-[18px]" /> Good to know
          </h3>
          <ul className="flex flex-col gap-2 text-[12.5px] text-[#27324A] leading-snug list-disc pl-4">
            <li>The assistant isn’t a doctor and can make mistakes. It can’t diagnose, prescribe or read results.</li>
            <li>
              In an emergency, call <strong className="text-[#B42318]">108</strong>.
            </li>
            <li>Never share one-time codes, passwords or card details in the chat.</li>
          </ul>
          <Link href={key === 'patient' ? '/patient/support' : '/contact'} className="mt-1 flex items-center gap-2 text-[13px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-2 w-fit">
            <MessageSquareText className="w-4 h-4" /> Need a person? Contact us
          </Link>
        </div>
      </aside>
    </div>
  )
}
