const BASE = 'https://same-site.invalid'

/**
 * A path on this site to send someone to (the `next` of a sign-in link, an OAuth state), or `fallback`.
 *
 * Checking for a leading "/" is not enough: browsers read "//evil.com" and "/\evil.com" (and the same with tabs or
 * newlines mixed in) as another site, which turns a sign-in link into a phishing redirect.
 */
export function safeNextPath(next: unknown, fallback = '/'): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return fallback
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback
  try {
    const url = new URL(next, BASE)
    return url.origin === BASE ? `${url.pathname}${url.search}${url.hash}` : fallback
  } catch {
    return fallback
  }
}
