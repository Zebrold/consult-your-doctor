'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  BrainCircuit,
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
import { ChatThread, Composer, LanguagePicker, PdfCard, chatKey, useChat, useLanguage } from './chat'

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
    { text: 'Where do I see revenue?', icon: Wallet },
    { text: 'Make a PDF onboarding guide for new staff', icon: FileText },
  ],
  executive: [
    { text: 'Find a doctor with a slot today', icon: Stethoscope },
    { text: 'How do I book a walk-in at the counter?', icon: UserPlus },
    { text: 'How do desk payments work?', icon: IndianRupee },
    { text: 'Make a PDF of lab test prices for the desk', icon: FileText },
  ],
}

const INTRO: Record<string, string> = {
  visitor: 'Find the right doctor or lab, check fees, open slots and test prices, and get help booking.',
  patient: 'Find the right doctor or lab, check fees and open slots, see your bookings, and get help booking.',
  doctor: 'Ask about your portal (check-ins, prescriptions, walk-ins and slots) or look up doctors and labs.',
  diagnostic_admin: 'Ask about your lab portal (bookings, walk-ins, reports and your test menu) or look up labs.',
  hospital_admin: 'Ask about your hospital portal (doctors, slots, visits, finance and staff) or look up doctors.',
  executive: 'Find doctors with open slots, labs and test prices, and get help with walk-ins and desk payments.',
}

const SECTION: Record<string, string> = {
  visitor: 'Patient assistant',
  patient: 'Patient assistant',
  doctor: 'Doctor portal assistant',
  diagnostic_admin: 'Diagnostic center assistant',
  hospital_admin: 'Hospital portal assistant',
  executive: 'Front desk assistant',
}

/**
 * A section's Zebrold AI tab: the assistant as a full page, with what it can do alongside. The conversation belongs
 * to this section and `viewer` (the signed-in user's id), so searches in one panel never appear in another.
 */
