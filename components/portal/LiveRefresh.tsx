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
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-gray-600" title={stamp ? `Updated at ${stamp}` : `Updates every ${seconds} seconds`}>
      <span className="w-1.5 h-1.5 rounded-full bg-vibrant-blue shrink-0" aria-hidden />
      {label}
    </span>
  )
}
