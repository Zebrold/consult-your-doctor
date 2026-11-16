// Rules for a patient changing their own booking: when it can be cancelled, whether the booking fee is refunded, and when
// a doctor visit can be moved. Plain module (no server imports) so the page, the actions and the dialogs share one rule set.
// Policy (lib/assistant/knowledge.ts): cancel until the booking starts; cancelled at least 2 hours before, the online
// booking fee and convenience fee are refunded; later, the fee is kept. A visit can be moved once, up to 2 hours before.

export const CHANGE_CUTOFF_MS = 2 * 60 * 60_000

type Start = { kind: 'visit'; slotStart: string | null } | { kind: 'lab'; day: string | null }

/** When the booking starts (ms). A lab booking has no time of day, so it starts at 00:00 IST on its visit day. */
export function bookingStart(b: Start): number | null {
  if (b.kind === 'visit') {
    if (!b.slotStart) return null
    const t = Date.parse(b.slotStart)
    return Number.isNaN(t) ? null : t
  }
  if (!b.day) return null
  const t = Date.parse(`${b.day.slice(0, 10)}T00:00:00+05:30`)
  return Number.isNaN(t) ? null : t
}

export type CancelTerms =
  | { allowed: true; refundDue: boolean; paid: 'online' | 'none' }
  | { allowed: false; reason: string }

export function cancelTerms(input: {
  status: string
  startsAt: number | null
  now: number
  online: boolean
  deskPaid: boolean
  lab?: boolean
}): CancelTerms {
  const { status, startsAt, now, online, deskPaid } = input
  if (status === 'cancelled') return { allowed: false, reason: 'This booking is already cancelled.' }
  if (status !== 'pending_payment' && status !== 'pending' && status !== 'confirmed') {
    return { allowed: false, reason: 'This booking can no longer be cancelled.' }
  }
  if (deskPaid) {
    return { allowed: false, reason: `This booking was paid at the ${input.lab ? 'lab' : 'hospital'} desk, so the desk can change it.` }
  }
  if (startsAt != null && now >= startsAt) return { allowed: false, reason: 'This booking has already started.' }
  if (status === 'confirmed' && online) {
    // Unknown start: be safe and treat it as inside the window (fee kept is disclosed before confirming).
    return { allowed: true, refundDue: startsAt != null && startsAt - now >= CHANGE_CUTOFF_MS, paid: 'online' }
  }
  return { allowed: true, refundDue: false, paid: 'none' }
}

export type RescheduleTerms = { allowed: true } | { allowed: false; reason: string; notReady?: true }

export function rescheduleTerms(input: {
  kind: 'visit' | 'lab'
  status: string
  startsAt: number | null
  now: number
  count: number | undefined
}): RescheduleTerms {
  if (input.kind === 'lab') return { allowed: false, reason: 'Lab bookings can’t be moved here.' }
  if (input.count === undefined) return { allowed: false, reason: 'Rescheduling opens after the next update.', notReady: true }
  if (input.status !== 'confirmed') return { allowed: false, reason: 'Only confirmed bookings can be moved.' }
  if (input.count >= 1) return { allowed: false, reason: 'You’ve already moved this booking once.' }
  if (input.startsAt == null || input.startsAt - input.now < CHANGE_CUTOFF_MS) {
    return { allowed: false, reason: 'Bookings can be moved up to 2 hours before the slot.' }
  }
  return { allowed: true }
}
