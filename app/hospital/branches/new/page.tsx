import type { Metadata } from 'next'
import { requireHospital } from '../../_lib/hospital'
import { BranchForm } from '../../_components/BranchForm'
import { DeskHead, HosBackHeader, HosBody } from '../../_components/hos-ui'

export const metadata: Metadata = { title: 'Add a branch | Hospital Portal' }
export const dynamic = 'force-dynamic'

/** Asks the team to list a new branch; once approved, this login can switch to it from Accounts & branches. */
export default async function NewBranchPage() {
  const { admin, user, hospital, staff } = await requireHospital()
  const { data: me } = await admin.from('profiles').select('email, phone_number').eq('id', user.id).maybeSingle()
  const subtitle = 'Our team checks the branch’s documents, then lists it. You can switch to it with this login once it’s live.'
  return (
    <>
      <HosBackHeader backHref="/hospital/branches" backLabel="Back to branches" title="Add a branch">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle}</p>
      </HosBackHeader>
      <HosBody className="lg:max-w-[820px]">
        <DeskHead title="Add a branch" subtitle={subtitle} />
        <BranchForm defaults={{ name: hospital.name, city: hospital.city ?? '', contactName: staff.name, phone: (me?.phone_number as string | null) ?? '', email: '' }} />
      </HosBody>
    </>
  )
}
