import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import type { createAdminClient } from '@/lib/supabase/admin'
import { findAuthUserId } from '@/lib/auth-users'
import { DEMO_CODE, DEMO_PATIENT_EMAIL, DEMO_PHONE, demoLoginEnabled, demoPatientPassword } from '@/lib/demo-login'
import { checkOtpChallenge, otpSendAllowed, otpTableReady, recordOtpChallenge } from '@/lib/otp-guard'
import { overLimit } from '@/lib/rate-limit'
import { sendWhatsAppOtp } from '@/lib/notify/whatsapp'
import { sendOtpSms } from '@/lib/notify/sms'

type Admin = ReturnType<typeof createAdminClient>

// Registering a patient at a hospital or diagnostic centre desk: staff enter the patient's mobile number, the site
// sends the patient a one-time code, the patient reads it out, and once it checks out the patient's account exists.
// Nothing here signs anyone in, so the staff member stays signed in as themselves.


/** A 10-digit Indian mobile number (with or without +91 / 0) as "+91XXXXXXXXXX", or null. */
export function indianMobile(raw: string | null | undefined) {
  let digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null
}

type Outcome<T = object> = ({ ok: true } & T) | { ok: false; error: string }

// The code is this site's own, as for patient sign-in (app/actions/auth.ts): sent on WhatsApp, then by text, and kept
// as a challenge (lib/otp-guard.ts) that allows a few guesses and works once. Its id rides in a cookie on the staff
// member's browser, one per patient number, so only the desk that sent the code can check it.
//
// There is deliberately no fallback code. A fixed code accepted when delivery failed let any desk "verify" any
// number, and that verification is what lets a desk issue the patient a new password.
const deskCookie = (phone: string) => `cyd_desk_otp_${phone.replace(/\D/g, '')}`
const CODE_TTL_MS = 10 * 60_000

function deskCodeHash(phone: string, code: string, expiresAt: number) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Verification codes are not configured on this server.')
  return createHmac('sha256', secret).update(`desk:${phone}:${code}:${expiresAt}`).digest('hex')
}

function sameHex(a: string, b: string) {
  const x = Buffer.from(a, 'hex')
  const y = Buffer.from(b, 'hex')
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y)
}

/**
 * Sends the patient a verification code. New numbers get an account when the code is confirmed. `deskScope` names the
 * staff member sending it (their desk token scope), who may send a limited number of codes an hour.
 */
export async function sendPatientOtp(admin: Admin, phone: string, deskScope: string): Promise<Outcome> {
  // The demo number and code used for patient sign-in work here too where demo sign-in is on (lib/demo-login.ts).
  if (phone === DEMO_PHONE && demoLoginEnabled()) return { ok: true }

  if (overLimit(`desk-otp:${deskScope}`, 60, 60 * 60_000)) {
    return { ok: false, error: 'This desk has sent a lot of codes in the last hour. Please wait a little before sending more.' }
  }
  // The per-number caps apply as for sign-in. The per-network cap doesn't: a busy desk sends many codes from one
  // connection, and counting them would block patients signing in on the hospital's Wi-Fi. So no address is kept.
  const ip = null
  const allowed = await otpSendAllowed(admin, phone, ip)
  if (!allowed.ok) return allowed
  if (!(await otpTableReady(admin))) {
    return { ok: false, error: 'Patient verification needs a database update (supabase/migrations/20261013_auth_otp_challenges.sql).' }
  }

  const code = randomInt(100000, 1000000).toString()
  const expiresAt = Date.now() + CODE_TTL_MS
  const id = await recordOtpChallenge(admin, { phone, hash: deskCodeHash(phone, code, expiresAt), expiresAt, ip })
  if (!id) return { ok: false, error: 'We couldn’t send the code just now. Please try again in a minute.' }

  if (!(await sendWhatsAppOtp(phone, code)) && !(await sendOtpSms(phone, code))) {
    return { ok: false, error: 'We couldn’t send the code to this number. Check it and try again in a minute.' }
  }
  const store = await cookies()
  store.set(deskCookie(phone), id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: CODE_TTL_MS / 1000, path: '/' })
  return { ok: true }
}

/** Checks the code the patient read out. Returns the patient's user id. */
export async function verifyPatientOtp(admin: Admin, phone: string, code: string): Promise<Outcome<{ userId: string }>> {
  const token = code.replace(/\D/g, '')
  if (token.length !== 6) return { ok: false, error: 'Enter the 6-digit code the patient received.' }

  if (phone === DEMO_PHONE && demoLoginEnabled()) {
    if (token !== DEMO_CODE) return { ok: false, error: 'That code is wrong or has expired. Send a new one.' }
    const { data } = await admin.from('profiles').select('id').in('phone_number', [phone, phone.slice(1)]).limit(1).maybeSingle()
    return data ? { ok: true, userId: data.id } : { ok: false, error: 'The demo patient account isn’t set up.' }
  }

  const store = await cookies()
  const challengeId = store.get(deskCookie(phone))?.value
  if (!challengeId) return { ok: false, error: 'That code has expired. Send the patient a new one.' }
  const verdict = await checkOtpChallenge(admin, challengeId, phone, (hash, expiresAt) => sameHex(hash, deskCodeHash(phone, token, expiresAt)))
  if (verdict === 'locked') {
    store.delete(deskCookie(phone))
    return { ok: false, error: 'Too many wrong codes. Send the patient a new one.' }
  }
  if (verdict !== 'valid') return { ok: false, error: 'That code is wrong or has expired. Send a new one.' }
  store.delete(deskCookie(phone))

  // The patient has proved the number: find its account, or open one.
  let userId = await findAuthUserId(admin, { phone })
  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({ phone, phone_confirm: true, user_metadata: { role: 'patient' } })
    userId = created?.user?.id ?? (error ? await findAuthUserId(admin, { phone }) : null)
    if (!userId) {
      console.error('verifyPatientOtp createUser:', error)
      return { ok: false, error: 'We couldn’t open an account for this number. Please try again.' }
    }
  }
  return { ok: true, userId }
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

  // The demo patient keeps the password the demo sign-in uses (only where demo sign-in is on).
  const demoPassword = demoPatientPassword()
  if (demoPassword) {
    const { data: auth } = await admin.auth.admin.getUserById(userId)
    if (auth.user?.email === DEMO_PATIENT_EMAIL) return { ok: true, patientCode, password: demoPassword }
  }

  const password = generatePassword()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) {
    console.error('issuePatientCredentials password:', error)
    return { ok: false, error: 'The Patient ID was created but the password couldn’t be set. Please try again.' }
  }
  return { ok: true, patientCode, password }
}
