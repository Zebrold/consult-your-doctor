'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

/** The header's back arrow: the page the visitor came from on this site, else `fallback`. */
export function AuthBack({ fallback }: { fallback: string }) {
  const router = useRouter()
  const back = () => {
    let fromHere = false
    try {
      fromHere = !!document.referrer && new URL(document.referrer).origin === window.location.origin
    } catch {}
    if (fromHere && window.history.length > 1) router.back()
    else router.push(fallback)
  }
  return (
    <button
      type="button"
      onClick={back}
      aria-label="Go back"
      className="relative z-10 -ml-2 w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition"
    >
      <ArrowLeft className="w-[26px] h-[26px]" strokeWidth={2.4} />
    </button>
  )
}
