import type { Metadata } from 'next'
import { PageHeader } from '../_components/ui'
import { requireExecutive } from '../_lib/ops'
import { getExecutiveTickets } from '@/app/actions/tickets'
import { ExecutiveTicketsClient } from './ExecutiveTicketsClient'

export const metadata: Metadata = { title: 'Help & Support — Ticket Management' }

export default async function ExecutiveSupportPage() {
  await requireExecutive()
  const { tickets, stats } = await getExecutiveTickets()

  return (
    <>
      <PageHeader
        eyebrow="Operations Support"
        title="Help & Support — Automated Ticket Management"
        description="Unified inbox for support requests across patients, clinicians, and hospital branches. Assign, reply to, track, and resolve user issues."
      />

      <ExecutiveTicketsClient initialTickets={tickets} stats={stats} />
    </>
  )
}
