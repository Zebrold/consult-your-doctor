// The executive Support desk's rules: how soon a ticket needs its first reply, and suggested replies by category.
// Plain values, safe in the browser. Change the hours here to change every deadline shown.

export type TicketPriorityKey = 'urgent' | 'high' | 'medium' | 'low'

/** Hours to the first reply, by priority. */
export const FIRST_REPLY_HOURS: Record<TicketPriorityKey, number> = { urgent: 1, high: 4, medium: 24, low: 72 }

const HOUR = 3_600_000

/** "45 min", "3 h", "2 days" */
export function span(ms: number) {
  const m = Math.max(1, Math.round(Math.abs(ms) / 60_000))
  if (m < 60) return `${m} min`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h`
  return `${Math.round(h / 24)} days`
}

export type Deadline = { label: string; late: boolean; due: number | null }

/**
 * Where a ticket stands against its first-reply deadline: "Reply due in 18 min", "Overdue by 1 h", "Replied in 42 min",
 * or nothing to do while it waits for the requester or is closed.
 */
export function replyDeadline(t: { priority: string; status: string; createdAt: string }, firstReplyAt: string | null, now: number): Deadline {
  const hours = FIRST_REPLY_HOURS[(t.priority as TicketPriorityKey) in FIRST_REPLY_HOURS ? (t.priority as TicketPriorityKey) : 'medium']
  const created = Date.parse(t.createdAt)
  const due = created + hours * HOUR
  if (firstReplyAt) return { label: `Replied in ${span(Date.parse(firstReplyAt) - created)}`, late: Date.parse(firstReplyAt) > due, due: null }
  if (t.status === 'resolved' || t.status === 'closed') return { label: 'Closed without a reply', late: false, due: null }
  if (t.status === 'awaiting_response') return { label: 'Waiting for them', late: false, due: null }
  return now > due ? { label: `Overdue by ${span(now - due)}`, late: true, due } : { label: `Reply due in ${span(due - now)}`, late: false, due }
}

/** Suggested replies by ticket category. Only what the product really does; edit before sending. */
export const SUGGESTED_REPLIES: { category: string; label: string; text: string }[] = [
  {
    category: 'refund',
    label: 'Refund being checked',
    text: 'Thank you for writing to us. We are checking the payment on your booking now. Refunds go back to the card, UPI or bank account you paid from, and your bank decides how soon it shows. We will update you here as soon as it is done.',
  },
  {
    category: 'payment',
    label: 'Payment being checked',
    text: 'Thank you for writing to us. We are checking this payment with our payment partner and will update you here. You don’t need to pay again in the meantime.',
  },
  {
    category: 'booking',
    label: 'Booking being checked',
    text: 'Thank you for writing to us. We are checking your booking with the hospital and will update you here shortly. Your booking ID is on your booking slip if the hospital asks for it.',
  },
  {
    category: 'payout',
    label: 'Withdrawal being checked',
    text: 'Thank you for letting us know. We are checking this withdrawal. Once the transfer is made we will mark it paid on your Payouts page with the transfer reference (UTR), so your bank can trace it.',
  },
  {
    category: 'login',
    label: 'Login help',
    text: 'Staff log in with their staff ID and password on their login page. If the password doesn’t work, use “Forgot password” there: a reset link goes to the email address on the account. If there is no email on the account, reply here and we will help.',
  },
  {
    category: 'badge',
    label: 'Badge being checked',
    text: 'Thank you for your patience. A paid badge shows once our team has checked the medical registration with the council and the photo ID. We will update you here as soon as the check is done.',
  },
  {
    category: 'other',
    label: 'We’re on it',
    text: 'Thank you for writing to us. We are looking into this and will update you here shortly.',
  },
]

/** The suggested replies for a ticket's category, the general one last. */
export function repliesFor(category: string) {
  const c = category.toLowerCase()
  return [...SUGGESTED_REPLIES.filter((r) => c.includes(r.category)), ...SUGGESTED_REPLIES.filter((r) => r.category === 'other')]
}
