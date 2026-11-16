import type { Metadata } from 'next'
import { AssistantPage } from '@/components/assistant/AssistantPage'
import { requireExecutivePage } from '../_lib/ops'
import { DeskHead, WorkBody } from '../_components/ui'

export const metadata: Metadata = {
  title: 'Care Assistant',
}

// The section layout checks who is signed in; the assistant's API checks the session again on every message.
export default async function ExecutiveAiPage() {
  const { user, profile } = await requireExecutivePage('ai')
  return (
    <WorkBody>
      <DeskHead title="Care Assistant" subtitle="Find doctors with open slots, labs and test prices, and get help with walk-ins and desk payments" />
      <AssistantPage role="executive" viewer={user.id} name={profile.fullName} titled />
    </WorkBody>
  )
}
