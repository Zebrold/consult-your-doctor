import { Metadata } from 'next'
import Link from 'next/link'
import { LogOut, MapPin, Stethoscope } from 'lucide-react'
import { requireExecutive, initials } from './_lib/ops'
import { ExecutiveDock } from './_components/ExecutiveDock'

export const metadata: Metadata = {
  title: 'Executive Operations',
}

export default async function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireExecutive()

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface">
      <header className="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-[1560px] mx-auto px-margin-x-mobile lg:px-margin-x-desktop flex items-center justify-between gap-4">
          <Link href="/executive/dashboard" className="flex items-center gap-stack-sm min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container text-primary shrink-0">
              <Stethoscope className="w-5 h-5" />
            </span>
            <span className="flex flex-col min-w-0">
              <span className="font-title-md text-base sm:text-lg font-bold text-on-surface tracking-tight leading-tight truncate">Consult your Doctor</span>
              <span className="font-label-sm text-label-sm text-indigo-gray-600">Executive Operations</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {profile.hospitalName && (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-indigo-gray-900 font-label-sm text-label-sm">
                <MapPin className="w-3.5 h-3.5 text-vibrant-blue" />
                {profile.hospitalName}
              </span>
            )}
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-vibrant-blue text-on-primary flex items-center justify-center font-bold text-xs shrink-0">
                {initials(profile.fullName)}
              </span>
              <span className="hidden sm:flex flex-col leading-tight">
                <span className="font-label-sm text-label-sm font-bold text-indigo-gray-900">{profile.fullName}</span>
                <span className="font-label-sm text-[11px] text-indigo-gray-600">Executive</span>
              </span>
            </div>
            <form action="/auth/signout" method="post">
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-soft-coral hover:bg-soft-coral/10 font-label-sm text-label-sm transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-[1560px] mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-6 pb-32 flex flex-col gap-stack-lg">
        {children}
      </main>

      <ExecutiveDock />
    </div>
  )
}
