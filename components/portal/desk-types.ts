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
  /** desk: paid by scanner or cash. online: paid by PayU, which includes the platform fee. */
  amounts: { desk: number; online: number; platformFee: number }
  /** The UPI scanner code, when a UPI ID is configured. */
  upi: { vpa: string; uri: string; image: string } | null
  /** The PayU merchant key (public: it is posted to PayU's checkout), when PayU is configured. */
  payuKey: string | null
}
