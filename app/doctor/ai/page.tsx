import type { Metadata } from 'next'
import { AssistantPage } from '@/components/assistant/AssistantPage'
import { requireDoctor } from '../_lib/doctor'
import { DocBody } from '../_components/doc-ui'

export const metadata: Metadata = {
  title: 'Help & support',
}

// The section layout checks who is signed in; the assistant's API checks the session again on every message.
export default async function DoctorAiPage() {
  const { user, doctor } = await requireDoctor()
  return (
    <DocBody>
      <AssistantPage role="doctor" viewer={user.id} name={doctor.name} />
    </DocBody>
  )
}
