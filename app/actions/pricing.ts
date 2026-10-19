'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { requireExecutive } from '@/app/executive/_lib/ops'
import {
  BOOKING_FEES_TAG, MAX_CONSULTATION_BOOKING_FEE, getBookingFees, saveBookingFees, validConsultationBookingFee, validDiagnosticPercent,
} from '@/lib/booking-fees'
import type { BookingFees } from '@/lib/pricing'

/** The live booking fees, for client components that load their own data. They are public: every booking page shows them. */
export async function bookingFeesAction(): Promise<BookingFees> {
  return getBookingFees()
}

export async function updateBookingFeesAction(input: BookingFees): Promise<{ success: boolean; fees?: BookingFees; error?: string }> {
  try {
    await requireExecutive()

    // Server actions take any value from the browser, so the amounts are checked here and not only in the form.
    const consultation = Number(input?.consultation)
    const diagnosticPercent = Number(input?.diagnosticPercent)
    if (!validConsultationBookingFee(consultation)) {
      return { success: false, error: `The doctor booking fee must be a whole number of rupees from ₹0 to ₹${MAX_CONSULTATION_BOOKING_FEE.toLocaleString('en-IN')}.` }
    }
    if (!validDiagnosticPercent(diagnosticPercent)) {
      return { success: false, error: 'The lab booking fee must be a percentage from 0 to 100, with at most two decimals.' }
    }

    const fees: BookingFees = { consultation, diagnosticPercent }
    await saveBookingFees(fees)

    // Every page that shows a fee, and the PayU hash and callback, read it through this tag.
    updateTag(BOOKING_FEES_TAG)
    revalidatePath('/', 'layout')
    return { success: true, fees }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Could not save the booking fees.' }
  }
}
