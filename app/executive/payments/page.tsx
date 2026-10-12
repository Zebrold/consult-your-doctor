import type { Metadata } from 'next'
import { PageHeader } from '../_components/ui'
import { requireExecutive } from '../_lib/ops'
import { getExecutivePayments } from '@/app/actions/payments'
import { getPlatformFees } from '@/lib/platform-fees'
import { PlatformFeeManager } from '../_components/PlatformFeeManager'
import { ExecutivePaymentsClient } from './ExecutivePaymentsClient'

export const metadata: Metadata = { title: 'Payment Management' }

export default async function ExecutivePaymentsPage() {
  await requireExecutive()
  const [{ transactions, stats }, fees] = await Promise.all([
    getExecutivePayments(),
    getPlatformFees(),
  ])

  return (
    <>
      <PageHeader
        eyebrow="Financial Operations"
        title="Executive Panel — Payment Management"
        description="Comprehensive ledger of online PayU, UPI QR, and desk collections. Reconcile transactions, issue traceable refunds, and configure live platform fees."
      />

      <PlatformFeeManager initialFees={fees} />

      <ExecutivePaymentsClient initialTransactions={transactions} stats={stats} />
    </>
  )
}

