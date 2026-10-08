import type { Metadata } from 'next'
import { StaffAccount } from '@/components/portal/StaffAccount'
import { requireHospital } from '../_lib/hospital'

export const metadata: Metadata = { title: 'My Profile | Hospital Portal' }
export const dynamic = 'force-dynamic'

export default async function HospitalProfilePage() {
  const { admin, user, hospital } = await requireHospital()
  const { data: profile } = await admin.from('profiles').select('full_name, phone_number, staff_id').eq('id', user.id).maybeSingle()

  return (
    <>
      <section>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm uppercase tracking-wider">Staff profile</span>
        <h1 className="font-headline-lg text-[24px] md:text-headline-lg text-indigo-gray-900 font-bold tracking-tight mt-1.5">My Profile</h1>
        <p className="text-sm md:text-body-md text-indigo-gray-600">Your sign-in details for {hospital.name}.</p>
      </section>
      <StaffAccount name={profile?.full_name ?? ''} phone={profile?.phone_number ?? null} staffId={profile?.staff_id ?? null} roleLabel="Hospital admin" />
    </>
  )
}
