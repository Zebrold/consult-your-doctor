import type { Metadata } from 'next'
import { AssistantPage } from '@/components/assistant/AssistantPage'
import { requireHospital } from '../_lib/hospital'

export const metadata: Metadata = {
  title: 'Zebrold AI',
}

// The section layout checks who is signed in; the assistant's API checks the session again on every message.
export default async function HospitalAiPage() {
  const { user } = await requireHospital()
  return <AssistantPage role="hospital_admin" viewer={user.id} />
}
