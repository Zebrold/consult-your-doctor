// Shapes shared by the hospital and diagnostic centre desk actions and the desk dialogs.

export type DeskResult<T = object> = ({ ok: true } & T) | { ok: false; error: string }

/** Everything the payment step needs for one unpaid booking. */
export type DeskPayment = {
  kind: 'appointment' | 'diagnostic'
  id: string
  /** The short booking ID patients see. */
  code: string
  status: string
  /** "Consultation with Dr. …", "CBC, Lipid Profile", … */
  what: string
  patient: { name: string; phone: string | null; email: string | null }
  /** What the desk collects by scanner or cash. Desks don't take PayU: online it only collects patients' booking fees. */
  amounts: { desk: number }
  /** What the desk amount is made of: each test with its amount, or the consultation fee. */
  items: { label: string; amount: number }[]
  /** The UPI scanner code, when a UPI ID is configured. */
  upi: { vpa: string; uri: string; image: string } | null
}
