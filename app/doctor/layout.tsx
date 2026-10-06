import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { doctorName } from '@/components/patient/format'
import { CircleUserRound, ExternalLink, MapPin } from 'lucide-react'
import { PortalDock } from '@/components/portal/PortalNav'
import { TopBar } from '@/components/portal/TopBar'
import { TopBarChip } from '@/components/portal/TopBarChip'
import { requireDoctor } from './_lib/doctor'

export const metadata: Metadata = {
  title: 'Doctor Portal',
}

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/doctor')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'doctor') {
    redirect('/auth/signout?next=/login/doctor')
  }

  const { doctor } = await requireDoctor()

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      <TopBar
        homeHref="/doctor/dashboard"
        section="Doctor Portal"
        person={{ name: doctorName(doctor.name), role: doctor.specialty || 'Doctor', image: doctor.image }}
        chips={doctor.hospital && <TopBarChip icon={MapPin}>{doctor.hospital.name}</TopBarChip>}
        links={[
          { href: '/doctor/profile', label: 'My profile', icon: <CircleUserRound /> },
          { href: `/doctors/${doctor.id}`, label: 'My public profile', icon: <ExternalLink /> },
        ]}
      />
      <main className="w-full max-w-[1440px] mx-auto px-4 lg:px-margin-x-desktop pt-4 md:pt-6 pb-28 md:pb-32 flex flex-col gap-4 md:gap-stack-md">
        {children}
      </main>
      <PortalDock portal="doctor" />
    </div>
  )
}
