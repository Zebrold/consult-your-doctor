import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AssistantPage } from '@/components/assistant/AssistantPage'

export const metadata: Metadata = {
  title: 'Zebrold AI',
}

// The section layout checks who is signed in; the assistant's API checks the session again on every message.
export default async function ExecutiveAiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <AssistantPage role="executive" viewer={user?.id ?? null} />
}
