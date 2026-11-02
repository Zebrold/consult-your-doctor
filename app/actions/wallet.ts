'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatINR } from '@/components/patient/format'
import { loadHospitalWallet, MIN_PAYOUT, type PayoutAccount } from '@/lib/wallet'

// Hospital wallets (lib/wallet.ts): a hospital admin keeps the bank account or UPI ID withdrawals are paid to and asks
// for a withdrawal; the operations team (executives) pays it and marks it paid, or rejects it, and records what a
// hospital pays in to settle a negative balance. Every call checks the caller's role against the database.

type Result = { ok: true; message?: string } | { ok: false; error: string }
const fail = (error: string): Result => ({ ok: false, error })
const NEEDS_UPDATE = 'Wallets need the latest database update (supabase/migrations/20261102_hospital_wallets.sql). Ask your administrator to run it.'

const missing = (error: { code?: string; message?: string } | null) =>
  !!error && (['42P01', 'PGRST205', '42703', 'PGRST204'].includes(error.code ?? '') || /hospital_payouts|hospital_wallet|payout_/.test(error.message ?? ''))

async function caller(role: 'hospital_admin' | 'executive') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== role) return null
  if (role === 'hospital_admin' && !profile.hospital_id) return null
  return { admin, userId: user.id, hospitalId: (profile.hospital_id as string | null) ?? null }
}

function refresh() {
  for (const path of ['/hospital/wallet', '/hospital/revenue', '/executive/wallets']) revalidatePath(path)
}

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/
const UPI = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/

/** Where the hospital's withdrawals are paid: a bank account (number and IFSC), a UPI ID, or both. */
export async function saveHospitalPayoutAccount(input: { name: string; accountNumber: string; ifsc: string; upiId: string }): Promise<Result> {
  const ctx = await caller('hospital_admin')
  if (!ctx?.hospitalId) return fail('Please log in with your hospital account.')
  const name = input.name.trim().replace(/\s+/g, ' ')
  const accountNumber = input.accountNumber.replace(/\s+/g, '')
  const ifsc = input.ifsc.trim().toUpperCase()
  const upiId = input.upiId.trim()
  if (name.length < 2 || name.length > 100) return fail('Enter the account holder’s name as the bank has it.')
  if (accountNumber && !/^\d{9,18}$/.test(accountNumber)) return fail('An account number is 9 to 18 digits.')
  if (accountNumber && !IFSC.test(ifsc)) return fail('Enter the branch’s IFSC, like HDFC0001234.')
  if (!accountNumber && ifsc) return fail('Enter the account number with the IFSC.')
  if (upiId && !UPI.test(upiId)) return fail('Enter a UPI ID like hospital@icici.')
  if (!accountNumber && !upiId) return fail('Enter a bank account or a UPI ID.')

  const { error } = await ctx.admin
    .from('hospitals')
    .update({ payout_account_name: name, payout_account_number: accountNumber || null, payout_ifsc: accountNumber ? ifsc : null, payout_upi_id: upiId || null })
    .eq('id', ctx.hospitalId)
  if (error) return fail(missing(error) ? NEEDS_UPDATE : 'Could not save the account. Please try again.')
  refresh()
  return { ok: true }
}

/** Asks for a withdrawal of the hospital's balance. One can wait at a time; it holds its amount until it is paid. */
export async function requestHospitalPayout(rawAmount: number): Promise<Result> {
  const ctx = await caller('hospital_admin')
  if (!ctx?.hospitalId) return fail('Please log in with your hospital account.')
  const amount = Math.round(Number(rawAmount) * 100) / 100
  if (!Number.isFinite(amount) || amount < MIN_PAYOUT) return fail(`The smallest withdrawal is ${formatINR(MIN_PAYOUT)}.`)

  const wallet = await loadHospitalWallet(ctx.admin, ctx.hospitalId, 1)
  if (!wallet.ready) return fail(NEEDS_UPDATE)
  if (!wallet.account) return fail('Add the bank account or UPI ID to pay withdrawals to first.')
  if (wallet.waiting > 0) return fail('A withdrawal is already waiting to be paid. You can ask for another once it is paid.')
  if (amount > wallet.available) return fail(`You can withdraw up to ${formatINR(wallet.available)}.`)

  const account: PayoutAccount = wallet.account
  const { error } = await ctx.admin.from('hospital_payouts').insert({ hospital_id: ctx.hospitalId, amount, account, requested_by: ctx.userId })
  if (error?.code === '23505') return fail('A withdrawal is already waiting to be paid.')
  if (error) return fail(missing(error) ? NEEDS_UPDATE : 'Could not ask for the withdrawal. Please try again.')
  refresh()
  return { ok: true, message: `Withdrawal of ${formatINR(amount)} requested. The Consult your Doctor team pays it to your account.` }
}

