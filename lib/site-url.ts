/** The live site, for links that leave the browser (emails, WhatsApp messages, PDFs, QR codes). */
export const CANONICAL_SITE_URL = 'https://consultyourdoctor.de'

const isLocalUrl = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(url)

/**
 * The site's public address. NEXT_PUBLIC_SITE_URL (or NEXT_PUBLIC_BASE_URL) wins, except that a localhost value is
 * ignored outside development: .env.local points at http://localhost:3000, and when that reached production every
 * sign-in, payment and email link sent people to localhost.
 *
 * Redirects for the person making a request should use that request's own address instead (new URL(path, request.url)
 * on the server, window.location.origin in the browser), so they always stay on the domain the person is using.
 */
export function siteUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '')
  if (configured && (process.env.NODE_ENV !== 'production' || !isLocalUrl(configured))) return configured
  return CANONICAL_SITE_URL
}
