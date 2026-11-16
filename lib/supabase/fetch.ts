// The fetch every server-side Supabase client uses (lib/supabase/server.ts, admin.ts, the proxy, the public lists).
//
// Plain fetch has no time limit. When a connection to Supabase stalls (a dropped keep-alive socket on a reused server
// instance, a slow moment at the API gateway), the request waits until the function itself is killed, minutes later:
// the page stays on its skeleton and a sign-in button stays on "Logging in…". With a limit, a stalled read is sent once
// more, and anything else fails with an error the page can show.
//
// Reads (GET and HEAD: selects, counts, getUser, storage downloads) are safe to repeat. Writes (POST, PATCH, DELETE:
// inserts, updates, RPCs, sign-in, token refresh, uploads) may already have happened, so they are never repeated.

const READ_TIMEOUT_MS = 15_000
const WRITE_TIMEOUT_MS = 30_000

export const serverFetch: typeof fetch = async (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const read = method === 'GET' || method === 'HEAD'
  // The global fetch is looked up on each call, so Next.js's own fetch handling still applies.
  const attempt = (ms: number) => {
    const limit = AbortSignal.timeout(ms)
    return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, limit]) : limit })
  }
  if (!read) return attempt(WRITE_TIMEOUT_MS)
  try {
    return await attempt(READ_TIMEOUT_MS)
  } catch (err) {
    // The caller cancelled it on purpose: don't send it again.
    if (init?.signal?.aborted) throw err
    console.warn(`[supabase] a read took over ${READ_TIMEOUT_MS / 1000}s or failed; trying once more:`, err instanceof Error ? err.message : err)
    return attempt(READ_TIMEOUT_MS)
  }
}
