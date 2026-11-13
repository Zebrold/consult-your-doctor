import type { createAdminClient } from '@/lib/supabase/admin'
import { doctorBookingFee, type BookingFees } from '@/lib/pricing'
import { isOnlineGateway } from '@/lib/payment-gateways'

type Admin = ReturnType<typeof createAdminClient>

// Hospital wallets (supabase/migrations/20261102_hospital_wallets.sql).
//
// Every hospital visit has two parts: the booking fee, which is Consult your Doctor's, and the hospital's charges (the
// consultation fee and any services). Whoever takes the money holds both parts until they are settled:
//   * Online payments (Razorpay) and the desk's UPI scanner pay Consult your Doctor's account. The hospital's part of that payment is
//     credited to the hospital's wallet.
//   * Cash stays with the hospital. Consult your Doctor's part of it (the booking fee) is debited from the wallet, which
//     can go below zero: the hospital then owes that amount.
// A hospital withdraws a positive balance to its bank account; an executive pays it and marks it paid. The wallet is
// worked out from the payments themselves, so a refunded payment drops out of it.

/** Payment gateways whose money lands in Consult your Doctor's account. Everything else (cash) stays with the hospital. */
export const PLATFORM_HELD = ['razorpay', 'upi_qr']

/** Below this a withdrawal isn't worth a bank transfer. */
export const MIN_PAYOUT = 100

/** What a payment is made of: Consult your Doctor's part and the hospital's part. */
export type Shares = { platform: number; hospital: number }

/** The booking fee an appointment was booked at; bookings from before the fee was stored use today's fee. */
export function appointmentBookingFee(row: { booking_fee?: number | string | null; booking_type?: string | null }, fees: BookingFees): number {
  const stored = row.booking_fee == null ? NaN : Number(row.booking_fee)
  return Number.isFinite(stored) ? stored : doctorBookingFee(fees, row.booking_type)
}

const WALLET_COLUMNS = ['platform_share', 'hospital_share', 'method', 'hospital_id']

const missingColumn = (error: { code?: string; message?: string } | null) =>
  !!error && (['42703', 'PGRST204'].includes(error.code ?? '') || /platform_share|hospital_share|method|schema cache/i.test(error.message ?? ''))

/**
 * Inserts a payment row. On a database that hasn't had the wallet migration yet, the row is saved without the wallet
 * columns rather than lost.
 */
export async function insertPaymentRow(admin: Admin, row: Record<string, unknown>) {
  const first = await admin.from('payments').insert(row)
  if (!missingColumn(first.error)) return first
  const plain = Object.fromEntries(Object.entries(row).filter(([key]) => !WALLET_COLUMNS.includes(key)))
  return admin.from('payments').insert(plain)
}

/** The columns that say whose money a payment is. */
export const shareColumns = (hospitalId: string | null, shares: Shares, method?: string | null) => ({
  ...(hospitalId ? { hospital_id: hospitalId } : {}),
  platform_share: Math.round(shares.platform * 100) / 100,
  hospital_share: Math.round(shares.hospital * 100) / 100,
  ...(method ? { method } : {}),
})

export type PayoutAccount = { name: string; accountNumber: string | null; ifsc: string | null; upiId: string | null }

export type WalletEntry = {
  id: string
  kind: 'collection' | 'cash_booking_fee' | 'adjustment' | 'payout'
  /** Positive adds to the wallet, negative takes from it. */
  amount: number
  createdAt: string
  appointmentId: string | null
  gateway: string | null
  reference: string | null
  /** For a withdrawal: requested, paid or rejected. */
  status: string | null
  note: string | null
}

export type Payout = {
  id: string
  amount: number
  status: 'requested' | 'paid' | 'rejected'
  account: PayoutAccount
  reference: string | null
  note: string | null
  createdAt: string
  processedAt: string | null
}

export type HospitalWallet = {
  /** False until the wallet migration has run. */
  ready: boolean
  /** Everything credited, less everything debited and withdrawn (a waiting withdrawal included). Can be negative. */
  balance: number
  /** Withdrawals waiting to be paid. */
  waiting: number
  /** What can be withdrawn now. */
  available: number
  entries: WalletEntry[]
  payouts: Payout[]
  account: PayoutAccount | null
}

const money = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100

const missingTable = (error: { code?: string; message?: string } | null) =>
  !!error && (['42P01', 'PGRST205', '42703', 'PGRST204'].includes(error.code ?? '') || /hospital_wallet|hospital_payouts|payout_/i.test(error.message ?? ''))

