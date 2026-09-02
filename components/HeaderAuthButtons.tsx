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
        className="px-4 md:px-5 py-2 bg-[#E31E24] rounded-full text-xs md:text-sm font-semibold text-white hover:bg-red-700 transition-colors inline-flex items-center gap-2 whitespace-nowrap shadow-sm"
      >
        <span className="hidden md:inline">Login</span>
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
