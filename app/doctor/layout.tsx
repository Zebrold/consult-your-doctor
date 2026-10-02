import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { doctorName } from '@/components/patient/format'
import { PortalDock, PortalMobileHeader } from '@/components/portal/PortalNav'
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
    redirect('/')
  }

  const { doctor } = await requireDoctor()

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      <PortalMobileHeader
        portal="doctor"
        name={doctorName(doctor.name)}
        subtitle="Doctor portal"
        image={doctor.image}
        profileHref="/doctor/profile"
        extraLink={{ href: `/doctors/${doctor.id}`, label: 'My public profile' }}
      />
      <main className="w-full max-w-[1440px] mx-auto px-4 lg:px-margin-x-desktop pt-4 md:pt-6 pb-28 md:pb-32 flex flex-col gap-4 md:gap-stack-md">
        {children}
      </main>
      <PortalDock portal="doctor" />
    </div>
  )
}
