import { Metadata } from 'next'
import { MapPin } from 'lucide-react'
import { TopBar } from '@/components/portal/TopBar'
import { TopBarChip } from '@/components/portal/TopBarChip'
import { requireExecutive } from './_lib/ops'
import { ExecutiveDock } from './_components/ExecutiveDock'

export const metadata: Metadata = {
  title: 'Executive Operations',
}

export default async function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireExecutive()

  return (
    <div className="min-h-screen bg-slate-50 font-body-md text-on-surface">
      <TopBar
        homeHref="/executive/dashboard"
        section="Executive Operations"
        person={{ name: profile.fullName, role: 'Executive' }}
        chips={profile.hospitalName && <TopBarChip icon={MapPin}>{profile.hospitalName}</TopBarChip>}
        container="max-w-[1560px] px-margin-x-mobile lg:px-margin-x-desktop"
      />
      <ExecutiveDock />

      <main className="max-w-[1560px] mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-4 md:pt-6 pb-dock flex flex-col gap-6 md:gap-stack-lg">
        {children}
      </main>

    </div>
  )
}
