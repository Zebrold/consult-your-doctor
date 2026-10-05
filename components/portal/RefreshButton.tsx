'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

/** Reloads the page's data (new bookings, check-ins) without a full reload. */
export function RefreshButton({
  label = 'Refresh',
  className = 'p-1.5 rounded-full text-indigo-gray-600 hover:text-indigo-gray-900 hover:bg-surface-container',
}: {
  label?: string
  className?: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={pending}
      onClick={() => start(() => router.refresh())}
      className={`${className} disabled:opacity-60`}
    >
      <RefreshCw className={`w-[18px] h-[18px] ${pending ? 'animate-spin' : ''}`} />
    </button>
  )
}
