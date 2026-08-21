'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // First, verify this executive owns this appointment
  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('executive_id, status')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appointment) {
    return { error: 'Appointment not found' }
  }

  if (appointment.executive_id !== user.id) {
    return { error: 'Not authorized to update this appointment' }
  }

  // Update status
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', appointmentId)

  if (updateError) {
    console.error('Failed to update status:', updateError)
    return { error: 'Failed to update status' }
  }

  revalidatePath('/executive/dashboard')
  return { success: true }
}

export async function verifyAndCheckInPatient(appointmentId: string, inputBookingId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  
  if (profile?.role !== 'executive') {
    return { error: 'Not authorized' }
  }

  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('id, hospital_id, status')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appointment) {
    return { error: 'Appointment not found' }
  }

  // Ensure appointment belongs to executive's hospital
  if (appointment.hospital_id !== profile.hospital_id) {
    return { error: 'Not authorized for this hospital' }
  }

  // Verify Booking ID (first 8 chars, case insensitive)
  const actualBookingId = appointment.id.slice(0, 8).toUpperCase()
  if (inputBookingId.toUpperCase().trim() !== actualBookingId) {
    return { error: 'Invalid Booking ID' }
  }

  // Update status to 'visited' (checked in)
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ 
      status: 'visited',
      executive_id: user.id // assign this executive as the one who handled it
    })
    .eq('id', appointmentId)

  if (updateError) {
    return { error: 'Failed to update status' }
  }

  revalidatePath('/executive/today')
  revalidatePath('/executive/dashboard')
  return { success: true }
}

export async function createWalkInAppointment(formData: FormData) {
  const supabase = await createClient()

  // 1. Verify caller is an Executive
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: executiveProfile } = await supabase
    .from('profiles')
    .select('role, hospital_id')
    .eq('id', user.id)
    .single()

  if (executiveProfile?.role !== 'executive') return { error: 'Forbidden' }

  const patientName = formData.get('patientName') as string
  const patientPhone = formData.get('patientPhone') as string
  const doctorId = formData.get('doctorId') as string
  const scheduleId = formData.get('scheduleId') as string

  if (!patientName || !patientPhone || !doctorId || !scheduleId) {
    return { error: 'All fields are required' }
  }

  try {
    // 2. Offline-to-Online: Check if patient exists or create them using Admin Client
    const adminAuthClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Look for existing user by phone
    // Note: listUsers is paginated, but for this demo we'll assume we can find them if they exist
    const { data: existingUsers } = await adminAuthClient.auth.admin.listUsers()
    
    // Auth phone format is usually E.164, but we just check if it ends with the provided number
    let patientUserId = existingUsers.users.find(u => u.phone?.includes(patientPhone))?.id

    if (!patientUserId) {
      // Create new user silently
      const { data: newUser, error: createError } = await adminAuthClient.auth.admin.createUser({
        phone: patientPhone,
        password: `CYD${Math.random().toString(36).slice(2, 10)}!`, // Random secure password
        phone_confirm: true // Auto confirm so they can use OTP later
      })

      if (createError) throw new Error('Failed to provision patient account: ' + createError.message)
      patientUserId = newUser.user.id

      // Insert the profile since there is no automatic trigger
      await adminAuthClient.from('profiles').insert({ 
        id: patientUserId, 
        full_name: patientName,
        phone_number: patientPhone,
        role: 'patient'
      })
    }

    // 3. Create Appointment and Payment
    // We need to mark schedule as booked and create appointment in a transaction-like manner
    
    // Check if slot is still available
    const { data: schedule } = await supabase.from('schedules').select('is_booked').eq('id', scheduleId).single()
    if (!schedule || schedule.is_booked) {
      return { error: 'This time slot is no longer available' }
    }

    // Mark booked
    await adminAuthClient.from('schedules').update({ is_booked: true }).eq('id', scheduleId)

    // Get consultation fee
    const { data: doctorProfile } = await supabase.from('doctors').select('consultation_fee').eq('id', doctorId).single()
    const fee = doctorProfile?.consultation_fee || 500

    // Create appointment (executive_id = the executive making the booking)
    const { data: appointment, error: aptError } = await adminAuthClient.from('appointments').insert({
      patient_id: patientUserId,
      doctor_id: doctorId,
      hospital_id: executiveProfile.hospital_id,
      schedule_id: scheduleId,
      executive_id: user.id,
      status: 'confirmed'
    }).select('id').single()

    if (aptError) {
      // Rollback schedule
      await adminAuthClient.from('schedules').update({ is_booked: false }).eq('id', scheduleId)
      throw new Error('Failed to create appointment')
    }

    // Create Cash Payment record
    await adminAuthClient.from('payments').insert({
      appointment_id: appointment.id,
      amount: fee,
      transaction_id: `CASH-${Date.now()}`,
      gateway: 'cash',
      status: 'success'
    })

    revalidatePath('/executive/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Walk-in booking error:', err)
    return { error: err.message || 'Failed to complete walk-in booking' }
  }
}
