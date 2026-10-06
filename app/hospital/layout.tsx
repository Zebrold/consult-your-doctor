import type { Metadata } from 'next'
import { Hospital } from 'lucide-react'
import { PortalDock } from '@/components/portal/PortalNav'
import { TopBar } from '@/components/portal/TopBar'
import { TopBarChip } from '@/components/portal/TopBarChip'
import { requireHospital } from './_lib/hospital'

export const metadata: Metadata = {
  title: 'Hospital Portal',
}

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  const { hospital, staff } = await requireHospital()
  const live = hospital.status === 'active'

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      <TopBar
        homeHref="/hospital/dashboard"
        section="Hospital Portal"
        person={{ name: staff.name, role: 'Hospital admin' }}
        chips={
          <>
            <TopBarChip icon={Hospital}>{hospital.name}</TopBarChip>
            <TopBarChip tone={live ? 'live' : 'off'}>{live ? 'Live for Booking' : 'Not Listed'}</TopBarChip>
          </>
        }
      />
      <main className="w-full max-w-[1440px] mx-auto px-4 lg:px-margin-x-desktop pt-4 md:pt-6 pb-28 md:pb-32 flex flex-col gap-4 md:gap-stack-md">
        {children}
      </main>
      <PortalDock portal="hospital" />
    </div>
  )
}
