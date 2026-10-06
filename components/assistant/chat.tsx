'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { ArrowUp, FileDown, FileText, LoaderCircle, Square } from 'lucide-react'
import type { PdfDoc } from '@/lib/assistant/pdf-doc'

// The chat both Zebrold AI surfaces share: the Support button on every page (Support.tsx) and each section's
// full-page Zebrold AI tab (AssistantPage.tsx). Replies stream from app/api/assistant as newline-delimited JSON.

/** `local` replies (errors, "not set up") are shown but never sent back to the model. */
export type Msg = { role: 'user' | 'assistant'; content: string; local?: boolean; pdf?: PdfDoc }
/** Support answers problems with the site; assistant is the open-ended Zebrold AI page. */
export type ChatMode = 'support' | 'assistant'

const HISTORY = 20
const NONE: Msg[] = []

const NOT_CONFIGURED =
  'Zebrold AI isn’t switched on yet. Meanwhile you can [search for doctors](/search), [book a lab test](/diagnostics) or [contact us](/contact).'

function loadChat(key: string): Msg[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? '[]')
    return Array.isArray(saved) ? saved.filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string') : []
  } catch {
    return []
  }
}

const subscribe = () => () => {}

/** One conversation, kept in sessionStorage under `storeKey` so it survives moving between pages. */
export function useChat(storeKey: string, mode: ChatMode) {
  const pathname = usePathname() ?? '/'
  const [messages, setMessages] = useState<Msg[]>(() => loadChat(storeKey))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  // The saved chat only exists in the browser, so it's shown once hydration is over.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  const abortRef = useRef<AbortController | null>(null)
  // Bumped by reset(), so a reply still arriving for the old conversation is dropped.
  const runRef = useRef(0)

  useEffect(() => {
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(messages.slice(-40)))
    } catch {
      // Storage can be blocked (private mode); the chat still works for this page.
    }
  }, [storeKey, messages])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    const run = runRef.current
    const history: Msg[] = [...messages, { role: 'user', content }]
    let pdf: PdfDoc | undefined
    const show = (reply: string, local = false) => {
      if (runRef.current === run) setMessages([...history, { role: 'assistant', content: reply, local, pdf }])
    }
    setMessages([...history, { role: 'assistant', content: '' }])
    setBusy(true)
    setStatus(null)

    const controller = new AbortController()
    abortRef.current = controller
    let reply = ''
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.filter((m) => !m.local && m.content.trim()).slice(-HISTORY).map(({ role, content }) => ({ role, content })),
          path: pathname,
          mode,
        }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const code = await res
          .json()
          .then((j: { error?: string }) => j.error)
          .catch(() => null)
        show(
          code === 'not_configured'
            ? NOT_CONFIGURED
            : code === 'rate_limited'
              ? 'You’ve sent a lot of messages in a short time. Please wait a few minutes and try again.'
              : 'Sorry, I couldn’t answer that just now. Please try again.',
          true,
        )
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let failed = false
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          let event: { type?: string; text?: string; pdf?: PdfDoc }
          try {
            event = JSON.parse(line)
          } catch {
            continue
          }
          if (event.type === 'text' && event.text) {
            reply += event.text
            setStatus(null)
            show(reply)
          } else if (event.type === 'status' && event.text) {
            setStatus(event.text)
          } else if (event.type === 'pdf' && event.pdf) {
            pdf = event.pdf
            show(reply)
          } else if (event.type === 'error' && event.text) {
            failed = true
            reply = reply ? `${reply}\n\n${event.text}` : event.text
            show(reply, true)
          }
        }
      }
      if (!reply.trim() && pdf) show('Your PDF is ready.')
      else if (!reply.trim()) show('Sorry, I couldn’t answer that just now. Please try again.', true)
      else if (!failed) show(reply)
    } catch {
      if (controller.signal.aborted) show(reply.trim() ? reply : 'Stopped.', !reply.trim())
      else show(reply.trim() ? reply : 'Couldn’t reach Zebrold AI. Check your connection and try again.', !reply.trim())
    } finally {
      if (runRef.current === run) {
        setBusy(false)
        setStatus(null)
        abortRef.current = null
      }
    }
  }

  const stop = () => abortRef.current?.abort()
  const reset = () => {
    runRef.current++
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setBusy(false)
    setStatus(null)
  }

  return { messages: hydrated ? messages : NONE, busy, status, send, stop, reset }
}

