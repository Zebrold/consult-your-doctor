import Link from 'next/link'
import Image from 'next/image'
import { Headset, LogOut, UserCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { MobileDashboardMenu } from '@/components/MobileDashboardMenu'
import { MainNav } from '@/components/MainNav'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
    profile = data
  }

  const mainNavLinks = <MainNav mobile />

  return (
    <header className="w-full bg-white flex flex-col border-b border-gray-200 transition-colors">
      {/* Top Bar */}
      <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between py-3 px-4 md:px-8">
        {/* Logo Area */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo.png" alt="Consult your Doctor Logo" width={200} height={50} className="h-10 md:h-10 w-auto object-contain" priority />
          </Link>
        </div>

        {/* Actions Area */}
        <div className="flex items-center gap-2 md:gap-6">
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 font-medium">
            <Headset className="w-5 h-5" />
            <span>24/7 Support</span>
          </div>

          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            {user ? (
              <div className="flex items-center gap-2 md:gap-4">
                {profile?.role === 'patient' && (
                  <Link
                    href="/patient/dashboard"
                    className="px-3 md:px-4 py-2 bg-emerald-600 text-white text-xs md:text-sm font-bold rounded-full hover:bg-emerald-700 transition-colors"
                  >
                    My Appointments
                  </Link>
                )}
                <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                  <UserCircle2 className="w-5 h-5 text-[#E31E24]" />
                  <span>Hello, {profile?.full_name || 'Patient'}</span>
                </div>
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full cursor-pointer text-xs md:text-sm font-semibold text-gray-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </form>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 md:px-5 py-2 border border-gray-300 rounded-full cursor-pointer text-xs md:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors inline-block whitespace-nowrap"
                >
                  Login
                </Link>
                <Link
                  href="/login/patient?type=signup"
                  className="px-4 md:px-5 py-2 bg-[#E31E24] rounded-full text-xs md:text-sm font-semibold text-white hover:bg-red-700 transition-colors inline-block whitespace-nowrap"
                >
                  Register
                </Link>
              </>
            )}
            <div className="ml-1 md:hidden">
              <MobileDashboardMenu>{mainNavLinks}</MobileDashboardMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="w-full border-t border-gray-100 hidden md:block">
        <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between py-3 px-4 md:px-8">
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-gray-700">
            <MainNav />
          </nav>

          <Link
            href="/#book-consultation-form"
            className="px-6 py-2.5 bg-[#E31E24] rounded text-sm font-semibold text-white hover:bg-red-700 transition-colors ml-auto lg:ml-0"
          >
            Book Appointment
          </Link>
        </div>
      </div>
    </header>
  )
}
