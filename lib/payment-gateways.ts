// Which payments were made online. Patients pay their booking fee online through Razorpay. Desks take 'cash' and
// 'upi_qr'. Plain data, safe in the browser.
//
// The few payments made before 2026-11-13 went through the previous gateway and are stored as LEGACY_ONLINE_GATEWAY.
// They are real online payments, so they count as "paid online" everywhere (booking pages, slips, the hospital ledger,
// executive reports). This is the only place that value is named; the previous gateway's code is gone.

/** The gateway new online payments are recorded under. */
export const ONLINE_GATEWAY = 'razorpay'

const LEGACY_ONLINE_GATEWAY = 'payu'

/** Every gateway value that means "paid online". */
export const ONLINE_GATEWAYS = [ONLINE_GATEWAY, LEGACY_ONLINE_GATEWAY]

export const isOnlineGateway = (gateway: string | null | undefined): boolean => gateway === ONLINE_GATEWAY || gateway === LEGACY_ONLINE_GATEWAY

/** The gateway to look labels up by: every online payment as 'razorpay', desk payments as they are. */
export const gatewayKey = (gateway: string | null | undefined): string => (isOnlineGateway(gateway) ? ONLINE_GATEWAY : (gateway ?? ''))

/** The provider's name shown beside the method ("UPI · Razorpay"); null for payments made before Razorpay. */
export const gatewayName = (gateway: string | null | undefined) => (gateway === ONLINE_GATEWAY ? 'Razorpay' : null)
