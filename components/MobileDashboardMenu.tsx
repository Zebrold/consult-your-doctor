'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function MobileDashboardMenu({ children, footer }: { children: React.ReactNode, footer?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close the menu automatically when the route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="p-2 text-gray-600 hover:text-gray-900 transition-colors md:hidden cursor-pointer"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay and Drawer Container */}
      <div 
        className={`fixed inset-0 z-[100] flex md:hidden transition-all duration-300 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        <div 
          className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" 
          onClick={() => setIsOpen(false)} 
        />
        <div 
          className={`relative w-72 max-w-[80vw] bg-white h-full flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <span className="font-bold text-gray-900">Menu</span>
            <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto" onClick={() => setIsOpen(false)}>
            {children}
          </div>
          {footer && (
            <div className="p-4 border-t border-gray-100 mt-auto">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
