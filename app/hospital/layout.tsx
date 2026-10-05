import type { Metadata } from 'next'
import Link from 'next/link'
import { Hospital, LogOut } from 'lucide-react'
import { initials } from '@/components/patient/format'
import { PortalDock, PortalMobileHeader } from '@/components/portal/PortalNav'
import { requireHospital } from './_lib/hospital'

export const metadata: Metadata = {
  title: 'Hospital Portal',
}

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  const { hospital, staff } = await requireHospital()
  const live = hospital.status === 'active'

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      <PortalMobileHeader portal="hospital" name={hospital.name} subtitle="Hospital portal" image={hospital.image} profileHref="/hospital/dashboard" />
      <header className="hidden md:block sticky top-0 z-40 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,102,255,0.04)]">
        <div className="h-16 w-full max-w-[1440px] mx-auto px-4 lg:px-margin-x-desktop flex items-center justify-between gap-4">
          <Link href="/hospital/dashboard" className="flex items-center gap-stack-sm min-w-0">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-[0_2px_8px_rgba(0,80,203,0.25)] shrink-0">
              <Hospital className="w-5 h-5" />
            </span>
            <span className="flex flex-col min-w-0">
              <span className="font-title-md text-title-md font-bold tracking-tight text-on-surface leading-tight truncate">{hospital.name}</span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-fresh-teal font-semibold">Hospital Portal</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low">
              <span className={`w-2 h-2 rounded-full ${live ? 'bg-fresh-teal animate-pulse' : 'bg-soft-coral'}`} />
              <span className="font-label-sm text-label-sm text-indigo-gray-600">{live ? 'Live for Booking' : 'Not Listed'}</span>
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" title="Sign out" aria-label="Sign out" className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-gray-600 hover:text-error hover:bg-error-container/50 transition-colors">
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            </form>
            <span title={staff.name} className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-[12px] font-bold shadow-sm">
              {initials(staff.name)}
            </span>
          </div>
        </div>
      </header>
      <main className="w-full max-w-[1440px] mx-auto px-4 lg:px-margin-x-desktop pt-4 md:pt-6 pb-28 md:pb-32 flex flex-col gap-4 md:gap-stack-md">
        {children}
      </main>
      <PortalDock portal="hospital" />
    </div>
  )
}
