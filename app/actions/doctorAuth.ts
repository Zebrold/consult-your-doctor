'use server'

import { createClient } from '@/lib/supabase/server'
import { siteUrl as publicSiteUrl } from '@/lib/site-url'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomInt } from 'node:crypto'
import { sendDoctorRegistrationReceivedEmail, sendDoctorActivationEmail } from '@/lib/notify/email'
import { clientIp } from '@/lib/otp-guard'
import { overLimit } from '@/lib/rate-limit'
import { collectDocuments, documentsReady, missingDocuments } from '@/lib/application-uploads'
import { DOCTOR_LANGUAGES, DOCTOR_SPECIALTIES, GENDERS, MEDICAL_COUNCILS, PRACTICE_TYPES, SLOT_MINUTES, doctorDetails, parseApplication, type DoctorDetails } from '@/lib/doctor-applications'
import { WEEKDAYS } from '@/lib/partner-applications'

export async function getHospitals() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('hospitals').select('id, name').order('name', { ascending: true })
  if (error) {
    console.error('Error fetching hospitals:', error)
    return []
  }
  return data || []
}

export async function submitDoctorSignup(_prevState: unknown, formData: FormData) {
  // Applicants aren't signed in, and database policies rightly hide profiles and other applications from the
  // public, so the duplicate checks and the insert run server-side with the admin client.
  const supabase = createAdminClient()

  // " | " separates the packed fields below, so strip pipes from free-text input.
  const field = (name: string) => ((formData.get(name) as string | null) ?? '').replace(/\|/g, '/').trim()
  const list = (name: string, allowed: string[]) => formData.getAll(name).map(String).filter((v) => allowed.includes(v))
  const year = (name: string) => (/^\d{4}$/.test(field(name)) ? Number(field(name)) : null)
  const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
  const isTime = (v: string) => /^\d{2}:\d{2}$/.test(v)
  const fail = (error: string) => ({ error, success: false })

  const fullName = [field('title'), field('firstName'), field('middleName'), field('lastName')].filter(Boolean).join(' ')
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
    return fail('Name, email, mobile number, and hospital selection are required.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200 || fullName.length > 200) {
    return fail('Please check your name and email address.')
  }
  if (!council || !registrationNumber || !specialty || !qualificationsRaw) {
    return fail('Medical council, registration number, qualification, and specialty are required for verification.')
  }
  if (!DOCTOR_SPECIALTIES.includes(specialty) || !MEDICAL_COUNCILS.includes(council)) return fail('Choose your speciality and medical council from the lists.')
  if (!/^\d{1,2}$/.test(experienceYears) || !/^\d{1,6}$/.test(consultationFee)) return fail('Check your years of experience and consultation fee.')

  const details: DoctorDetails = {
    middleName: field('middleName') || undefined,
    gender: GENDERS.includes(field('gender')) ? field('gender') : undefined,
    dateOfBirth: isDate(field('dateOfBirth')) ? field('dateOfBirth') : undefined,
    languages: list('languages', DOCTOR_LANGUAGES),
    registrationYear: year('registrationYear'),
    registrationValidUntil: isDate(field('registrationValidUntil')) ? field('registrationValidUntil') : undefined,
    college: field('college').slice(0, 160) || undefined,
    passingYear: year('passingYear'),
    otherQualifications: field('otherQualifications').slice(0, 300) || undefined,
    practiceType: PRACTICE_TYPES.includes(field('practiceType')) ? field('practiceType') : undefined,
    clinic: field('clinic').slice(0, 300) || undefined,
    consultDays: list('consultDays', WEEKDAYS),
    consultFrom: isTime(field('consultFrom')) ? field('consultFrom') : undefined,
    consultTo: isTime(field('consultTo')) ? field('consultTo') : undefined,
    slotMinutes: SLOT_MINUTES.includes(Number(field('slotMinutes'))) ? Number(field('slotMinutes')) : null,
    bio: field('bio').slice(0, 1500) || undefined,
    conditions: field('conditions').slice(0, 400) || undefined,
    awards: field('awards').slice(0, 400) || undefined,
    pan: field('pan').toUpperCase() || undefined,
  }
  if (!details.gender || !details.dateOfBirth) return fail('Enter your gender and date of birth.')
  if (!details.languages?.length) return fail('Choose the languages you consult in.')
  if (!details.registrationYear || !details.college || !details.passingYear) return fail('Enter your year of registration, college and year of passing.')
  if (!details.practiceType || !details.consultDays?.length || !details.consultFrom || !details.consultTo || !details.slotMinutes) {
    return fail('Enter how you practise, the days and hours you consult and the time per patient.')
  }
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(details.pan ?? '')) return fail('Check your PAN: 10 characters, like ABCDE1234F.')

  if (formData.get('confirmRegistration') !== 'on' || formData.get('noDisciplinary') !== 'on' || formData.get('consentVerification') !== 'on') {
    return fail('Please confirm all three declarations before sending.')
  }

  // Each application emails the address given, so limit how many one network can send.
  if (await overLimit(`doctor-signup:${(await clientIp()) ?? 'unknown'}`, 5, 60 * 60_000)) {
    return fail('Several applications have been sent from this network. Please try again in an hour.')
  }

  // Check if email already exists in users or requests
  // Admin client: a visitor's session may not search every profile's email (that would show which addresses are registered).
  const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
  if (existingUser) {
    return fail('This email is already registered in the system.')
  }

  const { data: existingReq } = await supabase.from('doctor_signup_requests').select('id').eq('email', email).eq('status', 'pending').limit(1).maybeSingle()
  if (existingReq) {
    return fail('A registration request for this email is already pending.')
  }

  // The documents uploaded under this form's upload id. Before the documents bucket exists, they come by email.
  const uploads = await documentsReady(supabase)
  const documents = uploads ? await collectDocuments(supabase, 'doctor', field('uploadId') || null) : {}
  const missing = uploads ? missingDocuments('doctor', documents) : []
  if (missing.length > 0) return fail(`Please add your ${missing.join(', ').toLowerCase()}.`)
  if (Object.keys(documents).length > 0) details.documents = documents
  if (!uploads) details.documentsByEmail = true

  // The fields approveDoctor() reads are packed into qualifications: the first part is the qualification, then the
  // EXP:/FEE: parts by prefix; COUNCIL:/REG:/SUB: are shown to the reviewer as they are.
  const packed = [
    qualificationsRaw,
    `EXP:${experienceYears}`,
    `FEE:${consultationFee}`,
    `COUNCIL:${council}`,
    `REG:${registrationNumber}`,
    ...(subSpecialty ? [`SUB:${subSpecialty}`] : []),
  ].join(' | ')

  const row = { full_name: fullName, email, phone_number: phone, specialty, hospital_id: hospitalId, status: 'pending' }
  let { error } = await supabase.from('doctor_signup_requests').insert({ ...row, qualifications: packed, details })
  // Before supabase/migrations/20261113_partner_documents.sql runs there is no details column: pack the answers too.
  if (error && (error.code === 'PGRST204' || /details/.test(error.message ?? ''))) {
    ;({ error } = await supabase.from('doctor_signup_requests').insert({ ...row, qualifications: `${packed} | DETAILS:${JSON.stringify(details)}` }))
  }

  if (error) {
    if (error.message.includes('unique constraint') || error.code === '23505') {
      return fail('An application with this email already exists.')
    }
    console.error('submitDoctorSignup:', error)
    return fail('An error occurred while submitting your application. Please try again.')
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
  return profile?.role === 'executive'
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
  const packed = parseApplication(qualString)
  const extra = doctorDetails((request as { details?: unknown }).details, qualString)

  // Create doctor record
  const { error: doctorError } = await adminClient.from('doctors').insert({
    profile_id: userId,
    hospital_id: request.hospital_id,
    department_id: departmentId,
    specialty: request.specialty,
    qualifications: cleanQuals,
    experience_years,
    consultation_fee,
    ...(packed.registration ? { registration_number: packed.registration } : {}),
    ...(packed.council ? { registration_council: packed.council } : {}),
    ...(extra.bio ? { bio: extra.bio } : {}),
  })

  if (doctorError) {
    await adminClient.auth.admin.deleteUser(userId) // Cleanup zombie
    await adminClient.from('profiles').delete().eq('id', userId)
    return { success: false, error: doctorError.message }
  }

  // Mark request as approved
  await adminClient.from('doctor_signup_requests').update({ status: 'approved' }).eq('id', requestId)

  // Generate secure activation / password-setup link
  const siteUrl = publicSiteUrl()
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
