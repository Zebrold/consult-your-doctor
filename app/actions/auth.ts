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

/** Turns Supabase's error for a failed text into something a patient can act on. */
function smsErrorMessage(message: string) {
  if (/signups not allowed/i.test(message)) return message
  // Our hook's own messages come through as-is; a crash or bad configuration shows up as a bare status code.
  if (/unexpected status code|hook|unexpected_failure|sms provider/i.test(message)) {
    return 'We couldn’t send the code right now. Please try again in a minute or continue with Google.'
  }
  return message
}

export async function sendOTP(prevState: any, formData: FormData) {
  let phone = formData.get('phone') as string
  const countryCode = formData.get('countryCode') as string || '+91'
  const fullName = formData.get('fullName') as string | null
  // Phone sign-up is for patients only. Staff accounts are created by an admin, so the form's role is ignored.
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
    return { error: 'We can only text codes to Indian (+91) mobile numbers. Choose IN +91, or continue with Google.', success: false, phone, fullName, role, isRegister }
  }
  if (!/^[6-9]\d{9}$/.test(phone.slice(SMS_COUNTRY_CODE.length))) {
    return { error: 'Enter a valid 10-digit Indian mobile number.', success: false, phone, fullName, role, isRegister }
  }

  const supabase = await createClient()

  // Only registration may create a new account; signing in with an unknown number should fail.
  const options: any = { shouldCreateUser: isRegister }
  if (isRegister) {
    options.data = { full_name: fullName, role: role }
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options
  })

  if (error) {
    const isUnknownNumber = !isRegister && /signups not allowed/i.test(error.message)
    return {
      error: isUnknownNumber
        ? 'No account found for this number. Switch to "Create Account" to register.'
        : smsErrorMessage(error.message),
      success: false, phone, fullName, role, isRegister
    }
  }

  return { success: true, phone, fullName, role, isRegister }
}

export async function verifyOTP(prevState: any, formData: FormData) {
  let phone = formData.get('phone') as string
  const token = formData.get('token') as string
  const fullName = formData.get('fullName') as string | null
  const role = 'patient' // see sendOTP: phone sign-up only creates patients
  const isRegister = formData.get('isRegister') === 'true'

  if (!phone || !token) {
    return { error: 'Phone number and OTP are required.', success: false }
  }

  phone = formatPhoneNumber(phone)

  const supabase = await createClient()

  // Demo / dummy patient bypass for UI testing
  if (phone.endsWith('9876543210') && token.trim() === '123456') {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'patient.demo@cyd.internal',
      password: 'Password123!'
    })
    if (authErr) return { error: authErr.message, success: false, phone, fullName, role, isRegister }
    const cookieStore = await cookies()
    cookieStore.set(ROLE_COOKIE, roleCookieValue(authData.user.id, 'patient'), ROLE_COOKIE_OPTIONS)
    const next = String(formData.get('next') || '')
    redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/')
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms'
  })

  if (error) {
    return { error: error.message, success: false, phone, fullName, role, isRegister }
  }

  if (data.user && isRegister) {
    // Create the patient profile only if this number has none yet. Registering again with a number that already
    // has an account just signs in; it must not rename the account or change its role.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { id: data.user.id, full_name: fullName?.trim(), phone_number: phone, role },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    if (profileError) {
      return { error: `Profile creation failed: ${profileError.message}`, success: false, phone, fullName, role, isRegister }
    }
  }

  if (!data.user) {
    return { error: 'Verification failed: user is null', success: false, phone, fullName, role, isRegister }
  }

  // Fetch the role to set the cookie
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
  const cookieStore = await cookies()
  cookieStore.set(ROLE_COOKIE, roleCookieValue(data.user.id, profile?.role || 'patient'), ROLE_COOKIE_OPTIONS)

  // Return patients to the page that asked them to sign in (only same-site paths).
  const next = String(formData.get('next') || '')
  const isPatient = !profile?.role || profile.role === 'patient'
  redirect(isPatient && next.startsWith('/') && !next.startsWith('//') ? next : '/')
}

export async function verifyOTPInline(prevState: any, formData: FormData) {
  let phone = formData.get('phone') as string
  const token = formData.get('token') as string
  const fullName = formData.get('fullName') as string | null
  const role = 'patient' // see sendOTP: phone sign-up only creates patients
  const isRegister = formData.get('isRegister') === 'true'

  if (!phone || !token) {
    return { error: 'Phone number and OTP are required.', success: false }
  }

  phone = formatPhoneNumber(phone)

  const supabase = await createClient()

  // Demo / dummy patient bypass for UI testing
  if (phone.endsWith('9876543210') && token.trim() === '123456') {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'patient.demo@cyd.internal',
      password: 'Password123!'
    })
    if (authErr) return { error: authErr.message, success: false, phone, fullName, role, isRegister }
    const cookieStore = await cookies()
    cookieStore.set(ROLE_COOKIE, roleCookieValue(authData.user.id, 'patient'), ROLE_COOKIE_OPTIONS)
    return { success: true, user: authData.user }
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms'
  })

  if (error) {
    return { error: error.message, success: false, phone, fullName, role, isRegister }
  }

  if (data.user && isRegister) {
    // Create the patient profile only if this number has none yet. Registering again with a number that already
    // has an account just signs in; it must not rename the account or change its role.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { id: data.user.id, full_name: fullName?.trim(), phone_number: phone, role },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    if (profileError) {
      return { error: `Profile creation failed: ${profileError.message}`, success: false, phone, fullName, role, isRegister }
    }
  }

  if (!data.user) {
    return { error: 'Verification failed: user is null', success: false, phone, fullName, role, isRegister }
  }

  // Fetch the role to set the cookie
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
  const cookieStore = await cookies()
  cookieStore.set(ROLE_COOKIE, roleCookieValue(data.user.id, profile?.role || 'patient'), ROLE_COOKIE_OPTIONS)

  return { success: true, user: data.user }
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
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/update-password`,
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
