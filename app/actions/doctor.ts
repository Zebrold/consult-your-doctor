'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const DOCUMENT_TYPES: Record<string, string> = { ...IMAGE_TYPES, 'application/pdf': 'pdf' }

export async function addPrescription(formData: FormData) {
  const appointmentId = formData.get('appointmentId') as string
  const notes = formData.get('notes') as string
  const file = formData.get('file') as File | null

  if (!appointmentId || !notes) return { error: 'Missing required fields' }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify doctor owns the appointment
  const { data: doctor } = await supabase.from('doctors').select('id').eq('profile_id', user.id).single()
  if (!doctor) return { error: 'Not a doctor' }

  const { data: appointment } = await supabase.from('appointments').select('doctor_id, status').eq('id', appointmentId).single()
  if (!appointment || appointment.doctor_id !== doctor.id) {
    return { error: 'Not authorized for this appointment' }
  }
  if (!['confirmed', 'visited', 'completed'].includes(appointment.status)) {
    return { error: 'Prescriptions can only be added to paid, active appointments.' }
  }

  let fileUrl = 'none'

  if (file && file.size > 0) {
    // Basic validation
    if (file.size > 5242880) return { error: 'File size must be under 5MB' }
    const fileExt = DOCUMENT_TYPES[file.type]
    if (!fileExt) return { error: 'Upload the prescription as a PDF, JPG, PNG or WebP file.' }

    // Generate unique filename
    const fileName = `${appointmentId}-${Date.now()}.${fileExt}`
    
    // Upload to supabase storage using admin client to bypass Storage RLS
    const adminClient = createAdminClient()
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('medical_records')
      .upload(fileName, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return { error: 'Failed to upload document' }
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('medical_records')
      .getPublicUrl(uploadData.path)
      
    fileUrl = publicUrl
  }

  // Insert medical record
  const { error: insertError } = await supabase.from('medical_records').insert({
    appointment_id: appointmentId,
    document_type: 'prescription',
    notes: notes,
    file_url: fileUrl
  })

  if (insertError) {
    console.error(insertError)
    return { error: 'Failed to add prescription' }
  }

  // Writing the prescription completes the visit
  if (appointment.status !== 'completed') {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', appointmentId)
  }

  revalidateDoctorPages()
  return { success: true }
}

function revalidateDoctorPages() {
  for (const path of ['/doctor/dashboard', '/doctor/schedule', '/doctor/patients', '/doctor/profile']) revalidatePath(path)
}

export async function blockScheduleSlot(scheduleId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: doctor } = await supabase.from('doctors').select('id').eq('profile_id', user.id).single()
  if (!doctor) return { error: 'Not a doctor' }

  // Must only delete if it belongs to the doctor AND is_booked = false
  const { error } = await supabase
    .from('schedules')
    .delete()
    .match({ id: scheduleId, doctor_id: doctor.id, is_booked: false })

  if (error) {
    console.error('Failed to block schedule:', error)
    return { error: 'Failed to block the slot. It might be already booked.' }
  }

  revalidateDoctorPages()
  return { success: true }
}

export async function updateDoctorProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Writes below use the admin client, so check here that the caller really is a doctor.
  const adminClient = createAdminClient()
  const { data: doctor } = await adminClient.from('doctors').select('id').eq('profile_id', user.id).maybeSingle()
  if (!doctor) return { success: false, error: 'Not a doctor' }

  const fullName = formData.get('full_name') as string
  const phoneNumber = formData.get('phone_number') as string
  const specialty = formData.get('specialty') as string
  const experienceYears = formData.get('experience_years') ? Number(formData.get('experience_years')) : null
  const consultationFee = formData.get('consultation_fee') ? Number(formData.get('consultation_fee')) : null
  const bio = formData.get('bio') as string
  const qualifications = formData.get('qualifications') as string
  const address = formData.get('address') as string

  const image = formData.get('image') as File | null
  if (image && image.size > 0 && !IMAGE_TYPES[image.type]) {
    return { success: false, error: 'The photo must be a JPG, PNG or WebP image.' }
  }

  // Update profile
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ 
      full_name: fullName,
      phone_number: phoneNumber || null
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('Profile update error:', profileError)
    return { success: false, error: profileError.message }
  }

  let imageUrl: string | undefined = undefined

  if (image && image.size > 0) {
    if (image.size > 5242880) return { success: false, error: 'Image size must be under 5MB' }
    
    const fileName = `doctors/${user.id}-${Date.now()}.${IMAGE_TYPES[image.type]}`
    
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('avatars')
      .upload(fileName, image, { upsert: true, contentType: image.type })

    if (uploadError) {
      console.error('Image upload error:', uploadError)
      return { success: false, error: 'Failed to upload profile image' }
    }
    
    const { data: publicUrlData } = adminClient.storage
      .from('avatars')
      .getPublicUrl(uploadData.path)
      
    imageUrl = publicUrlData.publicUrl
  }

  // Update doctor
  const doctorUpdates: Record<string, string | number | null> = {
    specialty: specialty || 'General Physician',
    experience_years: experienceYears,
    consultation_fee: consultationFee,
    bio: bio || null,
    qualifications: qualifications || null,
    address: address || null
  }
  
  if (imageUrl) {
    doctorUpdates.image_url = imageUrl
  }

  const { error: doctorError } = await adminClient
    .from('doctors')
    .update(doctorUpdates)
    .eq('profile_id', user.id)

  if (doctorError) {
    console.error('Doctor update error:', doctorError)
    return { success: false, error: doctorError.message }
  }

  revalidateDoctorPages()
  return { success: true }
}

