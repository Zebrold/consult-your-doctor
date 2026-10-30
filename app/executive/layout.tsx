import { Metadata } from 'next'
import { FileText, MapPin } from 'lucide-react'
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
    <div className="min-h-screen flex flex-col bg-slate-50 font-body-md text-on-surface">
      <TopBar
        homeHref="/executive/dashboard"
        section="Executive Operations"
        person={{ name: profile.fullName, role: 'Executive' }}
        links={[{ href: '/executive/policies', label: 'Policies & templates', icon: <FileText /> }]}
        chips={profile.hospitalName && <TopBarChip icon={MapPin}>{profile.hospitalName}</TopBarChip>}
        container="max-w-[1560px] px-margin-x-mobile lg:px-margin-x-desktop"
      />
      <ExecutiveDock />

      <main className="flex-1 w-full max-w-[1560px] mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-4 md:pt-6 pb-12 md:pb-16 flex flex-col gap-6 md:gap-stack-lg">
        {children}
      </main>

    </div>
  )
}
