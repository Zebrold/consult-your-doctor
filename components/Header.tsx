'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Smartphone, Headset } from 'lucide-react'
import { AuthModal } from './AuthModal'

export function Header() {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; type: 'login' | 'signup' }>({
    isOpen: false,
    type: 'login'
  })

  return (
    <>
      <header className="w-full bg-white flex flex-col border-b border-gray-200 transition-colors">
      {/* Top Bar */}
      <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between py-3 px-4 md:px-8">
        {/* Logo Area */}
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="Consult your Doctor Logo" width={200} height={50} className="h-10 w-auto object-contain" priority />
        </Link>

        {/* Actions Area */}
        <div className="flex items-center gap-6">
          {/* <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 font-medium">
            <Smartphone className="w-5 h-5" />
            <span>Download App</span>
          </div> */}
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 font-medium">
            <Headset className="w-5 h-5" />
            <span>24/7 Support</span>
          </div>

          <div className="flex items-center gap-3 ml-2">
            <button
              onClick={() => setAuthModal({ isOpen: true, type: 'login' })}
              className="px-5 py-2 border border-gray-300 rounded-full cursor-pointer text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => setAuthModal({ isOpen: true, type: 'signup' })}
              className="px-5 py-2 bg-[#E31E24] rounded text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Register
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="w-full border-t border-gray-100">
        <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between py-3 px-4 md:px-8">
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-gray-700">
            <Link href="/" className="text-[#E31E24]">Home</Link>
            <Link href="#" className="hover:text-[#E31E24] transition-colors">Find Doctors</Link>
            <Link href="#" className="hover:text-[#E31E24] transition-colors">Hospitals</Link>
            <Link href="#" className="hover:text-[#E31E24] transition-colors">Health Check Packages</Link>
            <Link href="#" className="hover:text-[#E31E24] transition-colors">Diagnostics</Link>
            <Link href="#" className="hover:text-[#E31E24] transition-colors">Medical Tourism</Link>
            <Link href="#" className="hover:text-[#E31E24] transition-colors">Corporate Health</Link>
            <Link href="#" className="hover:text-[#E31E24] transition-colors">About Us</Link>
            <Link href="#" className="hover:text-[#E31E24] transition-colors">Contact Us</Link>
          </nav>

          <Link
            href="#"
            className="px-6 py-2.5 bg-[#E31E24] rounded text-sm font-semibold text-white hover:bg-red-700 transition-colors ml-auto lg:ml-0"
          >
            Book Appointment
          </Link>
        </div>
      </div>
    </header>
      <AuthModal 
        isOpen={authModal.isOpen} 
        initialType={authModal.type} 
        onClose={() => setAuthModal(prev => ({ ...prev, isOpen: false }))} 
        key={authModal.isOpen ? 'open' : 'closed'}
      />
    </>
  )
}
