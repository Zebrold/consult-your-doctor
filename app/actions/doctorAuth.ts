'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getHospitals() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('hospitals').select('id, name').order('name', { ascending: true })
  if (error) {
    console.error('Error fetching hospitals:', error)
    return []
  }
  return data || []
}

export async function submitDoctorSignup(prevState: any, formData: FormData) {
  const supabase = await createClient()
  
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const specialty = formData.get('specialty') as string
  const qualificationsRaw = formData.get('qualifications') as string
  const experienceYears = formData.get('experience_years') as string
  const consultationFee = formData.get('consultation_fee') as string
  const hospitalId = formData.get('hospitalId') as string

  // Pack the extra fields into qualifications to avoid needing a DB migration right now
  const qualifications = `${qualificationsRaw} | EXP:${experienceYears} | FEE:${consultationFee}`

  if (!fullName || !email || !hospitalId) {
    return { error: 'Full Name, Email, and Hospital selection are required.', success: false }
  }

  // Check if email already exists in users or requests
  const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', email).single()
  if (existingUser) {
    return { error: 'This email is already registered in the system.', success: false }
  }

  const { data: existingReq } = await supabase.from('doctor_signup_requests').select('id').eq('email', email).single()
  if (existingReq) {
    return { error: 'A registration request for this email is already pending.', success: false }
  }

  const { error } = await supabase.from('doctor_signup_requests').insert({
    full_name: fullName,
    email,
    phone_number: phone,
    specialty,
    qualifications,
    hospital_id: hospitalId,
    status: 'pending'
  })

  if (error) {
    if (error.message.includes('unique constraint') || error.code === '23505') {
      return { error: 'An application with this email already exists.', success: false }
    }
    return { error: error.message || 'An error occurred while submitting your application.', success: false }
  }

  return { success: true, message: 'Your application has been submitted and is pending verification by the Super Admin.' }
}

export async function approveDoctor(requestId: string) {
  const adminClient = createAdminClient()

  // Fetch the request
  const { data: request, error: reqError } = await adminClient
    .from('doctor_signup_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (reqError || !request) {
    return { success: false, error: 'Request not found' }
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'Request is already processed' }
  }

  // Generate secure random password
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const password = generatePassword()

  // Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: request.email,
    password: password,
    email_confirm: true,
    user_metadata: { role: 'doctor' }
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || 'Failed to create user' }
  }

  const userId = authData.user.id

  // Create profile
  const generatedStaffId = `CYD${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  
  const { error: profileError } = await adminClient.from('profiles').insert({
    id: userId,
    full_name: request.full_name,
    email: request.email,
    phone_number: request.phone_number,
    role: 'doctor',
    staff_id: generatedStaffId
  })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId) // Cleanup zombie
    const isPhoneDuplicate = profileError.message?.includes('profiles_phone_number_key') || profileError.code === '23505'
    return { success: false, error: isPhoneDuplicate ? 'A user with this phone number already exists.' : profileError.message }
  }

  // Fetch or create department
  const { data: department } = await adminClient
    .from('departments')
    .select('id')
    .eq('hospital_id', request.hospital_id)
    .eq('name', request.specialty)
    .single()

  let departmentId = department?.id

  if (!departmentId) {
    const { data: newDept, error: deptError } = await adminClient
      .from('departments')
      .insert({ hospital_id: request.hospital_id, name: request.specialty })
      .select('id')
      .single()
    
    if (deptError) {
      await adminClient.auth.admin.deleteUser(userId) // Cleanup zombie
      await adminClient.from('profiles').delete().eq('id', userId)
      return { success: false, error: 'Failed to create department: ' + deptError.message }
    }
    departmentId = newDept.id
  }

  // Parse out the packed experience and fee
  const qualString = request.qualifications || ''
  const parts = qualString.split(' | ')
  const cleanQuals = parts[0]
  const expPart = parts.find(p => p.startsWith('EXP:'))
  const feePart = parts.find(p => p.startsWith('FEE:'))
  const experience_years = expPart ? parseInt(expPart.replace('EXP:', ''), 10) : 5
  const consultation_fee = feePart ? parseInt(feePart.replace('FEE:', ''), 10) : 500

  // Create doctor record
  const { error: doctorError } = await adminClient.from('doctors').insert({
    profile_id: userId,
    hospital_id: request.hospital_id,
    department_id: departmentId,
    specialty: request.specialty,
    qualifications: cleanQuals,
    experience_years,
    consultation_fee
  })

  if (doctorError) {
    await adminClient.auth.admin.deleteUser(userId) // Cleanup zombie
    await adminClient.from('profiles').delete().eq('id', userId)
    return { success: false, error: doctorError.message }
  }

  // Mark request as approved
  await adminClient.from('doctor_signup_requests').update({ status: 'approved' }).eq('id', requestId)

  return { 
    success: true, 
    credentials: {
      email: request.email,
      password: password
    }
  }
}

export async function rejectDoctor(requestId: string) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('doctor_signup_requests').update({ status: 'rejected' }).eq('id', requestId)
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}
