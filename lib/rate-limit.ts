// Attempt limits for sign-in and public forms (staff and Patient ID passwords, password resets, support tickets,
// doctor applications). These calls reach Supabase from the server, so Supabase's own per-address limits count the
// server, not the visitor; without a limit here, passwords could be guessed as fast as requests can be sent.
//
// The counts live in this server instance's memory. Instances don't share them, so this slows a guesser down rather
// than stopping one outright; a rate-limit rule in the host's firewall (Vercel Firewall) on these pages adds a
// shared limit.

const hits = new Map<string, number[]>()

function prune(now: number) {
  if (hits.size < 10_000) return
  for (const [key, times] of hits) if (times.every((t) => now - t > 60 * 60_000)) hits.delete(key)
}

/** Records one attempt under `key`; true when there have been more than `limit` in the last `windowMs`. */
export function overLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  prune(now)
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  recent.push(now)
  hits.set(key, recent)
  return recent.length > limit
}

/** Forgets the attempts under `key` (after a successful sign-in). */
export function clearAttempts(key: string) {
  hits.delete(key)
}
