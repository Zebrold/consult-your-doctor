'use client'

import { useState } from 'react'
import { InlineAuthModal } from './InlineAuthModal'
import { useRouter } from 'next/navigation'

export function HeaderAuthButtons() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    setIsOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 md:px-7 py-2 md:py-2.5 bg-[var(--color-secondary)] rounded-full text-xs md:text-sm font-bold text-[var(--color-on-secondary)] hover:opacity-90 transition-all shadow-sm whitespace-nowrap"
      >
        <span className="hidden md:inline">Login / Register</span>
      </button>

      {isOpen && (
        <InlineAuthModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
