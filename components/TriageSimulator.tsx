'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bot, Lock, Send, Stethoscope, Video, X } from 'lucide-react'

type Message = { id: number; from: 'ai' | 'user'; text: string; digest?: boolean; action?: 'connect' | 'redirect' }

const initialMessages: Message[] = [
  {
    id: 1,
    from: 'ai',
    text: "Hello! I'm your AI health triage assistant. Describe your symptoms and I will prepare a clinical summary for our on-call doctor.",
  },
  {
    id: 2,
    from: 'user',
    text: "I've had a dry cough and mild fever for 2 days. Feeling quite fatigued since yesterday evening.",
  },
  {
    id: 3,
    from: 'ai',
    text: "I've logged your vitals and symptoms. Based on this, Dr. Ananya Mehta (General Physician) is on standby. Would you like to connect right now?",
    digest: true,
    action: 'connect',
  },
]

const demoDoctorImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDLI3cjgoop22RgGAfaI9UWgREhvxxR9O6Dr_hK9a6JjGsHRAAbzoUeyX_ceYXogaZZX-koS4xGCZWbr8NZ4B5oSudUiztYyEj0dEn1juEZbW9SwOWno9mvdbpNmt0On044cY2GB-Y4OWkqnun3pxn1LDxZTibEDUy11SwDQpp37xRpD50_QqwR3MiHBhzpdxrFsHlp2GQ2-J-HFUFx3xgFqK9ZMt0EiVBDE4W8hFH7hBci5qGboXbRFw'

/** Demo chat showing how AI triage hands a patient off to a doctor. Replies are scripted, not a real model. */
export function TriageSimulator() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [draft, setDraft] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const streamRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(initialMessages.length + 1)

  // Follow new messages, but leave the scripted intro visible on first load.
  useEffect(() => {
    const stream = streamRef.current
    if (stream && messages.length > initialMessages.length) stream.scrollTop = stream.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!isModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isModalOpen])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setMessages((prev) => [...prev, { id: nextId.current++, from: 'user', text }])

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          from: 'ai',
          text: `I have updated your pre-consult brief with: "${text}". Ready to route your updated file directly to Dr. Ananya Mehta.`,
          action: 'redirect',
        },
      ])
    }, 700)
  }

  return (
    <>
      <div className="max-w-2xl mx-auto w-full bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden">
        {/* Chat header */}
        <div className="p-4 bg-primary text-on-primary flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-on-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-title-md text-base md:text-title-md font-bold">Consult AI Health Assistant</span>
                <span className="font-label-sm text-label-sm bg-fresh-teal text-white px-2 py-0.5 rounded-full">Demo</span>
              </div>
              <p className="font-label-sm text-label-sm text-on-primary/80">Automated Triage Protocol v4.2</p>
            </div>
          </div>
          <Lock className="w-5 h-5 text-on-primary/70" />
        </div>

        {/* Conversation */}
        <div ref={streamRef} className="p-4 md:p-6 flex flex-col gap-4 max-h-[440px] overflow-y-auto bg-surface-container-low/50" aria-live="polite">
          {messages.map((message) =>
            message.from === 'user' ? (
              <div key={message.id} className="flex items-start gap-3 max-w-[85%] self-end flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-vibrant-blue text-on-primary flex items-center justify-center shrink-0 text-xs font-bold">You</div>
                <div className="p-4 rounded-2xl rounded-tr-none bg-vibrant-blue text-on-primary shadow-sm font-body-md text-[15px]">{message.text}</div>
              </div>
            ) : (
              <div key={message.id} className="flex items-start gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-none bg-surface-container-lowest shadow-sm font-body-md text-[15px] text-on-surface flex flex-col gap-3">
                  <p>{message.text}</p>
                  {message.digest && (
                    <dl className="bg-surface-container-low p-3.5 rounded-lg flex flex-col gap-1.5 font-label-sm text-label-sm">
                      <div className="flex items-center justify-between gap-3 text-indigo-gray-600">
                        <dt>Calculated Risk:</dt>
                        <dd className="text-fresh-teal font-bold text-right">Mild - Non-Emergency</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-indigo-gray-600">
                        <dt>Recommended Specialist:</dt>
                        <dd className="text-on-surface font-bold text-right">General Physician</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-indigo-gray-600">
                        <dt>Physician on Standby:</dt>
                        <dd className="text-on-surface font-bold text-right">Dr. Ananya Mehta (Ready)</dd>
                      </div>
                    </dl>
                  )}
                  {message.action === 'connect' && (
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-full bg-fresh-teal text-white font-title-md text-base md:text-title-md hover:opacity-95 transition-all shadow-md mt-1"
                    >
                      <Video className="w-5 h-5" />
                      Connect to Doctor (€20)
                    </button>
                  )}
                  {message.action === 'redirect' && (
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center justify-center gap-1 w-full py-2 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm hover:bg-primary transition-all mt-1"
                    >
                      Redirect with Updated Notes
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-surface-container-lowest flex items-center gap-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type another symptom or question (e.g. 'I also have a sore throat')..."
            aria-label="Describe a symptom"
            className="flex-1 min-w-0 bg-surface-container-low px-4 py-3 rounded-full font-body-md text-[15px] text-on-surface focus:outline-none focus:ring-2 focus:ring-vibrant-blue/40"
          />
          <button
            type="submit"
            aria-label="Send"
            className="w-12 h-12 rounded-full bg-vibrant-blue text-on-primary flex items-center justify-center hover:bg-primary transition-colors shrink-0 shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Redirection modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-indigo-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="redirection-title"
            className="relative bg-surface-container-lowest max-w-md w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-fresh-teal animate-ping" />
                <h3 id="redirection-title" className="font-title-md text-title-md font-bold text-on-surface">Redirection Initialized</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-surface-container-low rounded-xl flex items-center gap-4">
              <img alt="" className="w-14 h-14 rounded-full object-cover shadow-sm" src={demoDoctorImage} />
              <div className="flex-1 min-w-0">
                <p className="font-title-md text-title-md font-bold text-on-surface truncate">Dr. Ananya Mehta</p>
                <p className="font-body-md text-body-md text-primary">General Physician</p>
                <p className="font-label-sm text-label-sm text-fresh-teal font-semibold">Ready to review clinical brief</p>
              </div>
            </div>

            <dl className="flex flex-col gap-2 font-label-sm text-label-sm text-indigo-gray-600 bg-surface-container p-3.5 rounded-lg">
              <div className="flex items-center justify-between gap-3">
                <dt>Encrypted Video Room:</dt>
                <dd className="font-bold text-on-surface text-right">Active (End-to-End Encrypted)</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>AI Clinical Brief Hand-off:</dt>
                <dd className="font-bold text-fresh-teal text-right">SBAR Synthesized</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Follow-up Policy:</dt>
                <dd className="font-bold text-on-surface text-right">23 Days Free Chat Included</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2">
              <Link
                href="/search?type=doctor&q=general"
                className="w-full py-3.5 rounded-full bg-vibrant-blue text-on-primary font-title-md text-base md:text-title-md hover:bg-primary transition-all text-center shadow-md"
              >
                Continue to Book a Doctor
              </Link>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2.5 rounded-full text-indigo-gray-600 font-label-sm text-label-sm hover:text-on-surface transition-colors"
              >
                Cancel &amp; Return
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
