import { randomInt } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Registering a patient at a hospital or diagnostic centre desk: staff enter the patient's mobile number, Supabase
// texts the patient a one-time code (through the same send-otp hook as patient sign-in), the patient reads it out,
// and once it checks out the patient's account exists. The code is checked on a throwaway client that keeps no
// session, so the staff member stays signed in as themselves.

// The demo number and code used for patient sign-in work here too, for trying the desk flows without a text.
const DEMO_PHONE = '+919876543210'
const DEMO_CODE = '123456'

/** A 10-digit Indian mobile number (with or without +91 / 0) as "+91XXXXXXXXXX", or null. */
export function indianMobile(raw: string | null | undefined) {
  let digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null
}

function otpClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

type Outcome<T = object> = ({ ok: true } & T) | { ok: false; error: string }

/** Texts the patient a sign-in code. New numbers get an account when the code is confirmed. */
export async function sendPatientOtp(phone: string): Promise<Outcome> {
  if (phone === DEMO_PHONE) return { ok: true }
  const { error } = await otpClient().auth.signInWithOtp({ phone, options: { shouldCreateUser: true } })
  if (!error) return { ok: true }
  console.error('sendPatientOtp:', error)
  if (/rate|seconds|too many/i.test(error.message)) return { ok: false, error: 'A code was sent a moment ago. Wait a minute before sending another.' }
  return { ok: false, error: 'We couldn’t text the code just now. Check the number and try again in a minute.' }
}

/** Checks the code the patient read out. Returns the patient's user id. */
export async function verifyPatientOtp(admin: Admin, phone: string, code: string): Promise<Outcome<{ userId: string }>> {
  const token = code.replace(/\D/g, '')
  if (token.length < 4) return { ok: false, error: 'Enter the code the patient received.' }

  if (phone === DEMO_PHONE) {
    if (token !== DEMO_CODE) return { ok: false, error: 'That code is wrong or has expired. Send a new one.' }
    const { data } = await admin.from('profiles').select('id').in('phone_number', [phone, phone.slice(1)]).limit(1).maybeSingle()
    return data ? { ok: true, userId: data.id } : { ok: false, error: 'The demo patient account isn’t set up.' }
  }

  const client = otpClient()
  const { data, error } = await client.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error || !data.user) {
    return { ok: false, error: /expired|invalid/i.test(error?.message ?? '') ? 'That code is wrong or has expired. Send a new one.' : 'We couldn’t check the code. Please try again.' }
  }
  // The check signed the patient in on this throwaway client; end that session straight away.
  await client.auth.signOut({ scope: 'local' }).catch(() => {})
  return { ok: true, userId: data.user.id }
}

/**
 * Makes sure the patient has a patient profile. A new profile gets the name and email the desk entered; an existing
 * patient's details are left as they are, except that an email is added if they had none.
 */
export async function ensurePatientProfile(admin: Admin, userId: string, details: { name: string; phone: string; email?: string | null }): Promise<Outcome<{ created: boolean; name: string }>> {
  const { data: existing } = await admin.from('profiles').select('id, role, full_name, email').eq('id', userId).maybeSingle()
  if (existing && existing.role && existing.role !== 'patient') return { ok: false, error: 'This number belongs to a staff account, not a patient.' }

  const email = details.email?.trim().toLowerCase() || null
  if (existing) {
    const hasEmail = existing.email && !String(existing.email).endsWith('.internal')
    if (email && !hasEmail) await admin.from('profiles').update({ email }).eq('id', userId)
    return { ok: true, created: false, name: existing.full_name || details.name }
  }

  const { error } = await admin.from('profiles').insert({ id: userId, full_name: details.name, phone_number: details.phone, email, role: 'patient' })
  if (error) {
    console.error('ensurePatientProfile:', error)
    return { ok: false, error: 'Could not create the patient’s profile. Please try again.' }
  }
  return { ok: true, created: true, name: details.name }
}

// No 0/O, 1/l/I: these are read out and typed by hand.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

export function generatePassword(length = 10) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
}

/**
 * Gives the patient a Patient ID (kept if they already have one) and a new password, so they can sign in with
 * either. Returns both so the desk can hand them over.
 */
export async function issuePatientCredentials(admin: Admin, userId: string): Promise<Outcome<{ patientCode: string; password: string }>> {
  const { data: profile } = await admin.from('profiles').select('patient_code').eq('id', userId).maybeSingle()
  let patientCode: string | null = profile?.patient_code ?? null

  for (let attempt = 0; !patientCode && attempt < 8; attempt++) {
    const candidate = `PT${randomInt(100000, 1000000)}`
    const { data: taken } = await admin.from('profiles').select('id').eq('patient_code', candidate).maybeSingle()
    if (taken) continue
    const { error } = await admin.from('profiles').update({ patient_code: candidate }).eq('id', userId)
    if (!error) patientCode = candidate
    else if (error.code !== '23505') {
      console.error('issuePatientCredentials code:', error)
      return { ok: false, error: /patient_code/.test(error.message) ? 'Patient IDs need the latest database update (supabase/migrations/20261008_desk_registration_reports.sql).' : 'Could not create the Patient ID.' }
    }
  }
  if (!patientCode) return { ok: false, error: 'Could not create a unique Patient ID. Please try again.' }

  // The demo patient keeps its known password, which the demo sign-in relies on.
  const { data: auth } = await admin.auth.admin.getUserById(userId)
  if (auth.user?.email === 'patient.demo@cyd.internal') return { ok: true, patientCode, password: 'Password123!' }

  const password = generatePassword()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) {
    console.error('issuePatientCredentials password:', error)
    return { ok: false, error: 'The Patient ID was created but the password couldn’t be set. Please try again.' }
  }
  return { ok: true, patientCode, password }
}
