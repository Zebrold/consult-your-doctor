'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath, updateTag } from 'next/cache'
import { createAdminClient as createServiceClient } from '@/lib/supabase/admin'
import { DIRECTORY_TAG } from '@/lib/public-directory'
import { provisionDoctor } from '@/lib/provisioning'
import { isVisiting } from '@/lib/practices'

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

  // Verify the doctor belongs to this admin's hospital, or visits it (a confirmed practice link, lib/practices.ts).
  // A visiting doctor's slots carry this hospital's id, so bookings on them belong here.
  const { data: doctor } = await supabase.from('doctors').select('hospital_id').eq('id', doctorId).single()
  const service = createServiceClient()
  const visiting = doctor?.hospital_id !== profile.hospital_id && (await isVisiting(service, doctorId, profile.hospital_id))
  if (doctor?.hospital_id !== profile.hospital_id && !visiting) return { error: 'Doctor not found in your hospital' }

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
    hospital_id?: string
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
          is_booked: false,
          ...(visiting ? { hospital_id: profile.hospital_id as string } : {}),
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

  // Skip times the doctor already has a slot for (at any hospital), so running the generator twice doesn't double-book
  // the calendar. A visiting doctor's other slots aren't visible to this hospital's own login, so look with the service.
  const { data: existing } = await (visiting ? service : supabase)
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
  const { error: insertError } = await (visiting ? service : supabase).from('schedules').insert(freshSlots)

  if (insertError) {
    console.error('Failed to generate slots:', insertError)
    return { error: 'Failed to generate slots in the database.' }
  }

  revalidatePath(`/hospital/doctors/${doctorId}/schedule`)
  revalidatePath('/hospital/doctors')
  revalidatePath('/hospital/dashboard')
  return { success: true, count: freshSlots.length, skipped }
}

/**
 * Removes open slots a hospital published for a doctor: one slot (`scheduleId`), or every open slot still ahead on one
 * day (`date`, YYYY-MM-DD in India time). Booked and past slots always stay.
 *
 * The caller and the doctor are checked here, then the rows are removed with the service role. Through the admin's own
 * session the delete depended on a database rule (20261005_security_hardening.sql) that may not be in place, and
 * without it Supabase removes nothing and reports no error, so the slot just stayed. The count removed is returned, so
 * "nothing removed" is reported instead of looking like success.
 */
export async function deleteDoctorSlot(formData: FormData): Promise<{ success: true; removed: number } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please log in again.' }
  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return { error: 'Only hospital administrators can remove slots.' }
  const hospitalId = profile.hospital_id as string

  const scheduleId = String(formData.get('scheduleId') ?? '')
  const doctorId = String(formData.get('doctorId') ?? '')
  const date = String(formData.get('date') ?? '')
  if (!doctorId || (!scheduleId && !/^\d{4}-\d{2}-\d{2}$/.test(date))) return { error: 'Choose a slot to remove.' }

  // The hospital's own doctor, or a visiting one whose slots here carry this hospital's id (lib/practices.ts).
  const { data: doctor } = await service.from('doctors').select('hospital_id').eq('id', doctorId).maybeSingle()
  if (!doctor) return { error: 'Doctor not found.' }
  const visiting = doctor.hospital_id !== hospitalId
  if (visiting && !(await isVisiting(service, doctorId, hospitalId))) return { error: 'This doctor isn’t at your hospital.' }

  const now = new Date().toISOString()
  const dayStart = new Date(`${date}T00:00:00+05:30`).toISOString()
  const dayEnd = new Date(Date.parse(dayStart) + 86_400_000).toISOString()
  // An own doctor's slots here have no hospital_id, or this one; never touch the ones they have at another hospital.
  // Before 20261115_executive_workspace.sql there is no hospital_id column and every slot is at the doctor's hospital.
  const remove = (scoped: boolean) => {
    let q = service.from('schedules').delete().eq('doctor_id', doctorId).eq('is_booked', false).gt('start_time', now)
    q = scheduleId ? q.eq('id', scheduleId) : q.gte('start_time', dayStart).lt('start_time', dayEnd)
    if (visiting) q = q.eq('hospital_id', hospitalId)
    else if (scoped) q = q.or(`hospital_id.is.null,hospital_id.eq.${hospitalId}`)
    return q.select('id')
  }
  let res = await remove(true)
  if (res.error && !visiting && /hospital_id/.test(res.error.message ?? '')) res = await remove(false)
  if (res.error) {
    console.error('deleteDoctorSlot:', res.error)
    return { error: 'Couldn’t remove the slot. Please try again.' }
  }
  const removed = res.data?.length ?? 0
  if (!removed) return { error: scheduleId ? 'That slot is booked or already gone. Refresh the page to see the latest.' : 'There are no open slots left to remove on this day.' }

  revalidatePath(`/hospital/doctors/${doctorId}/schedule`)
  revalidatePath('/hospital/doctors')
  revalidatePath('/hospital/dashboard')
  return { success: true, removed }
}

