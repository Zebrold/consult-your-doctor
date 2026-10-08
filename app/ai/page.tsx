import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PatientNavHeader } from '@/components/PatientNavHeader'
import { PatientDock } from '@/components/PatientDock'
import { AssistantPage } from '@/components/assistant/AssistantPage'

export const metadata: Metadata = {
  title: 'Zebrold AI',
  description: 'Ask Zebrold AI to find doctors and labs, compare fees, open slots and test prices, and make PDFs.',
}

// The patients' Zebrold AI tab, open to visitors too. Staff are kept to their own portal's AI page by the middleware.
export default async function AiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let name: string | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    name = profile?.full_name ?? user.user_metadata?.full_name ?? null
  }

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen">
      <PatientNavHeader name={name} email={user?.email ?? null} isSignedIn={!!user} />
      <main className="w-full max-w-[1240px] mx-auto px-margin-x-mobile lg:px-12 pt-2 md:pt-6 pb-28 md:pb-32">
        <AssistantPage role={user ? 'patient' : null} viewer={user?.id ?? null} />
      </main>
      <PatientDock activeTab="ai" isSignedIn={!!user} name={name} />
    </div>
  )
}
