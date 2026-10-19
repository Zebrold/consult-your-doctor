import type { Metadata } from 'next'
import { PageHeader } from '../_components/ui'
import { requireExecutive } from '../_lib/ops'
import { getExecutivePayments } from '@/app/actions/payments'
import { getBookingFees } from '@/lib/booking-fees'
import { BookingFeeManager } from '../_components/BookingFeeManager'
import { ExecutivePaymentsClient } from './ExecutivePaymentsClient'

export const metadata: Metadata = { title: 'Payment Management' }

export default async function ExecutivePaymentsPage() {
  await requireExecutive()
  const [{ transactions, stats }, fees] = await Promise.all([
    getExecutivePayments(),
    getBookingFees(),
  ])

  return (
    <>
      <PageHeader
        eyebrow="Financial Operations"
        title="Executive Panel — Payment Management"
        description="Comprehensive ledger of online PayU, UPI QR, and desk collections. Reconcile transactions, issue traceable refunds, and set the online booking fees."
      />

      <BookingFeeManager initialFees={fees} />

      <ExecutivePaymentsClient initialTransactions={transactions} stats={stats} />
    </>
  )
}

