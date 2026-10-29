// How a consultation was paid, as the finance page and its ledger name it. Kept out of the ledger's client module so
// the server page can read the labels too.

export type LedgerMethod = 'online' | 'upi' | 'cash' | 'other'

export const METHOD_LABEL: Record<LedgerMethod, string> = { online: 'Booked online, fee at counter', upi: 'UPI scanner', cash: 'Cash at desk', other: 'Paid at desk' }
