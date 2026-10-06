import type { Metadata } from 'next'
import { AssistantPage } from '@/components/assistant/AssistantPage'

export const metadata: Metadata = {
  title: 'Zebrold AI',
}

// The section layout checks who is signed in; the assistant's API checks the session again on every message.
export default function HospitalAiPage() {
  return <AssistantPage role="hospital_admin" />
}
