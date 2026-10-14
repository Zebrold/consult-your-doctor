'use client'

import { useEffect } from 'react'

/**
 * Shown when the root layout itself fails (app/error.tsx covers everything below it). It replaces the whole
 * document and gets none of the site's styles, so it carries its own.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: '#f8fafc', color: '#0f172a' }}>
        <title>Something went wrong | Consult Your Doctor</title>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 16px' }}>
          <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#2563eb' }}>Something went wrong</p>
            <h1 style={{ margin: '8px 0 0', fontSize: 28, lineHeight: 1.2 }}>The site didn’t load</h1>
            <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.6, color: '#475569' }}>
              It’s usually a brief connection problem. Try again, and if it keeps happening, contact our support team.
            </p>
            {error.digest && <p style={{ margin: '12px 0 0', fontSize: 12, color: '#94a3b8' }}>Reference: {error.digest}</p>}
            <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => retry()}
                style={{ border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Try again
              </button>
              {/* A plain link: the app's router may be what failed. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" style={{ borderRadius: 8, border: '1px solid #cbd5e1', color: '#334155', padding: '10px 20px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Go to home page
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
