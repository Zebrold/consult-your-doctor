import type { Metadata } from 'next'
import { PageHeader } from '../_components/ui'
import { requireExecutive } from '../_lib/ops'
import { getExecutivePayments } from '@/app/actions/payments'
import { ExecutivePaymentsClient } from './ExecutivePaymentsClient'

export const metadata: Metadata = { title: 'Payment Management' }

export default async function ExecutivePaymentsPage() {
  await requireExecutive()
  const { transactions, stats } = await getExecutivePayments()

  return (
    <>
      <PageHeader
        eyebrow="Financial Operations"
        title="Executive Panel — Payment Management"
        description="Comprehensive ledger of online PayU, UPI QR, and desk collections. Reconcile transactions, issue traceable refunds, and audit revenue flow across hospitals and diagnostic centres."
      />

      <ExecutivePaymentsClient initialTransactions={transactions} stats={stats} />
    </>
  )
}