export function toAccount(raw: unknown): PayoutAccount | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  const name = String(a.name ?? a.payout_account_name ?? '').trim()
  const accountNumber = String(a.accountNumber ?? a.payout_account_number ?? '').trim() || null
  const ifsc = String(a.ifsc ?? a.payout_ifsc ?? '').trim() || null
  const upiId = String(a.upiId ?? a.payout_upi_id ?? '').trim() || null
  if (!name || !(upiId || (accountNumber && ifsc))) return null
  return { name, accountNumber, ifsc, upiId }
}

/** "•••• 4821" for an account number, so the full number is only shown where it is needed to pay. */
export const maskAccount = (n: string | null) => (n ? `•••• ${n.slice(-4)}` : null)

/** A hospital's wallet: balance, its lines (newest first) and withdrawals. */
export async function loadHospitalWallet(admin: Admin, hospitalId: string, limit = 200): Promise<HospitalWallet> {
  const empty: HospitalWallet = { ready: false, balance: 0, waiting: 0, available: 0, entries: [], payouts: [], account: null }

  const [balanceRes, entriesRes, payoutsRes, hospitalRes] = await Promise.all([
    admin.from('hospital_wallet_balances').select('balance, waiting').eq('hospital_id', hospitalId).maybeSingle(),
    admin.from('hospital_wallet_ledger').select('*').eq('hospital_id', hospitalId).order('created_at', { ascending: false }).limit(limit),
    admin.from('hospital_payouts').select('*').eq('hospital_id', hospitalId).order('created_at', { ascending: false }).limit(50),
    admin.from('hospitals').select('payout_account_name, payout_account_number, payout_ifsc, payout_upi_id').eq('id', hospitalId).maybeSingle(),
  ])
  if ([balanceRes.error, entriesRes.error, payoutsRes.error, hospitalRes.error].some(missingTable)) return empty

  const balance = money(balanceRes.data?.balance)
  const waiting = money(balanceRes.data?.waiting)
  type EntryRow = { entry_id: string; kind: WalletEntry['kind']; amount: number | string; created_at: string; appointment_id: string | null; gateway: string | null; reference: string | null; status: string | null; note: string | null }
  type PayoutRow = { id: string; amount: number | string; status: Payout['status']; account: unknown; reference: string | null; note: string | null; created_at: string; processed_at: string | null }

  return {
    ready: true,
    balance,
    waiting,
    available: Math.max(0, balance),
    entries: ((entriesRes.data ?? []) as EntryRow[]).map((e) => ({
      id: e.entry_id,
      kind: e.kind,
      amount: money(e.amount),
      createdAt: e.created_at,
      appointmentId: e.appointment_id,
      gateway: e.gateway,
      reference: e.reference,
      status: e.status,
      note: e.note,
    })),
    payouts: ((payoutsRes.data ?? []) as PayoutRow[]).map((p) => ({
      id: p.id,
      amount: money(p.amount),
      status: p.status,
      account: toAccount(p.account) ?? { name: 'Unknown', accountNumber: null, ifsc: null, upiId: null },
      reference: p.reference,
      note: p.note,
      createdAt: p.created_at,
      processedAt: p.processed_at,
    })),
    account: toAccount(hospitalRes.data),
  }
}

/** Every hospital's balance and waiting withdrawals, for the operations team. Null until the migration has run. */
export async function loadWalletBalances(admin: Admin): Promise<Map<string, { balance: number; waiting: number }> | null> {
  const { data, error } = await admin.from('hospital_wallet_balances').select('hospital_id, balance, waiting')
  if (missingTable(error)) return null
  const map = new Map<string, { balance: number; waiting: number }>()
  for (const r of (data ?? []) as { hospital_id: string; balance: number | string; waiting: number | string }[]) {
    map.set(r.hospital_id, { balance: money(r.balance), waiting: money(r.waiting) })
  }
  return map
}

/** What a wallet line is, in a few words. */
export function entryLabel(e: Pick<WalletEntry, 'kind' | 'gateway' | 'status'>): string {
  if (e.kind === 'collection') return isOnlineGateway(e.gateway) ? 'Paid online' : 'UPI at your desk'
  if (e.kind === 'cash_booking_fee') return 'Booking fee on a cash payment'
  if (e.kind === 'payout') return e.status === 'paid' ? 'Withdrawn to your bank' : 'Withdrawal requested'
  return 'Adjustment'
}
