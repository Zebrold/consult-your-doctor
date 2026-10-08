'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Keeps a page's server data current without a reload: re-fetches every `seconds` while the tab is visible, and as
 * soon as someone comes back to the tab. Used where other people's changes matter right away, such as bed occupancy
 * on the hospital, doctor and patient pages.
 */
export function LiveRefresh({ seconds = 20, label = 'Live' }: { seconds?: number; label?: string }) {
  const router = useRouter()
  const [stamp, setStamp] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      router.refresh()
      setStamp(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }))
    }
    const timer = window.setInterval(refresh, Math.max(5, seconds) * 1000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [router, seconds])

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-secondary" title={stamp ? `Updated at ${stamp}` : `Updates every ${seconds} seconds`}>
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full rounded-full bg-fresh-teal opacity-60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-fresh-teal" />
      </span>
      {label}
    </span>
  )
}
