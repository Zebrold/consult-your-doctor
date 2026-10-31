// PayU transaction ids. Each checkout sends PayU an id made of the booking's id and a short suffix, so a retry after a
// failure (or a second attempt in another tab) never reaches PayU under an id it has already seen. The hash route and
// the callback read the booking's id back out of it. Used on the server and in the browser, so no Node-only imports here.

const BOOKING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A new transaction id for one checkout of this booking. */
export function newPayuTxnid(bookingId: string): string {
  return `${bookingId}-${Math.random().toString(36).slice(2, 8)}`
}

/** The booking id a PayU transaction id belongs to (the id itself, for an id made before the suffix existed). */
export function bookingIdOf(txnid: string): string {
  const head = txnid.slice(0, 36)
  return BOOKING_ID.test(head) ? head : txnid
}
