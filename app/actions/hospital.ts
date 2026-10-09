'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { sendDoctorActivationEmail } from '@/lib/notify/email'

export async function generateDoctorSlots(formData: FormData) {
  const supabase = await createClient()

  // Verify caller is Hospital Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return { error: 'Unauthorized' }

  const doctorId = formData.get('doctorId') as string
  const startDateStr = formData.get('startDate') as string
  const endDateStr = formData.get('endDate') as string
  const activeDaysStr = formData.get('activeDays') as string
  const startTimeStr = formData.get('startTime') as string // HH:mm
  const endTimeStr = formData.get('endTime') as string     // HH:mm
  const durationStr = formData.get('duration') as string

  if (!doctorId || !startDateStr || !endDateStr || !activeDaysStr || !startTimeStr || !endTimeStr || !durationStr) {
    return { error: 'Missing required fields' }
  }

  let activeDays: number[] = []
  try {
    activeDays = JSON.parse(activeDaysStr)
  } catch {
    return { error: 'Invalid active days' }
  }

  const durationMins = parseInt(durationStr, 10)
  if (isNaN(durationMins) || durationMins <= 0) return { error: 'Invalid duration' }

  // Verify the doctor actually belongs to this admin's hospital
  const { data: doctor } = await supabase.from('doctors').select('hospital_id').eq('id', doctorId).single()
  if (doctor?.hospital_id !== profile.hospital_id) return { error: 'Doctor not found in your hospital' }

  // Use Z to parse strictly as UTC midnight to safely iterate over days
  const startDate = new Date(`${startDateStr}T00:00:00Z`)
  const endDate = new Date(`${endDateStr}T00:00:00Z`)
  
  if (endDate < startDate) {
    return { error: 'End date must be on or after start date' }
  }

  type GeneratedSlot = {
    doctor_id: string
    start_time: string
    end_time: string
    is_booked: boolean
  }
  const newSlots: GeneratedSlot[] = []
  
  // Iterate through each day in the date range
  const currentDate = new Date(startDate.getTime())
  
  // Cap at 90 days to prevent abuse or browser timeout
  const maxDays = 90;
  let daysProcessed = 0;

  while (currentDate <= endDate && daysProcessed < maxDays) {
    // Check if the current day of the week is active
    if (activeDays.includes(currentDate.getUTCDay())) {
      const year = currentDate.getUTCFullYear()
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0')
      const date = String(currentDate.getUTCDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${date}`

      // Explicitly construct times in India Standard Time (+05:30)
      const currentDayStartTime = new Date(`${dateString}T${startTimeStr}:00+05:30`)
      const currentDayEndTime = new Date(`${dateString}T${endTimeStr}:00+05:30`)

      if (currentDayEndTime <= currentDayStartTime) {
         return { error: 'End time must be after start time' }
      }

      let currentSlotStart = new Date(currentDayStartTime.getTime())

      while (currentSlotStart < currentDayEndTime) {
        const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMins * 60000)
        if (currentSlotEnd > currentDayEndTime) break

        newSlots.push({
          doctor_id: doctorId,
          start_time: currentSlotStart.toISOString(),
          end_time: currentSlotEnd.toISOString(),
          is_booked: false
        })

        currentSlotStart = currentSlotEnd
      }
    }
    
    // Move to next day safely in UTC
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    daysProcessed++;
  }

  if (newSlots.length === 0) {
    return { error: 'No slots could be generated with the given parameters.' }
  }

  // Skip times the doctor already has a slot for, so running the generator twice doesn't double-book the calendar
  const { data: existing } = await supabase
    .from('schedules')
    .select('start_time, end_time')
    .eq('doctor_id', doctorId)
    .lt('start_time', newSlots[newSlots.length - 1].end_time)
    .gt('end_time', newSlots[0].start_time)
  type ExistingSlot = { start_time: string; end_time: string }
  const taken: [number, number][] = ((existing as ExistingSlot[] | null) ?? []).map((s: ExistingSlot) => [
    Date.parse(s.start_time),
    Date.parse(s.end_time),
  ])
  const freshSlots = newSlots.filter((s) => {
    const start = Date.parse(s.start_time)
    const end = Date.parse(s.end_time)
    return !taken.some(([a, b]: [number, number]) => start < b && end > a)
  })
  const skipped = newSlots.length - freshSlots.length
  if (freshSlots.length === 0) {
    return { error: 'The doctor already has slots covering all of these times.' }
  }

  // Insert all slots
  const { error: insertError } = await supabase.from('schedules').insert(freshSlots)

  if (insertError) {
    console.error('Failed to generate slots:', insertError)
    return { error: 'Failed to generate slots in the database.' }
  }

  revalidatePath(`/hospital/doctors/${doctorId}/schedule`)
  revalidatePath('/hospital/doctors')
  revalidatePath('/hospital/dashboard')
  return { success: true, count: freshSlots.length, skipped }
}

export async function deleteDoctorSlot(formData: FormData) {
  const supabase = await createClient()

  // Verify caller is Hospital Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return { error: 'Unauthorized' }

  const scheduleId = formData.get('scheduleId') as string
  const doctorId = formData.get('doctorId') as string

  if (!scheduleId || !doctorId) return { error: 'Missing required fields' }

  // Verify slot belongs to a doctor in this hospital
  const { data: doctor } = await supabase.from('doctors').select('hospital_id').eq('id', doctorId).single()
  if (doctor?.hospital_id !== profile.hospital_id) return { error: 'Unauthorized access to this doctor' }

  // Ensure the slot is this doctor's (not just any slot id) and not booked
  const { data: schedule } = await supabase.from('schedules').select('is_booked').eq('id', scheduleId).eq('doctor_id', doctorId).maybeSingle()
  if (!schedule) return { error: 'Slot not found.' }
  if (schedule.is_booked) return { error: 'Cannot delete a booked slot.' }

  // The doctor and is_booked filters also close the gap between the check above and the delete.
  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId).eq('doctor_id', doctorId).eq('is_booked', false)

  if (error) {
    console.error('Failed to delete slot:', error)
    return { error: 'Failed to delete the slot.' }
  }

  revalidatePath(`/hospital/doctors/${doctorId}/schedule`)
  revalidatePath('/hospital/doctors')
  revalidatePath('/hospital/dashboard')
  return { success: true }
}

export async function createHospitalDoctor(formData: FormData) {
  const supabase = await createClient()

  // 1. Verify caller is Hospital Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return { error: 'Forbidden. Hospital Admin only.' }

  const password = formData.get('password') as string
  const fullName = String(formData.get('fullName') || '').trim()
  const doctorEmail = String(formData.get('email') || '').trim().toLowerCase()
  const specialty = String(formData.get('specialty') || '').trim()
  const experienceYears = parseInt(formData.get('experienceYears') as string || '0', 10)
  const consultationFee = parseFloat(formData.get('consultationFee') as string || '0')

  if (!fullName || !specialty) {
    return { error: 'Doctor name and specialty are required.' }
  }

  // 2. Initialize Supabase Admin Client
  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Generate Unique ID CYD-[Initials]-[4 digits]
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  let adminId = ''
  let emailForAuth = ''
  let isUnique = false

  while (!isUnique) {
    adminId = `CYD${initials}${Math.floor(1000 + Math.random() * 9000)}`
    emailForAuth = doctorEmail || `${adminId.toLowerCase()}@cyd.internal`
    
    // Check if exists
    const { data: taken } = await adminAuthClient.from('profiles').select('id').eq('staff_id', adminId).maybeSingle()
    if (!taken) {
      isUnique = true
    }
  }

  // Check if real email already taken
  if (doctorEmail) {
    const { data: existingByEmail } = await adminAuthClient.from('profiles').select('id').eq('email', doctorEmail).maybeSingle()
    if (existingByEmail) {
      return { error: 'An account with this email address already exists.' }
    }
  }

  const effectivePassword = password && password.length >= 8 ? password : `CydDoc!${Math.random().toString(36).slice(-8)}`

  // 3. Create Auth User
  const { data: newAuthUser, error: authError } = await adminAuthClient.auth.admin.createUser({
    email: emailForAuth,
    password: effectivePassword,
    email_confirm: true,
    user_metadata: { role: 'doctor', full_name: fullName }
  })

  if (authError) {
    console.error('Failed to create auth user:', authError)
    return { error: authError.message }
  }

  // 4. Insert the profile
  const { error: profileError } = await adminAuthClient.from('profiles').insert({
    id: newAuthUser.user.id,
    role: 'doctor',
    full_name: fullName,
    email: doctorEmail || null,
    hospital_id: profile.hospital_id,
    staff_id: adminId
  })

  if (profileError) {
    console.error('Failed to update profile:', profileError)
    await adminAuthClient.auth.admin.deleteUser(newAuthUser.user.id)
    return { error: 'User created, but failed to assign profile.' }
  }

  // 5. Look up or create Department
  let departmentId = ''
  const { data: existingDept } = await adminAuthClient
    .from('departments')
    .select('id')
    .eq('hospital_id', profile.hospital_id)
    .eq('name', specialty)
    .single()

  if (existingDept) {
    departmentId = existingDept.id
  } else {
    const { data: newDept } = await adminAuthClient.from('departments').insert({
      hospital_id: profile.hospital_id,
      name: specialty
    }).select().single()
    if (newDept) departmentId = newDept.id
  }

  if (!departmentId) {
    return { error: 'Failed to assign department.' }
  }

  // 6. Insert Doctor Record
  const { data: newDoctor, error: doctorError } = await adminAuthClient.from('doctors').insert({
    profile_id: newAuthUser.user.id,
    hospital_id: profile.hospital_id,
    department_id: departmentId,
    specialty,
    experience_years: experienceYears,
    consultation_fee: consultationFee
  }).select('id').single()

  if (doctorError) {
    console.error('Failed to create doctor record:', doctorError)
    return { error: 'Failed to finalize doctor registration.' }
  }

  // 7. If email provided, send invitation link
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
  let activationLink = `${siteUrl}/login/doctor`
  let invitationSent = false

  if (doctorEmail) {
    try {
      const { data: linkData } = await adminAuthClient.auth.admin.generateLink({
        type: 'recovery',
        email: doctorEmail,
        options: { redirectTo: `${siteUrl}/update-password` }
      })
      if (linkData?.properties?.action_link) {
        activationLink = linkData.properties.action_link
      }
    } catch (err) {
      console.warn('generateLink fallback:', err)
    }

    const { data: hospital } = await adminAuthClient.from('hospitals').select('name').eq('id', profile.hospital_id).maybeSingle()

    invitationSent = await sendDoctorActivationEmail({
      to: doctorEmail,
      doctorName: fullName,
      activationLink,
      hospitalName: hospital?.name,
    })

    // Record invitation in doctor_invitations if table exists
    try {
      await adminAuthClient.from('doctor_invitations').insert({
        hospital_id: profile.hospital_id,
        doctor_id: newDoctor?.id || null,
        email: doctorEmail,
        full_name: fullName,
        specialty,
        status: 'invitation_pending',
        invited_by: user.id
      })
    } catch {}
  }

  for (const path of ['/hospital/dashboard', '/hospital/doctors', '/hospital/staff']) revalidatePath(path)
  return { 
    success: true, 
    doctorId: adminId, 
    email: doctorEmail || null, 
    activationLink: doctorEmail ? activationLink : null,
    invitationSent 
  }
}

/** Resends an invitation activation link to a hospital's doctor */
export async function resendDoctorInvitation(doctorId: string, email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: adminProfile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  if (adminProfile?.role !== 'hospital_admin' || !adminProfile.hospital_id) return { success: false, error: 'Forbidden' }

  const adminAuthClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
  let activationLink = `${siteUrl}/login/doctor`

  try {
    const { data: linkData } = await adminAuthClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${siteUrl}/update-password` }
    })
    if (linkData?.properties?.action_link) activationLink = linkData.properties.action_link
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to generate invitation link' }
  }

  const { data: hospital } = await adminAuthClient.from('hospitals').select('name').eq('id', adminProfile.hospital_id).maybeSingle()
  const { data: doc } = await adminAuthClient.from('doctors').select('profiles!doctors_profile_id_fkey(full_name)').eq('id', doctorId).maybeSingle()
  const docName = (doc?.profiles as any)?.full_name || 'Doctor'

  const sent = await sendDoctorActivationEmail({
    to: email,
    doctorName: docName,
    activationLink,
    hospitalName: hospital?.name,
  })

  return { success: true }
}

