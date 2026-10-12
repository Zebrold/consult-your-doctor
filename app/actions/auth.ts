'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ROLE_COOKIE, ROLE_COOKIE_OPTIONS, roleCookieValue } from '@/lib/role-cookie'

function formatPhoneNumber(phone: string, countryCode: string = '+91') {
  if (phone.startsWith('+')) return phone
  let cleaned = phone.replace(/\D/g, '')
  
  // Clean countryCode (extract only digits and +)
  let cleanedCC = countryCode.replace(/[^\d+]/g, '')
  if (!cleanedCC.startsWith('+')) {
    cleanedCC = '+' + cleanedCC
  }

  const ccDigits = cleanedCC.replace('+', '')
  // If user already typed the country code without plus
  if (cleaned.startsWith(ccDigits)) {
    return `+${cleaned}`
  }

  return `${cleanedCC}${cleaned}`
}

// Codes are texted by the send-otp Supabase hook through Fast2SMS, which only reaches Indian mobile numbers.
const SMS_COUNTRY_CODE = '+91'

import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppOtp } from '@/lib/notify/whatsapp'
import { sendOtpSms } from '@/lib/notify/sms'
import { siteUrl } from '@/lib/site-url'

function computeOtpHmac(phone: string, otp: string, expiresAt: number): string {
  // A guessable fallback secret would let anyone mint a valid code for any number, so refuse to run without one.
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Sign-in codes are not configured on this server.')
  return crypto.createHmac('sha256', secret).update(`${phone}:${otp}:${expiresAt}`).digest('hex')
}

function verifyOtpHmac(phone: string, token: string, expiresAt: number, expectedHash: string): boolean {
  if (Date.now() > expiresAt) return false
  const computed = computeOtpHmac(phone, token, expiresAt)
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(expectedHash, 'hex'))
  } catch {
    return false
  }
}

/** Authenticates or creates the patient user in Supabase auth, setting cookies and profiles */
async function authenticatePatientSession(phone: string, fullName: string | null, isRegister: boolean) {
  const admin = createAdminClient()
  const cleanPhone = phone.replace('+', '')

  let authUserId: string | null = null
  const { data: profile } = await admin.from('profiles').select('id, role').eq('phone_number', phone).maybeSingle()
  if (profile?.id) {
    authUserId = profile.id
  } else {
    const { data: usersData } = await admin.auth.admin.listUsers()
    const found = usersData?.users?.find(u => u.phone === cleanPhone || u.phone === phone)
    if (found) {
      authUserId = found.id
    }
  }

  if (!authUserId) {
    if (!isRegister) {
      return { error: 'No account found for this number. Switch to "Create Account" to register.' }
    }
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      user_metadata: { full_name: fullName?.trim() || 'Patient', role: 'patient' },
    })
    if (createErr || !created?.user) {
      return { error: createErr?.message || 'Could not create account.' }
    }
    authUserId = created.user.id
  }

  // Set one-time temp password for server session creation
  const tempPass = `cyd_wa_${crypto.randomUUID()}`
  const { error: passErr } = await admin.auth.admin.updateUserById(authUserId, { password: tempPass })
  if (passErr) {
    return { error: passErr.message || 'Could not prepare login session.' }
  }

  // Sign in via server client to set standard session cookies
  const supabase = await createClient()
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    phone,
    password: tempPass,
  })
  if (signInErr || !signInData?.user) {
    return { error: signInErr?.message || 'Sign in failed.' }
  }

  // Upsert profile
  if (isRegister || fullName) {
    await admin.from('profiles').upsert(
      {
        id: authUserId,
        full_name: fullName?.trim() || undefined,
        phone_number: phone,
        role: 'patient',
      },
      { onConflict: 'id', ignoreDuplicates: !isRegister }
    )
  }

  const { data: userProfile } = await admin.from('profiles').select('role').eq('id', authUserId).maybeSingle()
  const cookieStore = await cookies()
  cookieStore.set(ROLE_COOKIE, roleCookieValue(authUserId, userProfile?.role || 'patient'), ROLE_COOKIE_OPTIONS)

  return { success: true, user: signInData.user, role: userProfile?.role || 'patient' }
}

