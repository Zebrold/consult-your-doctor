import type { Metadata } from 'next'
import { AssistantPage } from '@/components/assistant/AssistantPage'
import { requireExecutivePage } from '../_lib/ops'
import { WorkBody } from '../_components/ui'

export const metadata: Metadata = {
  title: 'Zebrold AI',
}

// The section layout checks who is signed in; the assistant's API checks the session again on every message.
export default async function ExecutiveAiPage() {
  const { user, profile } = await requireExecutivePage('ai')
  return (
    <WorkBody>
      <AssistantPage role="executive" viewer={user.id} name={profile.fullName} />
    </WorkBody>
  )
}
