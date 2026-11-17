'use server'

import { createClient } from '@/lib/supabase/server'
import { siteUrl as publicSiteUrl } from '@/lib/site-url'
import { createAdminClient } from '@/lib/supabase/admin'
import { executiveFor } from '@/app/executive/_lib/ops'
import { randomInt } from 'node:crypto'
import { sendDoctorRegistrationReceivedEmail, sendDoctorActivationEmail, sendApplicationRejectedEmail } from '@/lib/notify/email'
import { alertTeamLater } from '@/lib/notify/team'
import { clientIp } from '@/lib/otp-guard'
import { overLimit } from '@/lib/rate-limit'
import { collectDocuments, documentsReady, missingDocuments } from '@/lib/application-uploads'
import { DOCTOR_LANGUAGES, DOCTOR_SPECIALTIES, GENDERS, MEDICAL_COUNCILS, PRACTICE_TYPES, SLOT_MINUTES, doctorDetails, parseApplication, type DoctorDetails } from '@/lib/doctor-applications'
import { WEEKDAYS } from '@/lib/partner-applications'
import { EMAIL_MESSAGE, PERSONAL_PAN_MESSAGE, isEmail, isLaterTime, phoneProblem } from '@/lib/join-rules'
import { APPLICATION_DOCS } from '@/lib/application-documents'

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
  const year = (name: string) => {
    const y = /^\d{4}$/.test(field(name)) ? Number(field(name)) : 0
    return y >= 1950 && y <= new Date().getFullYear() ? y : null
  }
  const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
  const isTime = (v: string) => /^\d{2}:\d{2}$/.test(v)
  // `field` names the input to fix: the form opens its step and shows the message under it (app/(auth)/signup/join-ui.tsx).
  const fail = (error: string, input?: string) => ({ error, success: false, field: input })

  const fullName = [field('title'), field('firstName'), field('middleName'), field('lastName')].filter(Boolean).join(' ')
  const email = field('email').toLowerCase()
  const countryCode = field('countryCode') || '+91'
  const phoneDigits = field('phone').replace(/\D/g, '')
  const phone = `${countryCode}${phoneDigits}`
  const specialty = field('specialty')
  const qualificationsRaw = field('qualifications')
  const experienceYears = field('experience_years')
  const consultationFee = field('consultation_fee')
  const hospitalId = field('hospitalId')
  const council = field('council')
  const registrationNumber = field('registrationNumber')
  const subSpecialty = field('subSpecialty')

  // The same rules and words as the form's own checks (lib/join-rules.ts), in the order the form asks.
  if (!field('title')) return fail('Choose one from the list.', 'title')
  if (!field('firstName')) return fail('This is required.', 'firstName')
  if (!field('lastName')) return fail('This is required.', 'lastName')
  if (fullName.length > 200) return fail('Please shorten your name.', 'firstName')
  if (!GENDERS.includes(field('gender'))) return fail('Choose one from the list.', 'gender')
  if (!isDate(field('dateOfBirth'))) return fail('Choose a date.', 'dateOfBirth')
  if (!isEmail(email) || email.length > 200) return fail(EMAIL_MESSAGE, 'email')
  const phoneIssue = phoneProblem(countryCode, phoneDigits)
  if (phoneIssue) return fail(phoneIssue, 'phone')
  const languages = list('languages', DOCTOR_LANGUAGES)
  if (!languages.length) return fail('Choose at least one.', 'languages')

  if (!MEDICAL_COUNCILS.includes(council)) return fail('Choose one from the list.', 'council')
  if (registrationNumber.length < 2) return fail('Enter your registration number as printed on your certificate.', 'registrationNumber')
  if (!year('registrationYear')) return fail(`Enter a year from 1950 to ${new Date().getFullYear()}.`, 'registrationYear')
  if (!/^\d{1,2}$/.test(experienceYears)) return fail('Enter a number from 0 to 70.', 'experience_years')
  if (qualificationsRaw.length < 2) return fail('Enter your highest qualification, for example MBBS or MD.', 'qualifications')
  if (field('college').length < 2) return fail('This is required.', 'college')
  if (!year('passingYear')) return fail(`Enter a year from 1950 to ${new Date().getFullYear()}.`, 'passingYear')
  if (!DOCTOR_SPECIALTIES.includes(specialty)) return fail('Choose one from the list.', 'specialty')

  if (!PRACTICE_TYPES.includes(field('practiceType'))) return fail('Choose one from the list.', 'practiceType')
  if (!hospitalId) return fail('Choose one from the list.', 'hospitalId')
  if (!/^\d{1,6}$/.test(consultationFee)) return fail('Enter a number from 0 to 100000.', 'consultation_fee')
  const consultDays = list('consultDays', WEEKDAYS)
  if (!consultDays.length) return fail('Choose at least one.', 'consultDays')
  if (!isTime(field('consultFrom'))) return fail('Choose a time.', 'consultFrom')
  if (!isTime(field('consultTo'))) return fail('Choose a time.', 'consultTo')
  if (!isLaterTime(field('consultFrom'), field('consultTo'))) return fail('The end time should be after the start time.', 'consultTo')
  if (!SLOT_MINUTES.includes(Number(field('slotMinutes')))) return fail('Choose one from the list.', 'slotMinutes')

  const pan = field('pan').toUpperCase()
  if (!/^[A-Z]{3}P[A-Z][0-9]{4}[A-Z]$/.test(pan)) return fail(PERSONAL_PAN_MESSAGE, 'pan')

  for (const name of ['confirmRegistration', 'noDisciplinary', 'consentVerification']) {
    if (formData.get(name) !== 'on') return fail('Tick this to continue.', name)
  }

  const details: DoctorDetails = {
    middleName: field('middleName') || undefined,
    gender: field('gender'),
    dateOfBirth: field('dateOfBirth'),
    languages,
    registrationYear: year('registrationYear'),
    registrationValidUntil: isDate(field('registrationValidUntil')) ? field('registrationValidUntil') : undefined,
    college: field('college').slice(0, 160),
    passingYear: year('passingYear'),
    otherQualifications: field('otherQualifications').slice(0, 300) || undefined,
    practiceType: field('practiceType'),
    clinic: field('clinic').slice(0, 300) || undefined,
    consultDays,
    consultFrom: field('consultFrom'),
    consultTo: field('consultTo'),
    slotMinutes: Number(field('slotMinutes')),
    bio: field('bio').slice(0, 1500) || undefined,
    conditions: field('conditions').slice(0, 400) || undefined,
    awards: field('awards').slice(0, 400) || undefined,
    pan,
  }

  // Check if email already exists in users or requests
  // Admin client: a visitor's session may not search every profile's email (that would show which addresses are registered).
  const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
  if (existingUser) {
    return fail('This email is already registered. Sign in to the doctor portal, or use another email.', 'email')
  }

  const { data: existingReq } = await supabase.from('doctor_signup_requests').select('id').eq('email', email).eq('status', 'pending').limit(1).maybeSingle()
  if (existingReq) {
    return fail('An application with this email is already waiting for review. Our team will be in touch.', 'email')
  }

  // The documents uploaded under this form's upload id. Before the documents bucket exists, they come by email.
  const uploads = await documentsReady(supabase)
  const documents = uploads ? await collectDocuments(supabase, 'doctor', field('uploadId') || null) : {}
  const missing = uploads ? missingDocuments('doctor', documents) : []
  if (missing.length > 0) {
    const firstMissing = APPLICATION_DOCS.doctor.find((d) => d.required && !documents[d.key])
    return fail(`Please add your ${missing.join(', ').toLowerCase()}.`, firstMissing ? `doc:${firstMissing.key}` : undefined)
  }
  if (Object.keys(documents).length > 0) details.documents = documents
  if (!uploads) details.documentsByEmail = true

  // Each application emails the address given, so limit how many one network can send. Counted only now, when the
  // application is about to be saved: corrections after a message above don't use up the network's attempts.
  if (await overLimit(`doctor-signup:${(await clientIp()) ?? 'unknown'}`, 5, 60 * 60_000)) {
    return fail('Several applications have been sent from this network. Please try again in an hour.')
  }

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
  alertTeamLater('doctor-application', {
    subject: `New doctor application: ${fullName}${specialty ? ` (${specialty})` : ''}`,
    heading: 'New doctor application',
    lines: [`${fullName} applied to join as a doctor${specialty ? ` in ${specialty}` : ''}. Check their registration with the medical council, then approve or decline the application.`],
    facts: [['Doctor', fullName], ['Speciality', specialty], ['Registration no.', registrationNumber], ['Email', email], ['Phone', phone]],
    page: '/executive/doctors',
    button: 'Review applications',
  })

  return { success: true, message: 'Your application has been sent. We’ve emailed you to confirm it arrived.' }
}