// Doctors move a paid visit between booked → checked in → completed. Unpaid or cancelled
// bookings are left to the payment flow and the operations team.
const DOCTOR_STATUSES = ['confirmed', 'visited', 'completed']

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  if (!DOCTOR_STATUSES.includes(status)) return { success: false, error: 'That status change is not allowed.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: doctor } = await supabase.from('doctors').select('id').eq('profile_id', user.id).single()
  if (!doctor) return { success: false, error: 'Not a doctor' }

  const adminClient = createAdminClient()
  const { data: updated, error } = await adminClient
    .from('appointments')
    .update({ status })
    .match({ id: appointmentId, doctor_id: doctor.id })
    .in('status', DOCTOR_STATUSES)
    .select('id')

  if (error) {
    console.error('Error updating appointment status:', error)
    return { success: false, error: error.message }
  }
  if (!updated || updated.length === 0) {
    return { success: false, error: 'This appointment is unpaid or cancelled, so its status cannot be changed here.' }
  }

  revalidateDoctorPages()
  return { success: true }
}

export async function addNewPatient(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: doctor } = await supabase.from('doctors').select('id, hospital_id').eq('profile_id', user.id).single()
  if (!doctor) return { success: false, error: 'Not a doctor' }

  const fullName = formData.get('full_name') as string
  const phoneNumber = formData.get('phone_number') as string
  const rawEmail = formData.get('email') as string
  const email = rawEmail && rawEmail.includes('@') ? rawEmail : `patient-${Date.now()}@consultyourdoctor.internal`
  // Only what the doctor actually entered is recorded; nothing clinical is filled in by default.
  const field = (name: string) => String(formData.get(name) || '').trim()
  const diagnosis = field('diagnosis')
  const bp = field('bp')
  const spo2 = field('spo2')
  const hr = field('hr')
  const allergy = field('allergy')
  const medications = field('medications')

  if (!fullName) return { success: false, error: 'Patient name is required' }

  const adminClient = createAdminClient()

  // Create auth user or use existing
  let patientId: string | null = null
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'patient' }
  })

  if (authUser?.user?.id) {
    patientId = authUser.user.id
  } else {
    // If user exists or failed, find profile
    const { data: existingProfile } = await adminClient.from('profiles').select('id').eq('email', email).maybeSingle()
    if (existingProfile) {
      patientId = existingProfile.id
    } else {
      return { success: false, error: authError?.message || 'Failed to create patient account' }
    }
  }

  // Ensure profile is updated
  await adminClient.from('profiles').upsert({
    id: patientId,
    full_name: fullName,
    phone_number: phoneNumber || null,
    email: email,
    role: 'patient',
    hospital_id: doctor.hospital_id || null
  })

  // The walk-in is seen now: give the visit a 30-minute slot starting now
  const startTime = new Date(Date.now()).toISOString()
  const endTime = new Date(Date.now() + 1800000).toISOString()
  const { data: newSchedule } = await adminClient.from('schedules').insert({
    doctor_id: doctor.id,
    start_time: startTime,
    end_time: endTime,
    is_booked: true
  }).select('id').single()

  if (newSchedule) {
    // Create appointment
    const { data: newApt } = await adminClient.from('appointments').insert({
      patient_id: patientId,
      doctor_id: doctor.id,
      schedule_id: newSchedule.id,
      hospital_id: doctor.hospital_id || null,
      status: 'confirmed'
    }).select('id').single()

    const vitals = [bp && `BP ${bp}`, spo2 && `SpO2 ${spo2}`, hr && `HR ${hr}`].filter(Boolean).join(', ')
    const notes = [
      diagnosis,
      vitals && `Vitals: ${vitals}.`,
      allergy && `Allergy: ${allergy}.`,
      medications && `Rx: ${medications}`,
    ].filter(Boolean).join(' ')
    if (newApt && notes) {
      await adminClient.from('medical_records').insert({
        appointment_id: newApt.id,
        document_type: 'prescription',
        notes,
        file_url: 'none'
      })
    }
  }

  revalidateDoctorPages()
  return { success: true }
}
