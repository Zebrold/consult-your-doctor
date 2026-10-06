import type { Metadata } from 'next'
import { Building2, LogOut, MapPin } from 'lucide-react'
import { PortalDock } from '@/components/portal/PortalNav'
import { TopBar } from '@/components/portal/TopBar'
import { TopBarChip } from '@/components/portal/TopBarChip'
import { requireLab } from './_lib/lab'

export const metadata: Metadata = {
  title: 'Diagnostic Center Portal',
}

export default async function DiagnosticCenterLayout({ children }: { children: React.ReactNode }) {
  const { lab, staff } = await requireLab()

  if (!lab) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl shadow-sm p-8 text-center flex flex-col items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </span>
          <h1 className="font-title-md text-title-md font-bold text-indigo-gray-900">Your account isn’t linked to a center yet</h1>
          <p className="text-sm text-indigo-gray-600">
            Signed in as {staff.email ?? staff.name}. Ask the Consult Your Doctor team to link this login to your diagnostic center, then sign in again.
          </p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="px-5 py-2.5 rounded-full bg-surface-container text-indigo-gray-900 text-sm font-semibold flex items-center gap-2 hover:bg-surface-container-high">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      <TopBar
        homeHref="/diagnostic-center/dashboard"
        section="Diagnostic Center"
        person={{ name: staff.name, role: 'Lab admin' }}
        links={[{ href: '/diagnostic-center/profile', label: 'Center profile', icon: <Building2 /> }]}
        chips={
          <TopBarChip icon={MapPin}>
            {lab.name}
            {lab.city ? `, ${lab.city}` : ''}
          </TopBarChip>
        }
      />
      <main className="w-full max-w-[1440px] mx-auto px-4 lg:px-margin-x-desktop pt-4 md:pt-6 pb-28 md:pb-32 flex flex-col gap-4 md:gap-stack-md">
        {children}
      </main>
      <PortalDock portal="lab" avatar={{ name: lab.name, image: lab.image }} />
    </div>
  )
}
