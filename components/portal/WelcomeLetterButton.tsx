'use client'

import { useState, useTransition } from 'react'
import { FileDown, LoaderCircle } from 'lucide-react'
import { welcomeLetterPdf } from '@/app/actions/welcome-letter'

/**
 * Downloads the partner's welcome letter (details, login and first steps) right after their login is created, while
 * the temporary password is still on screen.
 */
export function WelcomeLetterButton({ username, password, className }: { username: string; password: string; className?: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const download = () =>
    start(async () => {
      const res = await welcomeLetterPdf({ username, password })
      if (!res.success) return setError(res.error)
      setError(null)
      const bytes = Uint8Array.from(atob(res.pdf), (c) => c.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    })

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={download}
        disabled={pending}
        className={className ?? 'w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60'}
      >
        {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        Download welcome letter (PDF)
      </button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
