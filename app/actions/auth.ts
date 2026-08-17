'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Helper function to format phone number to E.164 (+91)
function formatPhoneNumber(phone: string) {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `+91${cleaned}`
  }
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`
  }
  // Fallback to prepending + if not matching above (e.g. they typed +91... already)
  if (!phone.startsWith('+')) {
    return `+${cleaned}`
  }
  return phone
}

export async function sendOTP(prevState: any, formData: FormData) {
  let phone = formData.get('phone') as string
  const fullName = formData.get('fullName') as string | null
  const role = formData.get('role') as string | null
  const isRegister = formData.get('isRegister') === 'true'

  if (!phone) {
    return { error: 'Phone number is required.', success: false }
  }
  
  if (isRegister && (!fullName || !role)) {
    return { error: 'Full name and role are required for registration.', success: false }
  }

  phone = formatPhoneNumber(phone)

  const supabase = await createClient()

  const options: any = {}
  if (isRegister) {
    options.data = { full_name: fullName, role: role }
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options
  })

  if (error) {
    return { error: error.message, success: false }
  }

  return { success: true, phone, fullName, role, isRegister }
}

export async function verifyOTP(prevState: any, formData: FormData) {
  let phone = formData.get('phone') as string
  const token = formData.get('token') as string
  const fullName = formData.get('fullName') as string | null
  const role = formData.get('role') as string | null
  const isRegister = formData.get('isRegister') === 'true'

  if (!phone || !token) {
    return { error: 'Phone number and OTP are required.', success: false }
  }

  phone = formatPhoneNumber(phone)

  const supabase = await createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms'
  })

  if (error) {
    return { error: error.message, success: false, phone, fullName, role, isRegister }
  }

  if (data.user && isRegister) {
    const profileData: any = {
      id: data.user.id,
      full_name: fullName,
      phone_number: phone,
      role: role,
    }

    // Insert or update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData)

    if (profileError) {
      return { error: `Profile creation failed: ${profileError.message}`, success: false, phone, fullName, role, isRegister }
    }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/dashboard')
}

export async function staffLogin(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const staffId = formData.get('staffId') as string
  const password = formData.get('password') as string
  const expectedRole = formData.get('role') as string

  if (!staffId || !password) {
    return { error: 'Staff ID and password are required.' }
  }

  // The email in Supabase is the ID lowercased + @cyd.internal
  const email = `${staffId.toLowerCase()}@cyd.internal`

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Invalid Staff ID or Password.' }
  }

  // Verify Role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
  
  if (profile?.role !== expectedRole) {
    await supabase.auth.signOut()
    return { error: `Unauthorized. You are not a ${expectedRole.replace('_', ' ')}.` }
  }

  if (expectedRole === 'doctor') {
    redirect('/doctor/dashboard')
  } else if (expectedRole === 'executive') {
    redirect('/executive/dashboard')
  } else if (expectedRole === 'hospital_admin') {
    redirect('/hospital/dashboard')
  }

  redirect('/')
}