export type Chat = ReturnType<typeof useChat>

/**
 * The scrolling list of messages. `intro` is a first assistant bubble that is always shown; `empty` is shown below it
 * until the first message is sent.
 */
export function ChatThread({
  chat,
  icon,
  intro,
  empty,
  wide = false,
  onNavigate,
}: {
  chat: Chat
  icon: LucideIcon
  intro?: ReactNode
  empty?: ReactNode
  wide?: boolean
  onNavigate?: () => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const { messages, busy, status } = chat
  const last = messages[messages.length - 1]
  const waiting = busy && last?.role === 'assistant' && !last.content

  useEffect(() => {
    // Follow the conversation as it grows; an empty chat stays at the top so its welcome is read from the start.
    if (messages.length) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, status])

  return (
    <div ref={listRef} aria-live="polite" className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div className={`min-h-full flex flex-col gap-3 ${wide ? 'w-full max-w-3xl mx-auto px-4 md:px-6 py-5' : 'px-4 py-4'}`}>
        {intro && (
          <Bubble role="assistant" icon={icon}>
            {intro}
          </Bubble>
        )}
        {messages.length === 0 && empty}
        {messages.map((m, i) =>
          m.role === 'assistant' && !m.content && !m.pdf ? null : (
            <Bubble key={i} role={m.role} icon={icon}>
              {m.role === 'assistant' ? (
                <>
                  {m.content && <Rich text={m.content} onNavigate={onNavigate} />}
                  {m.pdf && <PdfCard doc={m.pdf} className="mt-2.5" />}
                  {!m.local && m.content && !(busy && i === messages.length - 1) && (
                    <SaveAnswer question={messages[i - 1]?.role === 'user' ? messages[i - 1].content : null} answer={m.content} />
                  )}
                </>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </Bubble>
          ),
        )}
        {busy && (waiting || status) && (
          <div className="pl-9 flex items-center gap-2 text-[12px] text-on-surface-variant" role="status">
            {status ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin text-vibrant-blue" /> {status}
              </>
            ) : (
              <span className="flex gap-1 px-3 py-2.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30" aria-label="Zebrold AI is typing">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-vibrant-blue/70 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** The message box. Enter sends; Shift+Enter starts a new line. */
export function Composer({ chat, placeholder, wide = false, autoFocus = false }: { chat: Chat; placeholder: string; wide?: boolean; autoFocus?: boolean }) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // On phones the keyboard would cover the conversation, so only focus on larger screens.
    if (autoFocus && !window.matchMedia('(max-width: 767px)').matches) inputRef.current?.focus()
  }, [autoFocus])

  const submit = () => {
    if (!input.trim() || chat.busy) return
    void chat.send(input)
    setInput('')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className={`shrink-0 border-t border-outline-variant/30 bg-surface-container-lowest pt-3 pb-2 ${wide ? 'px-3 md:px-6' : 'px-3'}`}
    >
      <div className={wide ? 'max-w-3xl mx-auto' : ''}>
        <div className="flex items-end gap-2 rounded-2xl bg-surface-container-low border border-transparent focus-within:border-vibrant-blue focus-within:bg-surface-container-lowest px-3 py-2 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={2000}
            placeholder={placeholder}
            aria-label="Message Zebrold AI"
            className="flex-1 resize-none bg-transparent text-[14px] text-on-surface placeholder:text-outline focus:outline-none max-h-32 py-1.5 field-sizing-content"
          />
          {chat.busy ? (
            <button type="button" onClick={chat.stop} title="Stop" aria-label="Stop the reply" className="w-9 h-9 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center shrink-0">
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} title="Send" aria-label="Send" className="w-9 h-9 rounded-full bg-vibrant-blue text-on-primary flex items-center justify-center shrink-0 disabled:opacity-40 shadow-sm">
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[10.5px] text-on-surface-variant text-center mt-1.5">Zebrold AI can make mistakes and isn’t a doctor. Don’t share OTPs or card details.</p>
      </div>
    </form>
  )
}

function Bubble({ role, icon: Icon, children }: { role: 'user' | 'assistant'; icon: LucideIcon; children: ReactNode }) {
  if (role === 'user') {
    return <div className="self-end max-w-[85%] bg-primary text-on-primary rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[14px] leading-relaxed shadow-sm">{children}</div>
  }
  return (
    <div className="flex items-start gap-2 max-w-[92%]">
      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-vibrant-blue text-on-primary flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[14px] leading-relaxed text-on-surface shadow-[0_2px_8px_rgba(0,80,203,0.04)] break-words">
        {children}
      </div>
    </div>
  )
}

/** Renders the small subset of markdown replies use (paragraphs, lists, bold, links) without injecting HTML. */
function Rich({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let para: string[] = []
  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{para.flatMap((l, i) => (i ? [<br key={`br${i}`} />, ...inline(l, onNavigate)] : inline(l, onNavigate)))}</p>)
    para = []
  }
  const flushList = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag key={blocks.length} className={`${list.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1`}>
        {list.items.map((item, i) => (
          <li key={i}>{inline(item, onNavigate)}</li>
        ))}
      </Tag>,
    )
    list = null
  }

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/)
    if (!line.trim()) {
      flushPara()
      flushList()
    } else if (bullet) {
      flushPara()
      const ordered = !!bullet[1]
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push(bullet[2])
    } else {
      flushList()
      para.push(line.replace(/^#{1,6}\s+(.*)$/, '**$1**'))
    }
  }
  flushPara()
  flushList()
  return <div className="flex flex-col gap-2">{blocks}</div>
}

function inline(text: string, onNavigate?: () => void): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = `${m.index}-${out.length}`
    if (m[1] !== undefined) {
      const href = m[2]
      const cls = 'text-vibrant-blue font-semibold underline underline-offset-2 hover:text-primary'
      if (href.startsWith('/') && !href.startsWith('//')) {
        out.push(
          <Link key={key} href={href} onClick={onNavigate} className={cls}>
            {m[1]}
          </Link>,
        )
      } else if (/^https:\/\//.test(href)) {
        out.push(
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
            {m[1]}
          </a>,
        )
      } else if (/^tel:\+?[\d-]+$/.test(href)) {
        out.push(
          <a key={key} href={href} className={cls}>
            {m[1]}
          </a>,
        )
      } else {
        out.push(m[1])
      }
    } else {
      out.push(<strong key={key}>{m[3]}</strong>)
    }
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** A PDF the assistant prepared: built in the browser when the visitor clicks Download. */
export function PdfCard({ doc, className = '' }: { doc: PdfDoc; className?: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'failed'>('idle')
  const download = async () => {
    setState('working')
    try {
      const { downloadPdf } = await import('./pdf')
      await downloadPdf(doc)
      setState('idle')
    } catch (err) {
      console.error('PDF download failed:', err)
      setState('failed')
    }
  }
  return (
    <div className={`p-3 rounded-xl bg-primary-fixed/30 border border-primary/15 flex items-center gap-3 ${className}`}>
      <span className="w-10 h-10 rounded-lg bg-surface-container-lowest text-soft-coral flex items-center justify-center shrink-0 shadow-sm">
        <FileText className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-on-surface leading-snug line-clamp-2 break-words">{doc.title}</p>
        <p className={`text-[11px] ${state === 'failed' ? 'text-error' : 'text-on-surface-variant'}`}>{state === 'failed' ? 'Couldn’t create the PDF. Try again.' : 'PDF document'}</p>
      </div>
      <button
        type="button"
        onClick={() => void download()}
        disabled={state === 'working'}
        className="px-3 py-2 rounded-full bg-vibrant-blue text-on-primary text-[12px] font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-60"
      >
        {state === 'working' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        Download
      </button>
    </div>
  )
}

/** "Save as PDF" under any answer, so a reply can be kept without asking for a PDF. */
function SaveAnswer({ question, answer }: { question: string | null; answer: string }) {
  const [working, setWorking] = useState(false)
  const save = async () => {
    setWorking(true)
    try {
      const { downloadPdf, answerToDoc } = await import('./pdf')
      await downloadPdf(answerToDoc(question, answer))
    } catch (err) {
      console.error('PDF download failed:', err)
    } finally {
      setWorking(false)
    }
  }
  return (
    <button
      type="button"
      onClick={() => void save()}
      disabled={working}
      className="mt-2 -mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant hover:text-vibrant-blue disabled:opacity-60"
    >
      {working ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
      Save as PDF
    </button>
  )
}
