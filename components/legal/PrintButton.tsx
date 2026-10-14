'use client'

import { Printer } from 'lucide-react'

export function PrintButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white/15 border border-white/30 text-white text-sm font-bold hover:bg-white/25 transition-colors ${className}`}
    >
      <Printer className="w-4 h-4" /> Print
    </button>
  )
}
