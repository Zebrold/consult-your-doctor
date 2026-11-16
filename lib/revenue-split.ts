import { isFastTrack, type BookingFees } from '@/lib/pricing'
import { isOnlineGateway } from '@/lib/payment-gateways'
import { appointmentBookingFee } from '@/lib/wallet'

// The booking-fee split behind the executive Revenue page: of the successful payments in a period, how much is the
// General booking fee, the Fast track booking fee, the convenience fee on online doctor payments, and lab payments.
// A pure function, so it can be read and tested without a database.

export type SplitPayment = {
  amount: number | string | null
  refund_amount?: number | string | null
  gateway: string | null
  platform_share?: number | string | null
  appointment_id: string | null
  diagnostic_booking_id: string | null
}

export type SplitAppointment = { booking_fee?: number | string | null; booking_type?: string | null }

export type RevenueSplit = {
  general: { amount: number; bookings: number }
  fastTrack: { amount: number; bookings: number }
  /** The convenience fee paid on top of the booking fee, online doctor payments only. */
  convenience: { amount: number; payments: number }
  /**
   * Lab payments made online, whole (no lab booking fee is stored, so this includes each one's convenience fee), plus
   * the stored platform share of lab payments taken at a lab desk.
   */
  lab: { amount: number; bookings: number }
}

const num = (v: unknown) => Number(v) || 0

/**
 * Splits successful payments (pass only status 'success') into the fee kinds. Doctor bookings: the fee is the
 * appointment's booking fee (online: never more than what was paid); a desk payment counts its platform share when
 * stored, else the booking fee. Refunds recorded on a payment are taken off what was paid first.
 */
export function splitBookingFees(payments: SplitPayment[], appointmentsById: Map<string, SplitAppointment>, fees: BookingFees): RevenueSplit {
  const out: RevenueSplit = {
    general: { amount: 0, bookings: 0 },
    fastTrack: { amount: 0, bookings: 0 },
    convenience: { amount: 0, payments: 0 },
    lab: { amount: 0, bookings: 0 },
  }
  for (const p of payments) {
    const paid = Math.max(0, num(p.amount) - num(p.refund_amount))
    if (paid <= 0) continue

    if (!p.appointment_id) {
      if (p.diagnostic_booking_id) {
        // Online: the whole payment. At a lab desk the lab keeps its test price, so only the stored platform share counts.
        const stored = p.platform_share == null ? NaN : num(p.platform_share)
        const part = isOnlineGateway(p.gateway) ? paid : Number.isFinite(stored) ? Math.min(stored, paid) : 0
        if (part > 0) {
          out.lab.amount += part
          out.lab.bookings++
        }
      }
      continue
    }

    const appt = appointmentsById.get(p.appointment_id) ?? {}
    const booked = appointmentBookingFee(appt, fees)
    const online = isOnlineGateway(p.gateway)
    const stored = p.platform_share == null ? NaN : num(p.platform_share)
    const fee = online ? Math.min(booked, paid) : Number.isFinite(stored) ? Math.min(stored, paid) : Math.min(booked, paid)
    const bucket = isFastTrack(appt.booking_type) ? out.fastTrack : out.general
    if (fee > 0) {
      bucket.amount += fee
      bucket.bookings++
    }
    if (online) {
      const convenience = Math.max(0, paid - fee)
      if (convenience > 0) {
        out.convenience.amount += convenience
        out.convenience.payments++
      }
    }
  }
  return out
}
