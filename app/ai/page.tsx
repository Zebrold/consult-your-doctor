import type { Metadata } from 'next'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { PatientDock } from '@/components/PatientDock'
import { PatientFooter } from '@/components/AppFooter'
import { AssistantPage } from '@/components/assistant/AssistantPage'

export const metadata: Metadata = {
  title: 'Care Assistant',
  description: 'Ask the Care Assistant to find doctors and labs, compare fees, open slots and test prices, and make PDFs.',
}

// The patients' Care Assistant, open to visitors too. Staff are kept to their own portal's AI page by the middleware.
export default async function AiPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  let name: string | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    name = profile?.full_name ?? user.user_metadata?.full_name ?? null
  }

  return (
    <div className="bg-white lg:bg-transparent text-[#0B1B3F] antialiased min-h-screen">
      <main className="w-full max-w-[1340px] lg:px-9 lg:pt-7 lg:pb-7">
        <AssistantPage role={user ? 'patient' : null} viewer={user?.id ?? null} />
      </main>
      <div className="hidden lg:block">
        <PatientFooter isSignedIn={!!user} />
      </div>
      <PatientDock activeTab="ai" isSignedIn={!!user} name={name} detail={user ? `UHID CYD-${user.id.slice(0, 8).toUpperCase()}` : null} />
    </div>
  )
}