// Approving creates an account and returns its password, so only reviewers may call these actions.
async function canReviewApplications() {
  return !!(await executiveFor('doctors'))
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

  // A personal link to choose their own password (optional: the email also has the password the account was made with).
  const siteUrl = publicSiteUrl()
  const loginUrl = `${siteUrl}/login/doctor`
  let setPasswordLink: string | null = null

  try {
    const { data: linkData } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: request.email,
      options: { redirectTo: `${siteUrl}/update-password` }
    })
    setPasswordLink = linkData?.properties?.action_link ?? null
  } catch (err) {
    console.warn('generateLink fallback:', err)
  }

  // Fetch hospital name for email
  const { data: hospital } = await adminClient.from('hospitals').select('name').eq('id', request.hospital_id).maybeSingle()

  // The approval email: their user ID (staff ID) and password, the doctor login, and the set-your-own-password link.
  const emailed = await sendDoctorActivationEmail({
    to: request.email,
    doctorName: request.full_name,
    staffId: generatedStaffId,
    password,
    loginUrl,
    activationLink: setPasswordLink,
    hospitalName: hospital?.name,
  }).catch((err) => {
    console.error('Failed to send doctor activation email:', err)
    return false
  })

  return {
    success: true,
    credentials: {
      email: request.email,
      password: password,
      staffId: generatedStaffId,
      activationLink: setPasswordLink ?? loginUrl,
      emailed: !!emailed,
    }
  }
}

export async function rejectDoctor(requestId: string) {
  if (!(await canReviewApplications())) {
    return { success: false, error: 'Not authorized to review doctor applications' }
  }

  const adminClient = createAdminClient()
  const { data: rejected, error } = await adminClient
    .from('doctor_signup_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)
    .neq('status', 'rejected')
    .select('email, full_name')
    .maybeSingle()
  if (error) {
    return { success: false, error: error.message }
  }
  // Tell the applicant, once: a second click finds the request already rejected and sends nothing.
  if (rejected?.email) {
    await sendApplicationRejectedEmail({ to: rejected.email, name: rejected.full_name || 'Doctor', kind: 'doctor' }).catch(() => false)
  }
  return { success: true }
}
