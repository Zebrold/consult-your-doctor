import Link from 'next/link'
import Image from 'next/image'
import { Headset, LogOut, UserCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { MobileDashboardMenu } from '@/components/MobileDashboardMenu'
import { MainNav } from '@/components/MainNav'
import { HeaderAuthButtons } from '@/components/HeaderAuthButtons'

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
    <header className="w-full bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-[var(--color-surface-variant)] transition-colors">
      <div className="max-w-[1280px] mx-auto w-full flex items-center justify-between py-4 px-4 md:px-10">
        {/* Left: Logo Area */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center shrink-0 gap-2">
            <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
              stethoscope
            </span>
            <span className="text-[var(--color-primary)] text-xl font-bold tracking-tight hidden sm:block">Consult Your Doctor</span>
          </Link>
        </div>

        {/* Center: Navigation (Desktop) */}
        <nav className="hidden lg:flex items-center justify-center gap-6 text-sm font-semibold text-gray-700 flex-1">
          <MainNav />
        </nav>

        {/* Right: Actions Area */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2 md:gap-4">
              {profile?.role === 'patient' && (
                <Link
                  href="/patient/dashboard"
                  className="px-4 py-2 bg-[var(--color-secondary)] text-[var(--color-on-secondary)] text-sm font-bold rounded-full hover:opacity-90 transition-opacity"
                >
                  Dashboard
                </Link>
              )}
              <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-[var(--color-on-surface)] bg-[var(--color-surface-container-low)] px-4 py-2 rounded-full border border-[var(--color-surface-variant)]">
                <UserCircle2 className="w-5 h-5 text-[var(--color-primary)]" />
                <span>Hello, {profile?.full_name || 'Patient'}</span>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-[var(--color-surface-container-lowest)] hover:bg-[var(--color-surface-variant)] border border-[var(--color-surface-variant)] rounded-full cursor-pointer text-sm font-semibold text-[var(--color-on-surface)] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </form>
            </div>
          ) : (
            <HeaderAuthButtons />
          )}
          <div className="ml-1 lg:hidden">
            <MobileDashboardMenu>{mainNavLinks}</MobileDashboardMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
