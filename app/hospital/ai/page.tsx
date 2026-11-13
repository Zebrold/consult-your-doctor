import type { Metadata } from 'next'
import { AssistantPage } from '@/components/assistant/AssistantPage'
import { requireHospital } from '../_lib/hospital'
import { HosBody } from '../_components/hos-ui'

export const metadata: Metadata = {
  title: 'Help & support',
}

// The section layout checks who is signed in; the assistant's API checks the session again on every message.
export default async function HospitalAiPage() {
  const { user, staff } = await requireHospital()
  return (
    <HosBody>
      <AssistantPage role="hospital_admin" viewer={user.id} name={staff.name} />
    </HosBody>
  )
}