/** Withdraws a waiting withdrawal (before the team pays it). */
export async function cancelHospitalPayout(payoutId: string): Promise<Result> {
  const ctx = await caller('hospital_admin')
  if (!ctx?.hospitalId) return fail('Please log in with your hospital account.')
  const { data, error } = await ctx.admin
    .from('hospital_payouts')
    .update({ status: 'rejected', note: 'Cancelled by the hospital', processed_by: ctx.userId, processed_at: new Date().toISOString() })
    .eq('id', payoutId)
    .eq('hospital_id', ctx.hospitalId)
    .eq('status', 'requested')
    .select('id')
  if (error) return fail(missing(error) ? NEEDS_UPDATE : 'Could not cancel the withdrawal.')
  if (!data?.length) return fail('This withdrawal is no longer waiting; it may have been paid already.')
  refresh()
  return { ok: true }
}

/** The team has sent the money: records the bank or UPI reference and marks the withdrawal paid. */
export async function markPayoutPaid(payoutId: string, rawReference: string): Promise<Result> {
  const ctx = await caller('executive')
  if (!ctx) return fail('Only the operations team can pay withdrawals.')
  const reference = rawReference.trim().toUpperCase()
  if (!/^[A-Z0-9-]{6,40}$/.test(reference)) return fail('Enter the bank or UPI reference (UTR) of the transfer.')
  const { data, error } = await ctx.admin
    .from('hospital_payouts')
    .update({ status: 'paid', reference, processed_by: ctx.userId, processed_at: new Date().toISOString() })
    .eq('id', payoutId)
    .eq('status', 'requested')
    .select('id')
  if (error) return fail(missing(error) ? NEEDS_UPDATE : 'Could not mark it paid.')
  if (!data?.length) return fail('This withdrawal is no longer waiting.')
  refresh()
  return { ok: true }
}

/** Turns a withdrawal down; its amount goes back to the hospital's balance. */
export async function rejectPayout(payoutId: string, rawNote: string): Promise<Result> {
  const ctx = await caller('executive')
  if (!ctx) return fail('Only the operations team can review withdrawals.')
  const note = rawNote.trim()
  if (note.length < 5) return fail('Say why, so the hospital knows what to fix.')
  const { data, error } = await ctx.admin
    .from('hospital_payouts')
    .update({ status: 'rejected', note: note.slice(0, 500), processed_by: ctx.userId, processed_at: new Date().toISOString() })
    .eq('id', payoutId)
    .eq('status', 'requested')
    .select('id')
  if (error) return fail(missing(error) ? NEEDS_UPDATE : 'Could not reject it.')
  if (!data?.length) return fail('This withdrawal is no longer waiting.')
  refresh()
  return { ok: true }
}

/**
 * Records a payment into a hospital's wallet (positive: the hospital paid what it owed) or a correction out of it
 * (negative), with the reason.
 */
export async function recordWalletAdjustment(input: { hospitalId: string; amount: number; note: string }): Promise<Result> {
  const ctx = await caller('executive')
  if (!ctx) return fail('Only the operations team can adjust wallets.')
  const amount = Math.round(Number(input.amount) * 100) / 100
  const note = input.note.trim()
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) return fail('Enter an amount: positive adds to the wallet, negative takes from it.')
  if (note.length < 5) return fail('Write what this is for (for example the hospital’s transfer reference).')
  const { data: hospital } = await ctx.admin.from('hospitals').select('id').eq('id', input.hospitalId).maybeSingle()
  if (!hospital) return fail('Hospital not found.')
  const { error } = await ctx.admin.from('hospital_wallet_adjustments').insert({ hospital_id: input.hospitalId, amount, note: note.slice(0, 500), created_by: ctx.userId })
  if (error) return fail(missing(error) ? NEEDS_UPDATE : 'Could not record it.')
  refresh()
  return { ok: true }
}