export async function sendOTP(prevState: any, formData: FormData) {
  let phone = formData.get('phone') as string
  const countryCode = (formData.get('countryCode') as string) || '+91'
  const fullName = formData.get('fullName') as string | null
  const role = 'patient'
  const isRegister = formData.get('isRegister') === 'true'

  if (!phone) {
    return { error: 'Phone number is required.', success: false, phone, fullName, role, isRegister }
  }

  if (isRegister && !fullName?.trim()) {
    return { error: 'Full name is required for registration.', success: false, phone, fullName, role, isRegister }
  }

  phone = formatPhoneNumber(phone, countryCode)

  // Demo / dummy patient bypass for UI testing
  if (phone.endsWith('9876543210')) {
    return { success: true, phone, fullName, role, isRegister }
  }

  if (!phone.startsWith(SMS_COUNTRY_CODE)) {
    return { error: 'We can only send verification codes to Indian (+91) mobile numbers.', success: false, phone, fullName, role, isRegister }
  }
  if (!/^[6-9]\d{9}$/.test(phone.slice(SMS_COUNTRY_CODE.length))) {
    return { error: 'Enter a valid 10-digit Indian mobile number.', success: false, phone, fullName, role, isRegister }
  }

  // If signing in, ensure user exists
  if (!isRegister) {
    const admin = createAdminClient()
    const cleanPhone = phone.replace('+', '')
    const { data: profile } = await admin.from('profiles').select('id').eq('phone_number', phone).maybeSingle()
    let exists = Boolean(profile)
    if (!exists) {
      const { data: usersData } = await admin.auth.admin.listUsers()
      exists = Boolean(usersData?.users?.some(u => u.phone === cleanPhone || u.phone === phone))
    }
    if (!exists) {
      return {
        error: 'No account found for this number. Switch to "Create Account" to register.',
        success: false,
        phone,
        fullName,
        role,
        isRegister,
      }
    }
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString()
  const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes
  const hash = computeOtpHmac(phone, otp, expiresAt)

  const cookieStore = await cookies()
  const otpPayload = JSON.stringify({ phone, expiresAt, hash })
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 600,
    path: '/',
  }
  cookieStore.set('cyd_auth_otp', otpPayload, cookieOptions)
  cookieStore.set('cyd_wa_otp', otpPayload, cookieOptions)

  // WhatsApp first, then a text message. The code is never shown on screen: anyone can type any number here.
  if (await sendWhatsAppOtp(phone, otp)) {
    return { success: true, phone, fullName, role, isRegister, channel: 'whatsapp' }
  }
  console.warn('[sendOTP] WhatsApp delivery failed, trying SMS for:', phone)
  if (await sendOtpSms(phone, otp)) {
    return { success: true, phone, fullName, role, isRegister, channel: 'sms' }
  }

  cookieStore.delete('cyd_auth_otp')
  cookieStore.delete('cyd_wa_otp')
  return {
    error: "We couldn't send your code right now. Please try again in a minute, or continue with Google.",
    success: false,
    phone,
    fullName,
    role,
    isRegister,
  }
}

