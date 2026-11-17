import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { doctorName } from '@/components/patient/format'
import { requireDoctor } from './_lib/doctor'
import { DoctorDock } from './_components/DoctorDock'
import { FirstPassword } from '@/components/portal/FirstPassword'
import { hasTemporaryPassword } from '@/lib/temporary-password'

export const metadata: Metadata = {
  title: 'Doctor Portal',
}

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const user = await getCurrentUser()
  if (!user) redirect('/login/doctor')

  // The role check and the doctor's own record don't depend on each other, so fetch them together.
  const [{ data: profile }, { admin, doctor }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    requireDoctor(),
  ])
  if (profile?.role !== 'doctor') {
    redirect('/auth/signout?next=/login/doctor')
  }

  // A login made for the doctor starts on a temporary password: they choose their own before the portal opens.
  // getCurrentUser reads the account from Supabase Auth, so this clears as soon as they save it.
  if (hasTemporaryPassword(user)) {
    // staff_id is only readable with the admin client (20261031 column grants).
    const { data: me } = await admin.from('profiles').select('staff_id').eq('id', user.id).maybeSingle()
    return <FirstPassword name={doctorName(doctor.name)} staffId={(me?.staff_id as string | null) ?? null} portal="doctor portal" />
  }

  // The doctor workspace: the blue sidebar and white top bar on desktops, the tab bar on phones (DoctorDock), and the
  // pale app background behind every page.
  return (
    <div className="min-h-dvh bg-[#F6F8FC] lg:bg-[#F4F6FA] text-[#0B1B3F] font-(family-name:--font-manrope) antialiased lg:pl-[260px] lg:pt-[72px]">
      <DoctorDock doctor={{ id: doctor.id, name: doctorName(doctor.name), specialty: doctor.specialty, image: doctor.image }} />
      {children}
    </div>
  )
}
