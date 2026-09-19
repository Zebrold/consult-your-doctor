import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Hospital Portal',
}
import { createClient } from '@/lib/supabase/server'
import { HospitalPortalNav } from '@/components/HospitalPortalNav'

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/hospital')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (profile?.role !== 'hospital_admin') {
    redirect('/')
  }

  // Get hospital name
  const { data: hospital } = await supabase.from('hospitals').select('name').eq('id', profile.hospital_id).single()


  return (
    <HospitalPortalNav
      hospitalName={hospital?.name || 'Hospital Admin'}
      adminName={profile.full_name}
    >
      {children}
    </HospitalPortalNav>
  )
}