export async function verifyOTP(prevState: any, formData: FormData) {
  let phone = formData.get('phone') as string
  const token = formData.get('token') as string
  const fullName = formData.get('fullName') as string | null
  const role = 'patient'
  const isRegister = formData.get('isRegister') === 'true'

  if (!phone || !token) {
    return { error: 'Phone number and OTP are required.', success: false }
  }

  phone = formatPhoneNumber(phone)
  const trimmedToken = token.trim()

  const cookieStore = await cookies()
  const otpCookie = cookieStore.get('cyd_auth_otp')?.value || cookieStore.get('cyd_wa_otp')?.value

  // Demo bypass
  if (phone.endsWith('9876543210') && trimmedToken === '123456') {
    const supabase = await createClient()
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'patient.demo@cyd.internal',
      password: 'Password123!',
    })
    if (authErr) return { error: authErr.message, success: false, phone, fullName, role, isRegister }
    cookieStore.set(ROLE_COOKIE, roleCookieValue(authData.user.id, 'patient'), ROLE_COOKIE_OPTIONS)
    const next = String(formData.get('next') || '')
    redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/')
  }

  let isOtpValid = false
  if (otpCookie) {
    try {
      const parsed = JSON.parse(otpCookie)
      if (parsed.phone === phone) {
        isOtpValid = verifyOtpHmac(phone, trimmedToken, parsed.expiresAt, parsed.hash)
      }
    } catch (e) {
      console.error('[verifyOTP] Error verifying OTP cookie:', e)
    }
  }

  if (!isOtpValid) {
    return {
      error: 'Invalid or expired verification code. Please check your messages and try again.',
      success: false,
      phone,
      fullName,
      role,
      isRegister,
    }
  }

  cookieStore.delete('cyd_auth_otp')
  cookieStore.delete('cyd_wa_otp')

  try {
    const authResult = await authenticatePatientSession(phone, fullName, isRegister)
    if (authResult.error) {
      return { error: authResult.error, success: false, phone, fullName, role, isRegister }
    }

    const next = String(formData.get('next') || '')
    redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/')
  } catch (err: any) {
    if (err?.digest?.startsWith?.('NEXT_REDIRECT')) {
      throw err
    }
    console.error('[verifyOTP error]:', err)
    return {
      error: err?.message || 'Verification failed. Please try again.',
      success: false,
      phone,
      fullName,
      role,
      isRegister,
    }
  }
}

export async function verifyOTPInline(prevState: any, formData: FormData) {
  let phone = formData.get('phone') as string
  const token = formData.get('token') as string
  const fullName = formData.get('fullName') as string | null
  const role = 'patient'
  const isRegister = formData.get('isRegister') === 'true'

  if (!phone || !token) {
    return { error: 'Phone number and OTP are required.', success: false }
  }

  phone = formatPhoneNumber(phone)
  const trimmedToken = token.trim()

  const cookieStore = await cookies()
  const otpCookie = cookieStore.get('cyd_auth_otp')?.value || cookieStore.get('cyd_wa_otp')?.value

  // Demo bypass
  if (phone.endsWith('9876543210') && trimmedToken === '123456') {
    const supabase = await createClient()
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'patient.demo@cyd.internal',
      password: 'Password123!',
    })
    if (authErr) return { error: authErr.message, success: false, phone, fullName, role, isRegister }
    cookieStore.set(ROLE_COOKIE, roleCookieValue(authData.user.id, 'patient'), ROLE_COOKIE_OPTIONS)
    return { success: true, user: authData.user }
  }

  let isOtpValid = false
  if (otpCookie) {
    try {
      const parsed = JSON.parse(otpCookie)
      if (parsed.phone === phone) {
        isOtpValid = verifyOtpHmac(phone, trimmedToken, parsed.expiresAt, parsed.hash)
      }
    } catch (e) {
      console.error('[verifyOTPInline] Error verifying OTP cookie:', e)
    }
  }

  if (!isOtpValid) {
    return {
      error: 'Invalid or expired verification code. Please check your messages and try again.',
      success: false,
      phone,
      fullName,
      role,
      isRegister,
    }
  }

  cookieStore.delete('cyd_auth_otp')
  cookieStore.delete('cyd_wa_otp')

  try {
    const authResult = await authenticatePatientSession(phone, fullName, isRegister)
    if (authResult.error) {
      return { error: authResult.error, success: false, phone, fullName, role, isRegister }
    }

    return { success: true, user: authResult.user }
  } catch (err: any) {
    console.error('[verifyOTPInline error]:', err)
    return {
      error: err?.message || 'Verification failed. Please try again.',
      success: false,
      phone,
      fullName,
      role,
      isRegister,
    }
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(ROLE_COOKIE)
  redirect('/')
}

