'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

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

  const { data: appointment } = await supabase.from('appointments').select('doctor_id').eq('id', appointmentId).single()
  if (!appointment || appointment.doctor_id !== doctor.id) {
    return { error: 'Not authorized for this appointment' }
  }

  let fileUrl = 'none'

  if (file && file.size > 0) {
    // Basic validation
    if (file.size > 5242880) return { error: 'File size must be under 5MB' }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${appointmentId}-${Date.now()}.${fileExt}`
    
    // Upload to supabase storage using admin client to bypass Storage RLS
    const adminClient = createAdminClient()
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('medical_records')
      .upload(fileName, file, { upsert: true })

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

  // Auto-complete the appointment
  await supabase.from('appointments').update({ status: 'completed' }).eq('id', appointmentId)

  revalidatePath('/doctor/dashboard')
  return { success: true }
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

  revalidatePath('/doctor/dashboard/schedules')
  return { success: true }
}

export async function updateDoctorProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const fullName = formData.get('full_name') as string
  const phoneNumber = formData.get('phone_number') as string
  const specialty = formData.get('specialty') as string
  const experienceYears = formData.get('experience_years') ? Number(formData.get('experience_years')) : null
  const consultationFee = formData.get('consultation_fee') ? Number(formData.get('consultation_fee')) : null
  const bio = formData.get('bio') as string
  const qualifications = formData.get('qualifications') as string
  const address = formData.get('address') as string

  // Update profile
  const adminClient = createAdminClient()
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

  // Update doctor
  const { error: doctorError } = await adminClient
    .from('doctors')
    .update({
      specialty: specialty || 'General Physician',
      experience_years: experienceYears,
      consultation_fee: consultationFee,
      bio: bio || null,
      qualifications: qualifications || null,
      address: address || null
    })
    .eq('profile_id', user.id)

  if (doctorError) {
    console.error('Doctor update error:', doctorError)
    return { success: false, error: doctorError.message }
  }

  revalidatePath('/doctor/dashboard')
  return { success: true }
}

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: doctor } = await supabase.from('doctors').select('id').eq('profile_id', user.id).single()
  if (!doctor) return { success: false, error: 'Not a doctor' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('appointments')
    .update({ status })
    .match({ id: appointmentId, doctor_id: doctor.id })

  if (error) {
    console.error('Error updating appointment status:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/doctor/dashboard')
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
  const diagnosis = (formData.get('diagnosis') as string) || 'General Consultation'
  const bp = (formData.get('bp') as string) || '120/80'
  const spo2 = (formData.get('spo2') as string) || '98%'
  const hr = (formData.get('hr') as string) || '72 bpm'
  const allergy = (formData.get('allergy') as string) || 'No Known Allergies'
  const medications = (formData.get('medications') as string) || 'As prescribed by physician'

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

  // Create schedule slot
  const startTime = new Date(Date.now() + 3600000).toISOString()
  const endTime = new Date(Date.now() + 5400000).toISOString()
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

    if (newApt) {
      // Create medical record with clinical notes
      await adminClient.from('medical_records').insert({
        appointment_id: newApt.id,
        document_type: 'prescription',
        notes: `${diagnosis} - Vitals: BP ${bp}, SpO2 ${spo2}, HR ${hr}. Allergy: ${allergy}. Rx: ${medications}`,
        file_url: 'none'
      })
    }
  }

  revalidatePath('/doctor/dashboard')
  return { success: true }
}
