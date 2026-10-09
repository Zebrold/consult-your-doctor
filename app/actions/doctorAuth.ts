'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomInt } from 'node:crypto'
import { sendDoctorRegistrationReceivedEmail, sendDoctorActivationEmail } from '@/lib/notify/email'

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
  // Applicants aren't signed in, and database policies rightly hide profiles and other applications from the
  // public, so the duplicate checks and the insert run server-side with the admin client.
  const supabase = createAdminClient()

  // " | " separates the packed fields below, so strip pipes from free-text input.
  const field = (name: string) => ((formData.get(name) as string | null) ?? '').replace(/\|/g, '/').trim()

  const fullName = [field('title'), field('firstName'), field('lastName')].filter(Boolean).join(' ')
  const email = field('email').toLowerCase()
  const phoneDigits = field('phone').replace(/\D/g, '')
  const phone = phoneDigits ? `${field('countryCode')}${phoneDigits}` : ''
  const specialty = field('specialty')
  const qualificationsRaw = field('qualifications')
  const experienceYears = field('experience_years')
  const consultationFee = field('consultation_fee')
  const hospitalId = field('hospitalId')
  const council = field('council')
  const registrationNumber = field('registrationNumber')
  const subSpecialty = field('subSpecialty')

  if (!field('firstName') || !field('lastName') || !email || !phone || !hospitalId) {
    return { error: 'Name, email, mobile number, and hospital selection are required.', success: false }
  }

  if (!council || !registrationNumber || !specialty || !qualificationsRaw) {
    return { error: 'Medical council, registration number, qualification, and specialty are required for verification.', success: false }
  }

  if (formData.get('confirmRegistration') !== 'on' || formData.get('consentVerification') !== 'on') {
    return { error: 'Please confirm both declarations before submitting.', success: false }
  }

  // Pack the extra fields into qualifications to avoid needing a DB migration right now.
  // approveDoctor() reads the first part as the qualification and the EXP:/FEE: parts by prefix;
  // COUNCIL:/REG:/SUB: are shown to the reviewing admin as-is.
  const qualifications = [
    qualificationsRaw,
    `EXP:${experienceYears}`,
    `FEE:${consultationFee}`,
    `COUNCIL:${council}`,
    `REG:${registrationNumber}`,
    ...(subSpecialty ? [`SUB:${subSpecialty}`] : []),
  ].join(' | ')

  // Check if email already exists in users or requests
  const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
  if (existingUser) {
    return { error: 'This email is already registered in the system.', success: false }
  }

  const { data: existingReq } = await supabase.from('doctor_signup_requests').select('id').eq('email', email).eq('status', 'pending').limit(1).maybeSingle()
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

  // Trigger confirmation email notification
  await sendDoctorRegistrationReceivedEmail({
    to: email,
    doctorName: fullName,
    specialty,
  }).catch((err) => console.error('Failed to dispatch doctor registration email:', err))

  return { success: true, message: 'Your application has been submitted and is pending verification by the Super Admin.' }
}

// Approving creates an account and returns its password, so only reviewers may call these actions.
async function canReviewApplications() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'super_admin' || profile?.role === 'executive'
}

export async function approveDoctor(requestId: string) {
  if (!(await canReviewApplications())) {
    return { success: false, error: 'Not authorized to review doctor applications' }
  }

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

  // Generate a random password (crypto RNG: Math.random is predictable and must not be used for credentials)
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 14; i++) {
      password += chars.charAt(randomInt(chars.length))
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
  const expPart = parts.find((p: string) => p.startsWith('EXP:'))
  const feePart = parts.find((p: string) => p.startsWith('FEE:'))
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

  // Generate secure activation / password-setup link
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
  let activationLink = `${siteUrl}/login/doctor`

  try {
    const { data: linkData } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: request.email,
      options: { redirectTo: `${siteUrl}/update-password` }
    })
    if (linkData?.properties?.action_link) {
      activationLink = linkData.properties.action_link
    }
  } catch (err) {
    console.warn('generateLink fallback:', err)
  }

  // Fetch hospital name for email
  const { data: hospital } = await adminClient.from('hospitals').select('name').eq('id', request.hospital_id).maybeSingle()

  // Dispatch activation email
  await sendDoctorActivationEmail({
    to: request.email,
    doctorName: request.full_name,
    activationLink,
    hospitalName: hospital?.name,
  }).catch((err) => console.error('Failed to send doctor activation email:', err))

  return { 
    success: true, 
    credentials: {
      email: request.email,
      password: password,
      staffId: generatedStaffId,
      activationLink,
    }
  }
}

export async function rejectDoctor(requestId: string) {
  if (!(await canReviewApplications())) {
    return { success: false, error: 'Not authorized to review doctor applications' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('doctor_signup_requests').update({ status: 'rejected' }).eq('id', requestId)
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}
