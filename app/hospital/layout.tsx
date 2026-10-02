import type { Metadata } from 'next'
import { PortalDock, PortalMobileHeader } from '@/components/portal/PortalNav'
import { requireHospital } from './_lib/hospital'

export const metadata: Metadata = {
  title: 'Hospital Portal',
}

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  const { hospital } = await requireHospital()

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      <PortalMobileHeader portal="hospital" name={hospital.name} subtitle="Hospital portal" image={hospital.image} profileHref="/hospital/dashboard" />
      <main className="w-full max-w-[1440px] mx-auto px-4 lg:px-margin-x-desktop pt-4 md:pt-6 pb-28 md:pb-32 flex flex-col gap-4 md:gap-stack-md">
        {children}
      </main>
      <PortalDock portal="hospital" />
    </div>
  )
}
