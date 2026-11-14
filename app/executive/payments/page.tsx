import type { Metadata } from 'next'
import { requireExecutivePage } from '../_lib/ops'
import { getExecutivePayments } from '@/app/actions/payments'
import { getBookingFees } from '@/lib/booking-fees'
import { BookingFeeManager } from '../_components/BookingFeeManager'
import { ExePage } from '../_components/ui'
import { ExecutivePaymentsClient } from './ExecutivePaymentsClient'

export const metadata: Metadata = { title: 'Payments' }

/** Payments after DeskExePayments: the online booking fees, then every payment with refunds and corrections. */
export default async function ExecutivePaymentsPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { profile } = await requireExecutivePage('payments')
  const params = (await props.searchParams) ?? {}
  const [{ transactions, stats }, fees] = await Promise.all([getExecutivePayments(), getBookingFees()])

  return (
    <ExePage name={profile.fullName} title="Payments" subtitle="Online payments, UPI QR and desk collections. Reconcile, refund and set booking fees">
      <BookingFeeManager initialFees={fees} />
      <ExecutivePaymentsClient initialTransactions={transactions} stats={stats} initialQuery={(params.q ?? '').slice(0, 100)} />
    </ExePage>
  )
}