export function AssistantPage({ role, viewer }: { role: string | null; viewer: string | null }) {
  const key = role ?? 'visitor'
  const [language, setLanguage] = useLanguage()
  const chat = useChat(chatKey('ai', key, viewer), 'assistant', language)
  const prompts = PROMPTS[key] ?? PROMPTS.visitor
  const pdfs = chat.messages.flatMap((m) => (m.pdf ? [m.pdf] : []))
  const isPatient = key === 'patient' || key === 'visitor'
  const contactHref = key === 'patient' ? '/patient/support' : '/contact'

  const capabilities: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: Search, title: 'Live answers', text: 'Doctors, open slots, labs and test prices, straight from the site.' },
    { icon: FileText, title: 'PDFs on request', text: 'Doctor lists, price sheets and step-by-step guides to download.' },
    isPatient
      ? { icon: CalendarCheck, title: 'Your bookings', text: key === 'patient' ? 'Reads your own appointments and lab tests, and nobody else’s.' : 'Sign in and it can read your own appointments and lab tests.' }
      : { icon: ListChecks, title: 'Step-by-step help', text: 'How each part of your portal works, from first click to done.' },
    { icon: Languages, title: 'Your language', text: 'Choose Hindi, Telugu, Tamil, Bengali and more at the top, or translate any answer.' },
  ]

  const title = isPatient ? 'Care Assistant' : 'Zebrold AI'

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 lg:gap-6 items-start font-(family-name:--font-manrope)">
      <section
        aria-label={title}
        className={`flex flex-col bg-white overflow-hidden min-h-[440px] ${
          isPatient
            ? 'h-[calc(100dvh-78px-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-72px-3.5rem)] lg:max-h-[920px] lg:rounded-2xl lg:shadow-[0_0_0_1px_#E6EAF0,0_1px_2px_rgba(11,27,63,0.04)]'
            : 'rounded-3xl border border-outline-variant/30 shadow-[0_4px_24px_rgba(15,23,42,0.04)] h-[calc(100dvh-13.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-14rem)] max-h-[920px]'
        }`}
      >
        <header className={`shrink-0 flex items-center gap-2.5 pr-3 lg:pr-4 pb-3 border-b border-[#E8EAEE] ${isPatient ? 'pl-2 lg:pl-5 pt-[calc(env(safe-area-inset-top)+14px)] lg:pt-3.5' : 'pl-4 md:pl-6 pt-3'}`}>
          {isPatient && (
            <Link href="/" aria-label="Back to home" className="lg:hidden shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[#1A1F2B] active:bg-[#F0F2F5]">
              <ArrowLeft className="w-5 h-5" strokeWidth={2.4} />
            </Link>
          )}
          <span aria-hidden className="shrink-0 w-9 h-9 rounded-full bg-[#2A4DD0] text-white flex items-center justify-center">
            <Stethoscope className="w-[19px] h-[19px]" strokeWidth={2.3} />
          </span>
          <span className="flex-1 min-w-0">
            <h2 className="text-[16.5px] font-extrabold tracking-[-0.01em] text-[#1A1F2B] leading-tight">{title}</h2>
            <span className="flex items-center gap-[5px] text-[12px] font-bold text-[#067647] truncate">
              <span className="w-[7px] h-[7px] rounded-full bg-[#17B26A]" />
              Online · {SECTION[key] ?? SECTION.visitor}
            </span>
          </span>
          <LanguagePicker value={language} onChange={setLanguage} />
          {chat.messages.length > 0 && (
            <button type="button" onClick={chat.reset} aria-label="Restart conversation" title="New chat" className="shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center text-[#2A4DD0] hover:bg-[#F0F2F5] transition-colors">
              <RotateCcw className="w-[19px] h-[19px]" strokeWidth={2.3} />
            </button>
          )}
        </header>
        <ChatThread
          chat={chat}
          icon={Stethoscope}
          wide
          intro={
            isPatient
              ? [
                  <p key="hi">Hi! I&apos;m your Care Assistant from Consult your Doctor. I can find doctors, hospitals and labs, check fees and open slots, and help you book.</p>,
                  // The question goes once the conversation starts.
                  ...(chat.messages.length ? [] : [<p key="ask">What can I help you with?</p>]),
                ]
              : undefined
          }
          empty={
            isPatient ? (
              <>
                <div className="flex flex-col items-end gap-2 mt-1.5 mb-1">
                  {prompts.map(({ text }) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => void chat.send(text)}
                      className="max-w-[300px] px-4 py-[9px] rounded-[20px] border-[1.5px] border-[#2A4DD0] bg-white text-[#2A4DD0] text-[14px] font-semibold leading-[1.35] text-left hover:bg-[#F2F6FF] transition-colors"
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <p className="mt-auto pt-4 text-center text-[12px] text-[#6B7280]">
                  The Care Assistant isn&apos;t a doctor. In an emergency, call{' '}
                  <a href="tel:108" className="font-extrabold text-[#B42318]">
                    108
                  </a>
                  .
                </p>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 md:gap-5 py-2 md:py-8">
                <span className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-[#2A4DD0] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(42,77,208,0.25)]">
                  <BrainCircuit className="w-6 h-6 md:w-8 md:h-8" />
                </span>
                <div className="flex flex-col gap-1.5 max-w-md">
                  <p className="text-[20px] md:text-[26px] leading-tight font-extrabold text-[#0B1B3F] tracking-tight">How can I help today?</p>
                  <p className="text-[13.5px] md:text-[14px] text-[#5B667A]">{INTRO[key] ?? INTRO.visitor}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 md:gap-2.5 w-full max-w-2xl">
                  {prompts.map(({ text, icon: Icon }) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => void chat.send(text)}
                      className="flex items-start gap-3 text-left p-3 md:p-3.5 rounded-2xl bg-[#F4F6FA] border border-transparent hover:border-[#2A4DD0]/25 hover:bg-[#EEF3FF] transition-colors"
                    >
                      <span className="w-8 h-8 rounded-lg bg-white text-[#2A4DD0] flex items-center justify-center shrink-0 shadow-sm">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-[13.5px] font-semibold text-[#0B1B3F] leading-snug pt-1">{text}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[12px] text-[#5B667A]">
                  Zebrold AI isn’t a doctor. In an emergency, call{' '}
                  <a href="tel:108" className="font-bold text-[#B42318]">
                    108
                  </a>
                  .
                </p>
              </div>
            )
          }
        />
        <Composer chat={chat} wide autoFocus placeholder={isPatient ? 'Type a message…' : 'Ask about doctors, labs, prices or how something works…'} />
      </section>
      <aside className="hidden lg:flex flex-col gap-4">
        <div className="rounded-2xl bg-white shadow-[0_0_0_1px_#E6EAF0,0_1px_2px_rgba(11,27,63,0.04)] p-5">
          <h3 className="text-[15px] font-extrabold text-[#0B1B3F] mb-3.5">What the {title} can do</h3>
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
          {isPatient ? (
            <Link href={contactHref} className="mt-1 flex items-center gap-2 text-[13px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-2 w-fit">
              <MessageSquareText className="w-4 h-4" /> Need a person? Contact us
            </Link>
          ) : (
            <p className="mt-1 text-[12.5px] text-[#5B667A]">Need a person? Contact the Consult Your Doctor team.</p>
          )}
        </div>
      </aside>
    </div>
  )
}
