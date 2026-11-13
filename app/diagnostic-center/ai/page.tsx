import type { Metadata } from 'next'
import { AssistantPage } from '@/components/assistant/AssistantPage'
import { requireLab } from '../_lib/lab'

export const metadata: Metadata = {
  title: 'Help & support',
}

// The section layout checks who is signed in; the assistant's API checks the session again on every message.
export default async function DiagnosticCenterAiPage() {
  const { user, staff } = await requireLab()
  return <AssistantPage role="diagnostic_admin" viewer={user.id} name={staff.name} />
}
