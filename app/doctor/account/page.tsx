import type { Metadata } from 'next'
import { StaffAccount } from '@/components/portal/StaffAccount'
import { requireDoctor } from '../_lib/doctor'
import { DeskHead, DocBackHeader, DocBody } from '../_components/doc-ui'

export const metadata: Metadata = { title: 'Login details | Doctor Portal' }
export const dynamic = 'force-dynamic'

/** The doctor's own login: name, mobile number, Staff ID and password (they can change the password at any time). */
export default async function DoctorAccountPage() {
  const { admin, user } = await requireDoctor()
  // staff_id and phone_number are only readable with the admin client (20261031 column grants).
  const { data: me } = await admin.from('profiles').select('full_name, phone_number, staff_id').eq('id', user.id).maybeSingle()

  return (
    <>
      <DocBackHeader backHref="/doctor/profile" backLabel="Back to profile" title="Login details" />
      <DocBody>
        <DeskHead title="Login details" subtitle="Your name, mobile number, Staff ID and password" />
        <StaffAccount name={me?.full_name ?? ''} phone={me?.phone_number ?? null} staffId={me?.staff_id ?? null} roleLabel="Doctor" />
      </DocBody>
    </>
  )
}
