import QRCode from 'qrcode'
import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Payments a hospital or diagnostic centre desk collects for a booking it made: PayU (the patient pays online on the
// desk's screen; the PayU callback records it), the UPI scanner (the patient scans a QR code for the exact amount and
// the desk enters the UPI reference once it arrives), or cash. Configure the scanner with UPI_VPA (the UPI ID that
// receives the money, e.g. zebrold@icici) and optionally UPI_PAYEE_NAME.

export type DeskMethod = 'upi_qr' | 'cash'
export type Booking = { kind: 'appointment' | 'diagnostic'; id: string }

export const scannerConfigured = () => Boolean(process.env.UPI_VPA)

/** A QR code (as a data URL) that opens any UPI app with the payee, amount and booking filled in. */
export async function upiQr(amount: number, bookingCode: string, note: string) {
  const vpa = process.env.UPI_VPA
  if (!vpa) return null
  const params = new URLSearchParams({
    pa: vpa,
    pn: process.env.UPI_PAYEE_NAME || 'Consult Your Doctor',
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note.slice(0, 50),
    tr: bookingCode,
  })
  // URLSearchParams writes spaces as "+", which some UPI apps show literally.
  const uri = `upi://pay?${params.toString().replace(/\+/g, '%20')}`
  return { vpa, uri, image: await QRCode.toDataURL(uri, { margin: 1, width: 320, errorCorrectionLevel: 'M' }) }
}

/** A UPI reference (UTR / RRN) as shown in the payer's app: 12 digits, sometimes letters and digits. */
export const validUpiReference = (ref: string) => /^[A-Za-z0-9]{8,30}$/.test(ref)

/**
 * Records a desk payment and confirms the booking. Only bookings still waiting for payment move to confirmed, so a
 * double click or a replay can't confirm twice or revive a cancelled booking.
 */
export async function recordDeskPayment(admin: Admin, booking: Booking, payment: { method: DeskMethod; amount: number; reference: string }) {
  const table = booking.kind === 'appointment' ? 'appointments' : 'diagnostic_bookings'
  const { data: moved, error: updateError } = await admin.from(table).update({ status: 'confirmed' }).eq('id', booking.id).eq('status', 'pending_payment').select('id')
  if (updateError) throw updateError
  if (!moved?.length) return { recorded: false as const }

  const { error } = await admin.from('payments').insert({
    // Only the column in use is sent, so a consultation paid in cash also saves on a database without the
    // diagnostic_booking_id column (UPI needs the 20261008 migration either way).
    ...(booking.kind === 'appointment' ? { appointment_id: booking.id } : { appointment_id: null, diagnostic_booking_id: booking.id }),
    amount: payment.amount,
    gateway: payment.method,
    transaction_id: payment.reference,
    status: 'success',
  })
  if (error) {
    // Put the booking back so the desk can try again rather than leave a confirmed booking with no payment.
    await admin.from(table).update({ status: 'pending_payment' }).eq('id', booking.id)
    throw error
  }
  return { recorded: true as const }
}

/** A Postgres error from a database that hasn't had the latest migration yet, explained for staff. */
export function migrationHint(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message ?? ''
  // 42P01 / PGRST205: no such table. 42703 / PGRST204: no such column.
  const missing = ['42P01', 'PGRST205', '42703', 'PGRST204'].includes(error?.code ?? '')
  if (missing || /invalid input value for enum|diagnostic_booking_id|patient_code|results|does not exist|schema cache/i.test(message)) {
    return 'The database needs the latest update first (run supabase/migrations/20261008_desk_registration_reports.sql, then 20261009_beds_reviews_profiles.sql). Ask your administrator to run them.'
  }
  return null
}
