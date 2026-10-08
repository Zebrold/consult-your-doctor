import type { Metadata } from 'next'
import { AssistantPage } from '@/components/assistant/AssistantPage'
import { requireDoctor } from '../_lib/doctor'

export const metadata: Metadata = {
  title: 'Zebrold AI',
}

// The section layout checks who is signed in; the assistant's API checks the session again on every message.
export default async function DoctorAiPage() {
  const { user } = await requireDoctor()
  return <AssistantPage role="doctor" viewer={user.id} />
}