export async function staffLogin(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const rawStaffId = formData.get('staffId') as string
  const staffId = rawStaffId ? rawStaffId.trim().toUpperCase() : ''
  const password = formData.get('password') as string
  const expectedRole = formData.get('role') as string

  if (!staffId || !password) {
    return { error: 'Staff ID and password are required.' }
  }

  // The email in Supabase is the ID lowercased + @cyd.internal OR their real email if updated
  let email = `${staffId.toLowerCase()}@cyd.internal`

  // Let's check if the staff has a custom email set in profiles
  // We need to use service role to bypass RLS if they aren't logged in yet
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  
  const { data: profile } = await adminClient
    .from('profiles')
    .select('email')
    .eq('staff_id', staffId)
    .single()

  if (profile?.email) {
    email = profile.email
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Invalid Staff ID or Password.' }
  }

  // Verify Role
  const { data: roleProfile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
  
  if (roleProfile?.role !== expectedRole) {
    await supabase.auth.signOut()
    return { error: `Unauthorized. You are not a ${expectedRole.replace('_', ' ')}.` }
  }

  const cookieStore = await cookies()
  cookieStore.set(ROLE_COOKIE, roleCookieValue(data.user.id, expectedRole), ROLE_COOKIE_OPTIONS)

  if (expectedRole === 'doctor') {
    redirect('/doctor/dashboard')
  } else if (expectedRole === 'executive') {
    redirect('/executive/dashboard')
  } else if (expectedRole === 'hospital_admin') {
    redirect('/hospital/dashboard')
  } else if (expectedRole === 'super_admin') {
    redirect('/admin/dashboard')
  } else if (expectedRole === 'diagnostic_admin') {
    redirect('/diagnostic-center/dashboard')
  }
}

export async function sendPasswordResetOTP(staffId: string) {
  if (!staffId) return { error: 'Staff ID is required.' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  
  const { data: profile } = await adminClient
    .from('profiles')
    .select('email, role')
    .eq('staff_id', staffId.trim().toUpperCase())
    .single()

  if (!profile || !profile.email) {
    return { error: 'No registered email found for this Staff ID. Please contact the Super Admin to update your email.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${siteUrl()}/update-password`,
  })

  if (error) {
    console.error('Password reset error:', error)
    return { error: error.message }
  }

  return { success: true, email: maskEmail(profile.email) }
}

/** "priya.sharma@gmail.com" → "pr•••••••@gmail.com": enough to recognise, not enough to harvest. */
function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!domain) return '•••'
  return `${local.slice(0, 2)}${'•'.repeat(Math.max(local.length - 2, 3))}@${domain}`
}

export async function verifyOTPAndUpdatePassword(email: string, token: string, newPassword: string) {
  const supabase = await createClient()

  // Verify the OTP
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery'
  })

  if (verifyError) {
    console.error('Verify OTP error:', verifyError)
    return { error: verifyError.message }
  }

  // Update the password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (updateError) {
    console.error('Update password error:', updateError)
    return { error: updateError.message }
  }

  return { success: true }
}

/**
 * Sign-in with the Patient ID and password a diagnostic centre issued at registration (see
 * lib/patient-onboarding.ts). The ID leads to the account, which signs in with its email or mobile number.
 */
export async function patientIdLogin(prevState: { error?: string } | null, formData: FormData) {
  const patientCode = String(formData.get('patientId') || '').trim().toUpperCase()
  const password = String(formData.get('password') || '')
  if (!/^PT\d{6}$/.test(patientCode) || !password) return { error: 'Enter your Patient ID (like PT482193) and password.' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id, role').eq('patient_code', patientCode).maybeSingle()
  const { data: auth } = profile ? await admin.auth.admin.getUserById(profile.id) : { data: { user: null } }
  const identity = auth.user?.email ? { email: auth.user.email } : auth.user?.phone ? { phone: `+${auth.user.phone.replace(/^\+/, '')}` } : null
  if (!profile || profile.role !== 'patient' || !identity) return { error: 'That Patient ID or password is incorrect.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ ...identity, password })
  if (error || !data.user) return { error: 'That Patient ID or password is incorrect.' }

  const cookieStore = await cookies()
  cookieStore.set(ROLE_COOKIE, roleCookieValue(data.user.id, 'patient'), ROLE_COOKIE_OPTIONS)
  const next = String(formData.get('next') || '')
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/patient/profile')
}
