import type { Metadata } from 'next'
import { requireHospital } from './_lib/hospital'
import { HospitalDock } from './_components/HospitalDock'

export const metadata: Metadata = {
  title: 'Hospital Portal',
}

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  const { hospital, staff } = await requireHospital()

  // The hospital workspace: the blue sidebar and white top bar on desktops, the tab bar on phones (HospitalDock), and
  // the pale app background behind every page.
  return (
    <div className="min-h-dvh bg-[#F6F8FC] lg:bg-[#F4F6FA] text-[#0B1B3F] font-(family-name:--font-manrope) antialiased lg:pl-[260px] lg:pt-[72px]">
      <HospitalDock hospital={{ id: hospital.id, name: hospital.name }} staff={{ name: staff.name }} />
      {children}
    </div>
  )
}
