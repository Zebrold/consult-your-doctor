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
  if (t.status === 'awaiting_response') return { label: 'Waiting for reply', late: false, due: null }
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

/** The categories a ticket raised for a caller can have. `label` is what's stored on the ticket. */
export const TICKET_CATEGORIES: { key: string; label: string }[] = [
  { key: 'booking', label: 'Booking' },
  { key: 'payment', label: 'Payment' },
  { key: 'refund', label: 'Refund' },
  { key: 'lab report', label: 'Lab report' },
  { key: 'prescription', label: 'Prescription' },
  { key: 'login', label: 'Login' },
  { key: 'payout', label: 'Payout' },
  { key: 'badge', label: 'Badge' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'other', label: 'Other' },
]

/** "Steps to solve" by category key. Only what the team really does in this product. */
export const SOLVE_STEPS: Record<string, string[]> = {
  refund: [
    'Find the payment on Payments',
    'Check the booking was cancelled or the visit did not happen',
    'Refund it from the Razorpay dashboard (online) or at the desk (cash or UPI)',
    'Record the refund on Payments (the patient gets the refund email)',
  ],
  payment: [
    'Find the payment on Payments',
    'Check its status in Razorpay',
    'Confirm the booking or record a refund',
    'Reply with what happened',
  ],
  booking: [
    'Find the booking by its booking ID',
    'Check its payment and status',
    'Ask the hospital or lab to fix or move it',
    'Confirm with the requester',
  ],
  payout: [
    'Open the withdrawal on Wallets',
    'Check the bank account or UPI ID',
    'Pay it, or reject it with a reason',
    'Share the transfer reference (UTR)',
  ],
  login: [
    'Check the staff ID and branch',
    'Send a set-password link (never a password)',
    'Confirm they can sign in',
  ],
  badge: [
    'Confirm the payment',
    'Run the checks on Verified badges',
    'Approve, or reject and refund',
    'Tell them the outcome',
  ],
  'lab report': [
    'Find the booking',
    'Ask the lab to upload the corrected file',
    'Confirm the patient sees it in Health records',
  ],
  prescription: [
    'Find the booking',
    'Ask the doctor to upload the corrected file',
    'Confirm the patient sees it in Health records',
  ],
  equipment: [
    'Open the order',
    'Get photos of the problem',
    'Arrange a replacement with the supplier',
    'Confirm delivery',
  ],
  other: [
    'Understand the request',
    'Fix it, or hand it to the right team',
    'Reply and resolve',
  ],
}

/** The steps for a ticket's category (matched like `repliesFor`, longest key first), each with a stable key. */
export function stepsFor(category: string): { key: string; label: string }[] {
  const c = category.toLowerCase()
  const match = Object.keys(SOLVE_STEPS)
    .filter((k) => k !== 'other')
    .sort((a, b) => b.length - a.length)
    .find((k) => c.includes(k))
  const cat = match ?? 'other'
  return SOLVE_STEPS[cat].map((label, i) => ({ key: `${cat}:${i}`, label }))
}