export async function createHospitalDoctor(formData: FormData) {
  const supabase = await createClient()

  // 1. Verify caller is Hospital Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return { error: 'Forbidden. Hospital Admin only.' }

  const fullName = String(formData.get('fullName') || '').trim()
  const specialty = String(formData.get('specialty') || '').trim()
  if (!fullName || !specialty) {
    return { error: 'Doctor name and specialty are required.' }
  }

  // 2. The sign-in, department, doctor record and activation email (shared with the executive portal).
  const result = await provisionDoctor(createServiceClient(), {
    hospitalId: profile.hospital_id,
    fullName,
    email: String(formData.get('email') || ''),
    specialty,
    experienceYears: parseInt(formData.get('experienceYears') as string || '0', 10) || 0,
    consultationFee: parseFloat(formData.get('consultationFee') as string || '0') || 0,
    password: formData.get('password') as string | null,
    invitedBy: user.id,
    qualifications: String(formData.get('qualifications') || ''),
    address: String(formData.get('address') || ''),
    phone: String(formData.get('phone') || ''),
    registrationNumber: String(formData.get('registrationNumber') || ''),
    registrationCouncil: String(formData.get('registrationCouncil') || ''),
  })
  if ('error' in result) return { error: result.error }

  for (const path of ['/hospital/dashboard', '/hospital/doctors', '/hospital/staff']) revalidatePath(path)
  // Patients see the new doctor on the public lists straight away.
  updateTag(DIRECTORY_TAG)
  return {
    success: true,
    doctorId: result.staffId,
    email: result.email,
    activationLink: result.activationLink,
    invitationSent: result.invitationSent,
  }
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

  // The registration columns come from 20261009_beds_reviews_profiles.sql: ignore a missing-column error.
  if (formData.has('registrationNumber')) {
    const { error: registrationError } = await admin
      .from('doctors')
      .update({ registration_number: text('registrationNumber').slice(0, 40) || null, registration_council: text('registrationCouncil').slice(0, 80) || null })
      .eq('id', doctorId)
    if (registrationError) console.warn('updateHospitalDoctor registration:', registrationError)
  }

  const phone = text('phone')
  const fullName = text('fullName')
  if (fullName || phone) {
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        ...(phone ? { phone_number: phone } : {}),
        ...(fullName ? { full_name: fullName } : {}),
      })
      .eq('id', doctor.profile_id)
    if (profileError) {
      if (profileError.code === '23505') return { success: false, error: 'This phone number is already in use.' }
      console.warn('Profile update warning:', profileError)
    }
  }

  for (const path of ['/hospital/dashboard', '/hospital/doctors', '/hospital/staff', '/hospital/revenue']) revalidatePath(path)
  return { success: true }
}

/**
 * Sets the consultation fee of one of this hospital's doctors: shown on the doctor's profile page and paid at the
 * hospital counter, never online.
 */
export async function setHospitalDoctorFee(doctorId: string, rawFee: number): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please log in with your hospital account.' }
  const admin = createServiceClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return { success: false, error: 'Please log in with your hospital account.' }

  const fee = Math.round(Number(rawFee))
  if (!Number.isFinite(fee) || fee < 1 || fee > 100_000) return { success: false, error: 'Enter a fee between ₹1 and ₹1,00,000.' }

  const { data: doctor } = await admin.from('doctors').select('id, hospital_id').eq('id', doctorId).maybeSingle()
  if (!doctor || doctor.hospital_id !== profile.hospital_id) return { success: false, error: 'Doctor not found in your hospital.' }

  const { error } = await admin.from('doctors').update({ consultation_fee: fee }).eq('id', doctorId)
  if (error) {
    console.error('setHospitalDoctorFee:', error)
    return { success: false, error: 'Could not save the fee. Please try again.' }
  }
  for (const path of ['/hospital/doctors', '/hospital/patients', '/hospital/dashboard', '/hospital/revenue', `/doctors/${doctorId}`, `/hospitals/${profile.hospital_id}`]) revalidatePath(path)
  return { success: true }
}

export async function deleteHospitalDoctor(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return { success: false, error: 'Forbidden' }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const doctorId = String(formData.get('doctorId') || '').trim()
  if (!doctorId) return { success: false, error: 'Doctor ID is required.' }

  // A doctor with any visit on record keeps it: deleting the row could take those patients' visits and prescriptions with
  // it (the foreign keys from appointments are not in this repository, so they can't be relied on).
  const { data: visit } = await admin.from('appointments').select('id').eq('doctor_id', doctorId).limit(1).maybeSingle()
  if (visit) return { success: false, error: 'This doctor has visits on record, so their record can’t be deleted. Ask the Consult Your Doctor team to deactivate it.' }

  const { error } = await admin.from('doctors').delete().eq('id', doctorId).eq('hospital_id', profile.hospital_id)
  if (error) {
    console.error('deleteHospitalDoctor error:', error)
    return { success: false, error: 'Could not delete the doctor.' }
  }

  for (const path of ['/hospital/dashboard', '/hospital/doctors', '/hospital/staff']) revalidatePath(path)
  updateTag(DIRECTORY_TAG)
  return { success: true }
}

