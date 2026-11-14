import type { Metadata } from 'next'
import { requireExecutive } from './_lib/ops'
import { ExecutiveDock } from './_components/ExecutiveDock'
import { TEAM_LABEL } from './_lib/access'

export const metadata: Metadata = {
  title: 'Executive workspace',
}

export default async function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  const { profile, access } = await requireExecutive()

  // The executive workspace after the DeskExe* exports: the blue sidebar and white top bar on desktops, the tab bar on
  // phones (ExecutiveDock), and the pale desk background behind every page.
  return (
    <div className="min-h-dvh bg-[#F6F8FC] lg:bg-[#F4F6FA] text-[#0B1B3F] font-(family-name:--font-manrope) antialiased lg:pl-[260px] lg:pt-[72px]">
      <ExecutiveDock person={{ name: profile.fullName, team: access.ready ? TEAM_LABEL[access.team] : (profile.hospitalName ?? 'Executive') }} access={access} />
      {children}
    </div>
  )
}