/** Edits one of this hospital's doctors (the details patients see when booking). */
export async function updateHospitalDoctor(formData: FormData): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const doctorId = String(formData.get('doctorId') || '')
  const { data: doctor } = await admin.from('doctors').select('id, profile_id, hospital_id').eq('id', doctorId).maybeSingle()
  if (!doctor || doctor.hospital_id !== profile.hospital_id) return { success: false, error: 'Doctor not found in your hospital' }

  const text = (name: string) => String(formData.get(name) || '').trim()
  const specialty = text('specialty')
  const experience = Number(text('experience'))
  const fee = Number(text('fee'))
  if (!specialty) return { success: false, error: 'Specialty is required.' }
  if (!Number.isFinite(experience) || experience < 0 || experience > 70) return { success: false, error: 'Enter years of experience (0 to 70).' }
  if (!Number.isFinite(fee) || fee <= 0) return { success: false, error: 'Enter a consultation fee greater than zero.' }

  // The department follows the specialty, created for this hospital if it's new.
  let { data: dept } = await admin.from('departments').select('id').eq('hospital_id', profile.hospital_id).eq('name', specialty).maybeSingle()
  if (!dept) {
    const { data: created } = await admin.from('departments').insert({ hospital_id: profile.hospital_id, name: specialty }).select('id').single()
    dept = created
  }

  const { error } = await admin
    .from('doctors')
    .update({
      specialty,
      experience_years: Math.round(experience),
      consultation_fee: Math.round(fee),
      qualifications: text('qualifications') || null,
      address: text('address') || null,
      bio: text('bio') || null,
      ...(dept ? { department_id: dept.id } : {}),
    })
    .eq('id', doctorId)
  if (error) {
    console.error('updateHospitalDoctor:', error)
    return { success: false, error: 'Could not save the doctor’s details.' }
  }

  const phone = text('phone')
  const { error: phoneError } = await admin.from('profiles').update({ phone_number: phone || null }).eq('id', doctor.profile_id)
  if (phoneError) return { success: false, error: phoneError.code === '23505' ? 'This phone number is already in use.' : 'Could not save the phone number.' }

  for (const path of ['/hospital/dashboard', '/hospital/doctors', '/hospital/staff', '/hospital/revenue']) revalidatePath(path)
  return { success: true }
}
