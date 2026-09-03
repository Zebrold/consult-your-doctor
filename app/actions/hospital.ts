'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

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
  } catch (e) {
    return { error: 'Invalid active days' }
  }

  const durationMins = parseInt(durationStr, 10)
  if (isNaN(durationMins) || durationMins <= 0) return { error: 'Invalid duration' }

  // Verify the doctor actually belongs to this admin's hospital
  const { data: doctor } = await supabase.from('doctors').select('hospital_id').eq('id', doctorId).single()
  if (doctor?.hospital_id !== profile.hospital_id) return { error: 'Doctor not found in your hospital' }

  const [startHour, startMin] = startTimeStr.split(':').map(Number)
  const [endHour, endMin] = endTimeStr.split(':').map(Number)

  // Use Z to parse strictly as UTC midnight to safely iterate over days
  const startDate = new Date(`${startDateStr}T00:00:00Z`)
  const endDate = new Date(`${endDateStr}T00:00:00Z`)
  
  if (endDate < startDate) {
    return { error: 'End date must be on or after start date' }
  }

  const newSlots = []
  
  // Iterate through each day in the date range
  let currentDate = new Date(startDate.getTime())
  
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

  // Insert all slots
  const { error: insertError } = await supabase.from('schedules').insert(newSlots)

  if (insertError) {
    console.error('Failed to generate slots:', insertError)
    return { error: 'Failed to generate slots in the database.' }
  }

  revalidatePath(`/hospital/doctors/${doctorId}/schedule`)
  return { success: true, count: newSlots.length }
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

  // Ensure it's not booked
  const { data: schedule } = await supabase.from('schedules').select('is_booked').eq('id', scheduleId).single()
  if (schedule?.is_booked) return { error: 'Cannot delete a booked slot.' }

  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId)

  if (error) {
    console.error('Failed to delete slot:', error)
    return { error: 'Failed to delete the slot.' }
  }

  revalidatePath(`/hospital/doctors/${doctorId}/schedule`)
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
  const fullName = formData.get('fullName') as string
  const specialty = formData.get('specialty') as string
  const experienceYears = parseInt(formData.get('experienceYears') as string || '0', 10)
  const consultationFee = parseFloat(formData.get('consultationFee') as string || '0')

  if (!password || !fullName || !specialty) {
    return { error: 'All required fields must be filled.' }
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
    emailForAuth = `${adminId.toLowerCase()}@cyd.internal`
    
    // Check if exists
    const { data: existing } = await adminAuthClient.auth.admin.listUsers()
    if (!existing.users.some(u => u.email === emailForAuth)) {
      isUnique = true
    }
  }

  // 3. Create Auth User
  const { data: newAuthUser, error: authError } = await adminAuthClient.auth.admin.createUser({
    email: emailForAuth,
    password,
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
    hospital_id: profile.hospital_id,
    staff_id: adminId

  })

  if (profileError) {
    console.error('Failed to update profile:', profileError)
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
  const { error: doctorError } = await adminAuthClient.from('doctors').insert({
    profile_id: newAuthUser.user.id,
    hospital_id: profile.hospital_id,
    department_id: departmentId,
    specialty,
    experience_years: experienceYears,
    consultation_fee: consultationFee
  })

  if (doctorError) {
    console.error('Failed to create doctor record:', doctorError)
    return { error: 'Failed to finalize doctor registration.' }
  }

  revalidatePath('/hospital/doctors')
  return { success: true, doctorId: adminId }
}
