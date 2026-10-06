import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ASSISTANT_SYSTEM, contextNote } from '@/lib/assistant/knowledge'
import { assistantTools, type AssistantTool } from '@/lib/assistant/tools'
import type { PdfDoc } from '@/lib/assistant/pdf-doc'

// Zebrold AI: the Support chat on every page and each section's Zebrold AI page, running on Cloudflare Workers AI
// (which doesn't train on or reuse what it's sent). Streams newline-delimited JSON events to components/assistant/chat.tsx:
// {type:"status",text} | {type:"text",text} | {type:"pdf",pdf} | {type:"error",text} | {type:"done"}.

export const maxDuration = 60

const MODEL = process.env.CLOUDFLARE_AI_MODEL || '@cf/zai-org/glm-4.7-flash'
const MAX_TURNS = 20
const MAX_STEPS = 6

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(60),
  path: z.string().max(300).optional(),
  mode: z.enum(['support', 'assistant']).optional(),
})

// OpenAI-style chat messages, as Cloudflare's /ai/v1/chat/completions endpoint takes them.
type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string | Record<string, unknown> } }
type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

// A light per-address limit so the public endpoint can't be used to burn the daily allowance. It is per server
// instance; put a shared limiter (or the host's firewall rules) in front of it for heavy traffic.
const WINDOW_MS = 10 * 60_000
const LIMIT = 30
const hits = new Map<string, number[]>()
function overLimit(key: string) {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k)
  return recent.length > LIMIT
}

class UpstreamError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(`Workers AI ${status}: ${detail.slice(0, 300)}`)
  }
}

function friendly(err: unknown) {
  if (err instanceof UpstreamError) {
    if (err.status === 401 || err.status === 403) return 'Zebrold AI isn’t set up correctly yet. Please try again later.'
    if (err.status === 429 || /daily free allocation|neurons/i.test(err.detail)) {
      return 'Zebrold AI has used up today’s free allowance. Please try again tomorrow. Meanwhile you can [search for doctors](/search) or [book a lab test](/diagnostics).'
    }
    if (err.status >= 500) return 'Zebrold AI is busy right now. Please try again in a minute.'
  }
  if (err instanceof TypeError) return 'Couldn’t reach Zebrold AI. Please try again.'
  return 'Something went wrong. Please try again.'
}

/** Some models wrap private reasoning in <think> tags; never show it. */
const clean = (text: string | null | undefined) => (text ?? '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim()

async function complete(messages: ChatMessage[], tools: AssistantTool[], signal: AbortSignal) {
  // CLOUDFLARE_AI_BASE_URL can point at a Cloudflare AI Gateway (…/workers-ai/v1) for logs and caching.
  const base = process.env.CLOUDFLARE_AI_BASE_URL || `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`
  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })),
      tool_choice: 'auto',
      max_completion_tokens: 2500,
      temperature: 0.3,
      // Site help doesn't need long private reasoning; skipping it keeps answers fast and within the free allowance.
      chat_template_kwargs: { enable_thinking: false },
    }),
    signal,
  })
  const text = await res.text()
  if (!res.ok) throw new UpstreamError(res.status, text)
  let body: { choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] }; finish_reason?: string }[] }
  try {
    body = JSON.parse(text)
  } catch {
    throw new UpstreamError(502, text)
  }
  const message = body.choices?.[0]?.message
  if (!message) throw new UpstreamError(502, text)
  return message
}

export async function POST(request: Request) {
  // Only this site's pages may call the assistant.
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (origin && host && new URL(origin).host !== host) return Response.json({ error: 'forbidden' }, { status: 403 })

  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) return Response.json({ error: 'not_configured' }, { status: 503 })

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'local'
  if (overLimit(ip)) return Response.json({ error: 'rate_limited' }, { status: 429 })

  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad_request' }, { status: 400 })

  // The conversation must start and end with the visitor's message; keep only the recent turns.
  const turns = parsed.data.messages.slice(-MAX_TURNS)
  while (turns.length && turns[0].role !== 'user') turns.shift()
  if (!turns.length || turns[turns.length - 1].role !== 'user') return Response.json({ error: 'bad_request' }, { status: 400 })

  // Who is asking comes from the session cookie only.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  let role: string | null = null
  let firstName: string | null = null
  if (user) {
    const { data: profile } = await admin.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
    role = profile?.role ?? 'patient'
    firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: { type: string; text?: string; pdf?: PdfDoc }) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      const tools = assistantTools({ admin, patientId: user && role === 'patient' ? user.id : null, onPdf: (pdf) => send({ type: 'pdf', pdf }) })
      const byName = new Map(tools.map((t) => [t.name, t]))
      const messages: ChatMessage[] = [
        { role: 'system', content: `${ASSISTANT_SYSTEM}\n\n${contextNote({ role, firstName, path: parsed.data.path ?? '/', mode: parsed.data.mode ?? 'support', now: Date.now() })}` },
        ...turns.map((m) => ({ role: m.role, content: m.content })),
      ]

      try {
        let answered = false
        for (let step = 0; step < MAX_STEPS && !answered; step++) {
          const message = await complete(messages, tools, request.signal)
          const calls = message.tool_calls ?? []
          if (calls.length === 0) {
            const reply = clean(message.content)
            send({ type: 'text', text: reply || 'Sorry, I couldn’t answer that just now. Please try again.' })
            answered = true
            break
          }

          messages.push({ role: 'assistant', content: message.content ?? '', tool_calls: calls })
          for (const call of calls) {
            const t = byName.get(call.function?.name)
            if (t) send({ type: 'status', text: t.status })
            let result: string
            if (!t) {
              result = JSON.stringify({ error: `There is no tool named ${call.function?.name}.` })
            } else {
              // The model's arguments are untrusted: parse and validate before running anything.
              let args: unknown = call.function.arguments
              if (typeof args === 'string') {
                try {
                  args = args.trim() ? JSON.parse(args) : {}
                } catch {
                  args = null
                }
              }
              const valid = t.input.safeParse(t.prepare ? t.prepare(args ?? {}) : (args ?? {}))
              if (!valid.success) console.warn(`assistant tool ${t.name}: invalid arguments`, valid.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`))
              result = valid.success
                ? await t.run(valid.data as never).catch((err) => {
                    console.error(`assistant tool ${t.name}:`, err)
                    return JSON.stringify({ error: 'The tool failed. Tell the user to try again later.' })
                  })
                : JSON.stringify({ error: 'Invalid arguments', issues: valid.error.issues.slice(0, 5).map((i) => `${i.path.join('.') || '(input)'}: ${i.message}`) })
            }
            messages.push({ role: 'tool', tool_call_id: call.id, content: result })
          }
        }
        if (!answered) send({ type: 'text', text: 'Sorry, that took too many steps. Could you ask in a simpler way?' })
        send({ type: 'done' })
      } catch (err) {
        if (!request.signal.aborted) {
          console.error('assistant:', err)
          send({ type: 'error', text: friendly(err) })
        }
      } finally {
        try {
          controller.close()
        } catch {
          // The visitor closed the chat mid-reply; the stream is already gone.
        }
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  })
}
