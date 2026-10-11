'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RotateCcw } from 'lucide-react'

/** Shown in place of a page that failed to load, instead of the browser's bare "Application error" screen. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-5 py-16">
      <div className="max-w-md w-full text-center">
        <p className="text-sm font-semibold text-vibrant-blue">Something went wrong</p>
        <h1 className="mt-2 font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">
          This page didn’t load
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          It’s usually a brief connection problem. Try again, and if it keeps happening, contact our support team.
        </p>
        {error.digest && <p className="mt-3 text-xs text-slate-400">Reference: {error.digest}</p>}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-vibrant-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Go to home page
          </Link>
        </div>
      </div>
    </div>
  )
}
