import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="w-full bg-[#1A2C46] text-white py-12 md:py-16">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-8 lg:gap-4">
          {/* Logo & Description Column */}
          <div className="lg:col-span-2 space-y-4 pr-0 lg:pr-8">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <Image src="/logo.png" alt="Consult your Doctor Logo" width={180} height={45} className="h-9 w-auto object-contain" priority />
            </Link>
            <p className="text-gray-300 text-sm leading-relaxed">
              Your personal healthcare concierge. We connect patients with top doctors, hospitals and executives with complete support.
            </p>
          </div>

          {/* Company Column */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white tracking-wide whitespace-nowrap">Company</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">About Us</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Careers</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Blog</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Press & Media</Link></li>

            </ul>
          </div>

          {/* For Patients Column */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white tracking-wide whitespace-nowrap">For Patients</h3>
            <ul className="space-y-3">
              <li><Link href="/search" className="text-gray-300 hover:text-white transition-colors text-sm">Find Doctors</Link></li>
              <li><Link href="/search?type=hospital" className="text-gray-300 hover:text-white transition-colors text-sm">Find Hospitals</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Health Check Packages</Link></li>
              <li><Link href="/diagnostics" className="text-gray-300 hover:text-white transition-colors text-sm">Diagnostics</Link></li>

            </ul>
          </div>

          {/* For Hospitals Column */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white tracking-wide whitespace-nowrap">For Hospitals</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">List Your Hospital</Link></li>
              <li><Link href="/login/hospital" className="text-gray-300 hover:text-white transition-colors text-sm">Hospital Login</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Resource Center</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Partnerships</Link></li>
            </ul>
          </div>

          {/* For Doctors Column & Policies combined for space, or just keep it 6 cols as defined in grid */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white tracking-wide whitespace-nowrap">For Doctors</h3>
            <ul className="space-y-3">
              <li><Link href="/login/doctor" className="text-gray-300 hover:text-white transition-colors text-sm">Doctor Login</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Benefits</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Resources</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Support</Link></li>
            </ul>
          </div>

          {/* For Executives Column */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white tracking-wide whitespace-nowrap">For Executives</h3>
            <ul className="space-y-3">
              <li><Link href="/login/executive" className="text-gray-300 hover:text-white transition-colors text-sm">Executive Login</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">How It Works</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Benefits</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Support</Link></li>
            </ul>
          </div>

          {/* For Diagnostics Column */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white tracking-wide whitespace-nowrap">For Diagnostics</h3>
            <ul className="space-y-3">
              <li><Link href="/login/diagnostic" className="text-gray-300 hover:text-white transition-colors text-sm">Center Login</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">How It Works</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Benefits</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Support</Link></li>
            </ul>
          </div>
          
          {/* Policies Column (Need to increase grid cols to 7 if we want 2 col span for first, or 1 col span for all. Current is 6 cols: 2 + 1 + 1 + 1 + 1 = 6) */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-white tracking-wide whitespace-nowrap">Policies</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Privacy Policy</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Terms of Use</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Refund Policy</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors text-sm">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        
        {/* Footer Bottom */}
        <div className="mt-12 pt-8 border-t border-gray-700/50 flex flex-col md:flex-row items-center justify-between text-gray-400 text-xs">
          <p>&copy; {new Date().getFullYear()} Consult Your Doctor. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
