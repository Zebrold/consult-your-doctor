import { after } from 'next/server'

/**
 * Runs a notification once the response has been sent (next/server after(): on Vercel the function stays up until it
 * finishes), so a slow mail server never holds up the person who clicked. Failures are logged, never thrown.
 */
export function later(label: string, task: () => Promise<unknown>) {
  after(async () => {
    try {
      await task()
    } catch (err) {
      console.error(`notify ${label}:`, err)
    }
  })
}
