'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
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
import { ChatThread, Composer, PdfCard, useChat } from './chat'

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
  super_admin: [
    { text: 'What can each portal do?', icon: ListChecks },
    { text: 'How do hospitals publish slots?', icon: CalendarPlus },
    { text: 'How do lab reports reach patients?', icon: Upload },
    { text: 'Make a PDF overview of the booking flow', icon: FileText },
  ],
}

const INTRO: Record<string, string> = {
  visitor: 'Find the right doctor or lab, check fees, open slots and test prices, and get help booking.',
  patient: 'Find the right doctor or lab, check fees and open slots, see your bookings, and get help booking.',
  doctor: 'Ask about your portal (check-ins, prescriptions, walk-ins and slots) or look up doctors and labs.',
  diagnostic_admin: 'Ask about your lab portal (bookings, walk-ins, reports and your test menu) or look up labs.',
  hospital_admin: 'Ask about your hospital portal (doctors, slots, visits, finance and staff) or look up doctors.',
  executive: 'Find doctors with open slots, labs and test prices, and get help with walk-ins and desk payments.',
  super_admin: 'Ask how any part of the site works, or look up doctors and labs.',
}

const SECTION: Record<string, string> = {
  visitor: 'Patient assistant',
  patient: 'Patient assistant',
  doctor: 'Doctor portal assistant',
  diagnostic_admin: 'Diagnostic center assistant',
  hospital_admin: 'Hospital portal assistant',
  executive: 'Front desk assistant',
  super_admin: 'Platform assistant',
}

/** A section's Zebrold AI tab: the assistant as a full page, with what it can do alongside. */
export function AssistantPage({ role }: { role: string | null }) {
  const key = role ?? 'visitor'
  const chat = useChat('zebrold-ai-chat', 'assistant')
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
    { icon: Languages, title: 'Your language', text: 'Ask in English, Hindi, German and more.' },
  ]

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 lg:gap-6 items-start">
      <section
        aria-label="Zebrold AI"
        className="flex flex-col rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-[0_4px_24px_rgba(0,80,203,0.06)] overflow-hidden h-[calc(100dvh-12rem)] md:h-[calc(100dvh-14rem)] min-h-[440px] max-h-[920px]"
      >
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-3.5 border-b border-outline-variant/30 bg-gradient-to-r from-primary-fixed/30 to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-vibrant-blue text-on-primary flex items-center justify-center shadow-sm shrink-0">
              <BrainCircuit className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-title-md text-[17px] font-bold text-on-surface leading-tight">Zebrold AI</h2>
              <p className="text-[12px] text-on-surface-variant truncate flex items-center gap-1.5">
                <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-fresh-teal" />
                {SECTION[key] ?? SECTION.visitor}
              </p>
            </div>
          </div>
          {chat.messages.length > 0 && (
            <button
              type="button"
              onClick={chat.reset}
              className="px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-[12px] font-semibold text-on-surface flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> New chat
            </button>
          )}
        </header>

        <ChatThread
          chat={chat}
          icon={BrainCircuit}
          wide
          empty={
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 md:gap-5 py-2 md:py-8">
              <span className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-primary to-vibrant-blue text-on-primary flex items-center justify-center shadow-[0_8px_24px_rgba(0,102,255,0.3)]">
                <BrainCircuit className="w-6 h-6 md:w-8 md:h-8" />
              </span>
              <div className="flex flex-col gap-1.5 max-w-md">
                <p className="font-headline-lg text-[20px] md:text-[26px] leading-tight font-bold text-on-surface tracking-tight">How can I help today?</p>
                <p className="text-[13.5px] md:text-[14px] text-on-surface-variant">{INTRO[key] ?? INTRO.visitor}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 md:gap-2.5 w-full max-w-2xl">
                {prompts.map(({ text, icon: Icon }) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => void chat.send(text)}
                    className="flex items-start gap-3 text-left p-3 md:p-3.5 rounded-2xl bg-surface-container-low border border-transparent hover:border-primary/20 hover:bg-primary-fixed/30 transition-colors"
                  >
                    <span className="w-8 h-8 rounded-lg bg-surface-container-lowest text-vibrant-blue flex items-center justify-center shrink-0 shadow-sm">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[13.5px] font-semibold text-on-surface leading-snug pt-1">{text}</span>
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-on-surface-variant">
                Zebrold AI isn’t a doctor. In an emergency, call{' '}
                <a href="tel:112" className="font-bold text-soft-coral">
                  112
                </a>
                .
              </p>
            </div>
          }
        />
        <Composer chat={chat} wide autoFocus placeholder="Ask about doctors, labs, prices or how something works…" />
      </section>

      <aside className="hidden lg:flex flex-col gap-4">
        <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/30 p-5 shadow-sm">
          <h3 className="font-title-md text-[15px] font-bold text-on-surface mb-3.5">What Zebrold AI can do</h3>
          <ul className="flex flex-col gap-3.5">
            {capabilities.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-primary-fixed/50 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-on-surface">{title}</span>
                  <span className="block text-[12px] text-on-surface-variant leading-snug">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/30 p-5 shadow-sm">
          <h3 className="font-title-md text-[15px] font-bold text-on-surface mb-3 flex items-center justify-between">
            PDFs from this chat
            {pdfs.length > 0 && <span className="text-[11px] font-bold text-primary bg-primary-fixed/50 rounded-full px-2 py-0.5">{pdfs.length}</span>}
          </h3>
          {pdfs.length ? (
            <div className="flex flex-col gap-2">
              {pdfs.map((doc, i) => (
                <PdfCard key={`${i}-${doc.title}`} doc={doc} />
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-on-surface-variant leading-snug">Ask for a PDF, for example “make a PDF of this”, and it will be listed here to download.</p>
          )}
        </div>

        <div className="rounded-3xl bg-surface-container-low p-5 flex flex-col gap-3">
          <h3 className="font-title-md text-[15px] font-bold text-on-surface flex items-center gap-2">
            <ShieldCheck className="w-[18px] h-[18px] text-fresh-teal" /> Good to know
          </h3>
          <ul className="flex flex-col gap-2 text-[12.5px] text-on-surface-variant leading-snug list-disc pl-4">
            <li>Zebrold AI isn’t a doctor and can make mistakes. It can’t diagnose, prescribe or read results.</li>
            <li>
              In an emergency, call <strong className="text-soft-coral">112</strong>.
            </li>
            <li>Never share one-time codes, passwords or card details in the chat.</li>
          </ul>
          {key === 'patient' || key === 'visitor' ? (
            <Link href={contactHref} className="mt-1 flex items-center gap-2 text-[13px] font-bold text-primary hover:underline underline-offset-2 w-fit">
              <MessageSquareText className="w-4 h-4" /> Need a person? Contact us
            </Link>
          ) : (
            <p className="mt-1 text-[12.5px] text-on-surface-variant">Need a person? Contact the Consult Your Doctor team.</p>
          )}
        </div>
      </aside>
    </div>
  )
}
